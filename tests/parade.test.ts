import {describe,expect,it} from 'vitest';
import {SkinnedMesh,Vector3} from 'three';
import {airborne,airChance,alignCycle,blendFrames,bounceFrame,bounces,castPoses,changeFrame,cycleAngles,cyclePeriod,cyclePhase,entryFrame,exitFrame,flipTimeline,movingShare,restAt,restFrame,swapTimeline,follow,followLag,fallTimeline,syncPose,syncModes,syncSpread,syncDances,cheerRates,periodOf,exercises,changeTimeline,ease,holdPose,paradeFrame,paradePoses,pickPose,poseAngles,waveChance,wavePeriod} from '../src/paradePoses';
import {ledRatio,normalizeParadeOptions,projectParadeOptions} from '../src/paradeOptions';
import {createShapes} from '../src/paradeShapes';
import {driftOf,field,pushed,pushing,shoveOf} from '../src/paradeField';
import {idColours,idText,labelMotion,labelState} from '../src/paradeLabels';
import {rng} from '../src/model';
import {createCharacter} from '../src/rig';
import {bones,generate,hipShapeOf,jointShapeOf,jointShapes,partName} from '../src/model';
import {setRules,defaultRules} from '../src/rules';
const cast=Array.from({length:15},(_,i)=>`parade-${i}`);
const deg=(r:number)=>r*180/Math.PI;
describe('parade',()=>{
 it('gives a cast of fifteen fifteen different poses from the references, the same every time',()=>{
  const poses=castPoses(cast);
  expect(paradePoses.length).toBeGreaterThanOrEqual(60);for(const kind of ['stand','step','jump','float'])expect(paradePoses.filter(p=>p.kind===kind).length,kind).toBeGreaterThanOrEqual(10);expect(new Set(paradePoses.map(p=>p.name)).size).toBe(paradePoses.length);
  expect(poses).toHaveLength(15);expect(new Set(poses.map(p=>p.name)).size).toBe(15);
  expect(castPoses(cast)).toEqual(poses);expect(castPoses(cast.map(l=>`${l}x`)).map(p=>p.name)).not.toEqual(poses.map(p=>p.name));
 });
 it('faces every pose right: elbows bend forward, knees bend back, nothing turns the whole figure',()=>{
  for(const def of paradePoses){
   const a=poseAngles(def);
   // Local lower-limb angles: a forearm turns forward (counter-clockwise) from its upper arm, a shin back from its thigh.
   // Knees bend back (facing right); elbows fold outward on their own side (the far one the mirror way).
   for(const side of ['L','R']){const out=side==='L'?1:-1;expect(out*deg(a[`forearm_${side}`]),`${def.name} ${side} elbow`).toBeGreaterThanOrEqual(0);expect(out*deg(a[`forearm_${side}`])).toBeLessThanOrEqual(160);expect(deg(a[`shin_${side}`]),`${def.name} ${side} knee`).toBeLessThanOrEqual(0);expect(deg(a[`shin_${side}`])).toBeGreaterThanOrEqual(-130);}
   // Arms reach outward: elbow and hand on the arm's own side of its shoulder, never across the body.
   for(const [key,out] of [['near',1],['far',-1]] as const){const [u,f]=def.arm[key],r=(x:number)=>x*Math.PI/180;expect(out*.3*Math.sin(r(u)),`${def.name} ${key} elbow across`).toBeGreaterThanOrEqual(-.03);expect(out*(.3*Math.sin(r(u))+.41*Math.sin(r(f))),`${def.name} ${key} hand across`).toBeGreaterThanOrEqual(-.06);}
   expect(a.root??0,def.name).toBe(0);expect(Math.abs(deg(a.spine_lower)),def.name).toBeLessThanOrEqual(12);
   // Standing and stepping on the floor; jumps hop a little, floats hover higher, nobody flies off.
   // (A hop's and a flip's height comes from its motion: bounceFrame.)
   const lift=def.lift??0;if(airborne(def.kind)&&!def.cycle)expect(lift,def.name).toBeGreaterThanOrEqual(.5);else expect(lift,def.name).toBe(0);expect(lift).toBeLessThanOrEqual(.9);
  }
 });
 it('moves every pose a little, never far from the held one',()=>{
  // (The cycles move by design: see their own test.)
  for(const p of castPoses(cast).filter(p=>!p.cycle)){
   const moved=[0,.7,1.9,3.3].map(t=>paradeFrame(p,t));
   expect(moved.some(f=>Object.keys(f.angles).some(k=>Math.abs(f.angles[k]-moved[0].angles[k])>.01)),p.name).toBe(true);
   // (A waving hand swings by design: see the wave's own test.)
   for(const f of moved){for(const k of Object.keys(p.angles))if(k!==`forearm_${p.wave}`)expect(Math.abs(f.angles[k]-p.angles[k]),`${p.name} ${k}`).toBeLessThan(.15);expect(Math.abs(f.lift-p.lift)).toBeLessThan(.14);}
   if(p.kind==='float')expect(Math.max(...moved.map(f=>f.lift))-Math.min(...moved.map(f=>f.lift)),p.name).toBeGreaterThan(.05);
  }
 });
 it('stands the standing and stepping poses on the floor, on real characters',()=>{
  for(const [i,p] of castPoses(cast).entries()){
   const rig=createCharacter(generate(cast[i])),f=paradeFrame(p,1.2);rig.applyAngles(f.angles);
   for(const v of Object.values(f.angles))expect(Number.isFinite(v)).toBe(true);
   rig.group.updateMatrixWorld(true);const feet=['L','R'].map(s=>rig.map.get(`foot_${s}`)!.getWorldPosition(new Vector3()).y);
   if(p.kind==='stand'||p.kind==='step')expect(Math.min(...feet),p.name).toBeLessThan(.35);rig.dispose();
  }
 });
 it('scales a short body type up to a tall one\'s height, still standing on the floor',()=>{
  const only=(id:string)=>({...defaultRules,bodyTypes:Object.fromEntries(Object.keys(defaultRules.bodyTypes).map(k=>[k,k===id?100:0]))});
  const extent=(rig:ReturnType<typeof createCharacter>)=>{rig.group.updateMatrixWorld(true);let low=Infinity,high=-Infinity;const v=new Vector3();for(const o of rig.group.children)if(o instanceof SkinnedMesh&&o.visible&&!o.name.startsWith('hair')){const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);o.applyBoneTransform(i,v);v.applyMatrix4(o.matrixWorld);low=Math.min(low,v.y);high=Math.max(high,v.y);}}return {low,high};};
  try{
   setRules(only('pole'));const tall=createCharacter(generate('eq-tall')),target=tall.group.userData.restHeight;tall.dispose();
   setRules(only('brick'));const short=createCharacter(generate('eq-short')),h=short.group.userData.restHeight;expect(h).toBeLessThan(target*.8);
   short.group.scale.setScalar(target/h);short.applyAngles({});const e=extent(short);
   expect(e.low).toBeCloseTo(0,2);expect(e.high-e.low).toBeCloseTo(target,1);short.dispose();
  }finally{setRules(defaultRules);}
 });
 it('rotates through the library: a new pose nobody holds, eased in from the old one',()=>{
  const r=rng('rotate'),used=new Set(paradePoses.slice(0,paradePoses.length-3).map(p=>p.name));
  for(let i=0;i<20;i++)expect(used.has(pickPose(used,r).name)).toBe(false);
  // In the air with the asked chance; each half's two kinds evenly.
  const kinds:Record<string,number>={};for(let i=0;i<4000;i++){const k=pickPose(new Set(),r,.3).kind;kinds[k]=(kinds[k]??0)+1;}
  expect((kinds.float+kinds.jump)/4000).toBeCloseTo(.3,1);expect(Math.abs(kinds.jump-kinds.float)/4000).toBeLessThan(.05);expect(Math.abs(kinds.stand-kinds.step)/4000).toBeLessThan(.05);
  // Moving poses: eleven of them now, about one character in five moving (the three first ones' 3.8% and 15 points
  // more), shared evenly.
  const moving=paradePoses.filter(p=>p.cycle);expect(moving.map(p=>p.cycle).sort()).toEqual(['armwave','backflip','charleston','dance','disco','frontflip','hop','robot','run','twist','walk']);
  expect(movingShare).toBeCloseTo(.188,3);const tally:Record<string,number>={},draws=60000;for(let i=0;i<draws;i++){const p=pickPose(new Set(),r);if(p.cycle)tally[p.cycle]=(tally[p.cycle]??0)+1;}
  expect(Object.values(tally).reduce((a,b)=>a+b,0)/draws).toBeCloseTo(movingShare,2);for(const c of moving)expect(tally[c.cycle!]/draws,c.name).toBeCloseTo(movingShare/moving.length,2);
  // Only poses it allows (a newcomer: on the floor, no hop or flip).
  for(let i=0;i<300;i++){const p=pickPose(new Set(),r,0,q=>!airborne(q.kind)&&!bounces(q.cycle));expect(airborne(p.kind)).toBe(false);expect(bounces(p.cycle)).toBe(false);}
  // The mix: fewer in the air when the air is full, and away from what both neighbours do.
  expect(airChance(.5,[])).toBeCloseTo(.5);expect(airChance(.8,[])).toBeLessThan(.15);expect(airChance(.2,[])).toBeGreaterThan(.85);
  expect(airChance(.5,[true,true])).toBeLessThan(.2);expect(airChance(.5,[false,false])).toBeGreaterThan(.8);expect(airChance(.5,[true,false])).toBeCloseTo(.5);
  // A cast starts about half on the floor and half in the air, rarely four of one in a row.
  let long=0;for(let c=0;c<60;c++){const up=castPoses(Array.from({length:15},(_,i)=>`mix-${c}-${i}`)).map(p=>airborne(p.kind));const n=up.filter(Boolean).length;expect(n,`cast ${c}`).toBeGreaterThanOrEqual(4);expect(n).toBeLessThanOrEqual(11);let run=1,best=1;for(let i=1;i<up.length;i++){run=up[i]===up[i-1]?run+1:1;best=Math.max(best,run);}if(best>=4)long++;}
  expect(long).toBeLessThan(12);
  const a=paradeFrame(holdPose(paradePoses[0],r),1),b=paradeFrame(holdPose(paradePoses.find(p=>p.kind==='float')!,r),1);
  expect(blendFrames(a,b,ease(0))).toEqual({angles:{...a.angles},lift:a.lift});const end=blendFrames(a,b,ease(1));for(const k of Object.keys(b.angles))expect(end.angles[k]).toBeCloseTo(b.angles[k],9);expect(end.lift).toBeCloseTo(b.lift,9);
  expect(ease(.5)).toBeCloseTo(.5,9);expect(ease(-1)).toBe(0);expect(ease(2)).toBe(1);
 });
 it('keeps one foot clearly higher than the other in every pose off the floor',()=>{
  const footY=([t,s]:[number,number])=>-(Math.cos(t*Math.PI/180)+Math.cos(s*Math.PI/180))*.6;
  // (The flips tuck both legs together: they turn over, and are moving poses.)
  for(const def of paradePoses)if(airborne(def.kind)&&!def.cycle)expect(Math.abs(footY(def.leg.near)-footY(def.leg.far)),def.name).toBeGreaterThanOrEqual(.15);
 });
 it('changes pose with anticipation, a gravity hop and an overshoot, feet planted on a landing on the floor',()=>{
  const r=rng('change'),standing=holdPose(paradePoses.find(p=>p.name==='Calm walk')!,r),floating=holdPose(paradePoses.find(p=>p.name==='Float')!,r),stand2=holdPose(paradePoses.find(p=>p.name==='Áo dài')!,r);
  const {takeoff,land}=changeTimeline,t=1.3;
  for(const [from,to] of [[standing,floating],[floating,stand2],[standing,stand2]] as const){
   // Starts as the old pose and ends as the new one.
   const a=paradeFrame(from,t),b=paradeFrame(to,t),start=changeFrame(from,to,0,t),end=changeFrame(from,to,1,t);
   for(const k of Object.keys(a.angles))expect(start.angles[k],k).toBeCloseTo(a.angles[k],9);for(const k of Object.keys(b.angles))expect(end.angles[k],k).toBeCloseTo(b.angles[k],9);
   expect(start.lift).toBeCloseTo(Math.max(0,a.lift),9);expect(end.lift).toBeCloseTo(b.lift,9);
   // Anticipation: just before take-off the knees are bent deeper and the arms swung back (from the air onto the
   // floor it falls instead: see the fall's own test).
   const crouch=changeFrame(from,to,takeoff*.95,t);if(from!==floating||!airborne(from.kind)||airborne(to.kind)){expect(crouch.angles.shin_L).toBeLessThan(a.angles.shin_L-.5);
   // The arms drop toward their own sides (never across the body).
   expect(crouch.angles.upperarm_L).toBeLessThanOrEqual(a.angles.upperarm_L);expect(crouch.angles.upperarm_L).toBeGreaterThanOrEqual(Math.min(0,a.angles.upperarm_L));expect(crouch.angles.upperarm_R).toBeGreaterThanOrEqual(a.angles.upperarm_R);expect(crouch.angles.upperarm_R).toBeLessThanOrEqual(Math.max(0,a.angles.upperarm_R));}
   // Gravity: the hop is a parabola, highest halfway through the flight and still there.
   const mid=(takeoff+land)/2,hop=(k:number)=>changeFrame(from,{...to,angles:from.angles,lift:from.lift,kind:from.kind},k,0).lift;
   if(from===standing&&to===stand2){expect(hop(mid)).toBeGreaterThan(hop(mid-.1));expect(hop(mid)).toBeGreaterThan(hop(mid+.1));const d=1e-3;expect(Math.abs(hop(mid+d)-hop(mid-d))/(2*d)).toBeLessThan(.05);expect(hop(takeoff+.1)-hop(takeoff+.05)).toBeGreaterThan(hop(mid)-hop(mid-.05));}
   // Never below the floor.
   for(let k=0;k<=1;k+=.02)expect(changeFrame(from,to,k,t).lift).toBeGreaterThanOrEqual(0);
  }
  // Overshoot: after landing some angle goes past the new pose, then settles; landing on the floor stays on it.
  const after=[.82,.86,.9,.94].map(k=>changeFrame(standing,stand2,k,t)),b=paradeFrame(stand2,t),a=paradeFrame(standing,t);
  expect(after.some(f=>Object.keys(b.angles).some(k=>Math.abs(b.angles[k]-a.angles[k])>.05&&Math.sign(f.angles[k]-b.angles[k])===Math.sign(b.angles[k]-a.angles[k])&&Math.abs(f.angles[k]-b.angles[k])>.005))).toBe(true);
  for(const f of after)expect(f.lift).toBe(0);
  // Landing in the air: the body locks at the new height and lean while the limbs overshoot.
  const fl=holdPose(paradePoses.find(p=>p.name==='Hover')!,r),fb=paradeFrame(fl,t),air=[.82,.86,.9,.94].map(k=>changeFrame(standing,fl,k,t));
  for(const f of air){expect(f.lift).toBeCloseTo(fb.lift,9);expect(f.angles.spine_lower).toBeCloseTo(fb.angles.spine_lower,9);}
  expect(air.some(f=>['upperarm_L','upperarm_R','thigh_L','thigh_R'].some(k=>Math.abs(f.angles[k]-fb.angles[k])>.01))).toBe(true);
  // Landing on the floor, the knees take the overshoot (a squash), within the knee's limit.
  expect(after[1].angles.shin_L).toBeLessThan(b.angles.shin_L-.1);for(const f of after)expect(f.angles.shin_L).toBeGreaterThanOrEqual(-2.4);
 });
 it('keeps the parade settings in range, and the cylinder canvas at the screen\'s proportions',()=>{
  expect(normalizeParadeOptions({})).toEqual(normalizeParadeOptions(undefined));expect(projectParadeOptions.view).toBeTruthy();
  expect(normalizeParadeOptions({view:'dome',speed:9,size:0,background:'red',equal:false,shapes:999,squareVariety:5,push:-1,pushReach:9,pushIn:0,pushBack:'x',flipPush:2})).toMatchObject({view:'canvas',speed:1.5,size:.7,background:'studio',equal:false,shapes:48,squareVariety:1,push:0,pushReach:3,pushIn:.05,pushBack:1.2,flipPush:1});
  expect(normalizeParadeOptions({})).toMatchObject({squareVariety:.45,push:1,pushReach:.9,pushIn:.18,pushBack:1.2,flipPush:.5,theme:'studio',syncEvery:20,syncFor:10});
  expect(normalizeParadeOptions({syncEvery:500,syncFor:1})).toMatchObject({syncEvery:120,syncFor:3});expect(normalizeParadeOptions({syncEvery:0}).syncEvery).toBe(0);
  for(const theme of ['HFCD','XMAS','TET'])expect(normalizeParadeOptions({theme}).theme).toBe(theme);expect(normalizeParadeOptions({theme:'Halloween'}).theme).toBe('studio');
  // The 3:1 wall and the unwrapped view of older settings open as the one canvas.
  for(const view of ['wall','unwrapped'])expect(normalizeParadeOptions({view}).view).toBe('canvas');expect(normalizeParadeOptions({view:'cylinder'}).view).toBe('cylinder');
  expect(ledRatio).toBeCloseTo(Math.PI*4.2/4.01,6);expect(ledRatio).toBeCloseTo(3.29,2);
 });



 it('animates the walk and run cycles, joints within limits, the lower foot always on the floor, eased in like any pose',()=>{
  const r=rng('cycles'),deg=(x:number)=>x*180/Math.PI;
  for(const cycle of ['walk','run','dance'] as const){
   const def=paradePoses.find(p=>p.cycle===cycle)!,p=holdPose(def,r),rig=createCharacter(generate(`cycle-${cycle}`));
   expect(def.kind).toBe(cycle==='dance'?'stand':'step');expect(paradePoses.filter(q=>q.cycle===cycle)).toHaveLength(1);
   const frames=[0,.13,.27,.4,.55,.7,.85].map(k=>paradeFrame(p,k*cyclePeriod[cycle]));
   // It moves: the thighs swing through the stride, the legs against each other.
   const thigh=frames.map(f=>f.angles.thigh_L),knee=frames.map(f=>f.angles.shin_L);
   if(cycle==='dance'){expect(Math.max(...knee)-Math.min(...knee)).toBeGreaterThan(.12);expect(Math.max(...thigh)-Math.min(...thigh)).toBeLessThan(.3);}
   else expect(Math.max(...thigh)-Math.min(...thigh)).toBeGreaterThan(cycle==='run'?1.1:.6);
   for(const f of frames){
    // The dance keeps its arms outward, each elbow folding on its own side; walk and run swing them across, elbows
    // bent forward, as walkers and runners do.
    for(const side of ['L','R']){const out=cycle==='dance'&&side==='R'?-1:1,arm=f.angles[`upperarm_${side}`],hand=arm+f.angles[`forearm_${side}`];expect(deg(f.angles[`shin_${side}`])).toBeLessThanOrEqual(1);expect(deg(f.angles[`shin_${side}`])).toBeGreaterThanOrEqual(-130);expect(out*deg(f.angles[`forearm_${side}`])).toBeGreaterThanOrEqual(-1);expect(out*deg(f.angles[`forearm_${side}`])).toBeLessThanOrEqual(160);
     if(cycle==='dance'){const away=side==='L'?1:-1;expect(away*.3*Math.sin(arm),`${side} elbow across`).toBeGreaterThanOrEqual(-.03);expect(away*(.3*Math.sin(arm)+.41*Math.sin(hand)),`${side} hand across`).toBeGreaterThanOrEqual(-.06);}}
    expect(f.lift).toBe(0);
    rig.applyAngles(f.angles);rig.group.updateMatrixWorld(true);const feet=['L','R'].map(s=>rig.map.get(`foot_${s}`)!.getWorldPosition(new Vector3()).y);expect(Math.min(...feet)).toBeLessThan(.3);
   }
   // Same cycle, same limbs a whole stride later (the breath under it runs on its own).
   const a=paradeFrame(p,.3),b=paradeFrame(p,.3+cyclePeriod[cycle]);for(const k of Object.keys(a.angles))if(k!=='spine_lower')expect(b.angles[k],k).toBeCloseTo(a.angles[k],6);
   // Into the cycle from a held pose, and out of it: the same start, end and overshoot as any change.
   const held=holdPose(paradePoses[0],r),t=.4;
   const into=changeFrame(held,p,1,t),out=changeFrame(p,held,0,t);for(const k of Object.keys(into.angles)){expect(into.angles[k]).toBeCloseTo(paradeFrame(p,t).angles[k],9);expect(out.angles[k]).toBeCloseTo(paradeFrame(p,t).angles[k],9);}
   rig.dispose();
  }
  expect(cycleAngles('walk',.25)).not.toEqual(cycleAngles('walk',.75));
  // The poses he turned down are gone.
  for(const name of ['Shoulder line','Run (knee drive)','March','Aerobics (other side)','Float dance (other side)','Hurdle','Hurdle (other side)'])expect(paradePoses.some(p=>p.name===name),name).toBe(false);
 });
 it('dances five more ways on the spot (disco, robot, twist, arm wave, Charleston): smooth, arms outward, on the floor',()=>{
  const fps=60,styles=['disco','robot','twist','armwave','charleston'] as const;const seen=new Set<string>();
  for(const cycle of styles){
   const def=paradePoses.find(p=>p.cycle===cycle)!,rig=createCharacter(generate(`dance-${cycle}`)),frames=Math.round(cyclePeriod[cycle]*fps),seq=Array.from({length:frames*2+1},(_,i)=>cycleAngles(cycle,i/frames));
   expect(def.kind).toBe('stand');expect(paradePoses.filter(p=>p.cycle===cycle)).toHaveLength(1);
   // It moves, and comes back round to where it began.
   for(const k of Object.keys(seq[0]))expect(seq[frames][k],`${cycle} ${k}`).toBeCloseTo(seq[0][k],9);
   expect(Object.keys(seq[0]).some(k=>Math.max(...seq.map(f=>f[k]))-Math.min(...seq.map(f=>f[k]))>.5),cycle).toBe(true);
   let jerk=0,where='';for(const k of Object.keys(seq[0]))for(let i=2;i<seq.length;i++){const d=Math.abs(seq[i][k]-2*seq[i-1][k]+seq[i-2][k]);if(d>jerk){jerk=d;where=`${cycle} ${k} ${i}`;}}
   expect(jerk,where).toBeLessThan(.12);
   for(const [i,f] of seq.entries()){
    for(const side of ['L','R']){const out=side==='L'?1:-1,arm=f[`upperarm_${side}`],hand=arm+f[`forearm_${side}`];
     expect(deg(f[`shin_${side}`]),`${cycle} ${side} knee`).toBeLessThanOrEqual(1);expect(deg(f[`shin_${side}`])).toBeGreaterThanOrEqual(-130);expect(out*deg(f[`forearm_${side}`]),`${cycle} ${side} elbow`).toBeGreaterThanOrEqual(-1);expect(out*deg(f[`forearm_${side}`])).toBeLessThanOrEqual(160);
     expect(out*.3*Math.sin(arm),`${cycle} ${side} elbow across`).toBeGreaterThanOrEqual(-.03);expect(out*(.3*Math.sin(arm)+.41*Math.sin(hand)),`${cycle} ${side} hand across`).toBeGreaterThanOrEqual(-.06);}
    expect(f.root??0).toBe(0);
    if(i%7===0){rig.applyAngles(f);rig.group.updateMatrixWorld(true);const feet=['L','R'].map(s=>rig.map.get(`foot_${s}`)!.getWorldPosition(new Vector3()).y);expect(Math.min(...feet),cycle).toBeLessThan(.3);}
   }
   seen.add(JSON.stringify(cycleAngles(cycle,.3)));rig.dispose();
  }
  expect(seen.size).toBe(styles.length);
  // Through paradeFrame: always on the floor.
  const r=rng('dances');for(const cycle of styles){const p=holdPose(paradePoses.find(q=>q.cycle===cycle)!,r);for(const t of [0,.4,1.3])expect(paradeFrame(p,t).lift).toBe(0);}
 });
 it('lets each body part follow a change in its own time, overshooting more the more it changes, and arrive exactly',()=>{
  const {takeoff}=changeTimeline,ks=Array.from({length:1001},(_,i)=>i/1000);
  const peak=(id:string,d:number)=>Math.max(...ks.map(k=>follow(id,d,k)))-1,start=(id:string,d:number)=>ks.find(k=>follow(id,d,k)>1e-4)!;
  for(const id of ['upperarm_L','forearm_R','shin_L','head','spine_lower'])for(const d of [.05,.4,1,2.5,-1.3]){
   // Still before the take-off, exactly the new pose at the end, and smooth all the way (no step, no corner).
   for(const k of [0,takeoff*.5,takeoff])expect(follow(id,d,k)).toBe(0);expect(follow(id,d,1)).toBe(1);
   const q=ks.map(k=>follow(id,d,k));let worst=0;for(let i=2;i<q.length;i++)worst=Math.max(worst,Math.abs(q[i]-2*q[i-1]+q[i-2]));expect(worst,`${id} ${d}`).toBeLessThan(.002);
   expect(Math.abs(q[999]-1),`${id} ${d} arrives still`).toBeLessThan(1e-4);
   // Overshoot: never more than about 17° for any change.
   expect(peak(id,d)*Math.abs(d),`${id} ${d}`).toBeLessThan(.31);expect(peak(id,d)).toBeGreaterThan(.01);
  }
  // A bigger change overshoots more (as a share of it), up to the cap.
  expect(peak('upperarm_L',1)).toBeGreaterThan(peak('upperarm_L',.3));expect(peak('upperarm_L',.3)).toBeGreaterThan(peak('upperarm_L',.05));
  // Overlapping action: the forearm moves later than the upper arm, the head after the torso, and a part later the more it moves.
  expect(start('forearm_L',1)).toBeGreaterThan(start('upperarm_L',1));expect(start('head',1)).toBeGreaterThan(start('spine_lower',1));expect(start('forearm_L',2)).toBeGreaterThan(start('forearm_L',.2));
  expect(followLag.forearm).toBeGreaterThan(followLag.upperarm);
  // In real changes, knees never overshoot past straight and elbows never fold inward past the pose's own (beyond the
  // old pose's own gentle sway, which carries on as it eases out).
  const r=rng('room');
  for(let n=0;n<300;n++){
   const from=holdPose(paradePoses[Math.floor(r()*paradePoses.length)],r),t0=restAt(from,r()*20),to=alignCycle(holdPose(paradePoses[Math.floor(r()*paradePoses.length)],r),t0+1.6);
   // The two poses' own range over the change (their own motion goes on, slowing and starting, while they blend).
   const own=Array.from({length:41},(_,i)=>t0-.4+i*.05).flatMap(t=>[paradeFrame(from,t),paradeFrame(to,t)]),range=(id:string)=>[Math.min(...own.map(f=>f.angles[id])),Math.max(...own.map(f=>f.angles[id]))];
   for(let i=0;i<=96;i++){const f=changeFrame(from,to,i/96,t0+i/60,.5,i/60).angles;for(const s of ['L','R'])expect(f[`shin_${s}`],`${from.name} → ${to.name}`).toBeLessThanOrEqual(Math.max(.021,range(`shin_${s}`)[1]+1e-9));expect(f.forearm_L,`${from.name} → ${to.name}`).toBeGreaterThanOrEqual(Math.min(-.051,range('forearm_L')[0]-1e-9));}
  }
 });
 it('moves together now and then: walking, jogging, one dance, cheering at their own rates, or waving, each a little offset',()=>{
  const r=rng('sync'),fps=60,frac=(x:number)=>x-Math.floor(x),offsetOf=(p:{phase:number})=>{const f=frac(p.phase/(Math.PI*2)+.5)-.5;return f;};
  expect(syncModes).toEqual(['walk','jog','dance','cheer','wave','exercise']);
  for(const mode of syncModes){
   const cast=Array.from({length:24},()=>syncPose(mode,r,{dance:'twist',exercise:'squat',side:'R'}));
   // On the floor, all the same movement (one cycle or one standing pose), never the same as each other to the frame.
   for(const p of cast){expect(airborne(p.kind),mode).toBe(false);expect(bounces(p.cycle)).toBe(false);}
   expect(new Set(cast.map(p=>p.name)).size,mode).toBe(1);
   if(mode==='walk')expect(cast[0].cycle).toBe('walk');if(mode==='jog')expect(cast[0].cycle).toBe('jog');if(mode==='dance')expect(cast[0].cycle).toBe('twist');if(mode==='exercise')expect(cast[0].cycle).toBe('squat');
   if(mode!=='cheer'){const offsets=cast.map(offsetOf);for(const o of offsets)expect(Math.abs(o),mode).toBeLessThanOrEqual(syncSpread+1e-9);expect(Math.max(...offsets)-Math.min(...offsets),mode).toBeGreaterThan(syncSpread*.6);}
   if(mode==='cheer'){const rates=cast.map(periodOf);for(const k of rates){expect(k).toBeGreaterThanOrEqual(cheerRates[0]);expect(k).toBeLessThanOrEqual(cheerRates[1]);}expect(Math.max(...rates)-Math.min(...rates)).toBeGreaterThan(.12);}
   if(mode==='wave')for(const p of cast){expect(p.wave).toBe('R');expect(deg(paradeFrame(p,1).angles.upperarm_R)).toBeLessThan(-110);expect(Math.abs(deg(paradeFrame(p,1).angles.upperarm_L))).toBeLessThan(20);}
   // Moving in from any pose and holding it, frame by frame: smooth.
   let jerk=0,where='';
   for(let n=0;n<60;n++){
    const from=holdPose(paradePoses[Math.floor(r()*paradePoses.length)],r),t0=restAt(from,r()*20),to=cast[n%cast.length],frames=Math.round(1.6*fps);
    const seq=[paradeFrame(from,t0-2/fps),paradeFrame(from,t0-1/fps),...Array.from({length:frames+1},(_,i)=>changeFrame(from,to,i/frames,t0+i/fps,.5,i/fps)),...Array.from({length:Math.round(periodOf(to.cycle?to:{...to,cycle:'walk'})*fps)},(_,i)=>paradeFrame(to,t0+(frames+1+i)/fps))];
    for(const k of new Set(seq.flatMap(f=>Object.keys(f.angles))))for(let i=2;i<seq.length;i++){const at=(j:number)=>seq[j].angles[k]??0,d=Math.abs(at(i)-2*at(i-1)+at(i-2));if(d>jerk){jerk=d;where=`${from.name} → ${mode} ${k} ${i}`;}}
   }
   expect(jerk,where).toBeLessThan(.12);
  }
  // Gliding in (no hop): from anything into every moment together, smooth frame by frame, never rising above either
  // pose's own height, and on the floor the whole way when both are on the floor.
  let glideJerk=0,glideWhere='';
  for(const mode of syncModes)for(let n=0;n<80;n++){
   const from=holdPose(paradePoses[Math.floor(r()*paradePoses.length)],r),t0=restAt(from,r()*20),to=syncPose(mode,r,{dance:syncDances[n%syncDances.length],exercise:exercises[n%exercises.length],side:n%2?'L':'R'}),frames=Math.round(2*fps);
   const seq=[paradeFrame(from,t0-2/fps),paradeFrame(from,t0-1/fps),...Array.from({length:frames+1},(_,i)=>changeFrame(from,to,i/frames,t0+i/fps,.5,i/fps,true)),...Array.from({length:30},(_,i)=>paradeFrame(to,t0+(frames+1+i)/fps))];
   for(const k of new Set(seq.flatMap(f=>Object.keys(f.angles))))for(let i=2;i<seq.length;i++){const at=(j:number)=>seq[j].angles[k]??0,d=Math.abs(at(i)-2*at(i-1)+at(i-2));if(d>glideJerk){glideJerk=d;glideWhere=`${from.name} → ${mode} ${k} ${i}`;}}
   const own=Array.from({length:300},(_,i)=>t0-.5+i*.01).flatMap(t=>[paradeFrame(from,t).lift,paradeFrame(to,t).lift]),top=Math.max(...own);
   for(const f of seq){expect(f.lift,`${from.name} → ${mode}`).toBeLessThanOrEqual(top+1e-3);if(!airborne(from.kind)&&!bounces(from.cycle))expect(f.lift,`${from.name} → ${mode}`).toBe(0);}
  }
  expect(glideJerk,glideWhere).toBeLessThan(.12);
  // Falling from the air onto the floor, into a moment together or into any pose: by gravity and fast (from still,
  // faster and faster: a quarter of the way down at half the time, on the floor by fallTimeline.seconds), then heavy
  // in the legs (the knees crouch deep, then stand up slowly), the upper body carrying on, the impact a single thud.
  for(const name of ['Float','Hover','Tuck jump','Air run','Float sit'])for(const [to,glide] of [[syncPose('cheer',r),true],[holdPose(paradePoses.find(p=>p.name==='Áo dài')!,r),false],[holdPose(paradePoses.find(p=>p.name==='Walk cycle')!,r),false]] as const){
   const from=holdPose(paradePoses.find(p=>p.name===name)!,r),t0=40,frames=96,fall=(i:number)=>changeFrame(from,to,i/frames,t0+i/fps,.5,i/fps,glide,1.6);
   const top=fall(0).lift,landAt=Math.round(fallTimeline.seconds*fps);expect(top).toBeGreaterThan(.4);
   expect(top-fall(Math.round(landAt/2)).lift,name).toBeLessThan(top*.35);expect(fall(landAt).lift).toBe(0);for(let i=landAt;i<=frames;i++)expect(fall(i).lift).toBe(0);
   for(let i=1;i<landAt;i++)expect(fall(i).lift,`${name} ${i}`).toBeLessThanOrEqual(fall(i-1).lift+.004);
   const settled=paradeFrame(to,t0+frames/fps),deepest=Math.min(...Array.from({length:frames-landAt},(_,i)=>fall(landAt+i).angles.shin_L));expect(deepest,name).toBeLessThan(settled.angles.shin_L-.5);
   // Smooth through it all; at touchdown only the height stops at once (feet on the floor).
   let jerk=0,where='';const seq=Array.from({length:frames+1},(_,i)=>fall(i));
   for(const k of new Set(seq.flatMap(f=>Object.keys(f.angles))))for(let i=2;i<seq.length;i++){const at=(j:number)=>seq[j].angles[k]??0,d=Math.abs(at(i)-2*at(i-1)+at(i-2));if(d>jerk){jerk=d;where=`${name} ${k} ${i}`;}}
   expect(jerk,where).toBeLessThan(.12);
   for(const k of Object.keys(settled.angles))expect(fall(frames).angles[k]??0,`${name} ${k}`).toBeCloseTo(settled.angles[k],9);
  }
  // Walking into walking together: the stride stays whole as it slides into step (no two strides blended into a shuffle).
  const walk=paradePoses.find(p=>p.cycle==='walk')!,gap=(f:{angles:Record<string,number>})=>Math.abs(f.angles.thigh_L-f.angles.thigh_R),full=Math.max(...Array.from({length:60},(_,i)=>gap({angles:cycleAngles('walk',i/60)})));
  const w0={...holdPose(walk,r),phase:0},w1={...syncPose('walk',r),phase:Math.PI};
  const mid=Array.from({length:40},(_,i)=>changeFrame(w0,w1,.4+i*.005,3+i*cyclePeriod.walk/40,.5,1,true));expect(Math.max(...mid.map(gap))).toBeGreaterThan(full*.8);
  for(const k of [0,1])for(const key of Object.keys(paradeFrame(k?w1:w0,3).angles))expect(changeFrame(w0,w1,k,3,.5,0,true).angles[key]).toBeCloseTo(paradeFrame(k?w1:w0,3).angles[key],9);
  // A dance together is the dance asked for; each time the Parade asks for another.
  for(const dance of syncDances)expect(syncPose('dance',r,{dance}).cycle).toBe(dance);
  for(const exercise of exercises)expect(syncPose('exercise',r,{exercise}).cycle).toBe(exercise);
 });
 it('jogs like a marathon and cheers: smooth rounds on the floor, the cheer arms up and outward',()=>{
  for(const cycle of ['jog','cheer'] as const){
   const rig=createCharacter(generate(`sync-${cycle}`)),frames=60,seq=Array.from({length:frames*2+1},(_,i)=>cycleAngles(cycle,i/frames));
   for(const k of Object.keys(seq[0]))expect(seq[frames][k],`${cycle} ${k}`).toBeCloseTo(seq[0][k],9);
   let jerk=0;for(const k of Object.keys(seq[0]))for(let i=2;i<seq.length;i++)jerk=Math.max(jerk,Math.abs(seq[i][k]-2*seq[i-1][k]+seq[i-2][k]));expect(jerk,cycle).toBeLessThan(.12);
   for(const [i,f] of seq.entries()){
    for(const side of ['L','R']){expect(deg(f[`shin_${side}`]),`${cycle} knee`).toBeLessThanOrEqual(1);expect(deg(f[`shin_${side}`])).toBeGreaterThanOrEqual(-130);}
    if(cycle==='cheer')for(const side of ['L','R']){const out=side==='L'?1:-1,arm=f[`upperarm_${side}`],hand=arm+f[`forearm_${side}`];expect(out*deg(arm)).toBeGreaterThan(110);expect(out*(.3*Math.sin(arm)+.41*Math.sin(hand))).toBeGreaterThanOrEqual(-.06);expect(out*deg(f[`forearm_${side}`])).toBeGreaterThanOrEqual(0);}
    if(i%6===0){rig.applyAngles(f);rig.group.updateMatrixWorld(true);const feet=['L','R'].map(s=>rig.map.get(`foot_${s}`)!.getWorldPosition(new Vector3()).y);expect(Math.min(...feet),cycle).toBeLessThan(.3);}
   }
   rig.dispose();
  }
  // A jog is between a walk and a run.
  const swing=(c:'walk'|'jog'|'run')=>{const t=Array.from({length:40},(_,i)=>cycleAngles(c,i/40).thigh_L);return Math.max(...t)-Math.min(...t);};
  expect(swing('jog')).toBeGreaterThan(swing('walk'));expect(swing('jog')).toBeLessThan(swing('run'));
  // Neither is in the library: they come only when the cast moves together.
  expect(paradePoses.some(p=>p.cycle==='jog'||p.cycle==='cheer')).toBe(false);
 });
 it('exercises six ways in the morning (arm raise, side stretch, squat, toe touch, star jacks, knee lift): smooth, on the floor, arms outward',()=>{
  const fps=60;const seen=new Set<string>();
  expect(exercises).toHaveLength(6);
  for(const cycle of exercises){
   const rig=createCharacter(generate(`exercise-${cycle}`)),frames=Math.round(cyclePeriod[cycle]*fps),seq=Array.from({length:frames*2+1},(_,i)=>cycleAngles(cycle,i/frames));
   // It moves, and comes back round to where it began.
   for(const k of Object.keys(seq[0]))expect(seq[frames][k],`${cycle} ${k}`).toBeCloseTo(seq[0][k],9);
   expect(Object.keys(seq[0]).some(k=>Math.max(...seq.map(f=>f[k]))-Math.min(...seq.map(f=>f[k]))>.8),cycle).toBe(true);
   let jerk=0,where='';for(const k of Object.keys(seq[0]))for(let i=2;i<seq.length;i++){const d=Math.abs(seq[i][k]-2*seq[i-1][k]+seq[i-2][k]);if(d>jerk){jerk=d;where=`${cycle} ${k} ${i}`;}}
   expect(jerk,where).toBeLessThan(.12);
   for(const [i,f] of seq.entries()){
    for(const side of ['L','R']){const out=side==='L'?1:-1,arm=f[`upperarm_${side}`],hand=arm+f[`forearm_${side}`];
     expect(deg(f[`shin_${side}`]),`${cycle} ${side} knee`).toBeLessThanOrEqual(1);expect(deg(f[`shin_${side}`])).toBeGreaterThanOrEqual(-130);expect(out*deg(f[`forearm_${side}`]),`${cycle} ${side} elbow`).toBeGreaterThanOrEqual(-1);expect(out*deg(f[`forearm_${side}`])).toBeLessThanOrEqual(160);
     expect(out*.3*Math.sin(arm),`${cycle} ${side} elbow across`).toBeGreaterThanOrEqual(-.03);expect(out*(.3*Math.sin(arm)+.41*Math.sin(hand)),`${cycle} ${side} hand across`).toBeGreaterThanOrEqual(-.06);}
    expect(f.root??0).toBe(0);
    if(i%9===0){rig.applyAngles(f);rig.group.updateMatrixWorld(true);const feet=['L','R'].map(s=>rig.map.get(`foot_${s}`)!.getWorldPosition(new Vector3()).y);expect(Math.min(...feet),cycle).toBeLessThan(.3);}
   }
   seen.add(JSON.stringify(cycleAngles(cycle,.3)));rig.dispose();
  }
  expect(seen.size).toBe(exercises.length);
  // Only when exercising together: none is in the library.
  expect(paradePoses.some(p=>exercises.includes(p.cycle as never))).toBe(false);
 });
 it('hops on the spot and flips (back and front): smooth, on the floor at rest, a full turn, landing on its feet',()=>{
  const fps=60,wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
  for(const cycle of ['hop','backflip','frontflip'] as const){
   const def=paradePoses.find(p=>p.cycle===cycle)!,period=cyclePeriod[cycle],frames=Math.round(period*fps),seq=Array.from({length:frames*2+1},(_,i)=>bounceFrame(cycle,i/frames));
   expect(paradePoses.filter(p=>p.cycle===cycle)).toHaveLength(1);expect(bounces(cycle)).toBe(true);expect(def.kind).toBe(cycle==='hop'?'stand':'jump');
   // At rest at the start of each cycle: on the floor, upright, not moving (the frames either side of it alike; a hop
   // is at the bottom of its bounce there, turning round).
   const rest=bounceFrame(cycle,0);expect(rest.lift).toBe(0);expect(rest.angles.root??0).toBe(0);expect(rest.pivot??0).toBe(0);
   for(const k of Object.keys(rest.angles)){const a=bounceFrame(cycle,1/frames).angles[k],b=bounceFrame(cycle,-1/frames).angles[k];expect(bounceFrame(cycle,1).angles[k],k).toBeCloseTo(rest.angles[k],9);expect(Math.abs(a-b)/2,k).toBeLessThan(.003);expect(Math.abs(a-rest.angles[k]),k).toBeLessThan(cycle==='hop'?.03:.003);}
   // It leaves the floor and comes back down; never below it.
   const lifts=seq.map(f=>f.lift);expect(Math.min(...lifts)).toBeGreaterThanOrEqual(0);expect(Math.max(...lifts)).toBeGreaterThan(cycle==='hop'?.25:1.1);
   // Smooth, frame by frame (the turn compared on the circle, a full turn being none).
   let jerk=0,where='';for(const k of Object.keys(seq[0].angles))for(let i=2;i<seq.length;i++){const d1=wrap(seq[i].angles[k]-seq[i-1].angles[k]),d0=wrap(seq[i-1].angles[k]-seq[i-2].angles[k]);if(Math.abs(d1-d0)>jerk){jerk=Math.abs(d1-d0);where=`${cycle} ${k} ${i}`;}}
   expect(jerk,where).toBeLessThan(.12);
   let lj=0;for(let i=2;i<seq.length;i++)lj=Math.max(lj,Math.abs(seq[i].lift-2*seq[i-1].lift+seq[i-2].lift));expect(lj,cycle).toBeLessThan(.045);
   // Knees and elbows within their limits; the arms on their own sides.
   for(const f of seq)for(const side of ['L','R']){expect(deg(f.angles[`shin_${side}`])).toBeLessThanOrEqual(1);expect(deg(f.angles[`shin_${side}`])).toBeGreaterThanOrEqual(-131);const out=side==='L'?1:-1;expect(out*deg(f.angles[`forearm_${side}`])).toBeGreaterThanOrEqual(-1);expect(out*deg(f.angles[`forearm_${side}`])).toBeLessThanOrEqual(160);}
   if(cycle==='hop'){for(const f of seq)expect(f.angles.root??0).toBe(0);continue;}
   // A flip: one whole turn while in the air, backward (counter-clockwise) for a back flip, forward for a front flip;
   // a deliberate crouch before it (lấy đà), held a moment; upright for the landing, the knees taking it.
   const {sink,hold,push,leave,land}=flipTimeline,turns=seq.slice(0,frames+1).map(f=>f.angles.root??0),sign=cycle==='backflip'?1:-1;
   expect(Math.max(...turns.map(x=>sign*x))).toBeGreaterThan(Math.PI*1.9);for(const x of turns)expect(sign*x).toBeGreaterThanOrEqual(0);
   for(let i=0;i<=frames;i++){const u=i/frames;if(u<leave-.01||u>land)expect(turns[i],`${cycle} ${u}`).toBe(0);if(u<leave-.005||u>land+.001)expect(seq[i].lift,`${cycle} ${u}`).toBe(0);}
   const crouched=bounceFrame(cycle,(hold+push)/2);expect(crouched.angles.shin_L).toBeLessThan(rest.angles.shin_L-1);expect(crouched.lift).toBe(0);expect((push-sink)*cyclePeriod[cycle]).toBeGreaterThan(.6);
   expect(bounceFrame(cycle,land+.06).angles.shin_L).toBeLessThan(rest.angles.shin_L-.5);
   // On real characters, standing at rest and through the turn.
   const rig=createCharacter(generate(`flip-${cycle}`));for(const u of [0,.3,.55,.65,.75,.9]){rig.applyAngles(bounceFrame(cycle,u).angles);rig.group.updateMatrixWorld(true);for(const v of Object.values(bounceFrame(cycle,u).angles))expect(Number.isFinite(v)).toBe(true);}rig.dispose();
  }
 });
 it('morphs into and out of a hop or a flip at its rest moment, like any pose',()=>{
  const r=rng('bounce-change'),held=holdPose(paradePoses.find(p=>p.name==='Áo dài')!,r),change=1.6;
  for(const cycle of ['hop','backflip','frontflip'] as const){
   const def=paradePoses.find(p=>p.cycle===cycle)!,p=holdPose(def,r);
   // The rest moments: whole cycles; the first from any time on, and a pose timed to rest at a given time.
   const at=restAt(p,3.3);expect(at).toBeGreaterThanOrEqual(3.3-1e-9);expect(at-3.3).toBeLessThan(cyclePeriod[cycle]);expect(restAt(p,at)).toBeCloseTo(at,9);
   expect(cyclePhase(p,at)-Math.round(cyclePhase(p,at))).toBeCloseTo(0,6);const q=alignCycle(p,7.25);expect(cyclePhase(q,7.25)-Math.round(cyclePhase(q,7.25))).toBeCloseTo(0,6);
   for(const k of Object.keys(restFrame(p).angles))expect(paradeFrame(p,at).angles[k],k).toBeCloseTo(restFrame(p).angles[k],6);
   // Into it: ends as its rest frame, and the cycle carries on from there; out of it: starts as its rest frame.
   const into=alignCycle(p,1+change),end=changeFrame(held,into,1,1+change,.5,change),next=paradeFrame(into,1+change);
   for(const k of Object.keys(next.angles))expect(end.angles[k],k).toBeCloseTo(next.angles[k],6);expect(end.lift).toBeCloseTo(next.lift,6);
   const t0=restAt(p,5),out=changeFrame(p,held,0,t0,.5,0),before=paradeFrame(p,t0);for(const k of Object.keys(before.angles))expect(out.angles[k],k).toBeCloseTo(before.angles[k],6);
   // Landing in one counts as landing on the floor: the knees take it.
   expect(changeFrame(held,into,.86,1+change*.86).angles.shin_L).toBeLessThan(restFrame(into).angles.shin_L-.1);
  }
 });
 it('waves now and then: a quarter of the held poses raise one arm, either, on its own side, and wave the hand',()=>{
  const r=rng('wave');let waving=0,left=0;const n=4000;
  for(let i=0;i<n;i++){
   const def=paradePoses[i%paradePoses.length],p=holdPose(def,r);
   if(def.cycle){expect(p.wave).toBeUndefined();continue;}
   if(!p.wave)continue;waving++;if(p.wave==='L')left++;
   const side=p.wave,out=side==='L'?1:-1,frames=[0,1,2,3,4,5,6,7].map(t=>paradeFrame(p,t/8*wavePeriod+1)),hands=frames.map(f=>f.angles[`forearm_${side}`]);
   // Raised up and out on its own side, the forearm up, the hand swinging.
   for(const f of frames){const u=f.angles[`upperarm_${side}`],h=u+f.angles[`forearm_${side}`];expect(out*deg(u)).toBeGreaterThan(115);expect(out*deg(u)).toBeLessThan(165);expect(out*(.3*Math.sin(u)+.41*Math.sin(h))).toBeGreaterThanOrEqual(-.06);expect(out*deg(f.angles[`forearm_${side}`])).toBeGreaterThanOrEqual(0);expect(out*deg(f.angles[`forearm_${side}`])).toBeLessThanOrEqual(160);}
   expect(Math.max(...hands)-Math.min(...hands)).toBeGreaterThan(.4);
   // The other arm keeps its pose.
   const other=side==='L'?'R':'L',plain=poseAngles(def);expect(Math.abs(p.angles[`upperarm_${other}`]-plain[`upperarm_${other}`])).toBeLessThan(.05);
  }
  const held=Array.from({length:n},(_,i)=>paradePoses[i%paradePoses.length]).filter(d=>!d.cycle).length;
  expect(waving/held).toBeCloseTo(waveChance,1);expect(left/waving).toBeCloseTo(.5,1);
 });
 it('makes the hip joints, above the thighs, never round',()=>{
  for(let i=0;i<200;i++){const spec=generate(`hips-${i}`),shape=hipShapeOf(spec),shoulder=jointShapeOf(spec.parts.shoulder_L.variant);expect([1,2,3]).toContain(shape);if(shoulder!==0&&shoulder!==4)expect(shape).toBe(shoulder);expect(partName(spec,bones.find(b=>b.id==='hip_L')!)).toBe(jointShapes[shape]);expect(hipShapeOf(spec)).toBe(shape);}
 });
 it('pushes the others and the squares round a power jump away a little, and lets them back, as the Push sliders say',()=>{
  const o={push:1,pushReach:.9,pushIn:.18,pushBack:1.2},n=16,gap=.4,tall=2,jump={slot:5,at:10,power:1};
  // The push's course: nothing before the jump, eased out to its fullest at Push out, eased back to nothing by Push back.
  expect(pushed(-.1,.18,1.2)).toBe(0);expect(pushed(0,.18,1.2)).toBe(0);expect(pushed(.18,.18,1.2)).toBeCloseTo(1,9);expect(pushed(.09,.18,1.2)).toBeCloseTo(.5,9);expect(pushed(.18+1.2,.18,1.2)).toBeCloseTo(0,9);
  let prev=0,fell=false;for(let k=0;k<=138;k++){const v=pushed(k/100,.18,1.2);if(k<=18)expect(v).toBeGreaterThanOrEqual(prev-1e-12);else{if(v<prev)fell=true;expect(v).toBeLessThanOrEqual(prev+1e-12);}prev=v;}expect(fell).toBe(true);
  expect(pushing(jump,11.3,o)).toBe(true);expect(pushing(jump,11.39,o)).toBe(false);
  // At its fullest: the jumper stays put, its neighbours slide away on their own sides, the nearest most, far ones hardly.
  const at=(i:number,t=10.18,s=o)=>shoveOf([jump],i,n,gap,tall,t,s);
  expect(at(5)).toBe(0);expect(at(6)).toBeGreaterThan(0);expect(at(4)).toBeLessThan(0);expect(at(6)).toBeCloseTo(-at(4),9);
  expect(at(6)).toBeGreaterThan(at(7));expect(at(7)).toBeGreaterThan(at(8));expect(Math.abs(at(13))).toBeLessThan(.1*at(6));
  // Just a bit: the nearest moves at most a tenth of a figure's height at full strength.
  expect(at(6)).toBeLessThanOrEqual(field.shove*tall+1e-9);expect(at(6)).toBeGreaterThan(.05*tall);
  // Round the loop the shorter way: slot 0's neighbour across the seam is pushed back over it.
  expect(shoveOf([{slot:0,at:10,power:1}],15,n,gap,tall,10.18,o)).toBeLessThan(0);expect(shoveOf([{slot:0,at:10,power:1}],1,n,gap,tall,10.18,o)).toBeGreaterThan(0);
  // The sliders: twice the push, twice as far; a longer reach, felt further; and back in place afterwards.
  expect(at(6,10.18,{...o,push:2})).toBeCloseTo(2*at(6),9);expect(Math.abs(at(9,10.18,{...o,pushReach:2}))).toBeGreaterThan(Math.abs(at(9)));
  expect(at(6,10.05)).toBeLessThan(at(6));expect(at(6,10.9)).toBeLessThan(at(6));expect(at(6,11.38+1e-9)).toBeCloseTo(0,9);expect(at(6,9.9)).toBe(0);expect(at(6,10.18,{...o,push:0})).toBe(0);
  // A flip's push is weaker by its power.
  expect(shoveOf([{...jump,power:.5}],6,n,gap,tall,10.18,o)).toBeCloseTo(at(6)/2,9);
  // Squares: straight away from the jump's middle, the nearer more; none when nothing pushes; across the seam too.
  const drift=driftOf([{x:0,power:1,at:10}],13,1,tall,10.18,o)!;
  const [rx,ry]=drift(.5,1),[lx]=drift(-.5,1),[ux,uy]=drift(0,1.6),[fx]=drift(3,1),[nx]=drift(.3,1);
  expect(rx).toBeGreaterThan(0);expect(ry).toBeCloseTo(0,9);expect(lx).toBeCloseTo(-rx,9);expect(ux).toBeCloseTo(0,9);expect(uy).toBeGreaterThan(0);expect(nx).toBeGreaterThan(fx);expect(Math.abs(fx)).toBeLessThan(rx);
  expect(driftOf([{x:6.4,power:1,at:10}],13,1,tall,10.18,o)!(-6.4,1)[0]).toBeGreaterThan(0);
  expect(driftOf([{x:0,power:1,at:10}],13,1,tall,12,o)).toBeUndefined();expect(driftOf([],13,1,tall,10,o)).toBeUndefined();
 });
 it('labels each character with its ID, and fades a label out and in sliding up as one leaves and the next comes',()=>{
  expect(idText(1)).toBe('0001');expect(idText(11)).toBe('0011');expect(idText(100)).toBe('0100');
  // Going: from shown to gone, rising; coming: from below to its place, appearing; both eased (still at both ends).
  const out=(s:number)=>labelState('out',s),inn=(s:number)=>labelState('in',s);
  expect(out(0)).toEqual({opacity:1,lift:0});expect(out(labelMotion.out).opacity).toBe(0);expect(out(labelMotion.out).lift).toBeCloseTo(labelMotion.slide,9);
  expect(inn(0).opacity).toBe(0);expect(inn(0).lift).toBeCloseTo(-labelMotion.slide,9);expect(inn(labelMotion.in)).toEqual({opacity:1,lift:-0});
  for(const kind of ['in','out'] as const){const d=kind==='in'?labelMotion.in:labelMotion.out,q=Array.from({length:61},(_,i)=>labelState(kind,i/60*d));for(let i=1;i<q.length;i++){expect(q[i].lift).toBeGreaterThanOrEqual(q[i-1].lift-1e-12);}expect(Math.abs(q[1].lift-q[0].lift)).toBeLessThan(.01);expect(Math.abs(q[60].lift-q[59].lift)).toBeLessThan(.01);}
  expect(out(-1)).toEqual({opacity:1,lift:0});
  // Blue on HFCD; on XMAS and TET a colour of the theme, standing out on each background.
  expect(idColours.HFCD.white.toLowerCase()).toBe('#0564f8');for(const t of ['XMAS','TET'] as const)expect(idColours[t].black).not.toBe(idColours[t].white);
  expect(normalizeParadeOptions({}).ids).toBe(true);expect(normalizeParadeOptions({ids:false}).ids).toBe(false);
 });
 it('moves a few patterned squares behind the cast at its own speed, in straight lanes, never overlapping',()=>{
  const r=rng('shapes'),w=13,h=4,top=3.68,shapes=createShapes(20,['#ff0000','#00ff00','#0000ff'],'HFCD',r,1,w/h);
  expect(shapes.count).toBe(20);expect(shapes.group.renderOrder).toBeLessThan(0);
  const at=(drift:number)=>{shapes.update(drift,w,h,top);return shapes.group.children.map(m=>({x:m.position.x,y:m.position.y,s:m.scale.x,g:(m as import('three').Mesh).geometry}));};
  const a=at(0),b=at(2);
  for(let i=0;i<a.length;i++){
   // Squares only, 4–9% of the height across, at the cast's speed in a straight line.
   expect(a[i].g).toBe(a[0].g);expect(2*a[i].s).toBeGreaterThanOrEqual(.04*h-1e-9);expect(2*a[i].s).toBeLessThanOrEqual(.09*h+1e-9);
   expect(b[i].y).toBe(a[i].y);expect(((b[i].x-a[i].x)%w+w)%w).toBeCloseTo(2,9);
   expect(a[i].y-a[i].s).toBeGreaterThanOrEqual(0);expect(a[i].y+a[i].s).toBeLessThanOrEqual(top+1e-9);
  }
  for(const frame of [a,b,at(7.3)])for(let i=0;i<frame.length;i++)for(let j=i+1;j<frame.length;j++){
   const dx=Math.abs(frame[i].x-frame[j].x),dy=Math.abs(frame[i].y-frame[j].y),gap=frame[i].s+frame[j].s;
   expect(Math.min(dx,w-dx)>=gap||dy>=gap,`${i} ${j}`).toBe(true);
  }
  // At double size, as many as fit (still never overlapping) and as large.
  const big=createShapes(48,['#f00','#0f0'],'HFCD',r,2,w/h);big.update(1.7,w,h,top);const sq=big.group.children.map(m=>({x:m.position.x,y:m.position.y,s:m.scale.x}));
  expect(sq.length).toBeGreaterThan(8);expect(sq.length).toBeLessThanOrEqual(48);
  for(let i=0;i<sq.length;i++){expect(2*sq[i].s).toBeGreaterThanOrEqual(.08*h-1e-9);for(let j=i+1;j<sq.length;j++){const dx=Math.abs(sq[i].x-sq[j].x),dy=Math.abs(sq[i].y-sq[j].y),gap=sq[i].s+sq[j].s;expect(Math.min(dx,w-dx)>=gap||dy>=gap,`big ${i} ${j}`).toBe(true);}}
  big.dispose();
  expect(createShapes(0,['#000'],'HFCD',r).count).toBe(0);shapes.dispose();
  // Size randomness: none, all one size; all the way, much more spread; still never overlapping.
  const sizes=(variety:number)=>{const s=createShapes(24,['#f00','#0f0'],'HFCD',rng(`v${variety}`),1,w/h,variety);s.update(.4,w,h,top);const out=s.group.children.map(m=>({x:m.position.x,y:m.position.y,s:m.scale.x}));s.dispose();return out;};
  const same=sizes(0).map(q=>q.s);expect(Math.max(...same)-Math.min(...same)).toBeLessThan(1e-9);
  const wide=sizes(1);expect(Math.max(...wide.map(q=>q.s))/Math.min(...wide.map(q=>q.s))).toBeGreaterThan(3);
  for(let i=0;i<wide.length;i++)for(let j=i+1;j<wide.length;j++){const dx=Math.abs(wide[i].x-wide[j].x),dy=Math.abs(wide[i].y-wide[j].y),gap=wide[i].s+wide[j].s;expect(Math.min(dx,w-dx)>=gap||dy>=gap,`wide ${i} ${j}`).toBe(true);}
  // A push moves each square from its place by what it says.
  const pushed=createShapes(6,['#f00'],'HFCD',rng('push'),1,w/h);pushed.update(0,w,h,top);const home=pushed.group.children.map(m=>m.position.clone());pushed.update(0,w,h,top,(x,y)=>[.1*Math.sign(x),.05]);
  pushed.group.children.forEach((m,i)=>{expect(m.position.x-home[i].x).toBeCloseTo(.1*Math.sign(home[i].x),9);expect(m.position.y-home[i].y).toBeCloseTo(.05,9);});pushed.dispose();
 });

 it('moves smoothly through every pose change and into the held pose: no joint or height ever jumps between frames',()=>{
  // A jump is a sudden change of speed (a joint still one frame and far away the next), not fast motion: a run's legs
  // move quickly but smoothly. So each frame's step is compared with the step before it.
  const r=rng('smooth'),fps=60,change=1.6,frames=Math.round(change*fps);let jerk=0,step=0,lift=0,where='';
  for(let n=0;n<300;n++){
   // As in the Parade: a hop or a flip changes from its rest moment, and one coming in is timed to be at its own as the change ends.
   const from=holdPose(paradePoses[Math.floor(r()*paradePoses.length)],r),t0=restAt(from,r()*20),to=alignCycle(holdPose(paradePoses[Math.floor(r()*paradePoses.length)],r),t0+change);
   // Held, then the change frame by frame, then held again in the new pose.
   const seq=[paradeFrame(from,t0-2/fps),paradeFrame(from,t0-1/fps),...Array.from({length:frames+1},(_,i)=>changeFrame(from,to,i/frames,t0+i/fps,.5,i/fps)),...[1,2,3].map(i=>paradeFrame(to,t0+(frames+i)/fps))];
   // (A joint left out is straight: a flip's turn is only there while it is in it.)
   for(const k of new Set(seq.flatMap(f=>Object.keys(f.angles))))for(let i=2;i<seq.length;i++){
    const at=(j:number)=>seq[j].angles[k]??0,d1=at(i)-at(i-1),d0=at(i-1)-at(i-2);
    if(Math.abs(d1-d0)>jerk){jerk=Math.abs(d1-d0);where=`${from.name} → ${to.name}, ${k}, frame ${i}`;}step=Math.max(step,Math.abs(d1));
   }
   // (A fall from the air onto the floor lands with a thud: its touchdown is checked in the fall's own test.)
   if(!(airborne(from.kind)&&!bounces(from.cycle)&&(!airborne(to.kind)||bounces(to.cycle))))for(let i=2;i<seq.length;i++)lift=Math.max(lift,Math.abs((seq[i].lift-seq[i-1].lift)-(seq[i-1].lift-seq[i-2].lift)));
  }
  // The height may change speed at once only at take-off and landing (the push off the floor, the touch down: a
  // jump's own impulse, about 4 cm a frame), never in the air.
  expect(jerk,where).toBeLessThan(.12);expect(step).toBeLessThan(.45);expect(lift).toBeLessThan(.045);
 });
 it('swaps with power: a deep squashed crouch, a pencil shot off the top, the next shot up from below landing on its feet',()=>{
  const r=rng('swap'),grounded=paradePoses.filter(p=>!airborne(p.kind)&&!p.cycle),fps=60,deg=(x:number)=>x*180/Math.PI;
  let jerk=0,snapStep=0,where='';
  for(let n=0;n<120;n++){
   const stand=holdPose(grounded[Math.floor(r()*grounded.length)],r),land=holdPose(grounded[Math.floor(r()*grounded.length)],r),t0=r()*10,rise=8,depth=4;
   const {crouchEnd,snap,launch,entryLand}=swapTimeline,ex=(k:number,i=0)=>exitFrame(stand,k,t0+i/fps,rise,i/fps),held=paradeFrame(stand,t0);
   // Leaving: starts as the pose it held, at its own shape.
   for(const k of Object.keys(held.angles))expect(ex(0).angles[k]).toBeCloseTo(held.angles[k],9);expect(ex(0).stretch).toEqual([1,1]);
   // Lấy đà: a deep crouch, the body squashed, still on the floor.
   const low=ex(crouchEnd*.98);expect(low.angles.shin_L).toBeLessThan(Math.max(held.angles.shin_L-.9,-2.2));expect(low.stretch[1]).toBeLessThan(.92);expect(low.stretch[0]).toBeGreaterThan(1.04);expect(low.lift).toBe(0);
   // The shot: a pencil (legs together and straight, arms straight down at the sides), stretched tall, faster and faster.
   const shot=ex(crouchEnd+snap+.05);expect(Math.abs(deg(shot.angles.upperarm_L)-7)).toBeLessThan(3);expect(Math.abs(deg(shot.angles.upperarm_R)+7)).toBeLessThan(3);expect(Math.abs(deg(shot.angles.shin_L))).toBeLessThan(2);expect(Math.abs(deg(shot.angles.thigh_L)-3)).toBeLessThan(3);
   expect(shot.stretch[1]).toBeGreaterThan(1.18);expect(ex(launch).lift).toBe(0);expect(ex(1).lift).toBeCloseTo(rise,6);
   const lifts=[...Array(21).keys()].map(i=>ex(launch+(1-launch)*i/20).lift);for(let i=2;i<lifts.length;i++)expect(lifts[i]-lifts[i-1]).toBeGreaterThanOrEqual(lifts[i-1]-lifts[i-2]-1e-9);
   // Coming in: a stretched pencil from out of sight below, up to the top of its arc, down onto the floor, its own shape again.
   const en=(k:number)=>entryFrame(land,k,t0,depth),end=paradeFrame(land,t0);
   expect(en(0).lift).toBeCloseTo(-depth,6);expect(en(0).stretch[1]).toBeGreaterThan(1.15);expect(Math.abs(deg(en(0).angles.upperarm_L)-7)).toBeLessThan(3);
   expect(Math.max(...[...Array(60).keys()].map(i=>en(i/59*entryLand).lift))).toBeCloseTo(.6,1);
   for(const k of [entryLand,.8,.9,1])expect(en(k).lift).toBe(0);
   for(const k of Object.keys(end.angles))expect(en(1).angles[k]).toBeCloseTo(end.angles[k],9);expect(en(1).stretch).toEqual([1,1]);
   expect(en(.8).angles.shin_L).toBeLessThan(end.angles.shin_L-.05);
   // Frame by frame: the entry as smooth as any pose change; the launch snaps fast on purpose, but never teleports.
   const nIn=Math.round(1.15*fps),inSeq=Array.from({length:nIn+1},(_,i)=>entryFrame(land,i/nIn,t0+i/fps,depth));
   for(const k of Object.keys(inSeq[0].angles))for(let i=2;i<inSeq.length;i++){const d=Math.abs(inSeq[i].angles[k]-2*inSeq[i-1].angles[k]+inSeq[i-2].angles[k]);if(d>jerk){jerk=d;where=`${land.name} ${k} ${i}`;}}
   const nOut=Math.round(1.05*fps),outSeq=Array.from({length:nOut+1},(_,i)=>ex(i/nOut,i));
   for(const k of Object.keys(outSeq[0].angles))for(let i=1;i<outSeq.length;i++)snapStep=Math.max(snapStep,Math.abs(outSeq[i].angles[k]-outSeq[i-1].angles[k]));
  }
  expect(jerk,where).toBeLessThan(.12);expect(snapStep).toBeLessThan(.8);
 });

});


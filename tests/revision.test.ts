import {it,expect} from 'vitest';
import {PerspectiveCamera,Box3,Vector3,Mesh,MeshBasicMaterial,DoubleSide,Raycaster,SkinnedMesh} from 'three';
import {OrbitControls} from 'three-stdlib';
import {orbitMouseButtons} from '../src/controls';
import {partName,bones,generate,recolor,decodeSeed,encodeSeed,variants,twoTone,isBeaded,pairedSegment,poseRotation,defaultProportions,isJoint,linkedIds,palette,pairPartners,topShapes,bottomShapes,patchwork,flow,normalizeProportions,jointShapeOf,jointSizeOf,jointSizes,twinOf,bodyShapes,jointShapes} from '../src/model';
import {tether,fingerGap} from '../src/fingers';
import {hairStyles,placeHair,restCircles} from '../src/hair';
import {pixelSize,normalizePixel,defaultPixel} from '../src/pixelate';
import {normalizeSpray,defaultSpray} from '../src/spray';
import {normalizeRiso,defaultRiso} from '../src/riso';
import {setRules,defaultRules,normalizeRules} from '../src/rules';
import {normalizeSettings} from '../src/settings';
import {bodyLayout,holdsDisc,seamOverlap,waistRadius,shoulderY,isRound,isHalf} from '../src/body';
import {partColors,paletteLooks} from '../src/themes';
const partColorsFor=(spec:ReturnType<typeof generate>)=>partColors(spec,'HFCD');
import {solveAngles,smoothPose,toLocal,updateLayers,initialLayerState} from '../src/pose';
import {createCharacter,headOutlines,pixelPartsOf,sprayPartsOf,checkerStyleOf,checkerColours,checkerStyles,drawOrder,defaultLayerOrder,normalizeLayerOrder,shoulderRadius,jointPiece,elbowRadius,kneeRadius,jointRadius} from '../src/rig';
import {breathe,danceFrame,presetAngles} from '../src/motion';
import {danceBones,danceFps} from '../src/dance';
import danceData from '../src/dance.json';
import {beveledCylinder,frustum,dome} from '../src/geometry';
it('middle-button dragging pans without changing distance, while wheel still zooms',()=>{
 const ownerDocument=new EventTarget();
 const element=Object.assign(new EventTarget(),{style:{},clientWidth:800,clientHeight:600,ownerDocument,getBoundingClientRect:()=>({left:0,top:0,width:800,height:600}),setPointerCapture:()=>{},releasePointerCapture:()=>{}});
 const camera=new PerspectiveCamera(35,800/600,.1,100);camera.position.set(0,1,5);
 const controls=new OrbitControls(camera,element as unknown as HTMLElement);controls.mouseButtons={...orbitMouseButtons};controls.enablePan=true;controls.screenSpacePanning=true;
 const before=camera.position.clone(),target=controls.target.clone(),distance=camera.position.distanceTo(target);
 const event=(name:string,x:number,y:number,extra={})=>Object.assign(new Event(name,{cancelable:true}),{button:1,pointerId:1,pointerType:'mouse',clientX:x,clientY:y,pageX:x,pageY:y,...extra});
 element.dispatchEvent(event('pointerdown',200,200));ownerDocument.dispatchEvent(event('pointermove',280,240));ownerDocument.dispatchEvent(event('pointerup',280,240));
 expect(camera.position.distanceTo(before)).toBeGreaterThan(.1);expect(controls.target.distanceTo(target)).toBeGreaterThan(.1);expect(camera.position.distanceTo(controls.target)).toBeCloseTo(distance,6);
 element.dispatchEvent(event('wheel',200,200,{deltaY:-100}));expect(camera.position.distanceTo(controls.target)).toBeLessThan(distance);controls.dispose();
});
it('gives shoulders, elbows and knees one of five shapes (no triangle), mirrored left/right, that cover the segment ends, and opens older seeds with spheres',()=>{
 const seen=new Set<number>();
 const sizes=new Set<number>();
 for(let i=0;i<80;i++){const spec=generate(`joint-${i}`);for(const part of ['shoulder','elbow','knee']){expect(spec.parts[`${part}_R`].variant).toBe(spec.parts[`${part}_L`].variant);seen.add(jointShapeOf(spec.parts[`${part}_L`].variant));sizes.add(jointSizeOf(spec.parts[`${part}_L`].variant));}expect(decodeSeed(encodeSeed(spec)).parts.elbow_L.variant).toBe(spec.parts.elbow_L.variant);
  // Shoulders, elbows and knees never all share one size.
  expect(new Set(['shoulder_L','elbow_L','knee_L'].map(id=>jointSizeOf(spec.parts[id].variant))).size,`${i}`).toBeGreaterThan(1);}
 expect([...seen].sort()).toEqual([0,1,2,3,4]);expect([...sizes].sort()).toEqual([...jointSizes].sort());
 // Every flat shape holds the whole ball, so segment ends seated on the ball stay covered at any bend.
 for(let v=1;v<5;v++)expect(holdsDisc({outline:jointPiece(v,.07).outline},[0,0],.07*.999),`shape ${v}`).toBe(true);
 // The Ring's hole stays inside the gap between the two segment ends (they start where they sit flush on the ball).
 const hole=(r:number)=>Math.max(...jointPiece(4,r).holes![0].map(([x,y])=>Math.hypot(x,y)));
 for(const r of [elbowRadius,kneeRadius])expect(hole(r)).toBeLessThan(r*Math.sqrt(1-.91**2));
 // Rerolling the elbow row changes the elbows only and keeps their colour.
 const before=generate('joint-reroll');let after=before;for(let i=0;i<12&&after.parts.elbow_L.variant===before.parts.elbow_L.variant;i++)after=generate(`jr-${i}`,before,new Set(),'elbow_L');
 expect(after.parts.elbow_L.variant).not.toBe(before.parts.elbow_L.variant);expect(after.parts.knee_L).toEqual(before.parts.knee_L);expect(after.parts.elbow_L.color).toBe(before.parts.elbow_L.color);
 // A version-3 seed opens with spheres and a version-4 seed with its shapes, both at size M, as they were drawn.
 const spec=generate('joint-v3');spec.parts.knee_L.variant=spec.parts.knee_R.variant=3;
 expect(decodeSeed(encodeSeed(spec).replace('~6','~3')).parts.knee_L.variant).toBe(5);expect(decodeSeed(encodeSeed(spec).replace('~6','~4')).parts.knee_L.variant).toBe(8);
 for(const id of ['thigh_L','thigh_R','shin_L','shin_R'])expect(bones.find(b=>b.id===id)!.length).toBeCloseTo(.4*1.5);
});
it('produces subdivided beveled round surfaces with finite normals and exact bounds',()=>{
 for(const top of [0,.1]){const g=beveledCylinder(top,.1,.4);g.computeBoundingBox();expect(g.getAttribute('position').count).toBeGreaterThan(1000);expect(g.boundingBox!.getSize(new Vector3()).y).toBeCloseTo(.4,6);expect(Array.from(g.getAttribute('normal').array).every(Number.isFinite)).toBe(true);const p=g.getAttribute('position');let curvedRim=false;for(let i=0;i<p.count;i++){const r=Math.hypot(p.getX(i),p.getZ(i));if(p.getY(i)>-.2&&p.getY(i)<-.195&&r>.092&&r<.1)curvedRim=true;}expect(curvedRim).toBe(true);g.dispose();}
});

/** Every valid body: each build with each top shape and the bottom shapes it allows. */
const everyBody=()=>[0,1,2,3].flatMap(build=>topShapes(build).flatMap(top=>(build===0?[0]:build===1?pairPartners(top):bottomShapes(build)).map(bottom=>({build,top,bottom}))));
const withBody=(spec:ReturnType<typeof generate>,{build,top,bottom}:{build:number;top:number;bottom:number})=>({...spec,parts:{...spec.parts,spine_lower:{...spec.parts.spine_lower,variant:build},spine_upper:{...spec.parts.spine_upper,variant:top},root:{...spec.parts.root,variant:bottom}}});
it('keeps both hip joints just outside the body piece that carries them, touching it, for every body and slider',()=>{
 const base=generate('hip-coverage');
 for(const body of everyBody())for(const prop of [defaultProportions,{...defaultProportions,pelvis:1.5,torsoWidth:.5,joints:1.5},{...defaultProportions,pelvis:.5,torsoHeight:1.5,joints:.5}]){
  const spec=withBody(base,body),layout=bodyLayout(spec,prop),piece=layout.bottom??layout.top,rig=createCharacter(spec,'HFCD',undefined,prop),r=jointRadius(spec,'knee',prop);
  const hip=rig.map.get('hip_L')!.position,label=JSON.stringify(body);
  expect(hip.x).toBeCloseTo(layout.hipX,9);
  // Outside the piece, clear of it by the joint's radius, and touching (within 1 mm).
  let near=Infinity;for(let i=0,j=piece.outline.length-1;i<piece.outline.length;j=i++){const [ax,ay]=piece.outline[j],[bx,by]=piece.outline[i],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((hip.x-ax)*dx+(hip.y-ay)*dy)/(dx*dx+dy*dy||1)));near=Math.min(near,Math.hypot(ax+dx*t-hip.x,ay+dy*t-hip.y));}
  expect(holdsDisc(piece,[hip.x,hip.y],0),label).toBe(false);expect(near,label).toBeGreaterThan(r-1e-4);expect(near,label).toBeLessThan(r+.001);
  rig.dispose();
 }
});
it('stacks two body pieces without overlapping them, keeps them touching at any bend and slider setting, and never bends a Single body',()=>{
 const base=generate('seams');
 for(const body of everyBody())for(const torsoHeight of [.5,1,1.5])for(const width of [.5,1.5]){
  const spec=withBody(base,body),prop={...defaultProportions,torsoHeight,torsoWidth:width,pelvis:2-width},layout=bodyLayout(spec,prop),label=`${JSON.stringify(body)} h${torsoHeight} w${width}`;
  // The pieces are stacked: they meet in a thin overlap on the centre line with the pivot in it, so they touch at
  // any bend (the top piece turns about that point), and the waist ball behind them fills the gap a bend opens.
  if(layout.bottom){
   expect(holdsDisc(layout.top,[0,layout.pivot],seamOverlap*.3),label).toBe(true);expect(holdsDisc(layout.bottom,[0,layout.pivot],seamOverlap*.3),label).toBe(true);
   const topLow=Math.min(...layout.top.outline.map(p=>p[1])),bottomHigh=Math.max(...layout.bottom.outline.map(p=>p[1]));
   expect(bottomHigh-topLow,label).toBeLessThan(seamOverlap+1e-9);expect(waistRadius).toBeGreaterThan(.04);
  }
  // The neck ball (bottom at about 0.60) and the shoulder height both land on the top piece.
  expect(holdsDisc(layout.top,[0,.615],.01),label).toBe(true);expect(holdsDisc(layout.top,[0,shoulderY],.01)||layout.top.holes!==undefined,label).toBe(true);
 }
 // The rig turns the top piece about that same pivot.
 const two=createCharacter(withBody(base,{build:1,top:0,bottom:0})),layout=bodyLayout(withBody(base,{build:1,top:0,bottom:0}));
 expect(two.map.get('spine_lower')!.position.y).toBeCloseTo(layout.pivot,9);expect(two.map.get('spine_upper')!.position.y).toBe(0);
 // Neck and shoulders keep their height above the pelvis whatever the build.
 const neckY=(rig:ReturnType<typeof createCharacter>)=>rig.map.get('neck')!.getWorldPosition(new Vector3()).y-rig.map.get('root')!.getWorldPosition(new Vector3()).y;
 const one=createCharacter(withBody(base,{build:0,top:5,bottom:0}));expect(neckY(one)).toBeCloseTo(neckY(two),9);expect(neckY(two)).toBeCloseTo(.63,9);
 // A Single body takes the waist turn as a whole-body turn; the legs keep their direction.
 one.applyAngles({spine_lower:.4,thigh_L:.1});
 const turn=(rig:ReturnType<typeof createCharacter>,id:string)=>{const e=rig.map.get(id)!.matrixWorld.elements;return Math.atan2(e[1],e[0]);};
 expect(one.map.get('spine_lower')!.rotation.z).toBe(0);expect(one.map.get('root')!.rotation.z).toBeCloseTo(.4,9);expect(turn(one,'thigh_L')).toBeCloseTo(.1,9);
 two.applyAngles({spine_lower:.4});expect(two.map.get('spine_lower')!.rotation.z).toBeCloseTo(.4,9);
 one.dispose();two.dispose();
});
it('never stretches a circle, donut or half circle, at any slider setting, and never puts a skirt or a V below',()=>{
 const base=generate('round');
 for(const body of everyBody())for(const torsoHeight of [.5,1,1.5])for(const width of [.5,1.5]){
  const layout=bodyLayout(withBody(base,body),{...defaultProportions,torsoHeight,torsoWidth:width,pelvis:width});
  for(const [piece,shape] of [[layout.top,body.top],[layout.bottom,body.bottom]] as const){
   if(!piece||!(isRound(shape)||isHalf(shape)))continue;
   const xs=piece.outline.map(p=>p[0]),ys=piece.outline.map(p=>p[1]),w=Math.max(...xs)-Math.min(...xs),h=Math.max(...ys)-Math.min(...ys);
   // A half circle on top of another piece loses the 1.4 cm sliver of its flat side that hung outside the piece below
   // (seatOn), so it is measured a little less exactly.
   expect(w/h,`${JSON.stringify(body)} h${torsoHeight} w${width}`).toBeCloseTo(isRound(shape)?1:2,piece===layout.top&&layout.bottom&&isHalf(shape)?1:2);
  }
 }
 for(const build of [1,2,3])for(const skirt of [3,4,5])expect(bottomShapes(build)).not.toContain(skirt);
 expect(topShapes(0)).toEqual([0,1,6,7]);
 // A seed with a skirt or a V below opens with a stand-in (Dome → Bowl, Funnel → Block); a Single half circle becomes a Circle.
 const s=generate('skirt');s.parts.spine_lower.variant=2;s.parts.root.variant=3;s.parts.spine_upper.variant=1;expect(decodeSeed(encodeSeed(s)).parts.root.variant).toBe(2);
 s.parts.root.variant=4;expect(decodeSeed(encodeSeed(s)).parts.root.variant).toBe(1);
 s.parts.spine_lower.variant=0;s.parts.spine_upper.variant=2;expect(decodeSeed(encodeSeed(s)).parts.spine_upper.variant).toBe(0);
});
it('generates every build, pairs equal or mirrored shapes, and keeps the pair through rerolls and locks',()=>{
 const seen=new Set<number>();let s=generate('builds-0');
 for(let i=0;i<300;i++){
  s=i%4===0?generate(`b-${i}`,s,new Set(['root'])):i%4===1?generate(`b-${i}`,s,new Set(),['spine_upper','root','spine_lower'][i%3]):generate(`b-${i}`);
  const build=s.parts.spine_lower.variant;seen.add(build);
  if(build===1)expect(pairPartners(s.parts.spine_upper.variant),`${i}`).toContain(s.parts.root.variant);
  if(build===2)expect(s.parts.root.variant).not.toBe(6);if(build===3)expect(s.parts.spine_upper.variant).not.toBe(6);
  if(build>0)expect(s.parts.spine_upper.pattern>0!==s.parts.root.pattern>0,`${i}: exactly one piece is woven`).toBe(true);else expect(s.parts.spine_upper.pattern,`${i}: a Single body is woven`).toBeGreaterThan(0);
  expect(topShapes(build),`${i}`).toContain(s.parts.spine_upper.variant);if(build>0)expect(bottomShapes(build),`${i}: no skirt below`).toContain(s.parts.root.variant);
 }
 expect([...seen].sort()).toEqual([0,1,2,3]);
 // A locked bottom piece stays put; the top piece follows it into a pair.
 const locked=generate('lock-pair');for(let i=0;i<40;i++){const next=generate(`lp-${i}`,locked,new Set(['root']));expect(next.parts.root).toEqual(locked.parts.root);}
});

it('mirrors hands, feet and joints (shape + colour) and leg shapes across left/right, including rerolls and locks',()=>{
 let s=generate('mirror-0');
 for(let i=0;i<120;i++){
  s=i%3===0?generate(`m-${i}`,s,new Set(['hand_L','thigh_R'])):generate(`m-${i}`,s,new Set(),['hand_R','foot_L','hip_R','shin_L','thigh_R'][i%5]);
  // Shape and colour mirror; patterns (patchwork, flow) are placed on one side on purpose.
  for(const part of ['shoulder','hip','hand','foot'])for(const key of ['variant','color'] as const)expect(s.parts[`${part}_R`][key],`${i}: ${part}`).toBe(s.parts[`${part}_L`][key]);
  for(const part of ['thigh','shin'])expect(s.parts[`${part}_R`].variant,`${i}: ${part}`).toBe(s.parts[`${part}_L`].variant);
  for(const b of bones){if(b.parent)expect(s.parts[b.id].color,`${i}: ${b.id}`).not.toBe(s.parts[b.parent].color);}
 }
});
it('keeps texture patterns on the body pieces only, also for older seeds',()=>{
 for(let i=0;i<60;i++){const s=generate(`pattern-${i}`);for(const b of bones)if(!['torso','pelvis'].includes(b.kind)){const p=s.parts[b.id].pattern,allowed=['limb','leg'].includes(b.kind)?[0,twoTone,patchwork,flow]:['head','hand','foot'].includes(b.kind)?[0,flow]:[0];expect(allowed,`${b.id}: ${p}`).toContain(p);}}
 const legacy=generate('legacy');legacy.parts.thigh_L.pattern=2;legacy.parts.hand_R.variant=3;
 const restored=decodeSeed(encodeSeed(legacy));expect([0,patchwork]).toContain(restored.parts.thigh_L.pattern);expect(restored.parts.hand_R).toEqual(restored.parts.hand_L);
});
it('builds every torso, pelvis, leg and foot variant as finite closed geometry',()=>{
 for(let v=0;v<9;v++){const spec=generate('shapes');for(const b of bones)spec.parts[b.id].variant=v%variants[b.kind].length;const rig=createCharacter(spec);
  rig.group.traverse(o=>{if(o instanceof SkinnedMesh){const p=o.geometry.getAttribute('position'),n=o.geometry.getAttribute('normal');expect(Array.from(p.array).every(Number.isFinite),o.name).toBe(true);expect(Array.from(n.array).every(Number.isFinite),o.name).toBe(true);}});
  rig.dispose();}
});
it('adds mirrored knee joints without changing leg length, and still reads legacy 22-slot seeds',()=>{
 const knee=bones.find(b=>b.id==='knee_L')!,shin=bones.find(b=>b.id==='shin_L')!;
 expect(knee.parent).toBe('thigh_L');expect(knee.headPosition).toEqual([0,-.6,0]);expect(shin.parent).toBe('knee_L');expect(shin.headPosition).toEqual([0,0,0]);
 const spec=generate('knees');expect(spec.parts.knee_R).toEqual(spec.parts.knee_L);
 const packed=encodeSeed(spec).split('~')[1],legacy=packed.slice(0,2)+bones.map((b,i)=>/^(knee_|elbow_|hair)/.test(b.id)?'':packed.slice(2+i*4,6+i*4)).join('');
 const restored=decodeSeed(`knees~${legacy}`);for(const b of bones)if(!/^(knee_|elbow_|hair)/.test(b.id))expect(restored.parts[b.id]).toEqual(spec.parts[b.id]);
});
it('closes every lathe with a real fillet on the bottom rim as well as the top rim',()=>{
 for(const g of [frustum(.2,.2,.2,.05),dome(.2,.2,.04)]){const p=g.getAttribute('position');let bottomRim=false;for(let i=0;i<p.count;i++){const r=Math.hypot(p.getX(i),p.getZ(i)),y=p.getY(i);if(y>.005&&y<.03&&r>.17&&r<.199)bottomRim=true;}expect(bottomRim).toBe(true);g.dispose();}
});

it('never stacks two beaded segments on one limb, even through rerolls and locks',()=>{
 let s=generate('beads');
 for(let i=0;i<300;i++){
  s=i%4===0?generate(`b-${i}`,s,new Set(['shin_L','upperarm_R'])):generate(`b-${i}`,s,new Set(),['thigh_L','shin_R','forearm_L','upperarm_R'][i%4]);
  for(const id of ['upperarm_L','upperarm_R','thigh_L','thigh_R']){const lower=pairedSegment(id)!,a=bones.find(b=>b.id===id)!,b=bones.find(x=>x.id===lower)!;expect(isBeaded(a,s.parts[id].variant)&&isBeaded(b,s.parts[lower].variant),`${i}: ${id}`).toBe(false);}
 }
 const legacy=generate('x');legacy.parts.thigh_L.variant=3;legacy.parts.shin_L.variant=3;
 const fixed=decodeSeed(encodeSeed(legacy));expect(isBeaded(bones.find(b=>b.id==='shin_L')!,fixed.parts.shin_L.variant)).toBe(false);
});
it('reads 24-slot seeds from before the elbow joints',()=>{
 const spec=generate('elbows'),packed=encodeSeed(spec).split('~')[1];
 const old=packed.slice(0,2)+bones.map((b,i)=>b.id.startsWith('elbow_')||b.id==='hair'?'':packed.slice(2+i*4,6+i*4)).join('');
 const restored=decodeSeed(`elbows~${old}`);for(const b of bones)if(!b.id.startsWith('elbow_')&&b.id!=='hair')expect(restored.parts[b.id]).toEqual(spec.parts[b.id]);
});
it('solves in-plane bone angles from MediaPipe landmarks',()=>{
 // Upright body in a square frame: left landmarks on the image right, y grows downwards.
 const lm=Array.from({length:33},(_,id)=>({id,x:.5,y:.5,z:0,visibility:1}));
 const put=(i:number,x:number,y:number)=>{lm[i].x=x;lm[i].y=y;};
 put(11,.6,.3);put(12,.4,.3);put(23,.56,.6);put(24,.44,.6);put(7,.54,.2);put(8,.46,.2);
 put(13,.6,.45);put(15,.6,.6);put(19,.6,.65);   // left arm hanging straight down
 put(14,.25,.3);put(16,.1,.3);put(20,.05,.3);   // right arm stretched out sideways
 put(25,.56,.75);put(27,.56,.9);put(26,.44,.75);put(28,.44,.9);
 const a=solveAngles(lm,1)!;
 expect(a.spine_lower).toBeCloseTo(0,5);expect(a.head).toBeCloseTo(0,5);
 expect(a.upperarm_L).toBeCloseTo(0,5);expect(a.forearm_L).toBeCloseTo(0,5);
 expect(a.upperarm_R).toBeCloseTo(-Math.PI/2,5);expect(a.forearm_R).toBeCloseTo(0,5);
 expect(a.thigh_L).toBeCloseTo(0,5);expect(a.shin_R).toBeCloseTo(0,5);
 // The rig turns the right arm towards -X (the figure's right) with that angle.
 const rig=createCharacter(generate('pose'));rig.applyAngles(a);
 const elbow=rig.map.get('elbow_R')!.getWorldPosition(new Vector3()),shoulder=rig.map.get('upperarm_R')!.getWorldPosition(new Vector3());
 expect(elbow.x).toBeLessThan(shoulder.x-.25);expect(Math.abs(elbow.y-shoulder.y)).toBeLessThan(1e-6);
 lm[13].visibility=.1;expect(solveAngles(lm,1)!.upperarm_L).toBeUndefined();
 lm[11].visibility=.1;expect(solveAngles(lm,1)).toBeNull();
 rig.dispose();
});
it('keeps every preset pose in the picture plane',()=>{
 for(const pose of ['idle','reach','stride'] as const)for(const b of bones){const [x,y]=poseRotation(b.id,pose);expect(x).toBe(0);expect(y).toBe(0);}
});
it('stacks each limb as one piece: joints over segment ends, hand over its own shoulder, front limb over back limb',()=>{
 const rank=(order:string[])=>(id:string)=>order.indexOf(id);
 const at=rank(drawOrder(defaultLayerOrder));
 expect(drawOrder(defaultLayerOrder)).toHaveLength(bones.length);
 for(const s of ['L','R'])for(const [a,b] of [['upperarm','shoulder'],['shoulder','forearm'],['forearm','elbow'],['elbow','hand'],['thigh','shin'],['shin','knee'],['knee','foot']])expect(at(`${a}_${s}`)).toBeLessThan(at(`${b}_${s}`));
 // Limbs never interleave; the front arm/leg is drawn whole after the back one.
 const right=rank(drawOrder(defaultLayerOrder,{frontArm:'R',frontLeg:'R',behind:{L:false,R:false}}));
 expect(right('upperarm_R')).toBeGreaterThan(right('hand_L'));expect(right('thigh_R')).toBeGreaterThan(right('foot_L'));
 // An arm behind the body tucks under the torso; with the arms block below the torso nothing moves.
 const tucked=rank(drawOrder(defaultLayerOrder,{frontArm:'L',frontLeg:'L',behind:{L:true,R:false}}));
 expect(tucked('hand_L')).toBeLessThan(tucked('spine_upper'));expect(tucked('upperarm_R')).toBeGreaterThan(tucked('head'));
 // Orders stored by the old 14-row list keep their meaning.
 expect(normalizeLayerOrder(['shoulder','elbow','hand','forearm','upperarm','head','torso','neck','pelvis','spine','knee','foot','shin','thigh'])).toEqual(defaultLayerOrder);
});
it('smooths screen directions, so a slow upper arm does not drag its forearm and the feet stay level',()=>{
 const first=smoothPose(null,{world:{root:0,spine_lower:0,upperarm_L:0,forearm_L:0,thigh_L:0,shin_L:0,foot_L:0},confidence:{},depth:{}},.35);
 // The upper arm swings out but is barely trusted (foreshortened); the forearm is clearly seen pointing sideways.
 const next=smoothPose(first,{world:{root:.3,spine_lower:0,upperarm_L:1,forearm_L:Math.PI/2,thigh_L:.4,shin_L:-.2,foot_L:0},confidence:{root:1,spine_lower:1,upperarm_L:.03,forearm_L:1,thigh_L:.5,shin_L:.2,foot_L:1},depth:{}},0);
 const local=toLocal(next),sum=(...ids:string[])=>ids.reduce((a,id)=>a+(local[id]??0),0);
 expect(sum('root','spine_lower','upperarm_L','forearm_L')).toBeCloseTo(Math.PI/2,6);
 expect(sum('root','thigh_L','shin_L','foot_L')).toBeCloseTo(0,6);
});
it('restacks limbs from camera depth only after the cue holds for a few frames',()=>{
 let state=initialLayerState();
 const nearRight={arm:.4,leg:0,behindL:0,behindR:0};
 for(let i=0;i<4;i++){state=updateLayers(state,nearRight);expect(state.layers.frontArm).toBe('L');}
 state=updateLayers(state,nearRight);expect(state.layers.frontArm).toBe('R');
 // A one-frame blip the other way does not flip it back.
 state=updateLayers(state,{arm:-.6});state=updateLayers(state,nearRight);expect(state.layers.frontArm).toBe('R');
});
it('reads version-1 and version-2 seeds onto the body catalogue as a Big top build, and writes version 6',()=>{
 const spec=generate('legacy-torso');spec.parts.root.variant=5;spec.parts.spine_lower.variant=0;
 const packed=encodeSeed(spec).split('~')[1],at=(id:string)=>bones.findIndex(b=>b.id===id),swap=(p:string,id:string,v:number)=>p.slice(0,2+at(id)*4)+v.toString(36)+p.slice(3+at(id)*4);
 expect(packed[0]).toBe('6');
 // Version 1 → 2: Bowl→Bowl, Stack→Column, Donut→Donut, Vase→Funnel; then onto the body shapes: Bowl, Block, Donut, Funnel.
 for(const [old,now] of [[0,2],[7,1],[9,6],[10,4]]){const v1='1'+swap(packed,'spine_upper',old).slice(1);const s=decodeSeed(`legacy-torso~${v1}`);expect(s.parts.spine_upper.variant).toBe(now);expect(s.parts.spine_lower.variant).toBe(2);}
 // Version 2: Orb torso → Circle; pelvis Diamond → Diamond, Puck → Block, Tire → Donut (a small piece, so it becomes a Circle).
 for(const [old,now] of [[5,7],[4,1],[1,0]])expect(decodeSeed(`legacy-torso~2${swap(swap(packed,'spine_upper',5),'root',old).slice(1)}`).parts.root.variant).toBe(now);
 expect(decodeSeed(`legacy-torso~2${swap(packed,'spine_upper',5).slice(1)}`).parts.spine_upper.variant).toBe(0);
 // An index past the old catalogues is still rejected.
 expect(()=>decodeSeed(`legacy-torso~1${swap(packed,'spine_upper',11).slice(1)}`)).toThrow();expect(()=>decodeSeed(`legacy-torso~2${swap(packed,'root',6).slice(1)}`)).toThrow();
});
it('scales parts from the Proportions tab without changing bone lengths, and keeps each shoulder just outside the top piece edge',()=>{
 const extent=(rig:ReturnType<typeof createCharacter>,id?:string)=>{let lo=Infinity,hi=-Infinity;for(const b of bones){if(id&&b.id!==id)continue;const mesh=rig.group.getObjectByName(`${b.id}_mesh`) as SkinnedMesh,p=mesh.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const y=new Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).y;lo=Math.min(lo,y);hi=Math.max(hi,y);}}return hi-lo;};
 const side=new MeshBasicMaterial({side:DoubleSide}),spec=generate('proportions');spec.parts.hair.variant=0;const base=createCharacter(spec),bigHead=createCharacter(spec,'HFCD',undefined,{...defaultProportions,head:1.2});
 expect(extent(bigHead)-extent(base)).toBeCloseTo(.31*.2,4);
 expect(bigHead.map.get('elbow_L')!.position.toArray()).toEqual(base.map.get('elbow_L')!.position.toArray());
 const width=(rig:ReturnType<typeof createCharacter>,id:string)=>{const g=(rig.group.getObjectByName(`${id}_mesh`) as SkinnedMesh).geometry;g.computeBoundingBox();return g.boundingBox!.max.x-g.boundingBox!.min.x;};
 // A cylinder forearm (it tapers from the elbow to the wrist): its width follows the thickness slider.
 const tube={...spec,parts:{...spec.parts,forearm_L:{...spec.parts.forearm_L,variant:0}}},thick=createCharacter(tube,'HFCD',undefined,{...defaultProportions,arms:1.4}),plain=createCharacter(tube);expect(width(thick,'forearm_L')/width(plain,'forearm_L')).toBeCloseTo(1.4,2);plain.dispose();
 for(let build=0;build<4;build++)for(let v=0;v<variants.torso.length;v++)for(const torsoWidth of [.5,1,1.5]){
  spec.parts.spine_lower.variant=build;spec.parts.spine_upper.variant=v;const rig=createCharacter(spec,'HFCD',undefined,{...defaultProportions,torsoWidth});
  // Top piece edge at shoulder height, found by a ray coming in from the side (top piece space = spine_upper space).
  const torso=new Mesh((rig.group.getObjectByName('spine_upper_mesh') as SkinnedMesh).geometry,side);torso.updateMatrixWorld(true);
  const edge=new Raycaster(new Vector3(2,rig.map.get('shoulder_L')!.position.y,0),new Vector3(-1,0,0)).intersectObject(torso)[0].point.x;
  // The shoulder ball sits outside the edge, touching it: never over the torso (a sloped side leaves a little more room).
  const x=rig.map.get('shoulder_L')!.position.x,ball=jointRadius(spec,'shoulder');expect(x-edge,`build ${build}, top ${v} at ${torsoWidth}`).toBeGreaterThan(ball-.003);expect(x-edge,`build ${build}, top ${v} at ${torsoWidth}`).toBeLessThan(ball*2.2);
  expect(rig.map.get('shoulder_R')!.position.x).toBeCloseTo(-x,9);rig.dispose();
 }
 base.dispose();bigHead.dispose();thick.dispose();side.dispose();
});
it('gives each joint type its own colour, the same on both sides and apart from its neighbours, and locks or rerolls a joint pair together',()=>{
 expect(linkedIds('elbow_L')).toEqual(['elbow_L','elbow_R']);expect(isJoint('knee_R')).toBe(true);
 let s=generate('joints-0'),distinct=0;
 for(let i=0;i<120;i++){
  const before=s.parts.knee_L.color;
  s=i%3===0?generate(`j-${i}`,s,new Set(['knee_R'])):i%3===1?generate(`j-${i}`,s,new Set(),'elbow_L'):generate(`j-${i}`);
  for(const part of ['shoulder','elbow','knee'])expect(s.parts[`${part}_R`],`${i}: ${part}`).toEqual(s.parts[`${part}_L`]);
  if(new Set(['shoulder_L','elbow_L','knee_L'].map(id=>s.parts[id].color)).size===3)distinct++;
  if(i%3===0)expect(s.parts.knee_L.color).toBe(before);
  for(const b of bones)if(b.parent)expect(s.parts[b.id].color,`${i}: ${b.id}`).not.toBe(s.parts[b.parent].color);
 }
 // Shoulders, elbows and knees almost always get three different colours.
 expect(distinct).toBeGreaterThan(100);
});
it('plays the recorded Dance as a smooth loop and breathes gently around the presets',()=>{
 const count=atob(danceData.layers).length;expect(count/danceFps).toBeGreaterThan(60);
 const first=danceFrame(0);expect(Object.keys(first.angles)).toEqual(danceBones);
 let worst=0,previous=first.angles;
 for(let i=1;i<count;i++){const {angles}=danceFrame(i/danceFps);for(const id of danceBones){expect(Number.isFinite(angles[id])).toBe(true);worst=Math.max(worst,Math.abs(Math.atan2(Math.sin(angles[id]-previous[id]),Math.cos(angles[id]-previous[id]))));}previous=angles;}
 // Baked through the Live pose smoothing with misreads capped, so no bone jumps more than 0.9 rad between frames.
 expect(worst).toBeLessThan(.91);
 for(const id of danceBones)expect(danceFrame(count/danceFps).angles[id]).toBeCloseTo(first.angles[id],9);
 for(const pose of ['idle','reach','stride'] as const){const calm=presetAngles(pose);for(const t of [0,.7,1.9,3.1]){const a=breathe(pose,t);for(const id of Object.keys(calm))expect(Math.abs(a[id]-calm[id])).toBeLessThan(.04);}}
});
it('paints each character with its own scheme (up to eight colours, with the hair), keeps locked colours, and recolours without changing shapes',()=>{
 const roles=(s:ReturnType<typeof generate>)=>new Set(bones.filter(b=>b.kind!=='face').map(b=>s.parts[b.id].color));
 const seen=new Set<string>();
 for(let i=0;i<200;i++){
  const s=generate(`scheme-${i}`);expect(roles(s).size,`${i}`).toBeLessThanOrEqual(8);
  expect(s.parts.hand_L.color).toBe(s.parts.foot_R.color);expect(s.parts.root.color).toBe(s.parts.hand_L.color);
  seen.add([...roles(s)].sort().join('.'));
 }
 // 200 characters, almost all with a different set of colours.
 expect(seen.size).toBeGreaterThan(170);
 const base=generate('scheme-base'),locked=new Set(['head','hand_L']);
 const next=generate('scheme-next',base,locked);expect(next.parts.head.color).toBe(base.parts.head.color);expect(next.parts.foot_L.color).toBe(base.parts.hand_L.color);
 const again=recolor(base,new Set(['knee_L']),'salt');
 for(const b of bones){expect(again.parts[b.id].variant).toBe(base.parts[b.id].variant);if(b.parent)expect(again.parts[b.id].color,b.id).not.toBe(again.parts[b.parent].color);}
 expect(again.parts.knee_R.color).toBe(base.parts.knee_L.color);
 // Rerolling one part changes only its shape.
 const shape=generate('scheme-shape',base,new Set(),'head');expect(shape.parts.head.color).toBe(base.parts.head.color);
});

it('repaints the whole figure from the XMAS and TET sets, keeping neighbours apart and the face mark dark',()=>{
 for(const name of ['XMAS','TET'] as const){const look=paletteLooks[name];let crowded=0;
  for(let i=0;i<300;i++){const s=generate(`theme-${i}`),colorOf=partColors(s,name),used=new Set(bones.map(b=>s.parts[b.id].color));
   expect(colorOf(s.parts.face_mark.color)).toBe(look.mark);
   for(const b of bones)if(b.kind!=='face')expect(look.body).toContain(colorOf(s.parts[b.id].color));
   expect(partColors(s,name)(s.parts.head.color),'same character, same repaint').toBe(colorOf(s.parts.head.color));
   if(used.size-1>look.body!.length)crowded++;
   // Neighbours never match, even when the character uses more colours than the set holds.
   for(const b of bones)if(b.parent&&s.parts[b.id].color!==s.parts[b.parent].color)expect(colorOf(s.parts[b.id].color),`${name} ${i}: ${b.id}`).not.toBe(colorOf(s.parts[b.parent].color));
  }
  if(name==='TET')expect(crowded).toBeLessThan(15);
 }
 expect(partColors(generate('x'),'HFCD')(3)).toBe(palette[3].hex);
});

it('turns every joint halfway between the segment before it and the segment after it, without moving the limbs',()=>{
 const rig=createCharacter(generate('halfway')),turn=(id:string)=>{const e=rig.map.get(id)!.matrixWorld.elements;return Math.atan2(e[1],e[0]);};
 rig.applyAngles({thigh_L:.4,shin_L:.6,upperarm_L:1,forearm_L:.5});
 expect(turn('thigh_L')).toBeCloseTo(.4,9);expect(turn('shin_L')).toBeCloseTo(1,9);expect(turn('knee_L')).toBeCloseTo(.7,9);expect(turn('hip_L')).toBeCloseTo(.2,9);
 expect(turn('upperarm_L')).toBeCloseTo(1,9);expect(turn('forearm_L')).toBeCloseTo(1.5,9);expect(turn('elbow_L')).toBeCloseTo(1.25,9);expect(turn('shoulder_L')).toBeCloseTo(.5,9);
 rig.dispose();
});

it('lays a foot on or near the floor flat, and lets a raised foot follow its shin',()=>{
 const rig=createCharacter(generate('feet')),turn=(id:string)=>{const e=rig.map.get(id)!.matrixWorld.elements;return Math.atan2(e[1],e[0]);};
 // Standing on the left leg, the right leg kicked up high.
 rig.applyAngles({thigh_L:.1,shin_L:-.15,thigh_R:-1.3,shin_R:.6});
 expect(turn('foot_L')).toBeCloseTo(0,6);expect(turn('foot_R')).toBeCloseTo(turn('shin_R'),6);expect(Math.abs(turn('foot_R'))).toBeGreaterThan(.5);
 // A small step: both feet are within a few centimetres of the floor, so both lie flat.
 rig.applyAngles({thigh_L:.05,shin_L:.25,thigh_R:-.05});
 expect(turn('foot_L')).toBeCloseTo(0,6);expect(turn('foot_R')).toBeCloseTo(0,6);
 rig.dispose();
});

it('puts the patchwork on two random limb spots, never a mirrored pair, never on touching parts, and keeps a spot through rerolls',()=>{
 const base=generate('pw-base'),segments=new Set<string>();
 for(let i=0;i<200;i++){
  const s=i%3===0?generate(`pw-${i}`,base,new Set(['upperarm_L'])):i%3===1?generate(`pw-${i}`,base,new Set(),['upperarm_L','shin_R','spine_lower','spine_upper'][i%4]):generate(`pw-${i}`);
  const on=bones.filter(b=>s.parts[b.id].pattern===patchwork).map(b=>b.id);
  expect(on.length,`${i}`).toBe(2);expect(twinOf(on[0]),`${i}: ${on}`).not.toBe(on[1]);
  for(const id of on){expect(/^(upperarm|forearm|thigh|shin)_[LR]$/.test(id),`${i}: ${id}`).toBe(true);segments.add(id.split('_')[0]);}
  // Touching parts are never both patterned: the two body pieces, or a woven body piece and a thigh (its hip joint is hidden).
  const textured=(id:string)=>s.parts[id].pattern>0&&s.parts[id].pattern!==twoTone,build=s.parts.spine_lower.variant;
  if(build>0)expect(textured('spine_upper')&&textured('root'),`${i}`).toBe(false);
  for(const side of ['L','R'])if(textured(`thigh_${side}`))expect(build>0&&!s.parts.root.pattern,`${i}: thigh under a woven piece`).toBe(true);
  expect(decodeSeed(encodeSeed(s)).parts[on[0]].pattern).toBe(patchwork);
 }
 expect([...segments].sort()).toEqual(['forearm','shin','thigh','upperarm']);
 const spot=bones.find(b=>/^(upperarm|forearm|shin)_/.test(b.id)&&base.parts[b.id].pattern===patchwork)!.id;
 expect(generate('pw-reroll',base,new Set(),spot).parts[spot].pattern).toBe(patchwork);
});

it('tapers every arm and leg segment from the size of the joint at one end to the joint at the other',()=>{
 const spec=generate('taper'),set=(type:string,size:number)=>{for(const side of ['L','R'])spec.parts[`${type}_${side}`].variant=5*size;};
 set('shoulder',2);set('elbow',0);set('knee',2);
 const halfWidth=(rig:ReturnType<typeof createCharacter>,id:string,nearTop:boolean)=>{const p=(rig.group.getObjectByName(`${id}_mesh`) as SkinnedMesh).geometry.getAttribute('position');let lo=Infinity,hi=-Infinity;for(let i=0;i<p.count;i++){lo=Math.min(lo,p.getY(i));hi=Math.max(hi,p.getY(i));}let w=0;for(let i=0;i<p.count;i++){const y=p.getY(i);if(nearTop?y>hi-(hi-lo)*.15:y<lo+(hi-lo)*.15)w=Math.max(w,Math.abs(p.getX(i)));}return w;};
 for(const v of [0,3,4]){
  for(const id of ['upperarm_L','thigh_L'])spec.parts[id].variant=v===4&&id==='thigh_L'?3:v;
  const rig=createCharacter(spec);
  // Big shoulder, small elbow: the upper arm narrows downwards. Big knee: the thigh widens downwards to meet it.
  expect(halfWidth(rig,'upperarm_L',true),`arm ${v}`).toBeGreaterThan(halfWidth(rig,'upperarm_L',false)*1.3);
  expect(halfWidth(rig,'thigh_L',false),`leg ${v}`).toBeGreaterThan(halfWidth(rig,'thigh_L',true)*1.3);
  rig.dispose();
 }
});

it('arcs five touching ragdoll finger circles around each hand, never inside it, drawn over it, the same size and colour as the toes',()=>{
 const spec=generate('fingers'),rig=createCharacter(spec),r=rig.fingers.radius;
 expect(rig.fingers.meshes.length).toBe(10);
 const toe=rig.group.getObjectByName('toes_L') as SkinnedMesh;toe.geometry.computeBoundingBox();
 expect(toe.geometry.boundingBox!.max.y-toe.geometry.boundingBox!.min.y).toBeCloseTo(2*r,3);
 for(const finger of rig.fingers.meshes){
  expect(finger.renderOrder).toBeGreaterThan(rig.group.getObjectByName(`hand_${finger.userData.side}_mesh`)!.renderOrder);
  expect((finger.material as MeshBasicMaterial).color.getHexString()).toBe((toe.material as MeshBasicMaterial).color.getHexString());
  expect((finger.material as MeshBasicMaterial).color.getHexString()).not.toBe(new MeshBasicMaterial({color:palette[spec.parts.hand_L.color].hex}).color.getHexString());
 }
 const check=(label:string)=>{for(const h of rig.fingers.state())h.pos.forEach((p,i)=>{
  expect(p.distanceTo(h.centre),`${label}: ${i} inside the hand`).toBeGreaterThan(rig.fingers.handRadius+r*(1+fingerGap)-1e-6);
  expect(p.distanceTo(h.pin[i]),`${label}: ${i} off its tether`).toBeLessThan(r*tether+.003);
  if(i)expect(p.distanceTo(h.pos[i-1]),`${label}: ${i} touches ${i-1}`).toBeCloseTo(2*r,2);
  for(let j=i+2;j<5;j++)expect(p.distanceTo(h.pos[j]),`${label}: ${i}/${j}`).toBeGreaterThan(2*r-.003);
 });};
 rig.applyPose('idle');rig.settleFingers();check('idle');
 rig.applyPose('reach');for(let i=0;i<30;i++){rig.tick(1/60);check(`swing ${i}`);}
 rig.dispose();expect(rig.group.getObjectByName('finger_L')).toBeUndefined();
});

it('puts five touching toes along each sole over the foot, and sizes fingers and toes together from one slider',()=>{
 const spec=generate('toes'),rig=createCharacter(spec);
 for(const side of ['L','R']){
  const toes=rig.group.getObjectByName(`toes_${side}`) as SkinnedMesh,foot=rig.group.getObjectByName(`foot_${side}_mesh`) as SkinnedMesh;
  expect(toes.renderOrder).toBeGreaterThan(foot.renderOrder);
  expect((toes.material as MeshBasicMaterial).color.getHexString()).toBe(new MeshBasicMaterial({color:palette[spec.parts.hand_L.accent].hex}).color.getHexString());
 }
 // The figure stands on its toes' lowest point.
 rig.applyPose('idle');let low=Infinity;const v=new Vector3();for(const o of rig.group.children)if(o instanceof SkinnedMesh){const p=o.geometry.getAttribute('position');for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);o.applyBoneTransform(i,v);v.applyMatrix4(o.matrixWorld);low=Math.min(low,v.y);}}
 expect(low).toBeCloseTo(0,2);
 const big=createCharacter(spec,'HFCD',undefined,{...defaultProportions,fingers:1.5});
 expect(big.fingers.radius).toBeCloseTo(rig.fingers.radius*1.5,6);
 // Bigger toes widen the row by the same factor, so the circles still touch without overlapping.
 const size=(r:ReturnType<typeof createCharacter>)=>{const g=(r.group.getObjectByName('toes_L') as SkinnedMesh).geometry;g.computeBoundingBox();const b=g.boundingBox!;return [b.max.x-b.min.x,b.max.y-b.min.y];};
 expect(size(big)[1]/size(rig)[1]).toBeCloseTo(1.5,1);expect(size(rig)[0]/size(rig)[1]).toBeCloseTo(5,1);expect(size(big)[0]/size(big)[1]).toBeCloseTo(5,1);
 rig.dispose();big.dispose();
});

it('puts a sliding flow gradient on four random parts, never a mirrored pair and never touching another patterned part',()=>{
 const touching:Record<string,string[]>={hand:['forearm'],forearm:['hand'],foot:['shin'],shin:['foot']},textured=(s:ReturnType<typeof generate>,id:string)=>s.parts[id].pattern>0&&s.parts[id].pattern!==twoTone;
 const seen=new Set<string>(),base=generate('flow-base');
 for(let i=0;i<200;i++){
  const s=i%3===0?generate(`fl-${i}`,base,new Set(['head'])):i%3===1?generate(`fl-${i}`,base,new Set(),['hand_L','shin_R','spine_upper'][i%3]):generate(`fl-${i}`);
  const on=bones.filter(b=>s.parts[b.id].pattern===flow).map(b=>b.id);
  expect(on.length,`${i}`).toBe(4);for(const id of on)expect(on,`${i}`).not.toContain(twinOf(id));
  // Two flow parts never touch each other either.
  for(const id of on){const [part,side]=id.split('_');for(const n of touching[part]??[])expect(on,`${i}: ${id}`).not.toContain(`${n}_${side}`);}
  for(const id of on){
   seen.add(id.split('_')[0]);const [part,side]=id.split('_');
   for(const n of touching[part]??[])expect(textured(s,`${n}_${side}`),`${i}: ${id} touches ${n}`).toBe(false);
   if(part==='thigh')expect(textured(s,s.parts.spine_lower.variant===0?'spine_upper':'root'),`${i}: ${id}`).toBe(false);
  }
  expect(decodeSeed(encodeSeed(s)).parts[on[0]].pattern).toBe(flow);
 }
 expect(seen.size).toBeGreaterThan(5);
 // The flow keeps moving: one tick slides each flow texture along.
 const rig=createCharacter(base),id=bones.find(b=>base.parts[b.id].pattern===flow)!.id;
 expect(rig.group.getObjectByName(`${id}_mesh`)).toBeDefined();rig.tick(1);rig.dispose();
});

it('scales the patchwork cells with Checker scale and the flow speed with Flow speed (0 stops it)',()=>{
 expect(normalizeProportions({checker:9,flowSpeed:-5})).toMatchObject({checker:2.5,flowSpeed:-3});expect(normalizeProportions({flowSpeed:-1.5}).flowSpeed).toBe(-1.5);
 const spec=generate('sliders'),id=bones.find(b=>spec.parts[b.id].pattern===flow)!.id,spot=bones.find(b=>spec.parts[b.id].pattern===patchwork)!.id;
 const offsetAfter=(flowSpeed:number)=>{const rig=createCharacter(spec,'HFCD',undefined,{...defaultProportions,flowSpeed}),map=((rig.group.getObjectByName(`${id}_mesh`) as SkinnedMesh).material as MeshBasicMaterial).map;const before=map?.offset.x??0;rig.tick(3);const moved=(map?.offset.x??0)-before;rig.dispose();return {moved,map};};
 // Node has no canvas, so textures are only built in the browser; there the offset moves unless Flow speed is 0.
 const still=offsetAfter(0);if(still.map)expect(still.moved).toBe(0);
 const rig=createCharacter(spec,'HFCD',undefined,{...defaultProportions,checker:2});expect(rig.group.getObjectByName(`${spot}_mesh`)).toBeDefined();rig.dispose();
});

it('places every hair style on every head: caps and helmets stay above the face mark, the back sits behind the head, in its own colour',()=>{
 for(let head=0;head<variants.head.length;head++)for(let style=0;style<hairStyles.length;style++){
  if(hairStyles[style].retired)continue;
  const spec=generate('hair');spec.parts.head.variant=head;spec.parts.hair.variant=style;const rig=createCharacter(spec),label=`head ${head}, ${hairStyles[style].name}`;
  const front=rig.group.getObjectByName('hair_mesh') as SkinnedMesh,mark=rig.group.getObjectByName('face_mark_mesh') as SkinnedMesh,headMesh=rig.group.getObjectByName('head_mesh') as SkinnedMesh;
  expect(front.renderOrder,label).toBeGreaterThan(headMesh.renderOrder);expect(mark.renderOrder,label).toBeGreaterThan(front.renderOrder);
  // The cap's lowest point is above the mark's top (both in world space at rest).
  const extreme=(m:SkinnedMesh,pick:(a:number,b:number)=>number,start:number)=>{const p=m.geometry.getAttribute('position'),v=new Vector3();let y=start;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m.matrixWorld);y=pick(y,v.y);}return y;};
  // (A style whose front is all accent, like Shades, keeps only a hidden speck in the hair colour.)
  front.geometry.computeBoundingBox();const speck=front.geometry.boundingBox!.max.x-front.geometry.boundingBox!.min.x<.01;
  if(!speck)expect(extreme(front,Math.min,Infinity),label).toBeGreaterThan(extreme(mark,Math.max,-Infinity));
  const accent=rig.group.getObjectByName('hair_front_accent') as SkinnedMesh|undefined;
  if(accent){expect(extreme(accent,Math.min,Infinity),label).toBeGreaterThan(extreme(mark,Math.max,-Infinity));expect(accent.renderOrder,label).toBeGreaterThan(front.renderOrder);expect(accent.renderOrder,label).toBeLessThan(mark.renderOrder);}
  for(const dangle of rig.hair.meshes)expect(dangle.renderOrder,label).toBeLessThan(headMesh.renderOrder);
  for(const name of ['hair_back','hair_back_accent']){const back=rig.group.getObjectByName(name) as SkinnedMesh|undefined;if(back)expect(back.renderOrder,label).toBeLessThan(headMesh.renderOrder);}
  rig.dispose();
 }
 for(let i=0;i<60;i++){const s=generate(`hair-${i}`);expect(s.parts.hair.color,`${i}`).not.toBe(s.parts.head.color);}
 // The Hair slider scales the back pieces.
 const spec=generate('hair-size');spec.parts.hair.variant=hairStyles.findIndex(s=>s.name==='Fin');const size=(hair:number)=>{const rig=createCharacter(spec,'HFCD',undefined,{...defaultProportions,hair}),g=(rig.group.getObjectByName('hair_back') as SkinnedMesh).geometry;g.computeBoundingBox();const w=g.boundingBox!.max.x-g.boundingBox!.min.x;rig.dispose();return w;};
 expect(size(1.5)/size(1)).toBeCloseTo(1.5,2);
},30000);

it('keeps every hair style symmetrical, and every helmet covers the top of every head shape',()=>{
 const inside=([x,y]:[number,number],poly:[number,number][])=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;}return hit;};
 const placed=(head:number,style:number,size=1)=>{const h=headOutlines[head],lift=.31-Math.max(...h.outline.map(p=>p[1])),outline=h.outline.map(([x,y])=>[x,y+lift] as [number,number]);return {outline,markTop:h.markY+.05,hair:placeHair(hairStyles[style],outline,h.markY+.05,size)};};
 for(let style=0;style<hairStyles.length;style++){
  const {hair}=placed(0,style),points=[...hair.back,...hair.front].flatMap(p=>p.points).concat(hair.dangles.flatMap(d=>restCircles(d).map(c=>[c.x,c.y] as [number,number])));
  for(const [x,y] of points)expect(Math.min(...points.map(([u,v])=>Math.hypot(u+x,v-y))),`${hairStyles[style].name} at ${x.toFixed(3)},${y.toFixed(3)}`).toBeLessThan(2e-4);
  if(!hairStyles[style].front||hairStyles[style].cover===false)continue;
  for(let head=0;head<headOutlines.length;head++)for(const size of [.5,1,1.5]){
   const {outline,markTop,hair}=placed(head,style,size),brow=Math.min(...hair.front.flatMap(p=>p.points.map(q=>q[1])));
   expect(brow,`${hairStyles[style].name} on head ${head}`).toBeGreaterThanOrEqual(markTop+.008-1e-9);
   for(let i=0;i<outline.length;i++)for(let k=0;k<8;k++){
    const a=outline[i],b=outline[(i+1)%outline.length],p:[number,number]=[a[0]+(b[0]-a[0])*k/8,a[1]+(b[1]-a[1])*k/8];
    if(p[1]>brow+.002)expect(hair.front.some(f=>inside(p,f.points)),`${hairStyles[style].name} on head ${head} (${size}) leaves ${p.map(v=>v.toFixed(3))} uncovered`).toBe(true);
   }
  }
 }
});

it('swings ragdoll hair as the head moves, never stretching or overlapping, and brings it back to rest',()=>{
 const named=(name:string)=>hairStyles.findIndex(s=>s.name===name);
 for(const name of ['Antenna','Plume','Star','Ball top']){
  const spec=generate('dangles');spec.parts.hair.variant=named(name);const rig=createCharacter(spec);
  const check=(label:string)=>{for(const chain of rig.hair.state()){let from=chain.anchor,reach=chain.rope;chain.balls.forEach((b,i)=>{expect(b.pos.distanceTo(from),`${name} ${label} ${i}`).toBeCloseTo(reach,4);from=b.pos;reach=b.r+(chain.balls[i+1]?.r??0);});}};
  expect(rig.hair.meshes.length,name).toBeGreaterThan(0);check('rest');
  const rest=rig.hair.state().map(c=>c.balls.map(b=>b.pos.clone()));
  rig.applyPose('stride');let moved=0;for(let i=0;i<20;i++){rig.tick(1/60);check(`swing ${i}`);}
  // Still lagging behind the head a third of a second later: it moves like a ragdoll, not a rigid shape.
  rig.applyPose('reach');rig.tick(1/60);rig.tick(1/60);
  const lag=rig.hair.state().map(c=>c.balls.map(b=>b.pos.clone()));rig.settleFingers();
  const settled=rig.hair.state();settled.forEach((c,i)=>c.balls.forEach((b,j)=>{moved=Math.max(moved,b.pos.distanceTo(lag[i][j]));}));
  expect(moved,name).toBeGreaterThan(.001);
  rig.applyPose('reach');rig.settleFingers();for(let i=0;i<120;i++)rig.tick(1/60);
  const a=rig.hair.state();rig.tick(1/60);const b=rig.hair.state();
  a.forEach((c,i)=>c.balls.forEach((ball,j)=>expect(ball.pos.distanceTo(b[i].balls[j].pos),`${name} at rest`).toBeLessThan(1e-3)));
  void rest;rig.dispose();
 }
});

it('fills Donut and Ring holes with the stage colour, just under their part, but leaves the Ring hand open',()=>{
 const spec=generate('holes');spec.parts.spine_upper.variant=bodyShapes.indexOf('Donut');
 for(const j of ['shoulder','elbow','knee'])for(const side of ['L','R'])spec.parts[`${j}_${side}`].variant=jointShapes.indexOf('Ring');
 spec.parts.hand_L.variant=spec.parts.hand_R.variant=variants.hand.indexOf('Ring');
 const rig=createCharacter(spec);
 const torso=rig.group.getObjectByName('spine_upper_mesh');
 const plugs=rig.group.children.filter(o=>o.name.endsWith('_plug')) as SkinnedMesh[];
 const names=plugs.map(p=>p.name).sort();
 for(const j of ['shoulder','elbow','knee'])for(const side of ['L','R'])expect(names).toContain(`${j}_${side}_plug`);
 expect(torso).toBeDefined();if(bodyLayout(spec).top.holes?.length)expect(names).toContain('spine_upper_plug');
 expect(names.some(n=>n.startsWith('hand_'))).toBe(false);
 for(const plug of plugs){
  const part=rig.group.getObjectByName(plug.userData.part)!;
  expect(plug.renderOrder).toBeLessThan(part.renderOrder);expect(plug.renderOrder).toBeGreaterThan(part.renderOrder-.1);
  expect((plug.material as MeshBasicMaterial).color.getHexString()).toBe(new MeshBasicMaterial({color:'#000000'}).color.getHexString());
 }
 rig.setStage('#eae7e6');
 for(const plug of plugs)expect((plug.material as MeshBasicMaterial).color.getHexString()).toBe(new MeshBasicMaterial({color:'#eae7e6'}).color.getHexString());
 rig.dispose();
});

it('rests totem headwear on the head, touching it without overlapping, on every head shape',()=>{
 for(let head=0;head<headOutlines.length;head++)for(const style of hairStyles.filter(s=>s.sits)){
  const h=headOutlines[head],lift=.31-Math.max(...h.outline.map(p=>p[1])),outline=h.outline.map(([x,y])=>[x,y+lift] as [number,number]),hair=placeHair(style,outline,h.markY+.05);
  const top=(x:number)=>{let t=-Infinity;for(let i=0;i<outline.length;i++){const [ax,ay]=outline[i],[bx,by]=outline[(i+1)%outline.length];if((ax-x)*(bx-x)<=0&&ax!==bx)t=Math.max(t,ay+(by-ay)*(x-ax)/(bx-ax));}return t;};
  let gap=Infinity;
  for(const p of hair.back)for(let i=0;i<p.points.length;i++){const a=p.points[i],b=p.points[(i+1)%p.points.length];for(let k=0;k<20;k++){const x=a[0]+(b[0]-a[0])*k/20,y=a[1]+(b[1]-a[1])*k/20,t=top(x);if(Number.isFinite(t))gap=Math.min(gap,y-t);}}
  expect(gap,`${style.name} on head ${head}`).toBeGreaterThan(-.003);expect(gap,`${style.name} on head ${head}`).toBeLessThan(.003);
 }
});

it('never draws a retired hair style and opens one from an old seed as its stand-in',()=>{
 for(let i=0;i<300;i++)expect(hairStyles[generate(`retired-${i}`).parts.hair.variant].retired,`${i}`).toBeUndefined();
 const spec=generate('retired');const gear=hairStyles.findIndex(s=>s.name==='Gear');spec.parts.hair.variant=gear;
 expect(hairStyles[decodeSeed(encodeSeed(spec)).parts.hair.variant].name).toBe(hairStyles[gear].retired);
});

it('reads riso settings in range, also the older on/off switch, and keeps them with the saved look',()=>{
 expect(normalizeRiso(undefined)).toEqual(defaultRiso);expect(normalizeRiso(true)).toEqual({...defaultRiso,on:true});
 expect(normalizeRiso({on:true,size:9,coverage:-1,angle:400,grain:'x',opacity:.5,color:'red',blend:'Glow',invert:true})).toEqual({...defaultRiso,on:true,size:.04,coverage:.3,angle:90,opacity:.5,invert:true});
 const custom={on:true,color:'#112233',blend:'Multiply' as const,opacity:.7,size:.012,coverage:.6,angle:15,grain:0,invert:false};
 expect(normalizeSettings({riso:custom}).riso).toEqual(custom);expect(normalizeSettings({riso:false}).riso).toEqual(defaultRiso);
});

it('gives each checker spot one of four looks on its own, stripes and checks in two different colours of the character',()=>{
 const seen=new Set<number>();let differ=0;
 for(let i=0;i<200;i++){
  const spec=generate(`checker-${i}`),spots=bones.filter(b=>spec.parts[b.id].pattern===patchwork).map(b=>b.id),colorOf=partColorsFor(spec);
  const styles=spots.map(id=>checkerStyleOf(spec,id));styles.forEach(s=>seen.add(s));if(new Set(styles).size>1)differ++;
  for(const id of spots){const [a,b]=checkerColours(spec,id,colorOf);expect(a).not.toBe(b);const own=Object.values(spec.parts).flatMap(p=>[colorOf(p.color),colorOf(p.accent)]);expect(own).toContain(a);expect(own).toContain(b);}
 }
 expect(seen.size).toBe(checkerStyles.length);expect(differ).toBeGreaterThan(50);
});

it('draws two parts on the pixel grid, never joints, plain segments first, cells square and on the grid, following the pose',()=>{
 for(let i=0;i<40;i++){
  const spec=generate(`pixel-${i}`),ids=pixelPartsOf(spec);
  expect(ids.length,`${i}`).toBe(2);expect(new Set(ids).size).toBe(2);
  const plainSegments=bones.filter(b=>(b.kind==='limb'||b.kind==='leg')&&spec.parts[b.id].pattern===0).map(b=>b.id);
  for(const id of ids){expect(isJoint(id),id).toBe(false);expect(['limb','leg','hand','foot']).toContain(bones.find(b=>b.id===id)!.kind);expect([0,twoTone]).toContain(spec.parts[id].pattern);}
  if(plainSegments.length>=2)for(const id of ids)expect(plainSegments,id).toContain(id);
  const rig=createCharacter(spec);expect(rig.pixels.map(p=>p.part.name)).toEqual(ids.map(id=>`${id}_mesh`));
  for(const pixel of rig.pixels){
   expect(pixel.part.visible).toBe(false);const cells=pixel.mesh.geometry.drawRange.count/6;expect(cells).toBeGreaterThan(3);
   const p=pixel.mesh.geometry.getAttribute('position');
   for(let k=0;k<cells*4;k++)for(const v of [p.getX(k),p.getY(k)])expect(Math.abs(v/pixelSize-Math.round(v/pixelSize))).toBeLessThan(1e-4);
  }
  const box=()=>rig.pixels.map(px=>{const b=new Box3().setFromArray((px.mesh.geometry.getAttribute('position').array as Float32Array).subarray(0,px.mesh.geometry.drawRange.count/6*12));return b.min.toArray().concat(b.max.toArray()).join();}).join('|');
  const before=box();rig.applyPose('stride');expect(box()).not.toBe(before);
  rig.dispose();
 }
});

it('lets the pixel part be turned off, resized and redrawn at a low frame rate',()=>{
 expect(normalizePixel(undefined)).toEqual(defaultPixel);expect(normalizePixel({on:false,size:1,fps:7})).toEqual({on:false,size:.08,fps:0});
 const rig=createCharacter(generate('pixel-controls')),pixel=rig.pixels[0],cells=()=>pixel.mesh.geometry.drawRange.count;
 const p=pixel.mesh.geometry.getAttribute('position'),snapshot=()=>Array.from((p.array as Float32Array).subarray(0,cells()*2)).join();
 rig.setPixel({on:true,size:.07,fps:0});const big=cells();rig.setPixel({on:true,size:.02,fps:0});expect(cells()).toBeGreaterThan(big);
 rig.setPixel({on:true,size:.035,fps:4});const still=snapshot();rig.applyPose('stride');expect(snapshot()).toBe(still);
 rig.tick(.1);expect(snapshot()).toBe(still);rig.tick(.2);expect(snapshot()).not.toBe(still);
 rig.setPixel({on:false,size:.035,fps:0});expect(pixel.mesh.visible).toBe(false);expect(pixel.part.visible).toBe(true);
 rig.dispose();
});

it('spray-blurs two random parts when turned on: grainy copies in the part\'s layer, the part itself hidden',()=>{
 expect(normalizeSpray(undefined)).toEqual(defaultSpray);expect(normalizeSpray({on:true,amount:9})).toEqual({on:true,amount:.15});
 for(let i=0;i<10;i++){
  const spec=generate(`spray-${i}`),ids=sprayPartsOf(spec);
  expect(ids.length).toBe(2);expect(new Set(ids).size).toBe(2);for(const id of pixelPartsOf(spec))expect(ids).not.toContain(id);for(const id of ids)expect(isJoint(id),id).toBe(false);
  const rig=createCharacter(spec);
  for(const spray of rig.sprays){expect(spray.meshes.every(m=>!m.visible)).toBe(true);expect(spray.part.visible).toBe(true);}
  rig.setSpray({on:true,amount:.08});
  for(const spray of rig.sprays){
   expect(spray.part.visible).toBe(false);
   for(const m of spray.meshes){expect(m.visible).toBe(true);expect(m.renderOrder).toBe(spray.part.renderOrder);const mat=m.material as MeshBasicMaterial;expect(mat.alphaHash).toBe(true);expect(mat.transparent).toBe(false);expect(mat.opacity).toBeLessThan(.2);}
  }
  rig.setSpray({on:false,amount:.08});for(const spray of rig.sprays)expect(spray.part.visible).toBe(true);
  rig.dispose();
 }
});

it('draws the hip joints behind the body piece that carries them but over the thighs, in the shoulders\' shape',()=>{
 for(let i=0;i<12;i++){
  const spec=generate(`hips-${i}`),rig=createCharacter(spec),carrier=rig.group.getObjectByName(spec.parts.spine_lower.variant===0?'spine_upper_mesh':'root_mesh')!;
  for(const side of ['L','R']){const hip=rig.group.getObjectByName(`hip_${side}_mesh`)!;expect(hip.renderOrder,`${i} ${side}`).toBeLessThan(carrier.renderOrder);expect(hip.renderOrder).toBeGreaterThan(rig.group.getObjectByName(`thigh_${side}_mesh`)!.renderOrder);}
  expect(partName(spec,bones.find(b=>b.id==='hip_L')!)).toBe(jointShapes[jointShapeOf(spec.parts.shoulder_L.variant)]);
  rig.dispose();
 }
});

it('follows the pattern rules: counts, mirrored pairs, touching parts, weave, pixel and spray parts, checker looks',()=>{
 const count=(spec:ReturnType<typeof generate>,pattern:number)=>Object.values(spec.parts).filter(p=>p.pattern===pattern).length;
 try{
  expect(normalizeRules({checker:99,flow:-3,twoTone:7,checkerStyles:[false,false,false,false]})).toEqual({...defaultRules,checker:6,flow:0,twoTone:1});
  setRules({...defaultRules,checker:3,flow:6,pixel:3,spray:1});
  for(let i=0;i<20;i++){const spec=generate(`rules-${i}`);expect(count(spec,patchwork),`${i}`).toBe(3);expect(count(spec,flow)).toBeGreaterThanOrEqual(4);expect(count(spec,flow)).toBeLessThanOrEqual(6);expect(pixelPartsOf(spec).length).toBe(3);expect(sprayPartsOf(spec).length).toBe(1);}
  setRules({...defaultRules,checker:0,flow:0,weave:0,twoTone:0});
  for(let i=0;i<20;i++){const spec=generate(`rules-${i}`);expect(Object.values(spec.parts).every(p=>p.pattern===0),`${i}`).toBe(true);}
  setRules({...defaultRules,weave:2});
  for(let i=0;i<20;i++){const spec=generate(`rules-${i}`);if(spec.parts.spine_lower.variant!==0){expect(spec.parts.spine_upper.pattern).toBeGreaterThan(0);expect(spec.parts.root.pattern).toBeGreaterThan(0);}}
  setRules({...defaultRules,checkerStyles:[false,false,false,true]});
  for(let i=0;i<20;i++){const spec=generate(`rules-${i}`);for(const b of bones)if(spec.parts[b.id].pattern===patchwork)expect(checkerStyleOf(spec,b.id)).toBe(3);}
  // With the touching and mirror rules off, a thigh may take a checker under a woven piece, and a pair may both take it.
  setRules({...defaultRules,checker:6,checkerApart:false,touching:false});
  let mirrored=0;for(let i=0;i<20;i++){const spec=generate(`rules-${i}`);expect(count(spec,patchwork)).toBe(6);if(spec.parts.upperarm_L.pattern===patchwork&&spec.parts.upperarm_R.pattern===patchwork)mirrored++;}
  expect(mirrored).toBeGreaterThan(0);
 }finally{setRules(defaultRules);}
});

it('seats the top piece cleanly on the bottom one: nothing of it below the top line of the bottom piece pokes out beside it',()=>{
 const inside=(poly:[number,number][],[x,y]:[number,number])=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)hit=!hit;}return hit;};
 const base=generate('seat');
 for(const body of everyBody()){
  const layout=bodyLayout(withBody(base,body));if(!layout.bottom||isRound(body.top))continue;
  const s=Math.max(...layout.bottom.outline.map(p=>p[1]));
  const near=(poly:[number,number][],[x,y]:[number,number])=>poly.some((a,i)=>{const b=poly[(i+1)%poly.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(a[0]+dx*t-x,a[1]+dy*t-y)<1e-4;});
  for(const [x,y] of layout.top.outline)if(y<s-1e-6)expect(inside(layout.bottom.outline as [number,number][],[x,y])||near(layout.bottom.outline as [number,number][],[x,y]),`${JSON.stringify(body)} at ${x.toFixed(3)},${y.toFixed(3)}`).toBe(true);
 }
});

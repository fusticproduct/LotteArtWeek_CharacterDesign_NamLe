import {it,expect} from 'vitest';
import {PerspectiveCamera,Vector3,Mesh,MeshBasicMaterial,DoubleSide,Raycaster,SkinnedMesh} from 'three';
import {OrbitControls} from 'three-stdlib';
import {orbitMouseButtons} from '../src/controls';
import {bones,generate,recolor,decodeSeed,encodeSeed,variants,twoTone,isBeaded,pairedSegment,poseRotation,defaultProportions,isJoint,linkedIds} from '../src/model';
import {solveAngles,smoothPose,toLocal,updateLayers,initialLayerState} from '../src/pose';
import {createCharacter,drawOrder,defaultLayerOrder,normalizeLayerOrder,shoulderRadius} from '../src/rig';
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
it('keeps shoulders spherical for new, locked and legacy seeded characters',()=>{
 for(let i=0;i<50;i++){const spec=generate(`shoulder-${i}`);expect(spec.parts.shoulder_L.variant).toBe(0);expect(spec.parts.shoulder_R.variant).toBe(0);spec.parts.shoulder_L.variant=3;expect(decodeSeed(encodeSeed(spec)).parts.shoulder_L.variant).toBe(0);expect(generate('locked',spec,new Set(['shoulder_L'])).parts.shoulder_L.variant).toBe(0);}
 for(const id of ['thigh_L','thigh_R','shin_L','shin_R'])expect(bones.find(b=>b.id===id)!.length).toBeCloseTo(.4*1.5);
});
it('produces subdivided beveled round surfaces with finite normals and exact bounds',()=>{
 for(const top of [0,.1]){const g=beveledCylinder(top,.1,.4);g.computeBoundingBox();expect(g.getAttribute('position').count).toBeGreaterThan(1000);expect(g.boundingBox!.getSize(new Vector3()).y).toBeCloseTo(.4,6);expect(Array.from(g.getAttribute('normal').array).every(Number.isFinite)).toBe(true);const p=g.getAttribute('position');let curvedRim=false;for(let i=0;i<p.count;i++){const r=Math.hypot(p.getX(i),p.getZ(i));if(p.getY(i)>-.2&&p.getY(i)<-.195&&r>.092&&r<.1)curvedRim=true;}expect(curvedRim).toBe(true);g.dispose();}
});

it('encloses every hip variant inside each pelvis silhouette',()=>{
 const material=new MeshBasicMaterial({side:DoubleSide});
 for(let pelvisVariant=0;pelvisVariant<6;pelvisVariant++)for(let hipVariant=0;hipVariant<4;hipVariant++){
  const spec=generate('hip-coverage');spec.parts.root.variant=pelvisVariant;spec.parts.hip_L.variant=spec.parts.hip_R.variant=hipVariant;
  const rig=createCharacter(spec),pelvis=new Mesh((rig.group.getObjectByName('root_mesh') as SkinnedMesh).geometry,material);
  pelvis.updateMatrixWorld(true);
  for(const side of ['L','R']){
   const def=bones.find(b=>b.id===`hip_${side}`)!,offset=new Vector3(...def.headPosition);
   expect(Math.abs(offset.x)).toBeLessThan(.15);
   const positions=(rig.group.getObjectByName(`hip_${side}_mesh`) as SkinnedMesh).geometry.getAttribute('position');
   for(let i=0;i<positions.count;i+=Math.max(1,Math.floor(positions.count/40))){
    const point=new Vector3().fromBufferAttribute(positions,i).add(offset);
    const hits=new Raycaster(point,new Vector3(.013,.017,1).normalize()).intersectObject(pelvis);
    const distances=hits.map(h=>h.distance).filter((d,i,a)=>!i||Math.abs(d-a[i-1])>1e-6);
    expect(distances.length%2,`pelvis ${pelvisVariant}, hip ${hipVariant}, ${side}, vertex ${i}`).toBe(1);
   }
  }
  rig.dispose();
 }
 material.dispose();
});

it('mirrors hands, feet and joints (shape + colour) and leg shapes across left/right, including rerolls and locks',()=>{
 let s=generate('mirror-0');
 for(let i=0;i<120;i++){
  s=i%3===0?generate(`m-${i}`,s,new Set(['hand_L','thigh_R'])):generate(`m-${i}`,s,new Set(),['hand_R','foot_L','hip_R','shin_L','thigh_R'][i%5]);
  for(const part of ['shoulder','hip','hand','foot'])expect(s.parts[`${part}_R`],`${i}: ${part}`).toEqual(s.parts[`${part}_L`]);
  for(const part of ['thigh','shin'])expect(s.parts[`${part}_R`].variant,`${i}: ${part}`).toBe(s.parts[`${part}_L`].variant);
  for(const b of bones){if(b.parent)expect(s.parts[b.id].color,`${i}: ${b.id}`).not.toBe(s.parts[b.parent].color);}
 }
});
it('keeps texture patterns on the torso and pelvis only, also for older seeds',()=>{
 for(let i=0;i<60;i++){const s=generate(`pattern-${i}`);expect(s.parts.spine_upper.pattern).toBeGreaterThan(0);for(const b of bones)if(!['torso','pelvis'].includes(b.kind))expect([0,twoTone].includes(s.parts[b.id].pattern)&&(s.parts[b.id].pattern===0||['limb','leg'].includes(b.kind)),b.id).toBe(true);}
 const legacy=generate('legacy');legacy.parts.thigh_L.pattern=2;legacy.parts.hand_R.variant=3;
 const restored=decodeSeed(encodeSeed(legacy));expect(restored.parts.thigh_L.pattern).toBe(0);expect(restored.parts.hand_R).toEqual(restored.parts.hand_L);
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
 const packed=encodeSeed(spec).split('~')[1],legacy=packed.slice(0,2)+bones.map((b,i)=>/^(knee|elbow)_/.test(b.id)?'':packed.slice(2+i*4,6+i*4)).join('');
 const restored=decodeSeed(`knees~${legacy}`);for(const b of bones)if(!/^(knee|elbow)_/.test(b.id))expect(restored.parts[b.id]).toEqual(spec.parts[b.id]);
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
 const old=packed.slice(0,2)+bones.map((b,i)=>b.id.startsWith('elbow_')?'':packed.slice(2+i*4,6+i*4)).join('');
 const restored=decodeSeed(`elbows~${old}`);for(const b of bones)if(!b.id.startsWith('elbow_'))expect(restored.parts[b.id]).toEqual(spec.parts[b.id]);
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
it('reads version-1 seeds onto the flat torso catalogue and writes version 2',()=>{
 const spec=generate('legacy-torso'),packed=encodeSeed(spec).split('~')[1],i=bones.findIndex(b=>b.id==='spine_upper');
 expect(packed[0]).toBe('2');
 // Bowl→Bowl, Stack→Column, Donut→Donut, Vase→Funnel; an index past the old 11 torsos is still rejected.
 for(const [old,now] of [[0,3],[7,0],[9,6],[10,1]]){const v1='1'+packed.slice(1,2+i*4)+old.toString(36)+packed.slice(3+i*4);expect(decodeSeed(`legacy-torso~${v1}`).parts.spine_upper.variant).toBe(now);}
 expect(()=>decodeSeed(`legacy-torso~1${packed.slice(1,2+i*4)}b${packed.slice(3+i*4)}`)).toThrow();
});
it('scales parts from the Proportions tab without changing bone lengths, and keeps each shoulder on its torso edge',()=>{
 const extent=(rig:ReturnType<typeof createCharacter>,id?:string)=>{let lo=Infinity,hi=-Infinity;for(const b of bones){if(id&&b.id!==id)continue;const mesh=rig.group.getObjectByName(`${b.id}_mesh`) as SkinnedMesh,p=mesh.geometry.getAttribute('position');for(let i=0;i<p.count;i++){const y=new Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).y;lo=Math.min(lo,y);hi=Math.max(hi,y);}}return hi-lo;};
 const side=new MeshBasicMaterial({side:DoubleSide}),spec=generate('proportions'),base=createCharacter(spec),bigHead=createCharacter(spec,'HFCD',undefined,{...defaultProportions,head:1.2});
 expect(extent(bigHead)-extent(base)).toBeCloseTo(.31*.2,4);
 expect(bigHead.map.get('elbow_L')!.position.toArray()).toEqual(base.map.get('elbow_L')!.position.toArray());
 const width=(rig:ReturnType<typeof createCharacter>,id:string)=>{const g=(rig.group.getObjectByName(`${id}_mesh`) as SkinnedMesh).geometry;g.computeBoundingBox();return g.boundingBox!.max.x-g.boundingBox!.min.x;};
 // A straight (cylinder) forearm, whose width is exactly its thickness.
 const tube={...spec,parts:{...spec.parts,forearm_L:{...spec.parts.forearm_L,variant:0}}},thick=createCharacter(tube,'HFCD',undefined,{...defaultProportions,arms:1.4}),plain=createCharacter(tube);expect(width(thick,'forearm_L')/width(plain,'forearm_L')).toBeCloseTo(1.4,5);plain.dispose();
 for(let v=0;v<variants.torso.length;v++)for(const torsoWidth of [.5,1,1.5]){
  spec.parts.spine_upper.variant=v;const rig=createCharacter(spec,'HFCD',undefined,{...defaultProportions,torsoWidth});
  // Torso edge at shoulder height, found by a ray coming in from the side (torso space = spine_upper space).
  const torso=new Mesh((rig.group.getObjectByName('spine_upper_mesh') as SkinnedMesh).geometry,side);torso.updateMatrixWorld(true);
  const edge=new Raycaster(new Vector3(2,.325,0),new Vector3(-1,0,0)).intersectObject(torso)[0].point.x;
  // The shoulder ball is centred just outside the edge, so it always overlaps the torso.
  const x=rig.map.get('shoulder_L')!.position.x;expect(x-edge,`torso ${v} at ${torsoWidth}`).toBeGreaterThan(.03);expect(x-edge,`torso ${v} at ${torsoWidth}`).toBeLessThan(shoulderRadius);
  expect(rig.map.get('shoulder_R')!.position.x).toBeCloseTo(-x,9);rig.dispose();
 }
 base.dispose();bigHead.dispose();thick.dispose();side.dispose();
});
it('gives every joint one colour that differs from all its neighbours, and locks or rerolls the joints as one group',()=>{
 const joints=bones.filter(b=>isJoint(b.id)).map(b=>b.id);expect(linkedIds('elbow_L')).toEqual(joints);
 let s=generate('joints-0');
 for(let i=0;i<120;i++){
  const before=s.parts.knee_L.color;
  s=i%3===0?generate(`j-${i}`,s,new Set(['knee_R'])):i%3===1?generate(`j-${i}`,s,new Set(),'elbow_L'):generate(`j-${i}`);
  expect(new Set(joints.map(id=>s.parts[id].color)).size,`${i}`).toBe(1);
  if(i%3===0)expect(s.parts.knee_L.color).toBe(before);
  for(const b of bones)if(b.parent)expect(s.parts[b.id].color,`${i}: ${b.id}`).not.toBe(s.parts[b.parent].color);
 }
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
it('paints each character with its own five-colour scheme, keeps locked colours, and recolours without changing shapes',()=>{
 const roles=(s:ReturnType<typeof generate>)=>new Set(bones.filter(b=>b.kind!=='face').map(b=>s.parts[b.id].color));
 const seen=new Set<string>();
 for(let i=0;i<200;i++){
  const s=generate(`scheme-${i}`);expect(roles(s).size,`${i}`).toBeLessThanOrEqual(5);
  expect(s.parts.hand_L.color).toBe(s.parts.foot_R.color);expect(s.parts.root.color).toBe(s.parts.hand_L.color);
  seen.add([...roles(s)].sort().join('.'));
 }
 // 200 characters, almost all with a different set of colours.
 expect(seen.size).toBeGreaterThan(180);
 const base=generate('scheme-base'),locked=new Set(['head','hand_L']);
 const next=generate('scheme-next',base,locked);expect(next.parts.head.color).toBe(base.parts.head.color);expect(next.parts.foot_L.color).toBe(base.parts.hand_L.color);
 const again=recolor(base,new Set(['knee_L']),'salt');
 for(const b of bones){expect(again.parts[b.id].variant).toBe(base.parts[b.id].variant);if(b.parent)expect(again.parts[b.id].color,b.id).not.toBe(again.parts[b.parent].color);}
 expect(again.parts.elbow_R.color).toBe(base.parts.knee_L.color);
 // Rerolling one part changes only its shape.
 const shape=generate('scheme-shape',base,new Set(),'head');expect(shape.parts.head.color).toBe(base.parts.head.color);
});


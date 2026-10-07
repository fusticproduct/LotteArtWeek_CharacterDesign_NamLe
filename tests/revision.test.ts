import {it,expect} from 'vitest';
import {PerspectiveCamera,Vector3,Mesh,MeshBasicMaterial,DoubleSide,Raycaster,SkinnedMesh} from 'three';
import {OrbitControls} from 'three-stdlib';
import {orbitMouseButtons} from '../src/controls';
import {bones,generate,decodeSeed,encodeSeed,variants,twoTone,isBeaded,pairedSegment,poseRotation} from '../src/model';
import {solveAngles} from '../src/pose';
import {createCharacter} from '../src/rig';
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

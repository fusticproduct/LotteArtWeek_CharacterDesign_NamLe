import * as THREE from 'three';
/**
 * Ragdoll fingers (Nam, 2026-10-14): five fingers per hand, each a chain of flat circles that touch without overlapping
 * (like the toes), in the hand's colour, drawn just under the hand. The circles' centres are verlet points one
 * diameter apart: gravity, momentum and a pull back to a slightly curled rest shape, so the fingers swing behind the
 * hand. They are simulated in the character group's space, so standing the figure on the floor does not shake them.
 */
interface FingerDef {angle:number;length:number;radius:number;}
/** Thumb (inner side, rounder) to little finger; `angle` (rad) is measured from the hand's axis, outwards positive. */
const fingerDefs:FingerDef[]=[
 {angle:-1.05,length:.075,radius:.018},
 {angle:-.34,length:.11,radius:.016},
 {angle:0,length:.12,radius:.016},
 {angle:.34,length:.11,radius:.0155},
 {angle:.68,length:.09,radius:.014},
];
/** Rim steps per circle; gravity (m/s²); velocity kept per step; inward curl per circle (rad); fixed step (s). */
const circleSteps=20,gravity=-9.8,damping=.9,curl=.05,step=1/60;
/**
 * Pull towards the rest shape per pass at the finger's root, weaker towards the tip. The Finger stiffness slider sets it:
 * 100% keeps the shape and swings a little (Nam asked for much stiffer, 2026-10-14), 50% is floppy, 150% nearly rigid.
 */
export const shapeHold=(stiffness:number)=>Math.min(.9,.3*Math.pow(stiffness,2.6));
/** Where the fingers leave the hand, in the hand bone's space: around the centre of the hand shapes. */
const handCentre=new THREE.Vector3(0,-.045,0),rootReach=.055;
export interface FingerHand {side:'L'|'R';bone:THREE.Bone;color:string;}
interface Chain {def:FingerDef;sign:number;hand:THREE.Bone;radius:number;pos:THREE.Vector3[];prev:THREE.Vector3[];geometry:THREE.BufferGeometry;mesh:THREE.Mesh;}
/** `scale` is the Fingers slider (circle size, so also length), `stiffness` the Finger stiffness slider. */
export function createFingers(group:THREE.Group,hands:FingerHand[],scale=1,stiffness=1){
 const hold=shapeHold(stiffness),chains:Chain[]=[],groupInverse=new THREE.Matrix4(),frame=new THREE.Matrix4(),target=new THREE.Vector3(),dir=new THREE.Vector3(),velocity=new THREE.Vector3();
 for(const hand of hands)for(const def of fingerDefs){
  // As many touching circles as fit the finger's length.
  const radius=def.radius*scale,count=Math.max(2,Math.round(def.length/(2*def.radius))),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*(circleSteps+1)*3),3));
  const index:number[]=[];
  for(let k=0;k<count;k++){const centre=k*(circleSteps+1);for(let i=0;i<circleSteps;i++)index.push(centre,centre+1+i,centre+1+(i+1)%circleSteps);}
  geometry.setIndex(index);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:hand.color,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));
  mesh.name=`finger_${hand.side}`;mesh.frustumCulled=false;mesh.userData={side:hand.side};group.add(mesh);
  chains.push({def,sign:hand.side==='L'?1:-1,hand:hand.bone,radius,pos:Array.from({length:count},()=>new THREE.Vector3()),prev:Array.from({length:count},()=>new THREE.Vector3()),geometry,mesh});
 }
 /** The hand bone's frame in the group's space. */
 const handFrame=(bone:THREE.Bone)=>{group.updateMatrixWorld(true);groupInverse.copy(group.matrixWorld).invert();return frame.multiplyMatrices(groupInverse,bone.matrixWorld);};
 /** Rest direction from circle j to the next: along the hand, fanned out, curling inwards a little more at each circle. */
 const restDir=(c:Chain,j:number,out:THREE.Vector3)=>{const a=(c.def.angle+curl*j)*c.sign;return out.set(Math.sin(a),-Math.cos(a),0).transformDirection(frame);};
 const anchor=(c:Chain,out:THREE.Vector3)=>{const a=c.def.angle*(c.def.angle<-.5?1.3:1)*c.sign;return out.set(Math.sin(a)*rootReach,-Math.cos(a)*rootReach,0).add(handCentre).applyMatrix4(frame);};
 const simulate=(dt:number)=>{
  for(const c of chains){
   handFrame(c.hand);anchor(c,c.pos[0]);c.prev[0].copy(c.pos[0]);
   const n=c.pos.length,gap=2*c.radius;
   for(let j=1;j<n;j++){velocity.subVectors(c.pos[j],c.prev[j]).multiplyScalar(damping);c.prev[j].copy(c.pos[j]);c.pos[j].add(velocity);c.pos[j].y+=gravity*dt*dt;}
   for(let pass=0;pass<3;pass++)for(let j=1;j<n;j++){
    // A pull towards the rest shape (weaker towards the tip), then the circles touch again: one diameter apart.
    target.copy(c.pos[j-1]).addScaledVector(restDir(c,j-1,dir),gap);c.pos[j].lerp(target,hold*(1-.12*j));
    dir.subVectors(c.pos[j],c.pos[j-1]);const d=dir.length()||1;c.pos[j].copy(c.pos[j-1]).addScaledVector(dir,gap/d);
   }
  }
 };
 const draw=()=>{
  for(const c of chains){
   const position=c.geometry.getAttribute('position') as THREE.BufferAttribute;
   c.pos.forEach((p,k)=>{const centre=k*(circleSteps+1);position.setXYZ(centre,p.x,p.y,0);for(let i=0;i<circleSteps;i++){const a=i/circleSteps*Math.PI*2;position.setXYZ(centre+1+i,p.x+Math.cos(a)*c.radius,p.y+Math.sin(a)*c.radius,0);}});
   position.needsUpdate=true;
  }
 };
 let pending=0;
 /** Advance the physics by dt seconds (fixed steps, at most four per call) and redraw. */
 const update=(dt:number)=>{pending=Math.min(pending+dt,4*step);while(pending>=step){simulate(step);pending-=step;}draw();};
 /** Lay every finger along its rest shape, then let the physics run a second and a half: a still pose for pictures. */
 const settle=()=>{
  for(const c of chains){handFrame(c.hand);anchor(c,c.pos[0]);for(let j=1;j<c.pos.length;j++)c.pos[j].copy(c.pos[j-1]).addScaledVector(restDir(c,j-1,dir),2*c.radius);c.pos.forEach((p,j)=>c.prev[j].copy(p));}
  for(let i=0;i<90;i++)simulate(step);draw();
 };
 const dispose=()=>{for(const c of chains){c.geometry.dispose();(c.mesh.material as THREE.Material).dispose();group.remove(c.mesh);}};
 return {meshes:chains.map(c=>c.mesh),chains:chains.map(c=>c.pos),radii:chains.map(c=>c.radius),update,settle,dispose};
}
export type Fingers=ReturnType<typeof createFingers>;

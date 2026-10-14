import * as THREE from 'three';
/**
 * Ragdoll fingers (Nam, 2026-10-14): five fingers per hand, each a filled spline (centripetal Catmull-Rom) ribbon that
 * tapers to a round tip. They hang from the hand with verlet physics: gravity, momentum and a soft pull back to a
 * slightly curled rest shape, so they swing behind the hand when it moves and droop when it is raised. They are
 * simulated in the character group's space, so standing the figure on the floor does not shake them.
 */
interface FingerDef {angle:number;length:number;base:number;}
/** Thumb (inner side) to little finger; `angle` (rad) is measured from the hand's axis, outwards positive. */
const fingerDefs:FingerDef[]=[
 {angle:-1.05,length:.075,base:.036},
 {angle:-.34,length:.11,base:.032},
 {angle:0,length:.12,base:.032},
 {angle:.34,length:.11,base:.031},
 {angle:.68,length:.09,base:.028},
];
/** Simulation points per finger, ribbon samples, tip cap steps; tip width; gravity (m/s²); velocity kept per step; inward curl per segment (rad); fixed step (s). */
const points=5,samples=14,capSteps=7,tipWidth=.022,gravity=-9.8,damping=.9,curl=.05,step=1/60;
/** Pull towards the rest shape per pass at the finger's root; it weakens towards the tip, so fingers are floppy (ragdoll). */
const shapeHold=.05;
/** Where the fingers leave the hand, in the hand bone's space: around the centre of the hand shapes. */
const handCentre=new THREE.Vector3(0,-.045,0),rootReach=.055;
export interface FingerHand {side:'L'|'R';bone:THREE.Bone;color:string;}
interface Chain {def:FingerDef;sign:number;hand:THREE.Bone;pos:THREE.Vector3[];prev:THREE.Vector3[];geometry:THREE.BufferGeometry;mesh:THREE.Mesh;}
export function createFingers(group:THREE.Group,hands:FingerHand[]){
 const chains:Chain[]=[],groupInverse=new THREE.Matrix4(),frame=new THREE.Matrix4(),target=new THREE.Vector3(),dir=new THREE.Vector3(),velocity=new THREE.Vector3();
 for(const hand of hands)for(const def of fingerDefs){
  const geometry=new THREE.BufferGeometry(),count=2*samples+capSteps+2;
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));
  const index:number[]=[];
  for(let i=0;i<samples-1;i++){const a=2*i,b=a+1,c=a+2,d=a+3;index.push(a,b,c,b,d,c);}
  const centre=2*samples;for(let k=0;k<=capSteps;k++)if(k<capSteps)index.push(centre,centre+1+k,centre+2+k);
  geometry.setIndex(index);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:hand.color,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));
  mesh.name=`finger_${hand.side}`;mesh.frustumCulled=false;mesh.userData={side:hand.side};group.add(mesh);
  chains.push({def,sign:hand.side==='L'?1:-1,hand:hand.bone,pos:Array.from({length:points},()=>new THREE.Vector3()),prev:Array.from({length:points},()=>new THREE.Vector3()),geometry,mesh});
 }
 const segment=(c:Chain)=>c.def.length/(points-1);
 /** The hand bone's frame in the group's space. */
 const handFrame=(bone:THREE.Bone)=>{group.updateMatrixWorld(true);groupInverse.copy(group.matrixWorld).invert();return frame.multiplyMatrices(groupInverse,bone.matrixWorld);};
 /** Rest direction of segment j: along the hand, fanned out, curling inwards a little more at each joint. */
 const restDir=(c:Chain,j:number,out:THREE.Vector3)=>{const a=(c.def.angle+curl*j)*c.sign;return out.set(Math.sin(a),-Math.cos(a),0).transformDirection(frame);};
 const anchor=(c:Chain,out:THREE.Vector3)=>{const a=c.def.angle*(c.def.angle<-.5?1.3:1)*c.sign;return out.set(Math.sin(a)*rootReach,-Math.cos(a)*rootReach,0).add(handCentre).applyMatrix4(frame);};
 const simulate=(dt:number)=>{
  for(const c of chains){
   handFrame(c.hand);anchor(c,c.pos[0]);c.prev[0].copy(c.pos[0]);
   for(let j=1;j<points;j++){velocity.subVectors(c.pos[j],c.prev[j]).multiplyScalar(damping);c.prev[j].copy(c.pos[j]);c.pos[j].add(velocity);c.pos[j].y+=gravity*dt*dt;}
   const length=segment(c);
   for(let pass=0;pass<3;pass++)for(let j=1;j<points;j++){
    // A soft pull towards the rest shape (weaker towards the tip), then the segment keeps its length.
    target.copy(c.pos[j-1]).addScaledVector(restDir(c,j-1,dir),length);c.pos[j].lerp(target,shapeHold*(1-.15*j));
    dir.subVectors(c.pos[j],c.pos[j-1]);const d=dir.length()||1;c.pos[j].copy(c.pos[j-1]).addScaledVector(dir,length/d);
   }
  }
 };
 const tangent=new THREE.Vector3(),normal=new THREE.Vector3(),edge=new THREE.Vector3();
 const draw=()=>{
  for(const c of chains){
   const pts=new THREE.CatmullRomCurve3(c.pos,false,'centripetal').getPoints(samples-1),position=c.geometry.getAttribute('position') as THREE.BufferAttribute;
   for(let i=0;i<samples;i++){
    const p=pts[i];tangent.subVectors(pts[Math.min(i+1,samples-1)],pts[Math.max(i-1,0)]).setZ(0).normalize();normal.set(-tangent.y,tangent.x,0);
    const half=(c.def.base+(tipWidth-c.def.base)*i/(samples-1))/2;
    edge.copy(p).addScaledVector(normal,half);position.setXYZ(2*i,edge.x,edge.y,0);
    edge.copy(p).addScaledVector(normal,-half);position.setXYZ(2*i+1,edge.x,edge.y,0);
   }
   // Round tip: a half disc around the last sample, from one side through the tip to the other.
   const tip=pts[samples-1],centre=2*samples,r=tipWidth/2;position.setXYZ(centre,tip.x,tip.y,0);
   for(let k=0;k<=capSteps;k++){const a=-Math.PI/2+Math.PI*k/capSteps;edge.copy(tip).addScaledVector(tangent,Math.cos(a)*r).addScaledVector(normal,Math.sin(a)*r);position.setXYZ(centre+1+k,edge.x,edge.y,0);}
   position.needsUpdate=true;
  }
 };
 let pending=0;
 /** Advance the physics by dt seconds (fixed steps, at most four per call) and redraw. */
 const update=(dt:number)=>{pending=Math.min(pending+dt,4*step);while(pending>=step){simulate(step);pending-=step;}draw();};
 /** Lay every finger along its rest shape, then let the physics run a second and a half: a still pose for pictures. */
 const settle=()=>{
  for(const c of chains){handFrame(c.hand);anchor(c,c.pos[0]);for(let j=1;j<points;j++)c.pos[j].copy(c.pos[j-1]).addScaledVector(restDir(c,j-1,dir),segment(c));c.pos.forEach((p,j)=>c.prev[j].copy(p));}
  for(let i=0;i<90;i++)simulate(step);draw();
 };
 const dispose=()=>{for(const c of chains){c.geometry.dispose();(c.mesh.material as THREE.Material).dispose();group.remove(c.mesh);}};
 return {meshes:chains.map(c=>c.mesh),chains:chains.map(c=>c.pos),update,settle,dispose};
}
export type Fingers=ReturnType<typeof createFingers>;

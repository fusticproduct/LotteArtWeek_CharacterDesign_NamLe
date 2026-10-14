import * as THREE from 'three';
/**
 * Fingers (Nam, 2026-10-14): five floating balls per hand, one per finger, in their own colour. Each ball has a rest slot
 * just outside the hand's far edge (fanned like fingers) and an attractor spring pulling it there; the hand is a solid
 * disc that knocks the balls away when it moves into them, and the balls never overlap each other. Simulated in the
 * character group's space, so standing the figure on the floor does not shake them.
 */
/** Thumb (inner side, a little bigger) to little finger: angle (rad) from the hand's axis, outwards positive, and radius. */
const fingerDefs=[{angle:-1.2,radius:.03},{angle:-.56,radius:.027},{angle:0,radius:.028},{angle:.55,radius:.026},{angle:1.08,radius:.024}];
/** Rim steps per ball; velocity kept per step; fixed step (s). */
const circleSteps=24,damping=.86,step=1/60;
/** The hand as a solid disc in the hand bone's space (it covers the hand shapes). */
const handCentre=new THREE.Vector3(0,-.045,0),handRadius=.085;
/**
 * Attractor spring per step (fraction of the way to the slot). The Finger stiffness slider sets it: 100% follows the
 * hand closely with a little lag (Nam asked for stiff fingers), 50% drifts loosely, 150% sticks to the slot.
 */
export const shapeHold=(stiffness:number)=>Math.min(.6,.12*Math.pow(stiffness,2.2));
export interface FingerHand {side:'L'|'R';bone:THREE.Bone;color:string;}
interface Ball {angle:number;radius:number;sign:number;hand:THREE.Bone;pos:THREE.Vector3;vel:THREE.Vector3;mesh:THREE.Mesh;geometry:THREE.BufferGeometry;}
/** `scale` is the Fingers slider (ball size), `stiffness` the Finger stiffness slider. */
export function createFingers(group:THREE.Group,hands:FingerHand[],scale=1,stiffness=1){
 const pull=shapeHold(stiffness),balls:Ball[]=[],groupInverse=new THREE.Matrix4(),frame=new THREE.Matrix4(),target=new THREE.Vector3(),centre=new THREE.Vector3(),away=new THREE.Vector3();
 for(const hand of hands)for(const def of fingerDefs){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array((circleSteps+1)*3),3));
  geometry.setIndex(Array.from({length:circleSteps},(_,i)=>[0,1+i,1+(i+1)%circleSteps]).flat());
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:hand.color,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));
  mesh.name=`finger_${hand.side}`;mesh.frustumCulled=false;mesh.userData={side:hand.side};group.add(mesh);
  balls.push({angle:def.angle,radius:def.radius*scale,sign:hand.side==='L'?1:-1,hand:hand.bone,pos:new THREE.Vector3(),vel:new THREE.Vector3(),mesh,geometry});
 }
 const handFrame=(bone:THREE.Bone)=>{group.updateMatrixWorld(true);groupInverse.copy(group.matrixWorld).invert();return frame.multiplyMatrices(groupInverse,bone.matrixWorld);};
 /** A ball's rest slot: just outside the hand disc, fanned around the far edge, touching it. */
 const slot=(b:Ball,out:THREE.Vector3)=>{const a=b.angle*b.sign,reach=handRadius+b.radius;return out.set(Math.sin(a)*reach,-Math.cos(a)*reach,0).add(handCentre).applyMatrix4(frame);};
 const simulate=()=>{
  for(const b of balls){
   handFrame(b.hand);slot(b,target);
   // Attractor towards the slot, with damping.
   b.vel.multiplyScalar(damping).addScaledVector(target.sub(b.pos),pull);b.pos.add(b.vel);
  }
  // The hand is solid and the balls never overlap: a few rounds of pushing balls out of the hand disc (losing their
  // inward speed) and nudging touching pairs apart, ending with the hand so no ball is ever inside it.
  for(let round=0;round<8;round++){
   if(round>0)for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++){
    const a=balls[i],c=balls[j];away.subVectors(c.pos,a.pos).setZ(0);const d=away.length(),min=a.radius+c.radius;
    if(d<min&&d>1e-6){away.multiplyScalar((min-d)/d/2);a.pos.sub(away);c.pos.add(away);}
   }
   for(const b of balls){
    handFrame(b.hand);centre.copy(handCentre).applyMatrix4(frame);away.subVectors(b.pos,centre).setZ(0);const d=away.length(),min=handRadius+b.radius;
    if(d<min){if(d<1e-6)away.set(0,-1,0);else away.divideScalar(d);b.pos.copy(centre).addScaledVector(away,min);const inward=b.vel.dot(away);if(inward<0)b.vel.addScaledVector(away,-inward);}
   }
  }
 };
 const draw=()=>{
  for(const b of balls){
   const position=b.geometry.getAttribute('position') as THREE.BufferAttribute;position.setXYZ(0,b.pos.x,b.pos.y,0);
   for(let i=0;i<circleSteps;i++){const a=i/circleSteps*Math.PI*2;position.setXYZ(1+i,b.pos.x+Math.cos(a)*b.radius,b.pos.y+Math.sin(a)*b.radius,0);}
   position.needsUpdate=true;
  }
 };
 let pending=0;
 /** Advance the physics by dt seconds (fixed steps, at most four per call) and redraw. */
 const update=(dt:number)=>{pending=Math.min(pending+dt,4*step);while(pending>=step){simulate();pending-=step;}draw();};
 /** Put every ball in its slot, at rest: a still pose for pictures. */
 const settle=()=>{for(const b of balls){handFrame(b.hand);slot(b,b.pos);b.vel.set(0,0,0);}for(let i=0;i<30;i++)simulate();draw();};
 const dispose=()=>{for(const b of balls){b.geometry.dispose();(b.mesh.material as THREE.Material).dispose();group.remove(b.mesh);}};
 /** For the tests: each ball's centre, slot and radius. */
 const state=()=>balls.map(b=>{handFrame(b.hand);return {pos:b.pos.clone(),slot:slot(b,new THREE.Vector3()),radius:b.radius,centre:handCentre.clone().applyMatrix4(frame),side:b.mesh.userData.side as string};});
 return {meshes:balls.map(b=>b.mesh),update,settle,dispose,state,handRadius};
}
export type Fingers=ReturnType<typeof createFingers>;

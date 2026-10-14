import * as THREE from 'three';
/**
 * Ragdoll fingers (Nam, 2026-10-14): five circles per hand, one per finger, in their own colour, drawn just under the
 * hand. Each circle is tied to a point on the hand's rim by a short tether and rests touching the hand there; with
 * verlet physics (gravity, momentum, a pull back to its rest spot) it swings and rolls along the rim but is never inside
 * the hand, and the circles never overlap each other. Simulated in the character group's space, so standing the
 * figure on the floor does not shake them.
 */
/** Thumb (inner side, a little bigger) to little finger: angle (rad) from the hand's axis, outwards positive, and radius. */
const fingerDefs=[{angle:-1.2,radius:.032},{angle:-.56,radius:.028},{angle:0,radius:.029},{angle:.55,radius:.027},{angle:1.08,radius:.025}];
/** Rim steps per circle; gravity (m/s²); velocity kept per step; fixed step (s). */
const circleSteps=24,gravity=-9.8,damping=.9,step=1/60;
/** How far a circle's centre may stray from its pin on the rim, in radii (it can roll along the rim, not fly off). */
export const tether=2.2;
/**
 * Pull towards the rest direction per pass. The Finger stiffness slider sets it: 100% keeps the fingers fanned and
 * swinging a little (Nam asked for stiff fingers), 50% lets them dangle, 150% nearly rigid.
 */
export const shapeHold=(stiffness:number)=>Math.min(.9,.3*Math.pow(stiffness,2.6));
/** The hand as a solid disc in the hand bone's space (it covers the hand shapes); the fingers hang from its rim. */
const handCentre=new THREE.Vector3(0,-.045,0),handRadius=.085;
export interface FingerHand {side:'L'|'R';bone:THREE.Bone;color:string;}
interface Finger {angle:number;radius:number;sign:number;hand:THREE.Bone;pin:THREE.Vector3;pos:THREE.Vector3;prev:THREE.Vector3;geometry:THREE.BufferGeometry;mesh:THREE.Mesh;}
/** `scale` is the Fingers slider (circle size), `stiffness` the Finger stiffness slider. */
export function createFingers(group:THREE.Group,hands:FingerHand[],scale=1,stiffness=1){
 const hold=shapeHold(stiffness),fingers:Finger[]=[],groupInverse=new THREE.Matrix4(),frame=new THREE.Matrix4(),target=new THREE.Vector3(),dir=new THREE.Vector3(),velocity=new THREE.Vector3(),centre=new THREE.Vector3(),away=new THREE.Vector3();
 for(const hand of hands)for(const def of fingerDefs){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array((circleSteps+1)*3),3));
  geometry.setIndex(Array.from({length:circleSteps},(_,i)=>[0,1+i,1+(i+1)%circleSteps]).flat());
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:hand.color,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));
  mesh.name=`finger_${hand.side}`;mesh.frustumCulled=false;mesh.userData={side:hand.side};group.add(mesh);
  fingers.push({angle:def.angle,radius:def.radius*scale,sign:hand.side==='L'?1:-1,hand:hand.bone,pin:new THREE.Vector3(),pos:new THREE.Vector3(),prev:new THREE.Vector3(),geometry,mesh});
 }
 const handFrame=(bone:THREE.Bone)=>{group.updateMatrixWorld(true);groupInverse.copy(group.matrixWorld).invert();return frame.multiplyMatrices(groupInverse,bone.matrixWorld);};
 /** The finger's pin on the hand's rim, and its rest direction (out from the hand's centre, fanned like fingers). */
 const rest=(f:Finger)=>{const a=f.angle*f.sign;dir.set(Math.sin(a),-Math.cos(a),0);f.pin.copy(dir).multiplyScalar(handRadius).add(handCentre).applyMatrix4(frame);dir.transformDirection(frame);};
 /** Keep the circle within its tether and outside the hand disc. */
 const constrain=(f:Finger)=>{
  away.subVectors(f.pos,f.pin);const d=away.length(),reach=f.radius*tether;if(d>reach)f.pos.copy(f.pin).addScaledVector(away,reach/d);
  centre.copy(handCentre).applyMatrix4(frame);away.subVectors(f.pos,centre).setZ(0);const c=away.length(),min=handRadius+f.radius;
  if(c<min){if(c<1e-6)away.set(0,-1,0);else away.divideScalar(c);f.pos.copy(centre).addScaledVector(away,min);}
 };
 const simulate=(dt:number)=>{
  for(const f of fingers){
   handFrame(f.hand);rest(f);
   velocity.subVectors(f.pos,f.prev).multiplyScalar(damping);f.prev.copy(f.pos);f.pos.add(velocity);f.pos.y+=gravity*dt*dt;
   for(let pass=0;pass<3;pass++){target.copy(f.pin).addScaledVector(dir,f.radius);f.pos.lerp(target,hold);constrain(f);}
  }
  // The circles of one hand never overlap: nudge touching pairs apart, then back out of the hand.
  for(let round=0;round<4;round++)for(let i=0;i<fingers.length;i++)for(let j=i+1;j<fingers.length;j++){
   const a=fingers[i],b=fingers[j];if(a.hand!==b.hand)continue;away.subVectors(b.pos,a.pos).setZ(0);const d=away.length(),min=a.radius+b.radius;
   if(d<min&&d>1e-6){away.multiplyScalar((min-d)/d/2);a.pos.sub(away);b.pos.add(away);handFrame(a.hand);constrain(a);constrain(b);}
  }
 };
 const draw=()=>{
  for(const f of fingers){
   const position=f.geometry.getAttribute('position') as THREE.BufferAttribute;position.setXYZ(0,f.pos.x,f.pos.y,0);
   for(let i=0;i<circleSteps;i++){const a=i/circleSteps*Math.PI*2;position.setXYZ(1+i,f.pos.x+Math.cos(a)*f.radius,f.pos.y+Math.sin(a)*f.radius,0);}
   position.needsUpdate=true;
  }
 };
 let pending=0;
 /** Advance the physics by dt seconds (fixed steps, at most four per call) and redraw. */
 const update=(dt:number)=>{pending=Math.min(pending+dt,4*step);while(pending>=step){simulate(step);pending-=step;}draw();};
 /** Lay every finger in its rest direction, then let the physics run a second and a half: a still pose for pictures. */
 const settle=()=>{for(const f of fingers){handFrame(f.hand);rest(f);f.pos.copy(f.pin).addScaledVector(dir,f.radius);f.prev.copy(f.pos);}for(let i=0;i<90;i++)simulate(step);draw();};
 const dispose=()=>{for(const f of fingers){f.geometry.dispose();(f.mesh.material as THREE.Material).dispose();group.remove(f.mesh);}};
 /** For the tests: each finger's circle centre, pin, radius and its hand's centre. */
 const state=()=>fingers.map(f=>{handFrame(f.hand);return {pos:f.pos.clone(),pin:f.pin.clone(),radius:f.radius,centre:handCentre.clone().applyMatrix4(frame)};});
 return {meshes:fingers.map(f=>f.mesh),update,settle,dispose,state,handRadius};
}
export type Fingers=ReturnType<typeof createFingers>;

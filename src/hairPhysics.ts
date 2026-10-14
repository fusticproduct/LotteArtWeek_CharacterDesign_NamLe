import * as THREE from 'three';
import {restCircles,tipAt,type PlacedDangle} from './hair';
import type {Point2} from './geometry';
/**
 * Ragdoll hair (Nam, 2026-10-14): some styles carry chains of touching circles (an antenna, a plume, a pompom, the ball
 * on Ball top). Each circle keeps its distance from the one before (the first from its anchor on the head), so the chain
 * never stretches or overlaps, while verlet physics (gravity, momentum, a soft pull back to the rest shape) lets it lag
 * and sway as the head moves. Simulated in the character group's space, like the fingers (fingers.ts), and drawn behind
 * the head and the helmet so the chain grows out of them. A chain's last circle may be drawn as a shape instead (a star,
 * an asterisk), turned to point along the chain.
 */
const circleSteps=32,gravity=-9.8,damping=.92,step=1/60,passes=8,hold=.04;
interface Ball {r:number;tip?:Point2[];rest:THREE.Vector3;pos:THREE.Vector3;prev:THREE.Vector3;geometry:THREE.BufferGeometry;mesh:THREE.Mesh;}
interface Chain {anchor:THREE.Vector3;rope:number;balls:Ball[];}
/** `bone` is the hair bone; chains are in its space (placeHair); colours are the hair's main and accent colours. */
export function createDangles(group:THREE.Group,bone:THREE.Bone,placed:PlacedDangle[],colours:{main:string;accent:string},decorate?:(material:THREE.MeshBasicMaterial,geometry:THREE.BufferGeometry)=>void){
 const groupInverse=new THREE.Matrix4(),frame=new THREE.Matrix4(),anchor=new THREE.Vector3(),target=new THREE.Vector3(),velocity=new THREE.Vector3(),dir=new THREE.Vector3();
 const chains:Chain[]=placed.map(d=>({anchor:new THREE.Vector3(d.anchor[0],d.anchor[1],0),rope:d.rope,balls:restCircles(d).map((c,i,all)=>{
  // A fan around the centre: a circle's rim, or the tip shape's outline (both are star-shaped about the centre).
  const tip=i===all.length-1?d.tip:undefined,rim=tip?tip.length:circleSteps,geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array((rim+1)*3),3));
  geometry.setIndex(Array.from({length:rim},(_,k)=>[0,1+k,1+(k+1)%rim]).flat());
  const material=new THREE.MeshBasicMaterial({color:c.accent?colours.accent:colours.main,depthTest:false,depthWrite:false,side:THREE.DoubleSide});decorate?.(material,geometry);
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='hair_dangle';mesh.frustumCulled=false;group.add(mesh);
  return {r:c.r,tip,rest:new THREE.Vector3(c.x,c.y,0),pos:new THREE.Vector3(),prev:new THREE.Vector3(),geometry,mesh};
 })}));
 const balls=chains.flatMap(c=>c.balls);
 const toGroup=()=>{group.updateMatrixWorld(true);groupInverse.copy(group.matrixWorld).invert();frame.multiplyMatrices(groupInverse,bone.matrixWorld);};
 const simulate=(dt:number)=>{
  toGroup();
  for(const chain of chains){
   anchor.copy(chain.anchor).applyMatrix4(frame);
   for(const b of chain.balls){velocity.subVectors(b.pos,b.prev).multiplyScalar(damping);b.prev.copy(b.pos);b.pos.add(velocity);b.pos.y+=gravity*dt*dt;}
   for(let pass=0;pass<passes;pass++){
    for(const b of chain.balls)b.pos.lerp(target.copy(b.rest).applyMatrix4(frame),hold);
    // Each circle sits exactly its distance from the one before: the rope from the anchor, then touching.
    let from=anchor,reach=chain.rope;
    chain.balls.forEach((b,i)=>{dir.subVectors(b.pos,from).setZ(0);const d=dir.length();if(d>1e-9)b.pos.copy(from).addScaledVector(dir,reach/d);from=b.pos;reach=b.r+(chain.balls[i+1]?.r??0);});
   }
  }
 };
 const draw=()=>{
  toGroup();
  for(const chain of chains){
   let from=anchor.copy(chain.anchor).applyMatrix4(frame);
   for(const b of chain.balls){
    const position=b.geometry.getAttribute('position') as THREE.BufferAttribute;position.setXYZ(0,b.pos.x,b.pos.y,0);
    if(b.tip)tipAt(b.tip,b.pos.x,b.pos.y,[b.pos.x-from.x,b.pos.y-from.y]).forEach(([x,y],k)=>position.setXYZ(1+k,x,y,0));
    else for(let k=0;k<circleSteps;k++){const a=k/circleSteps*Math.PI*2;position.setXYZ(1+k,b.pos.x+Math.cos(a)*b.r,b.pos.y+Math.sin(a)*b.r,0);}
    position.needsUpdate=true;from=b.pos;
   }
  }
 };
 let pending=0;
 /** Advance by dt seconds (fixed steps, at most four per call) and redraw. */
 const update=(dt:number)=>{if(!balls.length)return;pending=Math.min(pending+dt,4*step);while(pending>=step){simulate(step);pending-=step;}draw();};
 /** Put every circle at rest, then let the physics run a second: a still pose for pictures. */
 const settle=()=>{if(!balls.length)return;toGroup();for(const b of balls){b.pos.copy(b.rest).applyMatrix4(frame);b.prev.copy(b.pos);}for(let i=0;i<60;i++)simulate(step);draw();};
 const dispose=()=>{for(const b of balls){b.geometry.dispose();(b.mesh.material as THREE.Material).dispose();group.remove(b.mesh);}};
 /** For the tests: each chain's anchor and circle centres and radii, in the group's space. */
 const state=()=>{toGroup();return chains.map(c=>({anchor:c.anchor.clone().applyMatrix4(frame),rope:c.rope,balls:c.balls.map(b=>({pos:b.pos.clone(),r:b.r}))}));};
 return {meshes:balls.map(b=>b.mesh),update,settle,dispose,state};
}
export type HairDangles=ReturnType<typeof createDangles>;

import * as THREE from 'three';
/**
 * Ragdoll fingers (Nam, 2026-10-14): five circles per hand, one per finger, the same size and colour as the toes, drawn
 * over the hand. At rest they float in an arc around the hand's far rim, one circle radius clear of it (Nam asked for
 * more space), each touching the next. With verlet physics (gravity, momentum, a pull back to its spot, a short tether to
 * its pin on the rim) they swing and roll around the hand, but neighbours always stay touching, none overlap, and none
 * ever comes nearer the hand than that gap. Simulated in the character
 * group's space, so standing the figure on the floor does not shake them.
 */
/**
 * Finger and toe shapes (Trung Bao, 2026-10-14): a circle, a diamond or a triangle, all inside the same circle so the
 * physics (touching, never overlapping) stays the same. A finger's diamond or triangle points away from its hand.
 * `fingers` hides the fingers (the toes stay); `shape` random gives each character its own shape from its label.
 */
export const digitShapes=['circle','diamond','triangle'] as const;
export type DigitShape=typeof digitShapes[number];
export const digitShapeNames:Record<DigitShape,string>={circle:'Circle',diamond:'Diamond',triangle:'Triangle'};
export interface DigitSettings {fingers:boolean;shape:'random'|DigitShape;}
export const defaultDigits:DigitSettings={fingers:true,shape:'random'};
export const normalizeDigits=(value:unknown):DigitSettings=>{const v=(value??{}) as Partial<DigitSettings>;return {fingers:v.fingers!==false,shape:digitShapes.includes(v.shape as DigitShape)?v.shape as DigitShape:'random'};};
/**
 * `n` points round a shape of radius r about (0, 0), its point at `angle` (0 = right): a circle, or a polygon (4 or 3
 * corners) walked evenly along its edges, so every shape has the same number of rim points.
 */
export function digitOutline(shape:DigitShape,r:number,angle:number,n=circleSteps):[number,number][]{
 const k=shape==='diamond'?4:3;
 return Array.from({length:n},(_,i)=>{
  if(shape==='circle'){const a=angle+i/n*Math.PI*2;return [Math.cos(a)*r,Math.sin(a)*r];}
  const t=i/n*k,e=Math.floor(t),f=t-e,a0=angle+e/k*Math.PI*2,a1=angle+(e+1)/k*Math.PI*2;
  return [(Math.cos(a0)*(1-f)+Math.cos(a1)*f)*r,(Math.sin(a0)*(1-f)+Math.sin(a1)*f)*r];
 });
}
/** Rim steps per circle; gravity (m/s²); velocity kept per step; fixed step (s). */
const circleSteps=24,gravity=-9.8,damping=.9,step=1/60;
/** How far a circle's centre may stray from its pin, in radii (it can roll along the rim, not fly off). */
export const tether=3.2;
/** Space between the hand's rim and the finger circles, in circle radii. */
export const fingerGap=1;
/**
 * Pull towards the rest spot per pass. The Finger stiffness slider sets it: 100% keeps the fingers in their arc and
 * swinging a little (Nam asked for stiff fingers), 50% lets them dangle, 150% nearly rigid.
 */
export const shapeHold=(stiffness:number)=>Math.min(.9,.3*Math.pow(stiffness,2.6));
/** The hand as a solid disc in the hand bone's space (it covers the hand shapes); the fingers sit around its rim. */
const handCentre=new THREE.Vector3(0,-.045,0),handRadius=.085;
export interface FingerHand {side:'L'|'R';bone:THREE.Bone;color:string;}
interface Ball {angle:number;pin:THREE.Vector3;pos:THREE.Vector3;prev:THREE.Vector3;geometry:THREE.BufferGeometry;mesh:THREE.Mesh;}
interface Hand {bone:THREE.Bone;sign:number;balls:Ball[];}
/** `radius` is the circle size shared with the toes (Fingers & toes slider), `stiffness` the Finger stiffness slider. */
/** `decorate` adds the paper and riso look to each circle's material (rig.ts addPaper). */
export function createFingers(group:THREE.Group,hands:FingerHand[],radius=.028,stiffness=1,decorate?:(material:THREE.MeshBasicMaterial,geometry:THREE.BufferGeometry)=>void){
 let shape:DigitShape='circle';
 const hold=shapeHold(stiffness),groupInverse=new THREE.Matrix4(),frame=new THREE.Matrix4(),target=new THREE.Vector3(),dir=new THREE.Vector3(),velocity=new THREE.Vector3(),centre=new THREE.Vector3(),away=new THREE.Vector3();
 // Neighbours touch: on a circle of radius R + gap + r their centres sit 2·asin(r / (R + gap + r)) apart.
 const reach=handRadius+radius*(1+fingerGap),spacing=2*Math.asin(radius/reach),gap=2*radius;
 const rigs:Hand[]=hands.map(hand=>({bone:hand.bone,sign:hand.side==='L'?1:-1,balls:Array.from({length:5},(_,i)=>{
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array((circleSteps+1)*3),3));
  geometry.setIndex(Array.from({length:circleSteps},(_,k)=>[0,1+k,1+(k+1)%circleSteps]).flat());
  const material=new THREE.MeshBasicMaterial({color:hand.color,depthTest:false,depthWrite:false,side:THREE.DoubleSide});decorate?.(material,geometry);
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name=`finger_${hand.side}`;mesh.frustumCulled=false;mesh.userData={side:hand.side};group.add(mesh);
  // Thumb (i = 0) on the inner side, little finger outermost; the arc is centred on the hand's axis.
  return {angle:(i-2)*spacing,pin:new THREE.Vector3(),pos:new THREE.Vector3(),prev:new THREE.Vector3(),geometry,mesh};
 })}));
 const balls=rigs.flatMap(h=>h.balls);
 /**
  * The figure does not move during one update or a settle, so its matrices are brought up to date once (`still`) and
  * every step reads them as they are: recomputing the whole figure per step was most of a character's build time.
  */
 let frozen=false;
 const still=<T,>(f:()=>T):T=>{group.updateMatrixWorld(true);frozen=true;try{return f();}finally{frozen=false;}};
 const handFrame=(bone:THREE.Bone)=>{if(!frozen)group.updateMatrixWorld(true);groupInverse.copy(group.matrixWorld).invert();return frame.multiplyMatrices(groupInverse,bone.matrixWorld);};
 /** A ball's rest spot (in the arc, clear of the rim) into `out`, and its pin on the rim. */
 const spot=(h:Hand,b:Ball,out:THREE.Vector3)=>{const a=b.angle*h.sign,x=Math.sin(a),y=-Math.cos(a);b.pin.set(x*handRadius,y*handRadius,0).add(handCentre).applyMatrix4(frame);return out.set(x*reach,y*reach,0).add(handCentre).applyMatrix4(frame);};
 const outOfHand=(p:THREE.Vector3)=>{away.subVectors(p,centre).setZ(0);const d=away.length();if(d<reach){if(d<1e-6)away.set(0,-1,0);else away.divideScalar(d);p.copy(centre).addScaledVector(away,reach);}};
 const simulate=(dt:number)=>{
  for(const h of rigs){
   handFrame(h.bone);centre.copy(handCentre).applyMatrix4(frame);
   for(const b of h.balls){velocity.subVectors(b.pos,b.prev).multiplyScalar(damping);b.prev.copy(b.pos);b.pos.add(velocity);b.pos.y+=gravity*dt*dt;}
   for(let pass=0;pass<12;pass++){
    for(const b of h.balls){
     spot(h,b,target);b.pos.lerp(target,hold/2);
     away.subVectors(b.pos,b.pin);const d=away.length(),limit=radius*tether;if(d>limit)b.pos.copy(b.pin).addScaledVector(away,limit/d);
    }
    // Neighbours stay exactly touching; no two balls overlap; none comes nearer the hand than the gap.
    for(let i=1;i<h.balls.length;i++){const a=h.balls[i-1].pos,c=h.balls[i].pos;dir.subVectors(c,a);const d=dir.length()||1,fix=(d-gap)/2/d;a.addScaledVector(dir,fix);c.addScaledVector(dir,-fix);}
    for(let i=0;i<h.balls.length;i++)for(let j=i+2;j<h.balls.length;j++){const a=h.balls[i].pos,c=h.balls[j].pos;dir.subVectors(c,a);const d=dir.length();if(d<gap&&d>1e-6){dir.multiplyScalar((gap-d)/d/2);a.sub(dir);c.add(dir);}}
    for(const b of h.balls)outOfHand(b.pos);
   }
  }
 };
 const draw=()=>{
  for(const h of rigs){
   handFrame(h.bone);centre.copy(handCentre).applyMatrix4(frame);
   for(const b of h.balls){
    const position=b.geometry.getAttribute('position') as THREE.BufferAttribute;position.setXYZ(0,b.pos.x,b.pos.y,0);
    const rim=digitOutline(shape,radius,Math.atan2(b.pos.y-centre.y,b.pos.x-centre.x));
    for(let k=0;k<circleSteps;k++)position.setXYZ(1+k,b.pos.x+rim[k][0],b.pos.y+rim[k][1],0);
    position.needsUpdate=true;
   }
  }
 };
 /** Shape and on/off (DigitSettings, with the character's shape already picked). */
 const configure=(next:DigitShape,on:boolean)=>{shape=next;for(const b of balls)b.mesh.visible=on;draw();};
 let pending=0;
 /** Advance the physics by dt seconds (fixed steps, at most four per call) and redraw. */
 const update=(dt:number)=>still(()=>{pending=Math.min(pending+dt,4*step);while(pending>=step){simulate(step);pending-=step;}draw();});
 /** Put every ball in its spot, then let the physics run a second and a half: a still pose for pictures. */
 const settle=()=>still(()=>{for(const h of rigs){handFrame(h.bone);for(const b of h.balls){spot(h,b,b.pos);b.prev.copy(b.pos);}}for(let i=0;i<90;i++)simulate(step);draw();});
 const dispose=()=>{for(const b of balls){b.geometry.dispose();(b.mesh.material as THREE.Material).dispose();group.remove(b.mesh);}};
 /** For the tests: each hand's ball centres and pins, the shared radius and the hand's centre. */
 const state=()=>rigs.map(h=>{handFrame(h.bone);return {pos:h.balls.map(b=>b.pos.clone()),pin:h.balls.map(b=>b.pin.clone()),centre:handCentre.clone().applyMatrix4(frame)};});
 return {meshes:balls.map(b=>b.mesh),update,settle,dispose,state,configure,handRadius,radius};
}
export type Fingers=ReturnType<typeof createFingers>;

import * as THREE from 'three';
import {rng,palette} from './model';
/**
 * Curtains (Nam, 2026-10-14): a fringe hanging from each forearm, across the chest (over the body, like a shirt) and
 * from the head (behind it, like hair); many thin strands (splines), each threaded with
 * clones of one random geometric shape. Each strand is a loose verlet rope: its top is pinned along the forearm, the
 * rest falls with gravity and keeps its link lengths, nothing pulls it back into shape, so it hangs relaxed and sways
 * and lags as the arm moves. Colours come from the palette: one colour for the whole curtain, or a random one per
 * strand and per shape. Drawn just behind a forearm (the strands come out from under it), over the top body piece,
 * and behind the head. Simulated in the character group's space like the fingers (fingers.ts).
 */
/**
 * `density`: strands per forearm; `length`, `size` and `spacing` scale the strands' length, the shapes' size and the
 * gap between shapes (1 = 18–32 cm strands, 2.2–3.4 cm shapes about 4.5 cm apart). `stiffness` 0 is a loose rope; up to
 * 1 the strands resist bending (each link leans toward the line of the one above) and swing less.
 */
/** Where curtains can hang (checkboxes in the Look tab). */
export const curtainPlaces=['head','torso','pelvis','upperarms','forearms','thighs','shins'] as const;
export type CurtainPlace=typeof curtainPlaces[number];
export const curtainPlaceNames:Record<CurtainPlace,string>={head:'Head',torso:'Top piece',pelvis:'Bottom piece',upperarms:'Upper arms',forearms:'Forearms',thighs:'Thighs',shins:'Shins'};
export interface CurtainSettings {on:boolean;colors:'one'|'random';density:number;length:number;size:number;spacing:number;stiffness:number;places:Record<CurtainPlace,boolean>;}
export const defaultCurtains:CurtainSettings={on:true,colors:'random',density:7,length:1,size:1,spacing:1,stiffness:0,places:{head:true,torso:true,pelvis:false,upperarms:false,forearms:true,thighs:false,shins:false}};
export const curtainRanges={density:{min:2,max:40},length:{min:.4,max:2.5},size:{min:.4,max:2.5},spacing:{min:.4,max:3},stiffness:{min:0,max:1}};
export const normalizeCurtains=(value:unknown):CurtainSettings=>{
 const v=(value??{}) as Partial<CurtainSettings>,num=(k:keyof typeof curtainRanges)=>{const n=Number(v[k]),r=curtainRanges[k];return Number.isFinite(n)?Math.min(r.max,Math.max(r.min,k==='density'?Math.round(n):n)):defaultCurtains[k];};
 // (Older settings had arms/torso/head switches.)
 const old=v as Partial<Record<'arms'|'torso'|'head',boolean>>,given=(v.places??{}) as Partial<Record<CurtainPlace,boolean>>;
 const places=Object.fromEntries(curtainPlaces.map(p=>[p,typeof given[p]==='boolean'?given[p]:p==='forearms'&&typeof old.arms==='boolean'?old.arms:(p==='torso'||p==='head')&&typeof old[p]==='boolean'?old[p]:defaultCurtains.places[p]])) as Record<CurtainPlace,boolean>;
 return {on:v.on!==false,colors:v.colors==='one'?'one':'random',density:num('density'),length:num('length'),size:num('size'),spacing:num('spacing'),stiffness:num('stiffness'),places};
};
type Point2=[number,number];
/** Bead outlines around (0, 0), pointing along +y (the strand's direction): circle, square, triangle, diamond, hexagon. */
const beadShapes:((r:number)=>Point2[])[]=[
 r=>Array.from({length:14},(_,i)=>{const a=i/14*Math.PI*2;return [Math.cos(a)*r,Math.sin(a)*r] as Point2;}),
 r=>[[-r*.8,-r*.8],[r*.8,-r*.8],[r*.8,r*.8],[-r*.8,r*.8]],
 r=>[[0,-r],[r*.95,r*.6],[-r*.95,r*.6]],
 r=>[[0,-r*1.2],[r*.8,0],[0,r*1.2],[-r*.8,0]],
 r=>Array.from({length:6},(_,i)=>{const a=Math.PI/6+i*Math.PI/3;return [Math.cos(a)*r,Math.sin(a)*r] as Point2;}),
];
export const curtainShapeNames=['Circle','Square','Triangle','Diamond','Hexagon'];
/** Palette colours a curtain may take: every colour but the paper white and the darks. */
export const curtainColours=palette.map((_,i)=>i).filter(i=>!['neutral','dark'].includes(palette[i].family));
const gravity=-9.8,step=1/60,passes=12,links=9,ribbon=.006,smooth=3;
interface Bead {t:number;r:number;shape:number;colour:number;}
interface Strand {bone:THREE.Bone;side:string;anchor:THREE.Vector3;link:number;pos:THREE.Vector3[];prev:THREE.Vector3[];colour:number;beads:Bead[];}
interface Layer {colour:number;kind:'string'|'bead';side:string;mesh:THREE.Mesh;positions:Float32Array;count:number;}
/**
 * A curtain mount: a bone and the path its strands hang from, in the bone's space (`density` pins spread evenly along
 * it by length): along a limb segment, or traced round a body piece's upper edge or the head's lower edge. `key` names
 * it: the limb bone (forearm_L…), torso, pelvis or head. `colorOf` gives a palette index's colour in the current palette.
 */
export interface CurtainMount {key:string;bone:THREE.Bone;path:THREE.Vector3[];}
/** Point at fraction t of a path's length. */
const onPath=(path:THREE.Vector3[],t:number)=>{
 const lengths=path.slice(1).map((p,i)=>p.distanceTo(path[i])),total=lengths.reduce((a,b)=>a+b,0);let left=t*total;
 for(let i=0;i<lengths.length;i++){if(left<=lengths[i]||i===lengths.length-1)return path[i].clone().lerp(path[i+1],lengths[i]?Math.min(1,left/lengths[i]):0);left-=lengths[i];}
 return path[0].clone();
};
export function createCurtains(group:THREE.Group,mounts:CurtainMount[],seed:string,settings:CurtainSettings,colorOf:(index:number)=>string,decorate?:(material:THREE.MeshBasicMaterial,geometry:THREE.BufferGeometry)=>void){
 const one=curtainColours[Math.floor(rng(`${seed}|colour`)()*curtainColours.length)];
 const n=settings.density;
 const strands:Strand[]=mounts.flatMap(arm=>Array.from({length:n},(_,i)=>{
  // Each strand draws from its own stream, so changing one setting does not reshuffle the others.
  const r=rng(`${seed}|${arm.key}|${i}`),pick=()=>curtainColours[Math.floor(r()*curtainColours.length)];
  // Pinned evenly along the mount's line; 18–32 cm long; one shape cloned along it.
  const length=(.18+.14*r())*settings.length,shape=Math.floor(r()*beadShapes.length),size=(.011+.006*r())*settings.size,count=Math.max(1,Math.round(length/(.045*settings.spacing)));
  const colour=settings.colors==='one'?one:pick();
  return {bone:arm.bone,side:arm.key,anchor:onPath(arm.path,(i+.5)/n),link:length/links,
   pos:Array.from({length:links+1},()=>new THREE.Vector3()),prev:Array.from({length:links+1},()=>new THREE.Vector3()),colour,
   beads:Array.from({length:count},(_,k)=>({t:(k+.7)/count,r:size,shape,colour:settings.colors==='one'?one:pick()}))};
 }));
 // One mesh per colour, kind and arm, so a bead is never drawn under another strand's string.
 const layers=new Map<string,Layer>(),layer=(colour:number,kind:'string'|'bead',side:string)=>{
  const key=`${colour}|${kind}|${side}`;let l=layers.get(key);
  if(!l){l={colour,kind,side,mesh:null!,positions:new Float32Array(0),count:0};layers.set(key,l);}
  return l;
 };
 const samples=links*smooth+1;
 for(const s of strands){layer(s.colour,'string',s.side).count+=(samples-1)*6;for(const b of s.beads)layer(b.colour,'bead',s.side).count+=beadShapes[b.shape](1).length*3;}
 for(const l of layers.values()){
  l.positions=new Float32Array(l.count*3);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(l.positions,3));
  const material=new THREE.MeshBasicMaterial({color:colorOf(l.colour),depthTest:false,depthWrite:false,side:THREE.DoubleSide,transparent:true});decorate?.(material,geometry);
  l.mesh=new THREE.Mesh(geometry,material);l.mesh.name=`curtain_${l.side}`;l.mesh.userData={side:l.side,kind:l.kind};l.mesh.frustumCulled=false;l.mesh.visible=settings.on;group.add(l.mesh);
 }
 const groupInverse=new THREE.Matrix4(),frame=new THREE.Matrix4(),anchor=new THREE.Vector3(),velocity=new THREE.Vector3(),dir=new THREE.Vector3();
 const toGroup=(bone:THREE.Bone)=>{group.updateMatrixWorld(true);groupInverse.copy(group.matrixWorld).invert();return frame.multiplyMatrices(groupInverse,bone.matrixWorld);};
 // Stiffness: a bending pull per pass, and a little more damping so a stiff strand swings less.
 const bend=settings.stiffness*.45,damping=.985-.035*settings.stiffness;
 const simulate=(dt:number)=>{
  for(const s of strands){
   anchor.copy(s.anchor).applyMatrix4(toGroup(s.bone));s.pos[0].copy(anchor);s.prev[0].copy(anchor);
   for(let i=1;i<s.pos.length;i++){velocity.subVectors(s.pos[i],s.prev[i]).multiplyScalar(damping);s.prev[i].copy(s.pos[i]);s.pos[i].add(velocity);s.pos[i].y+=gravity*dt*dt;s.pos[i].z=0;}
   // Links keep their length; the pinned top never moves, the others share each correction.
   for(let pass=0;pass<passes;pass++)for(let i=1;i<s.pos.length;i++){
    const a=s.pos[i-1],b=s.pos[i];dir.subVectors(b,a);const d=dir.length()||1e-9,fix=(d-s.link)/d;
    if(i===1)b.addScaledVector(dir,-fix);else{a.addScaledVector(dir,fix/2);b.addScaledVector(dir,-fix/2);}
    // Bending: this point leans toward the straight continuation of the link above it.
    if(bend>0&&i>=2){dir.subVectors(s.pos[i-1],s.pos[i-2]).setLength(s.link).add(s.pos[i-1]);b.lerp(dir,bend);}
   }
   // Then one pass from the pin down sets every link to its exact length (a sudden arm move cannot stretch the rope).
   for(let i=1;i<s.pos.length;i++){dir.subVectors(s.pos[i],s.pos[i-1]);const d=dir.length();if(d>1e-9)s.pos[i].copy(s.pos[i-1]).addScaledVector(dir,s.link/d);}
  }
 };
 /** A point along the strand (t 0–1) on a Catmull-Rom curve through its links, and the curve's direction there. */
 const along=(s:Strand,t:number,out:THREE.Vector2,tangent:THREE.Vector2)=>{
  const f=Math.min(links-1e-6,Math.max(0,t*links)),i=Math.floor(f),u=f-i,P=(k:number)=>s.pos[Math.min(links,Math.max(0,k))];
  const p0=P(i-1),p1=P(i),p2=P(i+1),p3=P(i+2),u2=u*u,u3=u2*u;
  const cr=(a:number,b:number,c:number,d:number)=>.5*(2*b+(-a+c)*u+(2*a-5*b+4*c-d)*u2+(-a+3*b-3*c+d)*u3);
  const dc=(a:number,b:number,c:number,d:number)=>.5*((-a+c)+2*(2*a-5*b+4*c-d)*u+3*(-a+3*b-3*c+d)*u2);
  out.set(cr(p0.x,p1.x,p2.x,p3.x),cr(p0.y,p1.y,p2.y,p3.y));tangent.set(dc(p0.x,p1.x,p2.x,p3.x),dc(p0.y,p1.y,p2.y,p3.y));if(tangent.lengthSq()<1e-12)tangent.set(0,-1);tangent.normalize();
 };
 const p=new THREE.Vector2(),q=new THREE.Vector2(),tp=new THREE.Vector2(),tq=new THREE.Vector2();
 const draw=()=>{
  const fill=new Map<Layer,number>();const put=(l:Layer,x:number,y:number)=>{const k=fill.get(l)??0;l.positions[k]=x;l.positions[k+1]=y;l.positions[k+2]=0;fill.set(l,k+3);};
  for(const s of strands){
   const string=layer(s.colour,'string',s.side);
   for(let k=0;k<samples-1;k++){
    along(s,k/(samples-1),p,tp);along(s,(k+1)/(samples-1),q,tq);
    const nx=-tp.y*ribbon/2,ny=tp.x*ribbon/2,mx=-tq.y*ribbon/2,my=tq.x*ribbon/2;
    put(string,p.x+nx,p.y+ny);put(string,p.x-nx,p.y-ny);put(string,q.x-mx,q.y-my);put(string,p.x+nx,p.y+ny);put(string,q.x-mx,q.y-my);put(string,q.x+mx,q.y+my);
   }
   for(const b of s.beads){
    const bead=layer(b.colour,'bead',s.side),outline=beadShapes[b.shape](b.r);along(s,b.t,p,tp);
    // Turned to follow the strand: the shape's +y runs along the strand.
    const c=tp.y,sn=-tp.x,tr=([x,y]:Point2):Point2=>[p.x+x*c-y*sn,p.y+x*sn+y*c];
    for(let k=0;k<outline.length;k++){const [ax,ay]=tr(outline[k]),[bx,by]=tr(outline[(k+1)%outline.length]);put(bead,p.x,p.y);put(bead,ax,ay);put(bead,bx,by);}
   }
  }
  for(const l of layers.values())(l.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate=true;
 };
 let pending=0;
 /** Advance by dt seconds (fixed steps, at most four per call) and redraw. */
 const update=(dt:number)=>{if(!settings.on)return;pending=Math.min(pending+dt,4*step);while(pending>=step){simulate(step);pending-=step;}draw();};
 /** Hang every strand straight down from its pin, then let it swing out for a second and a half: a still pose for pictures. */
 const settle=()=>{
  for(const s of strands){anchor.copy(s.anchor).applyMatrix4(toGroup(s.bone));s.pos.forEach((v,i)=>{v.set(anchor.x,anchor.y-i*s.link,0);s.prev[i].copy(v);});}
  for(let i=0;i<90;i++)simulate(step);draw();
 };
 const dispose=()=>{for(const l of layers.values()){l.mesh.geometry.dispose();(l.mesh.material as THREE.Material).dispose();group.remove(l.mesh);}};
 /** For the tests: each strand's points and link length, in the group's space. */
 const state=()=>strands.map(s=>({side:s.side,link:s.link,points:s.pos.map(v=>v.clone()),anchor:s.anchor.clone().applyMatrix4(toGroup(s.bone)),colours:[s.colour,...s.beads.map(b=>b.colour)]}));
 return {meshes:[...layers.values()].map(l=>l.mesh),update,settle,dispose,state};
}
export type Curtains=ReturnType<typeof createCurtains>;

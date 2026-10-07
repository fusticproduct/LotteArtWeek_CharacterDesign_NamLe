import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {beveledCylinder,bowl,dome,frustum,puck,flare,bicone,taperedPill,sphere,faceted,mergeGeometries,lathe,type ProfilePoint} from './geometry';
import {bones,palette,poseRotation,restHeight,patternedKinds,twoTone,isBeaded,type CharacterSpec,type BoneDefinition,type PartChoice,type Pose} from './model';

import {drawWeave,weaveDensity,type WeavePaletteName} from './weave';

/**
 * 2D look: every part is a flat, unlit colour drawn in a fixed layer order (painter's algorithm),
 * like cut paper. The meshes are still the 3D shapes, seen straight on by an orthographic camera.
 */
export const layerGroups={head:'Head',neck:'Neck',torso:'Torso',spine:'Lower spine',pelvis:'Pelvis',shoulder:'Shoulders',upperarm:'Upper arms',elbow:'Elbows',forearm:'Forearms',hand:'Hands',thigh:'Thighs',knee:'Knees',shin:'Shins',foot:'Feet'} as const;
export type LayerGroup = keyof typeof layerGroups;
/** Default stacking, top first: joints over limbs, arms over the body, legs at the back. */
export const defaultLayerOrder:LayerGroup[]=['shoulder','elbow','hand','forearm','upperarm','head','torso','neck','pelvis','spine','knee','foot','shin','thigh'];
/** Keeps a stored order usable after groups are added or renamed. */
export const normalizeLayerOrder=(order:unknown):LayerGroup[]=>{const valid=Array.isArray(order)?order.filter((g,i)=>g in layerGroups&&order.indexOf(g)===i) as LayerGroup[]:[];return [...valid,...defaultLayerOrder.filter(g=>!valid.includes(g))];};
export const groupOf=(id:string):LayerGroup=>{
 if(id==='root'||id.startsWith('hip_'))return 'pelvis';
 if(id==='spine_upper')return 'torso';
 if(id==='spine_lower')return 'spine';
 if(id==='face_mark')return 'head';
 return id.split('_')[0] as LayerGroup;
};
/** Draw order of a part: later = on top. The face mark rides just above its head, hip joints just under the pelvis. */
const layerOf=(id:string,order:LayerGroup[])=>{
 const rank=order.length-1-order.indexOf(groupOf(id));
 return rank*2+(id==='face_mark'?1:id.startsWith('hip_')?-1:0);
};
/** World size (m) of one weave tile for a pattern-scale value: higher scale = more, smaller cells. */
export const weaveTileSize=(density:number)=>weaveDensity/(density*2)*.64;
const weaveCache=new Map<string,HTMLCanvasElement>();
function weaveCanvas(seed:string,palette:WeavePaletteName){
 const key=`${palette}|${seed}`;let canvas=weaveCache.get(key);
 if(!canvas){
  canvas=document.createElement('canvas');canvas.width=canvas.height=1024;drawWeave(canvas,seed,palette);
  weaveCache.set(key,canvas);if(weaveCache.size>24)weaveCache.delete(weaveCache.keys().next().value!);
 }
 return canvas;
}
function materialFor(b:BoneDefinition,p:PartChoice,spec:CharacterSpec,weavePalette:WeavePaletteName) {
 const material=new THREE.MeshBasicMaterial({color:palette[p.color].hex,depthTest:false,depthWrite:false});
 if(p.pattern===twoTone&&!isBeaded(b,p.variant)&&typeof document!=='undefined'){
  // Two colour layers along the segment: V runs along its length on every lathe, box and pill shape.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d')!,split=[.38,.5,.62][(p.color+p.accent)%3];
  ctx.fillStyle=palette[p.color].hex;ctx.fillRect(0,0,256,256);
  ctx.fillStyle=palette[p.accent].hex;ctx.fillRect(0,0,256,Math.round(256*(1-split)));
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  material.map=texture;material.color.setRGB(1,1,1);
 }
 else if(p.pattern&&patternedKinds.includes(b.kind)&&typeof document!=='undefined'){
  // Basket weave, mapped flat in metres (see planarUV) so it reads as printed cloth, not a wrapped texture.
  const texture=new THREE.CanvasTexture(weaveCanvas(`${spec.label}|${b.id}|${p.color}|${p.accent}|${p.pattern}`,weavePalette));
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;
  const tile=weaveTileSize(spec.density);texture.repeat.set(1/tile,1/tile);
  material.map=texture;material.color.setRGB(1,1,1);
 }
 return material;
}
/** Front-projected UVs in metres: the pattern stays undistorted on any silhouette. */
function planarUV(g:THREE.BufferGeometry){
 const position=g.getAttribute('position'),uv=g.getAttribute('uv');
 for(let i=0;i<position.count;i++)uv.setXY(i,position.getX(i),position.getY(i));
 return g;
}
/** Stacks several pieces; each entry is [geometry, y offset]. */
const stack=(...pieces:[THREE.BufferGeometry,number][])=>mergeGeometries(pieces.map(([g,y])=>{g.translate(0,y,0);return g;}));
/** Corset/vase torso: rounded shoulders narrowing with a concave curve to a slim waist. */
function vase(L:number){
 const curve:ProfilePoint[]=Array.from({length:16},(_,i)=>{const t=i/15;return [.16+(.27-.16)*Math.pow(t,2.4),.02+(L-.1)*t,0] as ProfilePoint;});
 return lathe([[0,0],[.17,0,.02],...curve.slice(1),[.285,L-.045,.05],[.2,L,.03],[0,L]]);
}
/** Torso silhouettes from the turned-shape sheet: all 0→L tall, widest near the shoulders. */
function torsoGeometry(v:number,L:number){
 const R=.285;
 const g=v===0?bowl(R,L,.035)
  :v===1?stack([dome(.13,.14,.03),0],[bowl(R,.29,.032),L-.29])
  :v===2?stack([bowl(.19,.225,.03),0],[dome(R,.21,.03),.21])
  :v===3?stack([dome(.21,.21,.03),0],[bowl(R,.22,.03),.20])
  :v===4?stack([frustum(.13,.02,.12,.03),0],[frustum(.03,.31,L-.07,.03),.07])
  :v===5?frustum(.19,R,L,.035)
  :v===6?bicone(.16,R,.29,.2,L,.035)
  :v===7?stack([puck(.2,.15,.06),0],[puck(.245,.15,.06),.135],[puck(R,.15,.06),.27])
  :v===8?stack([dome(.15,.08,.025),0],[sphere(1).scale(R,.19,.2),.23])
  :v===9?new THREE.TorusGeometry(.16,.095,40,96).scale(1,.88,1).translate(0,.21,0)
  :vase(L);
 // Slightly larger than the slot originally allowed; shoulders sit at x = ±0.33 to match.
 g.scale(1.12,1,.83);
 return g;
}
/** Hip-area silhouettes centred on the pelvis bone; every one encloses both hip joints (no boxes). */
function pelvisGeometry(v:number){
 const g=v===0?sphere(1).scale(.2,.14,.16)
  :v===1?new THREE.TorusGeometry(.11,.085,32,72).rotateX(Math.PI/2)
  :v===2?bowl(.22,.22,.03).translate(0,-.13,0)
  :v===3?dome(.21,.2,.03).translate(0,-.1,0)
  :v===4?puck(.2,.2,.07).translate(0,-.1,0)
  :bicone(.13,.21,.11,.11,.21,.03).translate(0,-.11,0);
 if(v>1)g.scale(1,1,.85);
 return g;
}
export const kneeRadius=.105,elbowRadius=.088;
/** Distance from a ball joint's centre at which a segment end of radius `end` sits flush on the ball. */
const seat=(ball:number,end:number)=>Math.sqrt(Math.max(ball*ball-end*end,0));
/** Leg segment spanning y=-from … y=-to (slim at the hip, widening towards the foot). */
function legGeometry(v:number,from:number,to:number,top:number,bottom:number,hipCap:boolean){
 const L=to-from;let g:THREE.BufferGeometry;
 if(v===2){const n=4,h=L/n+.012;g=stack(...Array.from({length:n},(_,i)=>[puck(top+(bottom-top)*(n-1-i)/(n-1),h,h*.42),i*(L-h)/(n-1)] as [THREE.BufferGeometry,number]));}
 else if(v===3){const n=4;g=stack(...Array.from({length:n},(_,i)=>{const r=(top+(bottom-top)*(n-1-i)/(n-1))*1.12;return [sphere(1).scale(r,L/n*.62,r),L*(i+.5)/n] as [THREE.BufferGeometry,number];}));}
 else g=v===0?frustum(bottom,top,L,.02):v===1?flare(bottom,top,L,2.2,.02):v===4?faceted(frustum(bottom,top,L,.012,8)):taperedPill(bottom,top,L);
 g.translate(0,-to,0);
 return hipCap?mergeGeometries([g,sphere(top*.95)]):g;
}
/** Arm segment spanning y=-from … y=-to. `upper` picks the taper direction for the cone variant. */
function armGeometry(v:number,from:number,to:number,upper:boolean){
 const r=.068,h=to-from;let g:THREE.BufferGeometry;
 if(v===4)g=stack(...Array.from({length:4},(_,i)=>[sphere(1).scale(r*1.15,h/4*.62,r*1.15),h*(i+.5)/4] as [THREE.BufferGeometry,number]));
 else{
  const cone=upper?[r*.85,r*1.25]:[r*1.35,r*.8];
  g=v===0?frustum(r,r,h,.012):v===1?frustum(cone[0],cone[1],h,.012):v===2?taperedPill(r,r,h):v===3?new RoundedBoxGeometry(r*1.7,h,r*1.7,4,.022).translate(0,h/2,0):faceted(frustum(r,r,h,.012,8));
 }
 g.translate(0,-to,0);
 return g;
}
function footGeometry(v:number){
 const g=v===0?frustum(.15,.112,.16,.03)
  :v===1?dome(.155,.16,.025)
  :v===2?faceted(frustum(.16,.1,.16,.012,4)).rotateY(Math.PI/4)
  :v===3?puck(.15,.13,.05)
  :v===4?flare(.16,.105,.16,2.4,.02)
  :faceted(frustum(.155,.11,.16,.012,8)).rotateY(Math.PI/8);
 g.scale(1,1,1.12);g.translate(0,0,.02);
 return g;
}
function geometryFor(b:BoneDefinition,p:PartChoice):THREE.BufferGeometry {
 const v=p.variant,L=b.length;
 const box=(x:number,y:number,z:number,r=.03)=>new RoundedBoxGeometry(x,y,z,4,r);
 const cylinder=(top:number,bottom:number,h:number,n=64)=>{const c=beveledCylinder(top,bottom,h,n,Math.min(.012,h*.08));return n<16?faceted(c):c;};
 let g:THREE.BufferGeometry;
 if(b.kind==='head'){
  const r=.155;
  g=v===0?sphere(r):v===1?cylinder(0,.18,L):v===2?cylinder(.155,.155,L,8):v===3?new THREE.CapsuleGeometry(.13,.05,8,24):v===4?box(.265,L,.265,.035):bowl(.17,L,.025);
  if(v!==5)g.translate(0,L/2,0);
  const mount=sphere(.056);mount.translate(0,.145,.115);g=mergeGeometries([g,mount]);
 } else if(b.kind==='torso'){
  g=planarUV(torsoGeometry(v,L));
 } else if(b.kind==='pelvis'){
  g=planarUV(pelvisGeometry(v));
 } else if(b.kind==='connector'){
  const hip=b.id.startsWith('hip'),r=hip?.045:b.id==='spine_lower'?.082:b.id==='neck'?.055:b.id.startsWith('knee')?kneeRadius:b.id.startsWith('elbow')?elbowRadius:.09;
  // Shoulder and knee are the only ball joints: the limb segments beside them carry no caps of their own.
  if(b.id.startsWith('shoulder'))g=sphere(r);
  else if(b.id.startsWith('knee')||b.id.startsWith('elbow'))g=sphere(r);
  else g=v===0?sphere(r):v===1?puck(r,r*1.3,r*.5).translate(0,-r*.65,0):v===2?cylinder(r,r,hip?.065:L):new THREE.CapsuleGeometry(r,hip?.015:L*.25,10,32);
  if(b.id==='spine_lower'||b.id==='neck'){if(v<2)g.scale(1,Math.max(1,L/r*.65),1);g.translate(0,L*.4,0);}
 } else if(b.kind==='leg'){
  // Both segments stop where they sit flush on the knee ball, so the knee reads as its own part.
  const knee=seat(kneeRadius,.08);
  g=b.id.startsWith('thigh')?legGeometry(v,0,L-knee,.064,.08,true):legGeometry(v,knee,L,.08,.118,false);
 } else if(b.kind==='limb'){
  // Upper arm plugs into the shoulder ball; both arm segments stop flush on the elbow ball.
  const upper=b.id.startsWith('upperarm'),endRadius=v===1?.068*(upper?.85:.8):v===3?.058:.068,elbow=seat(elbowRadius,endRadius);
  g=upper?armGeometry(v,0,L-elbow,true):armGeometry(v,elbow,L,false);
 } else if(b.kind==='hand'){
  g=v===0?sphere(.09):v===1?box(.145,.15,.14,.035):v===2?new THREE.TorusGeometry(.064,.032,16,48):v===3?cylinder(0,.105,.17):v===4?faceted(bicone(.035,.095,.08,.035,.16,.008,8)).translate(0,-.08,0):new THREE.CapsuleGeometry(.064,.055,8,24);g.translate(0,-.045,0);
 } else if(b.kind==='foot'){
  g=footGeometry(v);g.computeBoundingBox();const min=g.boundingBox!.min.y,max=g.boundingBox!.max.y;g.translate(0,-max,0);g.scale(1,.16/(max-min),1);
 } else {
  g=v===0?sphere(.031):v===1?box(.023,.082,.018,.008):v===2?new THREE.CylinderGeometry(.043,.043,.018,3):v===3?sphere(.021):v===4?new THREE.TorusGeometry(.03,.009,8,24):box(.025,.075,.018,.008);
  if(v===2)g.rotateX(Math.PI/2);
  if(v===3){g.translate(-.035,0,0);const other=sphere(.021);other.translate(.035,0,0);g=mergeGeometries([g,other]);}
  if(v===5){const other=box(.075,.025,.018,.008);g=mergeGeometries([g,other]);}
 }
 return g;
}
export function createCharacter(spec:CharacterSpec,weavePalette:WeavePaletteName='HFCD',layerOrder:LayerGroup[]=defaultLayerOrder) {
 const group=new THREE.Group();group.name='geofolk_character';
 const map=new Map<string,THREE.Bone>();
 bones.forEach(def=>{const bone=new THREE.Bone();bone.name=def.id;bone.position.fromArray(def.headPosition);bone.userData={length:def.length};map.set(def.id,bone);if(def.parent)map.get(def.parent)!.add(bone);else group.add(bone);});
 group.updateMatrixWorld(true);
 const skeleton=new THREE.Skeleton(bones.map(b=>map.get(b.id)!));
 bones.forEach((def,index)=>{
  const choice=spec.parts[def.id],geometry=geometryFor(def,choice),count=geometry.getAttribute('position').count;
  const indices=new Uint16Array(count*4),weights=new Float32Array(count*4);
  for(let i=0;i<count;i++){indices[i*4]=index;weights[i*4]=1;}
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  const mesh=new THREE.SkinnedMesh(geometry,materialFor(def,choice,spec,weavePalette));mesh.name=`${def.id}_mesh`;mesh.renderOrder=layerOf(def.id,layerOrder);mesh.position.copy(map.get(def.id)!.getWorldPosition(new THREE.Vector3()));mesh.frustumCulled=false;mesh.userData={bone:def.id,asset:choice.variant};group.add(mesh);group.updateMatrixWorld(true);mesh.bind(skeleton,mesh.matrixWorld.clone());
 });
 group.userData={seed:spec.label,restHeight,units:'meters',rigVersion:2};
 // Stand the figure on the floor: translate so the lowest posed vertex sits at y = 0.
 const ground=()=>{group.position.y=0;group.updateMatrixWorld(true);let minY=Infinity;const vertex=new THREE.Vector3();for(const def of bones){const mesh=group.getObjectByName(`${def.id}_mesh`) as THREE.SkinnedMesh;const positions=mesh.geometry.getAttribute('position'),matrix=map.get(def.id)!.matrixWorld;for(let i=0;i<positions.count;i+=3){vertex.fromBufferAttribute(positions,i).applyMatrix4(matrix);minY=Math.min(minY,vertex.y);}}group.position.y=-minY;group.updateMatrixWorld(true);skeleton.update();};
 const applyPose=(pose:Pose)=>{bones.forEach(def=>map.get(def.id)!.rotation.fromArray([...poseRotation(def.id,pose),'XYZ']));ground();};
 /** Live pose: local in-plane (Z) rotation per bone, in radians; bones left out go straight. */
 const applyAngles=(angles:Record<string,number>)=>{bones.forEach(def=>map.get(def.id)!.rotation.set(0,0,angles[def.id]??0));ground();};
 /** Re-stack the parts without rebuilding the character. */
 const setLayerOrder=(order:LayerGroup[])=>{for(const def of bones)(group.getObjectByName(`${def.id}_mesh`) as THREE.SkinnedMesh).renderOrder=layerOf(def.id,order);};
 const dispose=()=>{group.traverse(o=>{if(o instanceof THREE.SkinnedMesh){o.geometry.dispose();const m=o.material as THREE.MeshBasicMaterial;m.map?.dispose();m.dispose();}});skeleton.dispose();};
 return {group,skeleton,map,applyPose,applyAngles,setLayerOrder,dispose};
}
export type CharacterRig=ReturnType<typeof createCharacter>;

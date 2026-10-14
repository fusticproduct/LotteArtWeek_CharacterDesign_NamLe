import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {beveledCylinder,dome,frustum,puck,flare,bicone,taperedPill,sphere,faceted,mergeGeometries,paper,ellipse2d,type Point2} from './geometry';
import {bones,poseRotation,restHeight,patternedKinds,twoTone,isBeaded,defaultDepth,defaultProportions,single,type CharacterSpec,type BoneDefinition,type PartChoice,type Pose,type LayerDepth,type Proportions} from './model';

import {drawWeave,weaveDensity,type WeavePaletteName} from './weave';
import {partColors} from './themes';
import {bodyLayout,halfWidthAt,shoulderY,hipY,seamMargin,bodyTop,type BodyLayout} from './body';

/**
 * 2D look: every part is a flat, unlit colour drawn in a fixed layer order (painter's algorithm),
 * like cut paper. The meshes are still the 3D shapes, seen straight on by an orthographic camera.
 */
export const layerGroups={arms:'Arms',head:'Head',neck:'Neck',torso:'Body',pelvis:'Lower body',legs:'Legs'} as const;
export type LayerGroup = keyof typeof layerGroups;
/** Default stacking, top first: arms over the body, legs at the back. */
export const defaultLayerOrder:LayerGroup[]=['arms','head','torso','neck','pelvis','legs'];
/** Groups of the older 14-row layer list, so a stored order keeps its meaning. */
const legacyGroups:Record<string,LayerGroup>={shoulder:'arms',upperarm:'arms',elbow:'arms',forearm:'arms',hand:'arms',thigh:'legs',knee:'legs',shin:'legs',foot:'legs'};
/** Keeps a stored order usable after groups are added or renamed. */
export const normalizeLayerOrder=(order:unknown):LayerGroup[]=>{
 const mapped=Array.isArray(order)?order.map(g=>legacyGroups[g]??g):[];
 const valid=mapped.filter((g,i)=>g in layerGroups&&mapped.indexOf(g)===i) as LayerGroup[];
 return [...valid,...defaultLayerOrder.filter(g=>!valid.includes(g))];
};
export const groupOf=(id:string):LayerGroup=>{
 if(id==='root'||id.startsWith('hip_'))return 'pelvis';
 // The build row (waist bone) is listed with the top piece; its hidden mesh is drawn with the bottom piece.
 if(id==='spine_upper'||id==='spine_lower')return 'torso';
 if(id==='head'||id==='face_mark')return 'head';
 if(id==='neck')return 'neck';
 return /^(shoulder|upperarm|elbow|forearm|hand)_/.test(id)?'arms':'legs';
};
/**
 * Inside a limb the stack is fixed, back to front, so the limb never looks broken: each ball joint
 * covers the two segment ends it joins, and the outer piece lies over the inner one (a hand raised
 * to the shoulder stays in front of it).
 */
export const limbStack={arm:['upperarm','shoulder','forearm','elbow','hand'],leg:['thigh','shin','knee','foot']} as const;
/** Bottom-to-top draw order of every bone, for a layer order and the current depth cues. */
export function drawOrder(order:LayerGroup[],depth:LayerDepth=defaultDepth):string[]{
 const limb=(parts:readonly string[],side:'L'|'R')=>parts.map(p=>`${p}_${side}`);
 const other=(side:'L'|'R')=>side==='L'?'R':'L';
 // An arm that reaches behind the body tucks under the torso (only matters while the arms are drawn over it).
 const tucked=order.indexOf('arms')<order.indexOf('torso')?(['L','R'] as const).filter(s=>depth.behind[s]):[];
 const pair=(parts:readonly string[],front:'L'|'R',skip:readonly string[]=[])=>[other(front),front].filter(s=>!skip.includes(s)).flatMap(s=>limb(parts,s as 'L'|'R'));
 const blocks:Record<LayerGroup,string[]>={
  arms:pair(limbStack.arm,depth.frontArm,tucked),
  legs:pair(limbStack.leg,depth.frontLeg),
  torso:[...pair(limbStack.arm,depth.frontArm,(['L','R'] as const).filter(s=>!tucked.includes(s))),'spine_upper'],
  head:['head','face_mark'],neck:['neck'],pelvis:['spine_lower','hip_L','hip_R','root'],
 };
 return [...order].reverse().flatMap(g=>blocks[g]);
}
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
/** `colorOf` gives the hex of a palette index in the chosen palette (see themes.ts). */
function materialFor(b:BoneDefinition,p:PartChoice,spec:CharacterSpec,weavePalette:WeavePaletteName,colorOf:(index:number)=>string) {
 const material=new THREE.MeshBasicMaterial({color:colorOf(p.color),depthTest:false,depthWrite:false});
 if(p.pattern===twoTone&&!isBeaded(b,p.variant)&&typeof document!=='undefined'){
  // Two colour layers along the segment: V runs along its length on every lathe, box and pill shape.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d')!,split=[.38,.5,.62][(p.color+p.accent)%3];
  ctx.fillStyle=colorOf(p.color);ctx.fillRect(0,0,256,256);
  ctx.fillStyle=colorOf(p.accent);ctx.fillRect(0,0,256,Math.round(256*(1-split)));
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
/**
 * Paper grain (A5): a tiling noise texture with a few fibres, shared by every character. Made on first use
 * because it needs a canvas (not available in the Node tests, which never render).
 */
let grainTexture:THREE.CanvasTexture|null=null;
function paperGrain(){
 if(grainTexture)return grainTexture;
 const size=256,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d')!;
 // Coarse blotches (a small noise image scaled up smoothly) under fine per-pixel grain.
 const coarse=document.createElement('canvas');coarse.width=coarse.height=16;const cctx=coarse.getContext('2d')!,blot=cctx.createImageData(16,16);
 for(let i=0;i<blot.data.length;i+=4){const v=128+(Math.random()-.5)*70;blot.data[i]=blot.data[i+1]=blot.data[i+2]=v;blot.data[i+3]=255;}
 cctx.putImageData(blot,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(coarse,0,0,size,size);
 const img=ctx.getImageData(0,0,size,size);for(let i=0;i<img.data.length;i+=4){const n=(Math.random()-.5)*60;for(let j=0;j<3;j++)img.data[i+j]=Math.max(0,Math.min(255,img.data[i+j]+n));}
 ctx.putImageData(img,0,0);
 ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=1;for(let i=0;i<40;i++){const x=Math.random()*size,y=Math.random()*size,a=Math.random()*Math.PI;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*18,y+Math.sin(a)*18);ctx.stroke();}
 grainTexture=new THREE.CanvasTexture(canvas);grainTexture.wrapS=grainTexture.wrapT=THREE.RepeatWrapping;
 return grainTexture;
}
/**
 * Paper look on a flat material: grain sampled in the part's own space (so it moves with the part) and a soft
 * light-to-dark shift from the top to the bottom of the part, like ink pooling. `amount` 0 turns it off.
 */
function addPaper(material:THREE.MeshBasicMaterial,geometry:THREE.BufferGeometry,amount:{value:number}){
 if(typeof document==='undefined')return;
 geometry.computeBoundingBox();const span=new THREE.Vector2(geometry.boundingBox!.min.y,geometry.boundingBox!.max.y);
 material.customProgramCacheKey=()=>'geofolk-paper';
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{paperGrain:{value:paperGrain()},paperAmount:amount,paperSpan:{value:span}});
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPaper;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPaper=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D paperGrain;uniform float paperAmount;uniform vec2 paperSpan;varying vec3 vPaper;')
   .replace('#include <map_fragment>','#include <map_fragment>\nfloat paperNoise=texture2D(paperGrain,vPaper.xy*1.6).r-.5;float paperDown=clamp((vPaper.y-paperSpan.x)/max(paperSpan.y-paperSpan.x,1e-4),0.,1.);\ndiffuseColor.rgb*=1.+paperAmount*(paperNoise*.6+(paperDown-.5)*.3);');
 };
}
/** Front-projected UVs in metres: the pattern stays undistorted on any silhouette. */
function planarUV(g:THREE.BufferGeometry){
 const position=g.getAttribute('position'),uv=g.getAttribute('uv');
 for(let i=0;i<position.count;i++)uv.setXY(i,position.getX(i),position.getY(i));
 return g;
}
/** Stacks several pieces; each entry is [geometry, y offset]. */
const stack=(...pieces:[THREE.BufferGeometry,number][])=>mergeGeometries(pieces.map(([g,y])=>{g.translate(0,y,0);return g;}));
/** Corner rounding of the flat (2D) parts, in metres. */
const paperRound=.022,markRound=.007;
/** Shoulder ball centre: three quarters of its radius outside the top piece's edge at shoulder height, so the arms always hang from the body whatever its shape or size. */
export const shoulderX=(layout:BodyLayout,prop:Proportions=defaultProportions)=>halfWidthAt(layout.top.outline,shoulderY)+shoulderRadius*prop.joints*.75;
/** Flat head silhouettes, 0 → 0.31 above the neck; `markY` is where the face mark sits on each. */
const headOutlines:{outline:Point2[];markY:number}[]=[
 {outline:ellipse2d(0,.155,.155,.155),markY:.16},
 {outline:[[-.21,0],[.21,0],[0,.31]],markY:.11},
 {outline:Array.from({length:6},(_,i)=>{const a=Math.PI/2+i*Math.PI/3;return [.158*Math.cos(a),.155+.155*Math.sin(a)] as Point2;}),markY:.155},
 {outline:[[-.2,.31],[.2,.31],[0,-.02]],markY:.215},
 {outline:[[-.145,0],[.145,0],[.145,.31],[-.145,.31]],markY:.155},
 {outline:ellipse2d(0,0,.19,.31,0,Math.PI,40),markY:.12},
];
const box2d=(w:number,h:number):Point2[]=>[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
/** Face marks, centred on the mark point: Dot, Dash, Triangle, Twin dots, Ring, Bar. */
const markOutlines:{outline:Point2[];holes?:Point2[][]}[][]=[
 [{outline:ellipse2d(0,0,.03,.03,0,Math.PI*2,32)}],
 [{outline:box2d(.026,.09)}],
 [{outline:[[-.04,.025],[.04,.025],[0,-.04]]}],
 [{outline:ellipse2d(-.04,0,.022,.022,0,Math.PI*2,28)},{outline:ellipse2d(.04,0,.022,.022,0,Math.PI*2,28)}],
 [{outline:ellipse2d(0,0,.035,.035,0,Math.PI*2,32),holes:[ellipse2d(0,0,.017,.017,0,Math.PI*2,24)]}],
 [{outline:box2d(.09,.024)}],
];
/** Ball joint radii, 85% of the first 2D build so the joints read as dots rather than balls (Nam, 2026-10-11). */
export const kneeRadius=.105*.85,elbowRadius=.088*.85,shoulderRadius=.09*.85;
/** Distance from a ball joint's centre at which a segment end of radius `end` sits flush on the ball. */
const seat=(ball:number,end:number)=>Math.sqrt(Math.max(ball*ball-end*end,0));
/**
 * Chain of true spheres along y=0 … L, radius going from `bottom` (y=0) to `top` (y=L). Never stretched or squashed:
 * the length sets how many beads fit, about 1.35 radii apart (Nam, 2026-10-14).
 */
const beads=(L:number,top:number,bottom:number)=>{const n=Math.max(2,Math.round(L/((top+bottom)/2*1.35)));return stack(...Array.from({length:n},(_,i)=>[sphere(top+(bottom-top)*(n-1-i)/(n-1)),L*(i+.5)/n] as [THREE.BufferGeometry,number]));};
/** Leg segment spanning y=-from … y=-to (slim at the hip, widening towards the foot); `w` scales its width. */
function legGeometry(v:number,from:number,to:number,top:number,bottom:number,hipCap:boolean,w:number){
 const L=to-from;let g:THREE.BufferGeometry;
 if(v===3)g=beads(L,top*1.12*w,bottom*1.12*w);
 else{
  if(v===2){const n=4,h=L/n+.012;g=stack(...Array.from({length:n},(_,i)=>[puck(top+(bottom-top)*(n-1-i)/(n-1),h,h*.42),i*(L-h)/(n-1)] as [THREE.BufferGeometry,number]));}
  else g=v===0?frustum(bottom,top,L,.02):v===1?flare(bottom,top,L,2.2,.02):v===4?faceted(frustum(bottom,top,L,.012,8)):taperedPill(bottom,top,L);
  g.scale(w,1,w);
 }
 g.translate(0,-to,0);
 return hipCap?mergeGeometries([g,sphere(top*.95*w)]):g;
}
/** Arm segment spanning y=-from … y=-to; `upper` picks the taper direction for the cone variant, `w` scales its width. */
function armGeometry(v:number,from:number,to:number,upper:boolean,w:number){
 const r=.068,h=to-from;let g:THREE.BufferGeometry;
 if(v===4)g=beads(h,r*w,r*w);
 else{
  const cone=upper?[r*.85,r*1.25]:[r*1.35,r*.8];
  g=v===0?frustum(r,r,h,.012):v===1?frustum(cone[0],cone[1],h,.012):v===2?taperedPill(r,r,h):v===3?new RoundedBoxGeometry(r*1.7,h,r*1.7,4,.022).translate(0,h/2,0):faceted(frustum(r,r,h,.012,8));
  g.scale(w,1,w);
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
function geometryFor(b:BoneDefinition,p:PartChoice,spec:CharacterSpec,prop:Proportions,body:BodyLayout):THREE.BufferGeometry {
 const v=p.variant,L=b.length;
 const box=(x:number,y:number,z:number,r=.03)=>new RoundedBoxGeometry(x,y,z,4,r);
 const cylinder=(top:number,bottom:number,h:number,n=64)=>{const c=beveledCylinder(top,bottom,h,n,Math.min(.012,h*.08));return n<16?faceted(c):c;};
 let g:THREE.BufferGeometry;
 if(b.kind==='head'){
  // Rounding pulls a pointed top down a little; lift every head so its top sits exactly at the rest height.
  g=paper([{outline:headOutlines[v].outline}],paperRound);g.computeBoundingBox();g.translate(0,L-g.boundingBox!.max.y,0);g.scale(prop.head,prop.head,prop.head);
 } else if(b.kind==='torso'){
  // Body pieces are laid out in the pelvis bone's space; the torso bone sits on the waist pivot. Patterns are mapped in metres.
  g=paper([body.top],paperRound);g.translate(0,-body.pivot,0);g=planarUV(g);
 } else if(b.kind==='pelvis'){
  // A Single body has no bottom piece: the pelvis bone keeps a small hidden disc between the hips.
  g=body.bottom?planarUV(paper([body.bottom],paperRound)):sphere(.03).translate(0,hipY,0);
 } else if(b.id==='spine_lower'){
  // Hidden inside both pieces, around the waist pivot.
  g=sphere(seamMargin*.7);
 } else if(b.kind==='connector'){
  const hip=b.id.startsWith('hip'),r=hip?.045:b.id==='neck'?.055:(b.id.startsWith('knee')?kneeRadius:b.id.startsWith('elbow')?elbowRadius:shoulderRadius)*prop.joints;
  // Shoulder and knee are the only ball joints: the limb segments beside them carry no caps of their own.
  // Hip joints are hidden inside the body, so every hip variant is a plain ball that fits there.
  if(b.id.startsWith('shoulder')||hip)g=sphere(r);
  else if(b.id.startsWith('knee')||b.id.startsWith('elbow'))g=sphere(r);
  else g=v===0?sphere(r):v===1?puck(r,r*1.3,r*.5).translate(0,-r*.65,0):v===2?cylinder(r,r,hip?.065:L):new THREE.CapsuleGeometry(r,hip?.015:L*.25,10,32);
  if(b.id==='neck'){if(v<2)g.scale(1,Math.max(1,L/r*.65),1);g.translate(0,L*.4,0);}
 } else if(b.kind==='leg'){
  // Both segments stop where they sit flush on the knee ball, so the knee reads as its own part.
  const knee=seat(kneeRadius*prop.joints,.08*prop.legs);
  g=b.id.startsWith('thigh')?legGeometry(v,0,L-knee,.064,.08,true,prop.legs):legGeometry(v,knee,L,.08,.118,false,prop.legs);
 } else if(b.kind==='limb'){
  // Upper arm plugs into the shoulder ball; both arm segments stop flush on the elbow ball.
  const upper=b.id.startsWith('upperarm'),endRadius=v===1?.068*(upper?.85:.8):v===3?.058:.068,elbow=seat(elbowRadius*prop.joints,endRadius*prop.arms);
  g=upper?armGeometry(v,0,L-elbow,true,prop.arms):armGeometry(v,elbow,L,false,prop.arms);
 } else if(b.kind==='hand'){
  g=v===0?sphere(.09):v===1?box(.145,.15,.14,.035):v===2?new THREE.TorusGeometry(.064,.032,16,48):v===3?cylinder(0,.105,.17):v===4?faceted(bicone(.035,.095,.08,.035,.16,.008,8)).translate(0,-.08,0):new THREE.CapsuleGeometry(.064,.055,8,24);g.translate(0,-.045,0);
 } else if(b.kind==='foot'){
  g=footGeometry(v);g.computeBoundingBox();const min=g.boundingBox!.min.y,max=g.boundingBox!.max.y;g.translate(0,-max,0);g.scale(1,.16/(max-min),1);g.scale(prop.feet,prop.feet,prop.feet);
 } else {
  // The face-mark bone sits at a fixed height; move the mark to where it reads best on the chosen head.
  g=paper(markOutlines[v],markRound,.02);g.scale(prop.head,prop.head,prop.head);g.translate(0,headOutlines[spec.parts.head.variant].markY*prop.head-b.headPosition[1],0);
 }
 return g;
}
export function createCharacter(spec:CharacterSpec,weavePalette:WeavePaletteName='HFCD',layerOrder:LayerGroup[]=defaultLayerOrder,proportions:Proportions=defaultProportions) {
 const group=new THREE.Group();group.name='geofolk_character';
 const map=new Map<string,THREE.Bone>(),paperAmount={value:1},colorOf=partColors(spec,weavePalette),body=bodyLayout(spec,proportions);
 // The waist pivot moves to the seam between the body pieces; neck and shoulders keep their height, shoulders and hips follow the pieces' edges.
 const place=(def:typeof bones[number],bone:THREE.Bone)=>{
  const side=Math.sign(def.headPosition[0]);
  if(def.id==='spine_lower')bone.position.y=body.pivot;
  else if(def.id==='spine_upper')bone.position.y=0;
  else if(def.id==='neck')bone.position.y=bodyTop-.01-body.pivot;
  else if(def.id.startsWith('shoulder_'))bone.position.set(side*shoulderX(body,proportions),shoulderY-body.pivot,0);
  else if(def.id.startsWith('hip_'))bone.position.x=side*body.hipX;
 };
 bones.forEach(def=>{const bone=new THREE.Bone();bone.name=def.id;bone.position.fromArray(def.headPosition);place(def,bone);bone.userData={length:def.length};map.set(def.id,bone);if(def.parent)map.get(def.parent)!.add(bone);else group.add(bone);});
 group.updateMatrixWorld(true);
 const skeleton=new THREE.Skeleton(bones.map(b=>map.get(b.id)!));
 bones.forEach((def,index)=>{
  const choice=spec.parts[def.id],geometry=geometryFor(def,choice,spec,proportions,body),count=geometry.getAttribute('position').count;
  const indices=new Uint16Array(count*4),weights=new Float32Array(count*4);
  for(let i=0;i<count;i++){indices[i*4]=index;weights[i*4]=1;}
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  const material=materialFor(def,choice,spec,weavePalette,colorOf);addPaper(material,geometry,paperAmount);
  const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name=`${def.id}_mesh`;mesh.position.copy(map.get(def.id)!.getWorldPosition(new THREE.Vector3()));mesh.frustumCulled=false;mesh.userData={bone:def.id,asset:choice.variant};group.add(mesh);group.updateMatrixWorld(true);mesh.bind(skeleton,mesh.matrixWorld.clone());
 });
 group.userData={seed:spec.label,restHeight,units:'meters',rigVersion:3,proportions};
 let stacking={order:layerOrder,depth:defaultDepth},stackKey='';
 /** Re-stack the parts without rebuilding the character; cheap to call every frame. */
 const restack=(next:Partial<typeof stacking>)=>{
  stacking={...stacking,...next};const key=JSON.stringify(stacking);if(key===stackKey)return;stackKey=key;
  drawOrder(stacking.order,stacking.depth).forEach((id,rank)=>{(group.getObjectByName(`${id}_mesh`) as THREE.SkinnedMesh).renderOrder=rank;});
 };
 restack({});
 // Stand the figure on the floor: translate so the lowest posed vertex sits at y = 0.
 const ground=()=>{group.position.y=0;group.updateMatrixWorld(true);let minY=Infinity;const vertex=new THREE.Vector3();for(const def of bones){const mesh=group.getObjectByName(`${def.id}_mesh`) as THREE.SkinnedMesh;const positions=mesh.geometry.getAttribute('position'),matrix=map.get(def.id)!.matrixWorld;for(let i=0;i<positions.count;i+=3){vertex.fromBufferAttribute(positions,i).applyMatrix4(matrix);minY=Math.min(minY,vertex.y);}}group.position.y=-minY;group.updateMatrixWorld(true);skeleton.update();};
 /**
  * A Single body is one piece, so it cannot bend at the waist: the waist turn goes to the whole body instead, and the
  * thighs turn back by the same amount so the legs keep their direction.
  */
 const unbent=(angles:Record<string,number>)=>{
  if(body.build!==single||!angles.spine_lower)return angles;
  const bend=angles.spine_lower;return {...angles,spine_lower:0,root:(angles.root??0)+bend,thigh_L:(angles.thigh_L??0)-bend,thigh_R:(angles.thigh_R??0)-bend};
 };
 /** Live pose: local in-plane (Z) rotation per bone, in radians; bones left out go straight. */
 const applyAngles=(angles:Record<string,number>)=>{const a=unbent(angles);bones.forEach(def=>map.get(def.id)!.rotation.set(0,0,a[def.id]??0));ground();};
 // Preset poses only turn in the picture plane (Z), so they go through the same path.
 const applyPose=(pose:Pose)=>applyAngles(Object.fromEntries(bones.map(def=>[def.id,poseRotation(def.id,pose)[2]])));
 const setLayerOrder=(order:LayerGroup[])=>restack({order});
 /** Paper grain and tone on or off (A5); a shared uniform, so no rebuild. */
 const setPaper=(on:boolean)=>{paperAmount.value=on?1:0;};
 /** Live pose depth: which arm/leg is in front and which arms are behind the body (null = default stacking). */
 const setDepth=(depth:LayerDepth|null)=>restack({depth:depth??defaultDepth});
 const dispose=()=>{group.traverse(o=>{if(o instanceof THREE.SkinnedMesh){o.geometry.dispose();const m=o.material as THREE.MeshBasicMaterial;m.map?.dispose();m.dispose();}});skeleton.dispose();};
 return {group,skeleton,map,applyPose,applyAngles,setLayerOrder,setDepth,setPaper,dispose};
}
export type CharacterRig=ReturnType<typeof createCharacter>;

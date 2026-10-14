import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {beveledCylinder,dome,frustum,puck,flare,bicone,taperedPill,sphere,faceted,mergeGeometries,paper,ellipse2d,type Point2} from './geometry';
import {rng,bones,poseRotation,restHeight,patternedKinds,twoTone,isBeaded,defaultDepth,defaultProportions,single,patchwork,flow,jointShapeOf,jointSizeOf,type CharacterSpec,type BoneDefinition,type PartChoice,type Pose,type LayerDepth,type Proportions} from './model';

import {drawWeave,drawPatchwork,drawFlow,patchworkUnits,weaveDensity,type WeavePaletteName} from './weave';
import {partColors,stageColor} from './themes';
import {defaultRiso,risoBlends,type RisoSettings} from './riso';
import {createFingers} from './fingers';
import {hairStyles,placeHair} from './hair';
import {createDangles} from './hairPhysics';
import {createPixelPart,defaultPixel,type PixelSettings} from './pixelate';
import {createSpray,defaultSpray,type SpraySettings} from './spray';
import {bodyLayout,halfWidthAt,shoulderY,hipY,waistRadius,bodyTop,type BodyLayout} from './body';

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
 if(id==='head'||id==='face_mark'||id==='hair')return 'head';
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
  head:['head','hair','face_mark'],neck:['neck'],pelvis:['spine_lower','hip_L','hip_R','root'],
 };
 return [...order].reverse().flatMap(g=>blocks[g]);
}
/** Flow: one full loop of its colours per 0.6 m, sliding along at one loop per 14 s. */
export const flowSpan=.6,flowPeriod=14;
/**
 * Checker spots (Nam, 2026-10-14): each of the two patchwork spots takes one of four looks, on its own: the patchwork
 * quilt, stripes across the part, stripes down it, or a two-colour checkerboard. Stripes and checks use two of the
 * character's own colours, picked to stand apart in lightness.
 */
/**
 * The one part drawn on the pixel grid (pixelate.ts): never a joint, never patterned. A plain arm or leg segment, else a
 * plain hand or foot; if every one of those carries a pattern, a two-tone segment, drawn in its main colour only.
 */
export const pixelPartOf=(spec:CharacterSpec)=>{
 const pick=(list:BoneDefinition[])=>list.length?list[Math.floor(rng(`${spec.label}|pixel`)()*list.length)].id:null,segment=(b:BoneDefinition)=>b.kind==='limb'||b.kind==='leg';
 return pick(bones.filter(b=>segment(b)&&spec.parts[b.id].pattern===0))??pick(bones.filter(b=>(b.kind==='hand'||b.kind==='foot')&&spec.parts[b.id].pattern===0))??pick(bones.filter(b=>segment(b)&&spec.parts[b.id].pattern===twoTone));
};
/** The two parts drawn spray-blurred (spray.ts): any head, body piece, arm or leg segment, hand or foot but the pixel part. */
export const sprayPartsOf=(spec:CharacterSpec)=>{
 const pixel=pixelPartOf(spec),r=rng(`${spec.label}|spray`);
 const options=bones.filter(b=>['head','torso','pelvis','limb','leg','hand','foot'].includes(b.kind)&&b.id!==pixel&&!(b.kind==='pelvis'&&spec.parts.spine_lower.variant===single)).map(b=>b.id);
 return options.map(id=>({id,k:r()})).sort((a,b)=>a.k-b.k).slice(0,2).map(o=>o.id);
};
export const checkerStyles=['Patchwork','Stripes across','Stripes down','Checkerboard'] as const;
export const checkerStyleOf=(spec:CharacterSpec,id:string)=>Math.floor(rng(`${spec.label}|${id}|checker`)()*checkerStyles.length);
const lightnessOf=(hex:string)=>{const c=new THREE.Color(hex);return (Math.max(c.r,c.g,c.b)+Math.min(c.r,c.g,c.b))/2;};
/** Two of the character's colours for a stripe or check spot: a random first one, then the most different in lightness of a few. */
export function checkerColours(spec:CharacterSpec,id:string,colorOf:(index:number)=>string):[string,string]{
 const r=rng(`${spec.label}|${id}|checker colours`),own=[...new Set(Object.values(spec.parts).flatMap(p=>[colorOf(p.color),colorOf(p.accent)]))];
 const first=own[Math.floor(r()*own.length)],rest=own.filter(c=>c!==first).sort(()=>r()-.5).slice(0,4);
 const second=rest.sort((a,b)=>Math.abs(lightnessOf(b)-lightnessOf(first))-Math.abs(lightnessOf(a)-lightnessOf(first)))[0]??'#ffffff';
 return [first,second];
}
/** Stripe width and check size (m) at Checker scale 100%. */
export const stripeWidth=.03,checkSize=.05;
/** World size (m) of one patchwork tile: 24 units of 3.5 cm, so a limb is about four units across. */
export const patchworkTile=patchworkUnits*.035;
/** World size (m) of one weave tile for a pattern-scale value: higher scale = more, smaller cells. */
export const weaveTileSize=(density:number)=>weaveDensity/(density*2)*.64;
const weaveCache=new Map<string,HTMLCanvasElement>();
function weaveCanvas(seed:string,palette:WeavePaletteName,draw:(canvas:HTMLCanvasElement,seed:string,palette:WeavePaletteName)=>unknown=drawWeave,size=2048){
 const key=`${size}|${palette}|${seed}`;let canvas=weaveCache.get(key);
 if(!canvas){
  // 2048 px so the threads stay sharp when zoomed in; the cache keeps the last 12 cloths.
  canvas=document.createElement('canvas');canvas.width=canvas.height=size;draw(canvas,seed,palette);
  weaveCache.set(key,canvas);if(weaveCache.size>12)weaveCache.delete(weaveCache.keys().next().value!);
 }
 return canvas;
}
/** `colorOf` gives the hex of a palette index in the chosen palette (see themes.ts). */
function materialFor(b:BoneDefinition,p:PartChoice,spec:CharacterSpec,weavePalette:WeavePaletteName,colorOf:(index:number)=>string,prop:Proportions) {
 const material=new THREE.MeshBasicMaterial({color:colorOf(p.color),depthTest:false,depthWrite:false});
 if(p.pattern===flow&&typeof document!=='undefined'){
  // Flow: a looping colour strip mapped along the part's own flow direction (see flowUV); tick() slides it.
  const texture=new THREE.CanvasTexture(weaveCanvas(`${spec.label}|${b.id}|flow`,weavePalette,drawFlow,512));
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.repeat.set(1/flowSpan,1);
  material.map=texture;material.color.setRGB(1,1,1);
 }
 else if(p.pattern===patchwork&&typeof document!=='undefined'){
  // Mapped flat in metres like the weave; each of the two spots has its own look: the patchwork quilt, or stripes or
  // checks in two of the character's colours (one period of them per texture, repeated).
  const style=checkerStyleOf(spec,b.id);let texture:THREE.CanvasTexture,period=patchworkTile;
  if(style===0)texture=new THREE.CanvasTexture(weaveCanvas(`${spec.label}|${b.id}|patchwork`,weavePalette,drawPatchwork,1024));
  else{
   const [a,c]=checkerColours(spec,b.id,colorOf),canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;
   ctx.fillStyle=a;ctx.fillRect(0,0,256,256);ctx.fillStyle=c;
   if(style===1)ctx.fillRect(0,0,256,128);else if(style===2)ctx.fillRect(0,0,128,256);else{ctx.fillRect(0,0,128,128);ctx.fillRect(128,128,128,128);}
   texture=new THREE.CanvasTexture(canvas);period=2*(style===3?checkSize:stripeWidth);
  }
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;texture.repeat.set(1/(period*prop.checker),1/(period*prop.checker));
  material.map=texture;material.color.setRGB(1,1,1);
 }
 else if(p.pattern===twoTone&&!isBeaded(b,p.variant)&&typeof document!=='undefined'){
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
 * Paper grain (A5): a seamless 1024 px tile, one per metre of part, shared by every character. Four octaves of
 * smooth value noise (cloudy blotches, mottling, tooth, fine tooth), per-pixel grit and a thousand thin light and dark fibres.
 * The first version was a 256 px tile with blotches blown up from 16 px, which read as low resolution (Nam, 2026-10-14).
 * Made on first use because it needs a canvas (not available in the Node tests, which never render).
 */
let grainTexture:THREE.CanvasTexture|null=null;
export const paperGrainSize=1024;
function paperGrain(){
 if(grainTexture)return grainTexture;
 const size=paperGrainSize,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d')!;
 const value=new Float32Array(size*size).fill(128);
 // Smooth value noise on an n × n lattice that wraps, so the tile repeats without seams.
 const octave=(n:number,amp:number)=>{
  const lattice=Float32Array.from({length:n*n},()=>Math.random()-.5),ease=(t:number)=>t*t*(3-2*t);
  for(let y=0;y<size;y++){const fy=y/size*n,y0=Math.floor(fy),ty=ease(fy-y0),r0=y0%n*n,r1=(y0+1)%n*n;
   for(let x=0;x<size;x++){const fx=x/size*n,x0=Math.floor(fx),tx=ease(fx-x0),c0=x0%n,c1=(x0+1)%n;
    const top=lattice[r0+c0]+(lattice[r0+c1]-lattice[r0+c0])*tx,bottom=lattice[r1+c0]+(lattice[r1+c1]-lattice[r1+c0])*tx;
    value[y*size+x]+=(top+(bottom-top)*ty)*amp;}}
 };
 octave(6,34);octave(24,28);octave(96,26);octave(320,18);
 const img=ctx.createImageData(size,size);
 for(let i=0;i<size*size;i++){const v=Math.max(0,Math.min(255,value[i]+(Math.random()-.5)*24));img.data[i*4]=img.data[i*4+1]=img.data[i*4+2]=v;img.data[i*4+3]=255;}
 ctx.putImageData(img,0,0);
 // Fibres: short, thin, slightly curved strokes; drawn again shifted by a tile where they cross an edge.
 ctx.lineCap='round';
 for(let i=0;i<1000;i++){
  const x=Math.random()*size,y=Math.random()*size,a=Math.random()*Math.PI,len=8+Math.random()*34,bend=(Math.random()-.5)*len*.5;
  ctx.strokeStyle=Math.random()<.65?`rgba(255,255,255,${.1+Math.random()*.16})`:`rgba(0,0,0,${.07+Math.random()*.1})`;ctx.lineWidth=.8+Math.random()*1.2;
  for(const dx of [-size,0,size])for(const dy of [-size,0,size]){
   const sx=x+dx,sy=y+dy;if(sx<-60||sx>size+60||sy<-60||sy>size+60)continue;
   ctx.beginPath();ctx.moveTo(sx,sy);ctx.quadraticCurveTo(sx+Math.cos(a)*len/2-Math.sin(a)*bend,sy+Math.sin(a)*len/2+Math.cos(a)*bend,sx+Math.cos(a)*len,sy+Math.sin(a)*len);ctx.stroke();
  }
 }
 grainTexture=new THREE.CanvasTexture(canvas);grainTexture.wrapS=grainTexture.wrapT=THREE.RepeatWrapping;grainTexture.anisotropy=8;
 return grainTexture;
}
/**
 * Paper look on a flat material: grain sampled in the part's own space (so it moves with the part) and a soft
 * light-to-dark shift from the top to the bottom of the part, like ink pooling. `amount` 0 turns it off.
 * Riso (riso.ts): a fine halftone laid out in the part's own space (so the dots move and turn with it). Dot spacing,
 * screen angle and coverage are set in the Parts panel; darker colours take a little more ink and the paper grain makes
 * the dots uneven. The riso colour is blended over the part's colour between the dots (or, inverted, in them).
 */
export type RisoUniforms=ReturnType<typeof risoUniforms>;
const risoUniforms=()=>({risoAmount:{value:0},risoCell:{value:defaultRiso.size},risoCover:{value:defaultRiso.coverage},risoAngle:{value:new THREE.Vector2(Math.SQRT1_2,Math.SQRT1_2)},risoGrain:{value:defaultRiso.grain},risoColor:{value:new THREE.Color(defaultRiso.color)},risoBlend:{value:0},risoInvert:{value:0}});
function addPaper(material:THREE.MeshBasicMaterial,geometry:THREE.BufferGeometry,amount:{value:number},riso:RisoUniforms){
 if(typeof document==='undefined')return;
 geometry.computeBoundingBox();const span=new THREE.Vector2(geometry.boundingBox!.min.y,geometry.boundingBox!.max.y);
 // Circles redrawn every frame (fingers, ragdoll hair) start empty: give them the neutral middle tone.
 if(span.y-span.x<1e-3)span.set(-1e3,1e3);
 material.customProgramCacheKey=()=>'geofolk-paper';
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{paperGrain:{value:paperGrain()},paperAmount:amount,paperSpan:{value:span},...riso});
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPaper;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPaper=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D paperGrain;uniform float paperAmount,risoAmount,risoCell,risoCover,risoGrain,risoInvert;uniform int risoBlend;uniform vec2 paperSpan,risoAngle;uniform vec3 risoColor;varying vec3 vPaper;')
   .replace('#include <map_fragment>','#include <map_fragment>\nfloat paperNoise=texture2D(paperGrain,vPaper.xy).r-.5;float paperDown=clamp((vPaper.y-paperSpan.x)/max(paperSpan.y-paperSpan.x,1e-4),0.,1.);\ndiffuseColor.rgb*=1.+paperAmount*(paperNoise*.6+(paperDown-.5)*.3);'+
    '\nif(risoAmount>0.){vec2 risoQ=fract(mat2(risoAngle.x,-risoAngle.y,risoAngle.y,risoAngle.x)*vPaper.xy/risoCell)-.5;float risoD=length(risoQ),risoL=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));'+
    'float risoR=sqrt(clamp(risoCover+(.5-sqrt(risoL))*.24+paperNoise*risoGrain*.6,.04,.995)/3.14159),risoW=max(fwidth(risoD)*.75,.01),risoInk=1.-smoothstep(risoR-risoW,risoR+risoW,risoD);'+
    'vec3 risoC=diffuseColor.rgb,risoK=risoColor;vec3 risoMix=risoBlend==1?risoC*risoK:risoBlend==2?1.-(1.-risoC)*(1.-risoK):risoBlend==3?mix(2.*risoC*risoK,1.-2.*(1.-risoC)*(1.-risoK),step(.5,risoC)):risoBlend==4?min(risoC,risoK):risoBlend==5?max(risoC,risoK):risoK;'+
    'diffuseColor.rgb=mix(risoC,risoMix,mix(1.-risoInk,risoInk,risoInvert)*risoAmount);}');
 };
}
/** Front-projected UVs in metres: the pattern stays undistorted on any silhouette. */
/** Flow mapping: U runs along the part's own axis (its bone's Y), so the colours run up a leg or an arm and turn with it (Nam, 2026-10-14); V is constant. */
function flowUV(g:THREE.BufferGeometry){
 const position=g.getAttribute('position'),uv=new THREE.BufferAttribute(new Float32Array(position.count*2),2);
 for(let i=0;i<position.count;i++)uv.setXY(i,position.getY(i),.5);
 g.setAttribute('uv',uv);return g;
}
const seedAngle=(text:string)=>{let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return (h>>>0)/4294967296*Math.PI*2;};
function planarUV(g:THREE.BufferGeometry){
 const position=g.getAttribute('position');if(!g.getAttribute('uv'))g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(position.count*2),2));const uv=g.getAttribute('uv');
 for(let i=0;i<position.count;i++)uv.setXY(i,position.getX(i),position.getY(i));
 return g;
}
/** Stacks several pieces; each entry is [geometry, y offset]. */
const stack=(...pieces:[THREE.BufferGeometry,number][])=>mergeGeometries(pieces.map(([g,y])=>{g.translate(0,y,0);return g;}));
/** Corner rounding of the flat (2D) parts, in metres. */
const paperRound=.022,markRound=.007;
/** Shoulder ball centre: three quarters of its radius outside the top piece's edge at shoulder height, so the arms always hang from the body whatever its shape or size. */
export const shoulderX=(layout:BodyLayout,shoulderBall:number=shoulderRadius)=>halfWidthAt(layout.top.outline,shoulderY)+shoulderBall*.75;
/** Radius of a ball joint for a character: the type's base radius, its size and the Joints slider. */
export const jointRadius=(spec:CharacterSpec,type:'shoulder'|'elbow'|'knee',prop:Proportions=defaultProportions)=>({shoulder:shoulderRadius,elbow:elbowRadius,knee:kneeRadius})[type]*jointSizeOf(spec.parts[`${type}_L`].variant)*prop.joints;
/** A segment's end is this fraction of the joint it meets, so the joint covers it and the segment tapers from joint to joint. */
const endRatio=.91;
/** A character's hair placed on its head (hair.ts), in the head bone's space, the head outline lifted and scaled as drawn. */
function hairOn(spec:CharacterSpec,prop:Proportions){
 const head=headOutlines[spec.parts.head.variant],lift=.31-Math.max(...head.outline.map(p=>p[1]));
 const outline=head.outline.map(([x,y])=>[x*prop.head,(y+lift)*prop.head] as Point2),markTop=(head.markY+.05)*prop.head;
 return placeHair(hairStyles[spec.parts.hair.variant]??hairStyles[0],outline,markTop,prop.hair);
}
/** Flat head silhouettes, 0 → 0.31 above the neck; `markY` is where the face mark sits on each. */
export const headOutlines:{outline:Point2[];markY:number}[]=[
 {outline:ellipse2d(0,.155,.155,.155),markY:.16},
 {outline:[[-.21,0],[.21,0],[0,.31]],markY:.11},
 {outline:Array.from({length:6},(_,i)=>{const a=Math.PI/2+i*Math.PI/3;return [.158*Math.cos(a),.155+.155*Math.sin(a)] as Point2;}),markY:.155},
 {outline:[[-.2,.31],[.2,.31],[0,-.02]],markY:.215},
 {outline:[[-.145,0],[.145,0],[.145,.31],[-.145,.31]],markY:.155},
 // A true half circle (never stretched): radius 0.3 keeps the top at the rest height and the flat base on the neck.
 {outline:ellipse2d(0,.01,.3,.3,0,Math.PI,48),markY:.13},
];
const box2d=(w:number,h:number):Point2[]=>[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
/** Face marks, centred on the mark point, always filled: Dot, Dash, Triangle, Twin dots, Diamond, Bar. */
const markOutlines:{outline:Point2[];holes?:Point2[][]}[][]=[
 [{outline:ellipse2d(0,0,.03,.03,0,Math.PI*2,32)}],
 [{outline:box2d(.026,.09)}],
 [{outline:[[-.04,.025],[.04,.025],[0,-.04]]}],
 [{outline:ellipse2d(-.04,0,.022,.022,0,Math.PI*2,28)},{outline:ellipse2d(.04,0,.022,.022,0,Math.PI*2,28)}],
 [{outline:[[0,-.044],[.034,0],[0,.044],[-.034,0]]}],
 [{outline:box2d(.09,.024)}],
];
/**
 * Flat joint shapes (Square, Diamond, Hexagon, Ring) with an inner radius r: the segment ends that sit flush on a
 * ball of radius r all lie inside it, so a bent limb never shows a gap at the joint. The Ring's hole (0.38 r) is
 * smaller than the gap between the two segment ends, so it shows the stage, not a segment. No triangle: with that
 * inner radius it is twice the ball's size (Nam, 2026-10-14).
 */
const regular=(n:number,inner:number,turn:number):Point2[]=>Array.from({length:n},(_,i)=>{const a=turn+i*Math.PI*2/n,outer=inner/Math.cos(Math.PI/n);return [outer*Math.cos(a),outer*Math.sin(a)] as Point2;});
export const jointPiece=(v:number,r:number):{outline:Point2[];holes?:Point2[][]}=>v===1?{outline:regular(4,r,Math.PI/4)}:v===2?{outline:regular(4,r,0)}:v===3?{outline:regular(6,r,Math.PI/2)}:{outline:regular(48,r,0),holes:[ellipse2d(0,0,r*.38,r*.38,0,Math.PI*2,32)]};
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
/**
 * Arm segment spanning y=-from … y=-to, tapering from radius `near` (top) to `far` (bottom), the sizes of the joints at
 * its ends; `w` scales its width. The Cone narrows to 62% at the far end; the Box is a square prism, so it reads as a
 * trapezoid; the Chain's beads shrink or grow along it.
 */
export const coneTip=.62;
function armGeometry(v:number,from:number,to:number,w:number,near:number,far:number){
 const h=to-from;let g:THREE.BufferGeometry;
 if(v===4)g=beads(h,near*w,far*w);
 else{
  g=v===0?frustum(far,near,h,.012):v===1?frustum(far*coneTip,near,h,.012):v===2?taperedPill(far,near,h):v===3?faceted(frustum(far*Math.SQRT2,near*Math.SQRT2,h,.01,4)).rotateY(Math.PI/4):faceted(frustum(far,near,h,.012,8));
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
/**
 * Donut holes (Nam, 2026-10-14): the hole of a Donut body piece or a Ring joint is filled with the stage colour, so it
 * looks see-through but hides whatever is behind it. The plug is 1.5 mm wider than the hole and drawn just under its
 * part, so no seam shows. The Ring hand (a 3D torus) stays truly open.
 */
function plugFor(b:BoneDefinition,p:PartChoice,spec:CharacterSpec,prop:Proportions,body:BodyLayout):THREE.BufferGeometry|null {
 const plug=(holes:Point2[][]|undefined,round:number)=>holes?.length?paper(holes.map(h=>{
  const cx=h.reduce((s,q)=>s+q[0],0)/h.length,cy=h.reduce((s,q)=>s+q[1],0)/h.length,r=h.reduce((s,q)=>s+Math.hypot(q[0]-cx,q[1]-cy),0)/h.length,k=1+.0015/Math.max(r,1e-3);
  return {outline:h.map(([x,y])=>[cx+(x-cx)*k,cy+(y-cy)*k] as Point2)};
 }),round):null;
 if(b.kind==='torso')return plug(body.top.holes,paperRound)?.translate(0,-body.pivot,0)??null;
 if(b.kind==='pelvis')return plug(body.bottom?.holes,paperRound);
 const joint=/^(shoulder|elbow|knee)_/.exec(b.id)?.[1] as 'shoulder'|'elbow'|'knee'|undefined;
 if(joint&&jointShapeOf(p.variant)!==0)return plug(jointPiece(jointShapeOf(p.variant),jointRadius(spec,joint,prop)).holes,paperRound*.5);
 return null;
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
  // The waist ball: behind both pieces at the pivot, it fills the gap a bend opens between stacked pieces.
  g=sphere(waistRadius);
 } else if(b.kind==='connector'){
  const hip=b.id.startsWith('hip'),r=hip?.045:b.id==='neck'?.055:jointRadius(spec,b.id.startsWith('knee')?'knee':b.id.startsWith('elbow')?'elbow':'shoulder',prop);
  // Shoulder and knee are the only ball joints: the limb segments beside them carry no caps of their own.
  // Hip joints are hidden inside the body, so every hip variant is a plain ball that fits there.
  if(hip)g=sphere(r);
  else if(b.id.startsWith('shoulder')||b.id.startsWith('knee')||b.id.startsWith('elbow')){const shape=jointShapeOf(v);g=shape===0?sphere(r):paper([jointPiece(shape,r)],paperRound*.5);}
  else g=v===0?sphere(r):v===1?puck(r,r*1.3,r*.5).translate(0,-r*.65,0):v===2?cylinder(r,r,hip?.065:L):new THREE.CapsuleGeometry(r,hip?.015:L*.25,10,32);
  if(b.id==='neck'){if(v<2)g.scale(1,Math.max(1,L/r*.65),1);g.translate(0,L*.4,0);}
 } else if(b.kind==='leg'){
  // Both segments stop where they sit flush on the knee ball, so the knee reads as its own part. They taper to and from
  // the knee's size; the shin still widens towards the foot.
  const kneeEnd=endRatio*kneeRadius*jointSizeOf(spec.parts.knee_L.variant),knee=seat(jointRadius(spec,'knee',prop),kneeEnd*prop.legs);
  g=b.id.startsWith('thigh')?legGeometry(v,0,L-knee,.064,kneeEnd,true,prop.legs):legGeometry(v,knee,L,kneeEnd,Math.min(.13,Math.max(.118,kneeEnd*1.2)),false,prop.legs);
 } else if(b.kind==='limb'){
  // Upper arm plugs into the shoulder ball; both arm segments stop flush on the elbow ball. Each tapers from the size of
  // the joint at its top to the joint (or the wrist) at its bottom.
  const upper=b.id.startsWith('upperarm'),shoulderEnd=endRatio*shoulderRadius*jointSizeOf(spec.parts.shoulder_L.variant),elbowEnd=endRatio*elbowRadius*jointSizeOf(spec.parts.elbow_L.variant),wrist=.058;
  const [near,far]=upper?[shoulderEnd,elbowEnd]:[elbowEnd,wrist],atElbow=upper?far*(v===1?coneTip:1):near,elbow=seat(jointRadius(spec,'elbow',prop),atElbow*prop.arms);
  g=upper?armGeometry(v,0,L-elbow,prop.arms,near,far):armGeometry(v,elbow,L,prop.arms,near,far);
 } else if(b.kind==='hand'){
  g=v===0?sphere(.09):v===1?box(.145,.15,.14,.035):v===2?new THREE.TorusGeometry(.064,.032,16,48):v===3?cylinder(0,.105,.17):v===4?faceted(bicone(.035,.095,.08,.035,.16,.008,8)).translate(0,-.08,0):new THREE.CapsuleGeometry(.064,.055,8,24);g.translate(0,-.045,0);
 } else if(b.kind==='foot'){
  g=footGeometry(v);g.computeBoundingBox();const min=g.boundingBox!.min.y,max=g.boundingBox!.max.y;g.translate(0,-max,0);g.scale(1,.16/(max-min),1);g.scale(prop.feet,prop.feet,prop.feet);
 } else if(b.kind==='hair'){
  // The hair bone's own mesh is the front (cap or helmet) in the hair colour; a style without one keeps a speck hidden in the head's centre.
  const front=hairOn(spec,prop).front.filter(p=>!p.accent);g=front.length?paper(front.map(p=>({outline:p.points})),paperRound):sphere(.001).translate(0,.15,0);
 } else {
  // The face-mark bone sits at a fixed height; move the mark to where it reads best on the chosen head.
  g=paper(markOutlines[v],markRound,.02);g.scale(prop.head,prop.head,prop.head);g.translate(0,headOutlines[spec.parts.head.variant].markY*prop.head-b.headPosition[1],0);
 }
 return g;
}
export function createCharacter(spec:CharacterSpec,weavePalette:WeavePaletteName='HFCD',layerOrder:LayerGroup[]=defaultLayerOrder,proportions:Proportions=defaultProportions) {
 const group=new THREE.Group();group.name='geofolk_character';
 const map=new Map<string,THREE.Bone>(),paperAmount={value:1},riso=risoUniforms(),decorate=(m:THREE.MeshBasicMaterial,g:THREE.BufferGeometry)=>addPaper(m,g,paperAmount,riso),colorOf=partColors(spec,weavePalette),body=bodyLayout(spec,proportions);
 // The waist pivot moves to the seam between the body pieces; neck and shoulders keep their height, shoulders and hips follow the pieces' edges.
 const place=(def:typeof bones[number],bone:THREE.Bone)=>{
  const side=Math.sign(def.headPosition[0]);
  if(def.id==='spine_lower')bone.position.y=body.pivot;
  else if(def.id==='spine_upper')bone.position.y=0;
  else if(def.id==='neck')bone.position.y=bodyTop-.01-body.pivot;
  else if(def.id.startsWith('shoulder_'))bone.position.set(side*shoulderX(body,jointRadius(spec,'shoulder',proportions)),shoulderY-body.pivot,0);
  else if(def.id.startsWith('hip_'))bone.position.x=side*body.hipX;
 };
 bones.forEach(def=>{const bone=new THREE.Bone();bone.name=def.id;bone.position.fromArray(def.headPosition);place(def,bone);bone.userData={length:def.length};map.set(def.id,bone);if(def.parent)map.get(def.parent)!.add(bone);else group.add(bone);});
 group.updateMatrixWorld(true);
 const skeleton=new THREE.Skeleton(bones.map(b=>map.get(b.id)!));
 const plugMaterial=new THREE.MeshBasicMaterial({color:stageColor(weavePalette,true),depthTest:false,depthWrite:false}),plugs:THREE.SkinnedMesh[]=[];
 bones.forEach((def,index)=>{
  const choice=spec.parts[def.id],shaped=geometryFor(def,choice,spec,proportions,body),geometry=choice.pattern===patchwork?planarUV(shaped):choice.pattern===flow?flowUV(shaped):shaped,count=geometry.getAttribute('position').count;
  const indices=new Uint16Array(count*4),weights=new Float32Array(count*4);
  for(let i=0;i<count;i++){indices[i*4]=index;weights[i*4]=1;}
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  const material=materialFor(def,choice,spec,weavePalette,colorOf,proportions);decorate(material,geometry);
  const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name=`${def.id}_mesh`;mesh.position.copy(map.get(def.id)!.getWorldPosition(new THREE.Vector3()));mesh.frustumCulled=false;mesh.userData={bone:def.id,asset:choice.variant};group.add(mesh);group.updateMatrixWorld(true);mesh.bind(skeleton,mesh.matrixWorld.clone());
  const hole=plugFor(def,choice,spec,proportions,body);
  if(hole){
   const n=hole.getAttribute('position').count;hole.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(n*4).map((_,i)=>i%4?0:index),4));hole.setAttribute('skinWeight',new THREE.Float32BufferAttribute(new Float32Array(n*4).map((_,i)=>i%4?0:1),4));
   const plug=new THREE.SkinnedMesh(hole,plugMaterial);plug.name=`${def.id}_plug`;plug.userData={part:mesh.name};plug.position.copy(mesh.position);plug.frustumCulled=false;group.add(plug);group.updateMatrixWorld(true);plug.bind(skeleton,plug.matrixWorld.clone());plugs.push(plug);
  }
 });
 // Fingers and toes are circles of one size and one colour (the hands' accent), sized by the Fingers & toes slider.
 const digitRadius=.028*proportions.fingers,digitColor=colorOf(spec.parts.hand_L.accent);
 const fingers=createFingers(group,(['L','R'] as const).map(side=>({side,bone:map.get(`hand_${side}`)!,color:digitColor})),digitRadius,proportions.fingerStiffness,decorate);
 // Toes (Nam, 2026-10-14): five flat circles along each sole, drawn over the foot, the same size and colour as the
 // fingers. They always touch without overlapping, one diameter apart and centred on the foot.
 const toes=(['L','R'] as const).map(side=>{
  const foot=group.getObjectByName(`foot_${side}_mesh`) as THREE.SkinnedMesh,bone=map.get(`foot_${side}`)!,index=bones.findIndex(b=>b.id===`foot_${side}`);
  foot.geometry.computeBoundingBox();const box=foot.geometry.boundingBox!,r=digitRadius;
  const geometry=paper(Array.from({length:5},(_,i)=>({outline:ellipse2d((box.min.x+box.max.x)/2+(i-2)*2*r,box.min.y+r*.15,r,r,0,Math.PI*2,32)})),.002,.02),count=geometry.getAttribute('position').count;
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(count*4).map((_,i)=>i%4?0:index),4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(new Float32Array(count*4).map((_,i)=>i%4?0:1),4));
  const material=new THREE.MeshBasicMaterial({color:digitColor,depthTest:false,depthWrite:false});decorate(material,geometry);
  const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name=`toes_${side}`;mesh.userData={side};mesh.position.copy(bone.getWorldPosition(new THREE.Vector3()));mesh.frustumCulled=false;group.add(mesh);group.updateMatrixWorld(true);mesh.bind(skeleton,mesh.matrixWorld.clone());
  return mesh;
 });
 // Hair (hair.ts) besides the front in the hair colour: behind the head in the hair colour and the accent, and the
 // front's accent pieces (a visor, a stripe, rivets); all ride on the hair bone.
 const hairBone=map.get('hair')!,hairIndex=bones.findIndex(b=>b.id==='hair'),placed=hairOn(spec,proportions);
 const hairExtra=([['hair_back',placed.back,false],['hair_back_accent',placed.back,true],['hair_front_accent',placed.front,true]] as const).flatMap(([name,all,accent])=>{
  const pieces=all.filter(p=>p.accent===accent);if(!pieces.length)return [];
  const geometry=paper(pieces.map(p=>({outline:p.points})),paperRound),count=geometry.getAttribute('position').count;
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(count*4).map((_,i)=>i%4?0:hairIndex),4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(new Float32Array(count*4).map((_,i)=>i%4?0:1),4));
  const material=new THREE.MeshBasicMaterial({color:colorOf(accent?spec.parts.hair.accent:spec.parts.hair.color),depthTest:false,depthWrite:false});decorate(material,geometry);
  const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name=name;mesh.userData={accent};mesh.position.copy(hairBone.getWorldPosition(new THREE.Vector3()));mesh.frustumCulled=false;group.add(mesh);group.updateMatrixWorld(true);mesh.bind(skeleton,mesh.matrixWorld.clone());
  return [mesh];
 });
 // Ragdoll chains (hairPhysics.ts): an antenna, a plume, a pompom.
 const dangles=createDangles(group,hairBone,placed.dangles,{main:colorOf(spec.parts.hair.color),accent:colorOf(spec.parts.hair.accent)},decorate);
 group.userData={seed:spec.label,restHeight,units:'meters',rigVersion:3,proportions};
 let stacking={order:layerOrder,depth:defaultDepth},stackKey='';
 /** Re-stack the parts without rebuilding the character; cheap to call every frame. */
 const restack=(next:Partial<typeof stacking>)=>{
  stacking={...stacking,...next};const key=JSON.stringify(stacking);if(key===stackKey)return;stackKey=key;
  drawOrder(stacking.order,stacking.depth).forEach((id,rank)=>{(group.getObjectByName(`${id}_mesh`) as THREE.SkinnedMesh).renderOrder=rank;});
  for(const finger of fingers.meshes)finger.renderOrder=group.getObjectByName(`hand_${finger.userData.side}_mesh`)!.renderOrder+.5;
  for(const toe of toes)toe.renderOrder=group.getObjectByName(`foot_${toe.userData.side}_mesh`)!.renderOrder+.5;
  for(const plug of plugs)plug.renderOrder=group.getObjectByName(plug.userData.part)!.renderOrder-.05;
  if(pixel)pixel.mesh.renderOrder=pixel.part.renderOrder;
  for(const spray of sprays)for(const m of spray.meshes)m.renderOrder=spray.part.renderOrder;
  const head=group.getObjectByName('head_mesh')!.renderOrder,hair=group.getObjectByName('hair_mesh')!.renderOrder;
  for(const extra of hairExtra)extra.renderOrder=extra.name==='hair_front_accent'?hair+.5:head-(extra.userData.accent?.4:.5);
  for(const dangle of dangles.meshes)dangle.renderOrder=head-.6;
 };
 // The pixel part (pixelate.ts): its own mesh is hidden; the cells are redrawn whenever the pose changes.
 let pixelSettings:PixelSettings=defaultPixel,pixelClock=0;
 // Spray-blurred parts (spray.ts): off until setSpray turns them on.
 const sprays=sprayPartsOf(spec).map(id=>createSpray(group,group.getObjectByName(`${id}_mesh`) as THREE.SkinnedMesh,`${spec.label}|${id}|spray`));
 const pixelId=pixelPartOf(spec),pixel=pixelId?createPixelPart(group,group.getObjectByName(`${pixelId}_mesh`) as THREE.SkinnedMesh,colorOf(spec.parts[pixelId].color),decorate):null;
 restack({});
 // Stand the figure on the floor: translate so the lowest posed vertex sits at y = 0.
 const ground=()=>{group.position.y=0;group.updateMatrixWorld(true);let minY=Infinity;const vertex=new THREE.Vector3();for(const [mesh,id] of [...bones.map(def=>[group.getObjectByName(`${def.id}_mesh`),def.id]),...toes.map(t=>[t,`foot_${t.userData.side}`])] as [THREE.SkinnedMesh,string][]){const positions=mesh.geometry.getAttribute('position'),matrix=map.get(id)!.matrixWorld;for(let i=0;i<positions.count;i+=3){vertex.fromBufferAttribute(positions,i).applyMatrix4(matrix);minY=Math.min(minY,vertex.y);}}group.position.y=-minY;group.updateMatrixWorld(true);skeleton.update();};
 /**
  * A Single body is one piece, so it cannot bend at the waist: the waist turn goes to the whole body instead, and the
  * thighs turn back by the same amount so the legs keep their direction.
  */
 const unbent=(angles:Record<string,number>)=>{
  if(body.build!==single||!angles.spine_lower)return angles;
  const bend=angles.spine_lower;return {...angles,spine_lower:0,root:(angles.root??0)+bend,thigh_L:(angles.thigh_L??0)-bend,thigh_R:(angles.thigh_R??0)-bend};
 };
 /**
  * Each joint turns halfway between the segment before it and the segment after it (Nam, 2026-10-14), so a square or
  * ring knee sits at the average angle of thigh and shin. The segment after it takes the other half, so limbs point
  * exactly where they did.
  */
 const halfway=(angles:Record<string,number>)=>{
  const a={...angles};
  for(const side of ['L','R'])for(const [joint,next] of [['shoulder','upperarm'],['elbow','forearm'],['hip','thigh'],['knee','shin']]){const turn=a[`${next}_${side}`]??0;a[`${joint}_${side}`]=(a[`${joint}_${side}`]??0)+turn/2;a[`${next}_${side}`]=turn/2;}
  return a;
 };
 /** Live pose: local in-plane (Z) rotation per bone, in radians; bones left out go straight. */
 /**
  * Feet (Nam, 2026-10-14): a foot on or near the floor lies flat on it; a raised foot follows its shin, so a dancing
  * character steps and kicks freely. The floor is the lower foot's sole; between 5 and 20 cm above it a foot eases
  * from flat to free.
  */
 const footHeight=.16*proportions.feet,snapNear=.05,snapFar=.2,ankle=new THREE.Vector3();
 const settleFeet=()=>{
  group.updateMatrixWorld(true);
  const feet=['L','R'].map(side=>{const e=map.get(`shin_${side}`)!.matrixWorld.elements,foot=map.get(`foot_${side}`)!;return {foot,shin:Math.atan2(e[1],e[0]),sole:foot.getWorldPosition(ankle).y-footHeight};});
  const floor=Math.min(...feet.map(f=>f.sole));
  for(const f of feet){const t=Math.min(1,Math.max(0,(f.sole-floor-snapNear)/(snapFar-snapNear)));f.foot.rotation.z=-f.shin*(1-t*t*(3-2*t));}
 };
 // The upper arm hangs 2 cm off the shoulder's centre; undo the shoulder's half turn on that offset so the arm's pivot stays put.
 const rest=new Map(bones.map(def=>[def.id,map.get(def.id)!.position.clone()])),zAxis=new THREE.Vector3(0,0,1);
 const applyAngles=(angles:Record<string,number>)=>{
  const a=halfway(unbent(angles));bones.forEach(def=>map.get(def.id)!.rotation.set(0,0,a[def.id]??0));
  for(const side of ['L','R'])map.get(`upperarm_${side}`)!.position.copy(rest.get(`upperarm_${side}`)!).applyAxisAngle(zAxis,-(a[`shoulder_${side}`]??0));
  settleFeet();ground();if(!pixelSettings.fps)pixel?.update();
 };
 // Preset poses only turn in the picture plane (Z), so they go through the same path.
 const applyPose=(pose:Pose)=>applyAngles(Object.fromEntries(bones.map(def=>[def.id,poseRotation(def.id,pose)[2]])));
 const setLayerOrder=(order:LayerGroup[])=>restack({order});
 /** Paper grain and tone on or off (A5); a shared uniform, so no rebuild. */
 const setPaper=(on:boolean)=>{paperAmount.value=on?1:0;};
 /** Riso halftone settings (riso.ts); shared uniforms too, so no rebuild. */
 const setRiso=(s:RisoSettings)=>{
  const a=s.angle*Math.PI/180;riso.risoAmount.value=s.on?s.opacity:0;riso.risoCell.value=s.size;riso.risoCover.value=s.coverage;riso.risoAngle.value.set(Math.cos(a),Math.sin(a));
  riso.risoGrain.value=s.grain;riso.risoColor.value.set(s.color);riso.risoBlend.value=risoBlends.indexOf(s.blend);riso.risoInvert.value=s.invert?1:0;
 };
 /** The stage colour shown through Donut and Ring holes (stageColor in themes.ts); a shared material, so no rebuild. */
 const setStage=(color:string)=>{plugMaterial.color.set(color);};
 /** Live pose depth: which arm/leg is in front and which arms are behind the body (null = default stacking). */
 const setDepth=(depth:LayerDepth|null)=>restack({depth:depth??defaultDepth});
 const dispose=()=>{fingers.dispose();dangles.dispose();pixel?.dispose();for(const spray of sprays)spray.dispose();group.traverse(o=>{if(o instanceof THREE.SkinnedMesh){o.geometry.dispose();const m=o.material as THREE.MeshBasicMaterial;m.map?.dispose();m.dispose();}});skeleton.dispose();};
 fingers.settle();dangles.settle();
 // Flow parts slide their colours: each starts at its own phase.
 const flows=bones.filter(def=>spec.parts[def.id].pattern===flow).map(def=>({map:((group.getObjectByName(`${def.id}_mesh`) as THREE.SkinnedMesh).material as THREE.MeshBasicMaterial).map,phase:seedAngle(`${spec.label}|${def.id}|phase`)/(Math.PI*2)}));
 let clock=0;
 /** Advance the moving parts by dt seconds: the flow gradients, the ragdoll fingers and the ragdoll hair. */
 const tick=(dt:number)=>{clock+=dt;for(const f of flows)if(f.map)f.map.offset.x=((f.phase+clock*proportions.flowSpeed/flowPeriod)%1+1)%1;fingers.update(dt);dangles.update(dt);
  // Frame-rate quantised pixel part: redraw its cells only every 1/fps seconds.
  if(pixel&&pixelSettings.fps){pixelClock+=dt;if(pixelClock>=1/pixelSettings.fps){pixelClock%=1/pixelSettings.fps;pixel.update();}}
 };
 /** Ragdoll fingers and hair: `tick(dt)` every frame; `settleFingers()` (both) before a still picture. */
 const settleFingers=()=>{fingers.settle();dangles.settle();pixel?.update();};
 /** Pixel part settings (pixelate.ts): on/off, cell size, and the rate its cells are redrawn at (0 = with every pose). */
 const setPixel=(s:PixelSettings)=>{pixelSettings=s;pixelClock=0;pixel?.configure(s);};
 /** Spray blur settings (spray.ts) for the two spray parts; a Donut's hole plug hides with its part. */
 const setSpray=(s:SpraySettings)=>{for(const spray of sprays)spray.configure(s,[group.getObjectByName(spray.part.name.replace(/_mesh$/,'_plug'))].filter(o=>!!o) as THREE.Object3D[]);};
 setSpray(defaultSpray);
 return {group,skeleton,map,applyPose,applyAngles,setLayerOrder,setDepth,setPaper,setRiso,setPixel,setSpray,setStage,dispose,fingers,hair:dangles,pixel,sprays,tick,updateFingers:fingers.update,settleFingers};
}
export type CharacterRig=ReturnType<typeof createCharacter>;

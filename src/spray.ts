import * as THREE from 'three';
import {rng} from './model';
/**
 * Spray blur (Nam, 2026-10-14): two random parts look spray-painted, soft-edged, like the reference. The part is drawn
 * as many faint see-through copies of itself, nudged out along a golden-angle spiral with a Gaussian spread, so they
 * pile up to the full colour in the middle and fade smoothly at the edges. A strong grain, fixed to the part (it moves
 * with it and never flickers), makes the mist read as sprayed dots and breaks up any banding. Never on a woven piece. Every part of the character is drawn in the see-through pass
 * (rig.ts), so the copies stay in the part's place in the layer order. The part's own mesh stays in the rig (exports,
 * grounding) but is hidden while the spray is on.
 */
/**
 * Which parts (Trung Bao, 2026-10-14): `random` keeps the rule's count of random parts (rules.ts spray); `chosen` sprays
 * exactly the places ticked in the Look tab, hair included (its back pieces, accents and ragdoll dangles go with it).
 * A chosen part is sprayed whatever its pattern, but a pixel part stays pixel while Pixel parts is on.
 */
export const sprayPlaces=['head','hair','torso','pelvis','upperarms','forearms','hands','thighs','shins','feet'] as const;
export type SprayPlace=typeof sprayPlaces[number];
export const sprayPlaceNames:Record<SprayPlace,string>={head:'Head',hair:'Hair',torso:'Top piece',pelvis:'Bottom piece',upperarms:'Upper arms',forearms:'Forearms',hands:'Hands',thighs:'Thighs',shins:'Shins',feet:'Feet'};
/** The bones each place sprays. */
export const sprayPlaceBones:Record<SprayPlace,string[]>={head:['head'],hair:['hair'],torso:['spine_upper'],pelvis:['root'],upperarms:['upperarm_L','upperarm_R'],forearms:['forearm_L','forearm_R'],hands:['hand_L','hand_R'],thighs:['thigh_L','thigh_R'],shins:['shin_L','shin_R'],feet:['foot_L','foot_R']};
export interface SpraySettings {on:boolean;amount:number;pick:'random'|'chosen';places:Record<SprayPlace,boolean>;}
/** `amount`: how far the paint spreads (m). */
export const defaultSpray:SpraySettings={on:false,amount:.05,pick:'random',places:{head:false,hair:true,torso:false,pelvis:false,upperarms:false,forearms:false,hands:false,thighs:false,shins:false,feet:false}};
export const sprayRange={min:.005,max:.15};
export const normalizeSpray=(value:unknown):SpraySettings=>{
 const v=(value??{}) as Partial<SpraySettings>,n=Number(v.amount),given=(v.places??{}) as Partial<Record<SprayPlace,boolean>>;
 const places=Object.fromEntries(sprayPlaces.map(p=>[p,typeof given[p]==='boolean'?given[p]:defaultSpray.places[p]])) as Record<SprayPlace,boolean>;
 return {on:v.on===true,amount:Number.isFinite(n)?Math.min(sprayRange.max,Math.max(sprayRange.min,n)):defaultSpray.amount,pick:v.pick==='chosen'?'chosen':'random',places};
};
/** Copies, each just strong enough that together they build the middle up to 97%. */
const copies=64,strength=1-Math.pow(.03,1/copies);
/**
 * `part` is a skinned part (its copies are skinned to the same bones) or a plain mesh the rig moves itself (a hair
 * dangle): its copies are its children, and it hides by its material so they still show.
 */
export function createSpray(group:THREE.Group,part:THREE.Mesh,seed:string){
 const skinned=part instanceof THREE.SkinnedMesh;
 const radius={value:defaultSpray.amount},r=rng(seed);
 const turn=r()*Math.PI*2;
 const meshes=Array.from({length:copies},(_,i)=>{
  // Golden-angle spiral; the radius is the Gaussian quantile of the copy's rank, so the spread is even and smooth.
  const a=turn+i*2.39996,d=Math.sqrt(-2*Math.log(1-(i+.5)/copies*.97))*.5,offset=new THREE.Vector2(Math.cos(a)*d,Math.sin(a)*d);
  const material=(part.material as THREE.MeshBasicMaterial).clone();
  material.transparent=true;material.opacity=strength;material.depthWrite=false;
  material.customProgramCacheKey=()=>'geofolk-spray';
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,{sprayOffset:{value:offset},sprayRadius:radius,sprayCopy:{value:i}});
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform vec2 sprayOffset;uniform float sprayRadius;varying vec2 vSpray;')
    .replace('#include <begin_vertex>','#include <begin_vertex>\nvSpray=position.xy;')
    .replace('#include <project_vertex>','#include <project_vertex>\nmvPosition.xy+=sprayOffset*sprayRadius;gl_Position=projectionMatrix*mvPosition;');
   // A fixed grain on the part (5 mm cells, each copy its own draw), strong: from 10% to 190% of the copy's strength,
   // so the mist reads as sprayed dots, most of all at the edges where few copies overlap.
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vSpray;uniform float sprayCopy;')
    .replace('#include <opaque_fragment>','diffuseColor.a*=.1+1.8*fract(sin(dot(floor(vSpray*200.)+sprayCopy*17.31,vec2(12.9898,78.233)))*43758.5453);\n#include <opaque_fragment>');
  };
  const mesh=skinned?new THREE.SkinnedMesh(part.geometry,material):new THREE.Mesh(part.geometry,material);mesh.name=`${part.name}_spray`;mesh.userData={part:part.name};mesh.frustumCulled=false;mesh.visible=false;mesh.renderOrder=part.renderOrder;
  if(mesh instanceof THREE.SkinnedMesh){mesh.position.copy(part.position);group.add(mesh);mesh.bind((part as THREE.SkinnedMesh).skeleton,(part as THREE.SkinnedMesh).bindMatrix);}else part.add(mesh);
  return mesh;
 });
 /** On/off and spread; `extra` are other meshes of the part to hide with it (a donut hole's plug). */
 const configure=(settings:Pick<SpraySettings,'on'|'amount'>,extra:THREE.Object3D[]=[])=>{radius.value=settings.amount;for(const m of meshes)m.visible=settings.on;if(skinned)part.visible=!settings.on;else (part.material as THREE.Material).visible=!settings.on;for(const o of extra)o.visible=!settings.on;};
 const dispose=()=>{for(const m of meshes){(m.material as THREE.Material).dispose();m.removeFromParent();}};
 return {meshes,part,configure,dispose};
}
export type Spray=ReturnType<typeof createSpray>;

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
export interface SpraySettings {on:boolean;amount:number;}
/** `amount`: how far the paint spreads (m). */
export const defaultSpray:SpraySettings={on:false,amount:.05};
export const sprayRange={min:.005,max:.15};
export const normalizeSpray=(value:unknown):SpraySettings=>{const v=(value??{}) as Partial<SpraySettings>,n=Number(v.amount);return {on:v.on===true,amount:Number.isFinite(n)?Math.min(sprayRange.max,Math.max(sprayRange.min,n)):defaultSpray.amount};};
/** Copies, each just strong enough that together they build the middle up to 97%. */
const copies=64,strength=1-Math.pow(.03,1/copies);
export function createSpray(group:THREE.Group,part:THREE.SkinnedMesh,seed:string){
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
  const mesh=new THREE.SkinnedMesh(part.geometry,material);mesh.name=`${part.name}_spray`;mesh.userData={part:part.name};mesh.position.copy(part.position);mesh.frustumCulled=false;mesh.visible=false;
  group.add(mesh);mesh.bind(part.skeleton,part.bindMatrix);
  return mesh;
 });
 /** On/off and spread; `extra` are other meshes of the part to hide with it (a donut hole's plug). */
 const configure=(settings:SpraySettings,extra:THREE.Object3D[]=[])=>{radius.value=settings.amount;for(const m of meshes)m.visible=settings.on;part.visible=!settings.on;for(const o of extra)o.visible=!settings.on;};
 const dispose=()=>{for(const m of meshes){(m.material as THREE.Material).dispose();group.remove(m);}};
 return {meshes,part,configure,dispose};
}
export type Spray=ReturnType<typeof createSpray>;

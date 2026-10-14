import * as THREE from 'three';
import {rng} from './model';
/**
 * Spray blur (Nam, 2026-10-14): two random parts look spray-painted, soft-edged and grainy, like the reference. The
 * part is drawn as many faint copies of itself, each nudged a little in a random direction (more of them near the
 * middle, a few far out); every copy keeps a random scatter of its pixels (hashed alpha, fixed to the part), so the
 * copies pile up to the full colour in the middle and fade out at the edges as a grainy mist, with a few loose specks
 * beyond. The copies are opaque, so they stay in the part's place in the layer order. The part's own mesh stays in the
 * rig (exports, grounding) but is hidden while the spray is on.
 */
export interface SpraySettings {on:boolean;amount:number;}
/** `amount`: how far the paint spreads (m). */
export const defaultSpray:SpraySettings={on:false,amount:.05};
export const sprayRange={min:.005,max:.15};
export const normalizeSpray=(value:unknown):SpraySettings=>{const v=(value??{}) as Partial<SpraySettings>,n=Number(v.amount);return {on:v.on===true,amount:Number.isFinite(n)?Math.min(sprayRange.max,Math.max(sprayRange.min,n)):defaultSpray.amount};};
/** Copies in the mist (each 16% strong, so the middle builds to ~97%) and loose specks (5%) further out. */
const mist=20,specks=6;
export function createSpray(group:THREE.Group,part:THREE.SkinnedMesh,seed:string){
 const radius={value:defaultSpray.amount},r=rng(seed);
 const meshes=Array.from({length:mist+specks},(_,i)=>{
  // A roughly Gaussian nudge (Box-Muller), in units of the spread; specks sit further out.
  const a=r()*Math.PI*2,d=Math.sqrt(-2*Math.log(1-r()*.98))*(i<mist?.55:1.25),offset=new THREE.Vector2(Math.cos(a)*d,Math.sin(a)*d);
  const material=(part.material as THREE.MeshBasicMaterial).clone();
  material.alphaHash=true;material.transparent=false;material.opacity=i<mist?.16:.05;
  material.customProgramCacheKey=()=>'geofolk-spray';
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,{sprayOffset:{value:offset},sprayRadius:radius});
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform vec2 sprayOffset;uniform float sprayRadius;')
    .replace('#include <project_vertex>','#include <project_vertex>\nmvPosition.xy+=sprayOffset*sprayRadius;gl_Position=projectionMatrix*mvPosition;');
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

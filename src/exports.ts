import * as THREE from 'three';
import {zipSync,strToU8} from 'fflate';
import {bones,palette,patterns,variantNames,restHeight,encodeSeed,poseRotation,type CharacterSpec,type Pose} from './model';
import type {CharacterRig} from './rig';
import {exportFBX} from './fbx';
/** Rig description; with the built rig, bone positions are the real ones (the waist pivot sits on the seam of the body pieces, shoulders and hips on their edges) and the proportions are included. */
export function rigJSON(spec:CharacterSpec,pose:Pose,sceneTranslation:number[]=[0,0,0],rig?:CharacterRig) {return {format:'geofolk_rig',version:1,rigVersion:3,sceneTranslation,seed:encodeSeed(spec),units:'meters',upAxis:'Y',restHeight:rig?.group.userData.restHeight??restHeight,pose,skinning:'rigid',weightPerVertex:1,patternDensity:spec.density,proportions:rig?.group.userData.proportions,palette,bones:bones.map(b=>({...b,headPosition:rig?rig.map.get(b.id)!.position.toArray():b.headPosition,tailPosition:[0,b.kind==='limb'||b.kind==='leg'?-b.length:b.length,0],defaultRotation:[0,0,0],rotation:rig?rig.map.get(b.id)!.rotation.toArray().slice(0,3):poseRotation(b.id,pose),...{asset:variantNames(b)[spec.parts[b.id].variant]??variantNames(b)[0],color:palette[spec.parts[b.id].color].hex,accent:palette[spec.parts[b.id].accent].hex,texture:patterns[spec.parts[b.id].pattern]}})),spec};}
export function download(data:BlobPart,name:string,type:string){const url=URL.createObjectURL(new Blob([data],{type}));const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export function objBundle(rig:CharacterRig,spec:CharacterSpec,pose:Pose){
 rig.group.updateMatrixWorld(true);rig.skeleton.update();
 let obj='# Geofolk — posed OBJ, meters, Y-up\nmtllib character.mtl\n',mtl='# Geofolk matte materials\n',offset=1;
 const files:Record<string,Uint8Array>={};
 for(const b of bones){const mesh=rig.group.getObjectByName(`${b.id}_mesh`) as THREE.SkinnedMesh;const g=mesh.geometry,uv=g.getAttribute('uv'),positions=g.getAttribute('position'),normal=g.getAttribute('normal');const bone=rig.map.get(b.id)!;
  obj+=`\no ${mesh.name}\nusemtl ${b.id}\n`;
  const normalMatrix=new THREE.Matrix3().getNormalMatrix(bone.matrixWorld);
  for(let i=0;i<positions.count;i++){const v=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(bone.matrixWorld);obj+=`v ${v.x} ${v.y} ${v.z}\n`;}
  for(let i=0;i<uv.count;i++)obj+=`vt ${uv.getX(i)} ${uv.getY(i)}\n`;
  for(let i=0;i<normal.count;i++){const n=new THREE.Vector3().fromBufferAttribute(normal,i).applyMatrix3(normalMatrix).normalize();obj+=`vn ${n.x} ${n.y} ${n.z}\n`;}
  const indices=g.index?Array.from(g.index.array):Array.from({length:positions.count},(_,i)=>i);
  for(let i=0;i<indices.length;i+=3)obj+=`f ${indices.slice(i,i+3).map(j=>`${j+offset}/${j+offset}/${j+offset}`).join(' ')}\n`;
  const material=mesh.material as THREE.MeshStandardMaterial,rgb=material.map?[1,1,1]:material.color.clone().convertLinearToSRGB().toArray();
  mtl+=`\nnewmtl ${b.id}\nKd ${rgb.join(' ')}\nKa 0 0 0\nKs 0.04 0.04 0.04\nNs 8\nd 1\nillum 2\n`;
  if(material.map){const path=`textures/${b.id}.png`,raw=atob((material.map.image as HTMLCanvasElement).toDataURL('image/png').split(',')[1]);files[path]=Uint8Array.from(raw,c=>c.charCodeAt(0));mtl+=`map_Kd ${path}\n`;}
  offset+=positions.count;
 }
 files['character.obj']=strToU8(obj);files['character.mtl']=strToU8(mtl);files['rig.json']=strToU8(JSON.stringify(rigJSON(spec,pose,rig.group.position.toArray(),rig),null,2));
 files['README.txt']=strToU8('Extract the entire ZIP before importing character.obj. Keep character.mtl and textures/ beside it. OBJ contains the visible posed geometry and materials, but cannot contain a skeleton or animation. The included rig.json is for custom pipelines. Use the FBX export to get an editable armature.');
 return zipSync(files,{level:6});
}
export function exportCharacter(format:'fbx'|'obj'|'json',rig:CharacterRig,spec:CharacterSpec,pose:Pose){
 const filename=spec.label.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)||'character';
 if(format==='json')download(JSON.stringify(rigJSON(spec,pose,rig.group.position.toArray(),rig),null,2),`${filename}.rig.json`,'application/json');
 if(format==='fbx')download(exportFBX(rig,spec).buffer as ArrayBuffer,`${filename}.fbx`,'application/octet-stream');
 if(format==='obj')download(objBundle(rig,spec,pose).buffer as ArrayBuffer,`${filename}.obj.zip`,'application/zip');
}

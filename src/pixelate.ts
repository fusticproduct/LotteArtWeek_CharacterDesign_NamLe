import * as THREE from 'three';
/**
 * Pixel part (Nam, 2026-10-14): every character has one plain-coloured limb segment drawn quantized, like a figure on a
 * pixel grid: its silhouette is filled in square cells on a grid fixed to the stage (screen axes), so a sloping arm
 * becomes a staircase and the steps shift as it moves. Every frame the part's posed outline is rasterised (a cell is in
 * when its centre is inside the part) and the cells are merged into runs per row. The cells take the part's (main)
 * colour, paper and riso; the part's own mesh stays in the rig (exports, grounding) but is hidden.
 */
/** Cell size on the figure (m) by default: an arm is three or four cells across. */
export const pixelSize=.035;
/**
 * Pixel part controls (Parts panel): on/off, cell size (m), and fps: 0 redraws the cells with every pose change; 4–24
 * redraws them only that many times a second, so the part moves in steps like low-frame-rate pixel animation.
 */
export interface PixelSettings {on:boolean;size:number;fps:number;}
export const pixelFps=[0,24,12,8,4] as const;
export const defaultPixel:PixelSettings={on:true,size:pixelSize,fps:0};
export const pixelRange={min:.015,max:.08};
export const normalizePixel=(value:unknown):PixelSettings=>{
 const v=(value??{}) as Partial<PixelSettings>,size=Number(v.size);
 return {on:v.on!==false,size:Number.isFinite(size)?Math.min(pixelRange.max,Math.max(pixelRange.min,size)):pixelSize,fps:(pixelFps as readonly number[]).includes(Number(v.fps))?Number(v.fps):0};
};
const maxQuads=4096;
/** `decorate` gives the cells the part's paper and riso look (rig.ts addPaper), measured on the cells at rest. */
export function createPixelPart(group:THREE.Group,part:THREE.SkinnedMesh,color:string,decorate?:(material:THREE.MeshBasicMaterial,geometry:THREE.BufferGeometry)=>void){
 const positions=new Float32Array(maxQuads*12),geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from({length:maxQuads*6},(_,i)=>{const q=Math.floor(i/6)*4;return q+[0,1,2,0,2,3][i%6];}),1));
 const material=new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false});
 const mesh=new THREE.Mesh(geometry,material);mesh.name=`${part.name}_pixel`;mesh.frustumCulled=false;mesh.userData={part:part.name};group.add(mesh);
 part.visible=false;
 const source=part.geometry.getAttribute('position'),index=part.geometry.getIndex(),boneIndex=part.geometry.getAttribute('skinIndex').getX(0),bone=part.skeleton.bones[boneIndex];
 const toGroup=new THREE.Matrix4(),points=new Float32Array(source.count*2),v=new THREE.Vector3();
 let cell=pixelSize,on=true;
 /** The cells covered now, as row → sorted column list. */
 const rasterise=()=>{
  // Rigid skinning on one bone (world = bone · boneInverse · bind), then into the group's space.
  group.updateMatrixWorld(true);
  toGroup.copy(group.matrixWorld).invert().multiply(bone.matrixWorld).multiply(part.skeleton.boneInverses[boneIndex]).multiply(part.bindMatrix);
  for(let i=0;i<source.count;i++){v.fromBufferAttribute(source,i).applyMatrix4(toGroup);points[i*2]=v.x;points[i*2+1]=v.y;}
  const cells=new Map<number,Set<number>>(),triangles=index?index.count/3:source.count/3;
  for(let t=0;t<triangles;t++){
   const a=index?index.getX(t*3):t*3,b=index?index.getX(t*3+1):t*3+1,c=index?index.getX(t*3+2):t*3+2;
   const ax=points[a*2],ay=points[a*2+1],bx=points[b*2],by=points[b*2+1],cx=points[c*2],cy=points[c*2+1];
   const area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);if(Math.abs(area)<1e-12)continue;
   const x0=Math.ceil(Math.min(ax,bx,cx)/cell-.5),x1=Math.floor(Math.max(ax,bx,cx)/cell-.5),y0=Math.ceil(Math.min(ay,by,cy)/cell-.5),y1=Math.floor(Math.max(ay,by,cy)/cell-.5);
   for(let iy=y0;iy<=y1;iy++)for(let ix=x0;ix<=x1;ix++){
    const px=(ix+.5)*cell,py=(iy+.5)*cell;
    const w0=((bx-px)*(cy-py)-(by-py)*(cx-px))/area,w1=((cx-px)*(ay-py)-(cy-py)*(ax-px))/area,w2=1-w0-w1;
    if(w0>=0&&w1>=0&&w2>=0){let row=cells.get(iy);if(!row)cells.set(iy,row=new Set());row.add(ix);}
   }
  }
  return cells;
 };
 /** Rebuild the cells for the current pose. */
 const update=()=>{
  if(!on)return;
  let quads=0;
  for(const [iy,row] of rasterise()){
   const xs=[...row].sort((p,q)=>p-q);
   for(let i=0;i<xs.length&&quads<maxQuads;){
    let j=i;while(j+1<xs.length&&xs[j+1]===xs[j]+1)j++;
    const x0=xs[i]*cell,x1=(xs[j]+1)*cell,y0=iy*cell,y1=(iy+1)*cell,o=quads*12;
    positions.set([x0,y0,0,x1,y0,0,x1,y1,0,x0,y1,0],o);quads++;i=j+1;
   }
  }
  geometry.setDrawRange(0,quads*6);(geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate=true;
  geometry.boundingBox=new THREE.Box3().setFromArray(positions.subarray(0,quads*12));
  mesh.renderOrder=part.renderOrder;
 };
 /** On/off and cell size (PixelSettings); off shows the part's own mesh again. */
 const configure=(settings:PixelSettings)=>{on=settings.on;cell=settings.size;mesh.visible=on;part.visible=!on;if(on)update();};
 update();decorate?.(material,geometry);
 const dispose=()=>{geometry.dispose();material.dispose();group.remove(mesh);};
 return {mesh,part,update,configure,dispose};
}
export type PixelPart=ReturnType<typeof createPixelPart>;

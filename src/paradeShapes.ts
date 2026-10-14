import * as THREE from 'three';
import {drawWeave,type WeavePaletteName} from './weave';
/**
 * Floating squares for the Parade (Trung Bao, 2026-10-14, second and third rounds): a few larger squares behind the
 * characters, each a solid colour, a two-colour checkerboard or a woven pattern (chosen at random) in the palette's
 * colours, moving in straight lines at a speed of their own (no parallax), on average 6.5% of the canvas's height across
 * times a scale, each its own size within a spread (`variety`: 0 all one size, 0.45 from 4% to 9%, 1 from 1% to 12%).
 * A power jump pushes the squares near it outward a little and they drift back (Parade.tsx). They travel in lanes, each lane one height, its squares evenly apart, lanes further apart than the largest
 * square and no more squares in a lane than fit round the canvas, so no two ever overlap. They go round the canvas like the cast
 * (seamless: one leaving an edge comes in at the other), drawn before every character.
 */
const square=new THREE.PlaneGeometry(2,2);
interface Tile {mesh:THREE.Mesh;lane:number;x:number;size:number;}
/** A square's pattern, drawn on a small canvas: a checkerboard of two colours or a woven tile (weave.ts); null: solid. */
function pattern(r:()=>number,palette:WeavePaletteName,colours:string[]):THREE.Texture|null{
 if(typeof document==='undefined'||r()<1/3)return null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;
 if(r()<.5){
  const a=colours[Math.floor(r()*colours.length)],others=colours.filter(c=>c!==a),b=others[Math.floor(r()*others.length)]??a,n=3+Math.floor(r()*4),cell=256/n;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){ctx.fillStyle=(x+y)%2?b:a;ctx.fillRect(Math.floor(x*cell),Math.floor(y*cell),Math.ceil(cell),Math.ceil(cell));}
 }else drawWeave(canvas,`parade-square-${r()}`,palette,5+Math.floor(r()*4),colours.length?[...colours].sort(()=>r()-.5).slice(0,4):undefined);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
/**
 * Up to `count` squares (fewer if they would not fit at this `scale`) in a group drawn before the cast, in `colours`
 * (hex) of `palette`, on a canvas `ratio` times as wide as it is tall, their sizes spread by `variety` (0–1). `update`
 * places them: `w` × `h` the canvas, with the floor at 0 and the lanes' top at `top` (below the ID labels); `push` moves
 * each from its place (x, y), never past the floor or that top.
 */
export function createShapes(count:number,colours:string[],palette:WeavePaletteName='HFCD',r:()=>number=Math.random,scale=1,ratio=3.29,variety=.45){
 const group=new THREE.Group();group.name='parade_shapes';group.renderOrder=-1;
 // Squares (half-widths around 3.25% of the canvas's height, spread by variety) × scale; lanes further apart than the
 // largest could be, floor to top.
 const half=(x:number)=>.0325*scale*(1+.85*variety*(2*x-1)),widest=2*half(1);
 const fit=Math.max(1,Math.floor(.92/(widest*1.15))),laneCount=count?Math.min(fit,8,Math.max(2,Math.ceil(count/3))):0;
 // Each square is nudged by up to 20% of its lane's gap, so the gap must be at least 1/0.6 of the widest square.
 const roomy=Math.max(1,Math.floor(ratio*.6/widest)),perLane=laneCount?Math.min(roomy,Math.ceil(count/laneCount)):0,tiles:Tile[]=[],textures:THREE.Texture[]=[],materials:THREE.Material[]=[];
 for(let lane=0;lane<laneCount;lane++){
  const n=Math.max(1,Math.min(perLane,count-tiles.length)),start=r();
  for(let k=0;k<n&&tiles.length<count;k++){
   const map=pattern(r,palette,colours),material=new THREE.MeshBasicMaterial({map,color:map?'#ffffff':colours[Math.floor(r()*colours.length)],depthTest:false,depthWrite:false,transparent:true});
   if(map)textures.push(map);materials.push(material);
   const mesh=new THREE.Mesh(square,material);group.add(mesh);tiles.push({mesh,lane,x:(start+(k+(r()-.5)*.4)/n)%1,size:half(r())});
  }
 }
 /** `drift`: how far the squares have moved (m; the cast's drift times their speed). */
 const update=(drift:number,w:number,h:number,top:number,push?:(x:number,y:number)=>[number,number])=>{
  const gap=top/Math.max(1,laneCount);
  for(const t of tiles){
   const x=((t.x*w+drift)%w+w)%w-w/2,y=(t.lane+.5)*gap,[dx,dy]=push?push(x,y):[0,0],half=t.size*h;
   t.mesh.position.set(x+dx,Math.min(top-half,Math.max(half,y+dy)),-1);t.mesh.scale.setScalar(half);
  }
 };
 const dispose=()=>{for(const t of textures)t.dispose();for(const m of materials)m.dispose();group.clear();};
 return {group,update,dispose,count:tiles.length,lanes:laneCount};
}

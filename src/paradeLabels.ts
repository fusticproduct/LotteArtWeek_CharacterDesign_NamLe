import * as THREE from 'three';
import {ease} from './paradePoses';
import type {WeavePaletteName} from './weave';
/**
 * ID labels on the Parade (Trung Bao, 2026-10-14, after his reference): each character's number in the cast (the order
 * the characters were generated in, 0001 on), small at the top left of its place round the canvas, in Geist Pixel
 * (public/fonts, SIL Open Font License), blue on HFCD and a colour of the theme on XMAS and TET. Newcomers bring higher
 * numbers into the line, so after a while the numbers are no longer in order. When one shoots off the top its label
 * fades out sliding up; the newcomer's fades in sliding up into place. Drawn in the scene (onto the canvas and the
 * cylinder alike, seamless across the seam), over everything.
 */
export const idText=(n:number)=>String(n).padStart(4,'0');
/** The labels' colour per theme, on its dark and its light background (Parade.tsx themeBackgrounds). */
export const idColours:Record<WeavePaletteName,{black:string;white:string}>={HFCD:{black:'#0A6CFF',white:'#0564F8'},XMAS:{black:'#FFFFFF',white:'#114DDC'},TET:{black:'#FFD31F',white:'#C01E2E'}};
/** Seconds a label takes to go and to come, and how far it slides (in label heights). */
export const labelMotion={out:.45,in:.6,slide:1.1};
/** A label going (out) or coming (in), `s` seconds in: its opacity and how far above its place it is (label heights). */
export function labelState(kind:'in'|'out',s:number){
 const p=ease(s/(kind==='in'?labelMotion.in:labelMotion.out));
 return kind==='in'?{opacity:p,lift:-(1-p)*labelMotion.slide}:{opacity:1-p,lift:p*labelMotion.slide};
}
const family='Geist Pixel Square';
let loading:Promise<boolean>|null=null;
/** Loads the font once (true when it is ready; false if it could not be, and a monospace stands in). */
export const loadIdFont=()=>loading??=(typeof FontFace==='undefined'||typeof document==='undefined'?Promise.resolve(false):new FontFace(family,`url(${new URL('fonts/GeistPixel-Square.woff2',document.baseURI).href})`).load().then(f=>{document.fonts.add(f);return true;},()=>false));
/**
 * Texture size: a label is 4 : 1, the text on its left, its digits centred up and down (measured), so they are
 * `labelGlyph` of the label's height either side of its middle.
 */
export const labelGlyph=.25;
const texW=256,texH=64,textures=new Map<string,THREE.Texture>();
function textureFor(text:string){
 let t=textures.get(text);
 if(!t){
  const canvas=document.createElement('canvas');canvas.width=texW;canvas.height=texH;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#ffffff';ctx.font=`${Math.round(texH*labelGlyph*2*44/31.8)}px "${family}", ui-monospace, monospace`;ctx.textBaseline='alphabetic';
  const m=ctx.measureText(text),up=m.actualBoundingBoxAscent||texH*labelGlyph,down=m.actualBoundingBoxDescent||0;ctx.fillText(text,2,texH/2+(up-down)/2);
  t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;textures.set(text,t);
 }
 return t;
}
interface Shown {mesh:THREE.Mesh;material:THREE.MeshBasicMaterial;text:string;since?:number;}
/** The labels for `texts` (one per place round the canvas), all shown. */
export function createLabels(texts:string[]){
 const group=new THREE.Group();group.name='parade_ids';group.renderOrder=1e4;
 const plane=new THREE.PlaneGeometry(1,1).translate(.5,0,0),made:THREE.MeshBasicMaterial[]=[];
 const make=(text:string):Shown=>{const material=new THREE.MeshBasicMaterial({map:textureFor(text),transparent:true,depthTest:false,depthWrite:false});made.push(material);const mesh=new THREE.Mesh(plane,material);mesh.renderOrder=1e4;group.add(mesh);return {mesh,material,text};};
 const slots=texts.map(text=>({shown:make(text) as Shown|undefined,going:undefined as Shown|undefined}));
 const drop=(s:Shown)=>{group.remove(s.mesh);s.material.dispose();};
 return {
  group,
  /** The label of place `i` starts to go at `at` (s). */
  leave(i:number,at:number){const s=slots[i];if(!s?.shown)return;if(s.going)drop(s.going);s.going={...s.shown,since:at};s.shown=undefined;},
  /** Place `i` takes the label `text`, coming in from `at` (s). */
  arrive(i:number,text:string,at:number){const s=slots[i];if(!s)return;if(s.shown)drop(s.shown);s.shown={...make(text),since:at};},
  /**
   * Places them at `time`: place i's left edge at x(i), the labels' middle at y, `height` tall (the canvas's units),
   * in `colour`; hidden when `visible` is false.
   */
  update(time:number,x:(i:number)=>number,y:number,height:number,colour:string,visible:boolean){
   group.visible=visible;if(!visible)return;
   slots.forEach((s,i)=>{
    const put=(l:Shown,kind:'in'|'out'|null)=>{const st=kind&&l.since!==undefined?labelState(kind,time-l.since):{opacity:1,lift:0};l.material.opacity=st.opacity;l.material.color.set(colour);l.mesh.visible=st.opacity>.002;l.mesh.position.set(x(i),y+st.lift*height,2);l.mesh.scale.set(height*texW/texH,height,1);};
    if(s.going){if(time-s.going.since!>=labelMotion.out){drop(s.going);s.going=undefined;}else put(s.going,'out');}
    if(s.shown)put(s.shown,s.shown.since!==undefined&&time-s.shown.since<labelMotion.in?'in':null);
   });
  },
  dispose(){for(const m of made)m.dispose();plane.dispose();group.clear();},
 };
}

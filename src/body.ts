import {ellipse2d,type Point2} from './geometry';
import {defaultProportions,single,donut,type CharacterSpec,type Proportions} from './model';
/**
 * Layout of the body pieces (see bodyShapes in model.ts), in the pelvis (root) bone's space at rest.
 * Bone heights do not change: the hip joints, shoulders and neck stay where they were, and the pieces fill the space
 * between them. Two pieces meet at the waist pivot, which the rig moves to the seam, so the top piece swings about it.
 */
export const bodyTop=.64,bodyBottom=-.14,hipY=-.03,shoulderY=.535;
/** Both pieces of a two-piece body hold a disc of this radius around the waist pivot, so they stay joined at any bend. */
export const seamMargin=.045;
/** Seam (pivot) height per build; a Single body does not bend there. */
const seams=[.07,.25,.12,.36];
/** Natural width of the [top, bottom] piece per build. */
const widths=[[.62,0],[.48,.48],[.62,.42],[.42,.62]];
/** Hip joints (balls of radius 0.045) sit this far inside the piece that carries them. */
const hipClearance=.055;
export interface Piece {outline:Point2[];holes?:Point2[][]}
/** Rounded rectangle with corner radius r. */
const roundedBox=(w:number,y0:number,h:number,r:number):Point2[]=>[
 ...ellipse2d(w/2-r,y0+r,r,r,-Math.PI/2,0,8),...ellipse2d(w/2-r,y0+h-r,r,r,0,Math.PI/2,8),
 ...ellipse2d(-w/2+r,y0+h-r,r,r,Math.PI/2,Math.PI,8),...ellipse2d(-w/2+r,y0+r,r,r,Math.PI,Math.PI*1.5,8)];
/** One body shape filling the box w × h from height y0; circles and donuts take the height as their diameter. */
export function shapeOutline(v:number,w:number,y0:number,h:number):Piece{
 const y1=y0+h,narrow=Math.max(.16,w*.34)/2;
 if(v===0||v===donut){const r=h/2,piece:Piece={outline:ellipse2d(0,y0+r,r,r)};if(v===donut){const hole=Math.min(r*.4,r-2*seamMargin-.03);piece.holes=[ellipse2d(0,y0+r,hole,hole,0,Math.PI*2,40)];}return piece;}
 if(v===1)return {outline:roundedBox(w,y0,h,Math.min(.07,w*.18,h*.2))};
 if(v===2)return {outline:ellipse2d(0,y1,w/2,h,Math.PI,Math.PI*2,48)};
 if(v===3)return {outline:ellipse2d(0,y0,w/2,h,0,Math.PI,48)};
 if(v===4)return {outline:[[-narrow,y0],[narrow,y0],[w/2,y1],[-w/2,y1]]};
 if(v===5)return {outline:[[-w/2,y0],[w/2,y0],[narrow,y1],[-narrow,y1]]};
 const end=Math.max(.08,w*.17);
 return {outline:[[-end,y0],[end,y0],[w/2,y0+h/2],[end,y1],[-end,y1],[-w/2,y0+h/2]]};
}
const scaleX=(piece:Piece,s:number):Piece=>({outline:piece.outline.map(([x,y])=>[x*s,y]),holes:piece.holes?.map(h=>h.map(([x,y])=>[x*s,y] as Point2))});
/** Whether a point lies inside a piece (inside the outline, outside its holes). */
const inPolygon=(polygon:Point2[],[x,y]:Point2)=>{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,yi]=polygon[i],[xj,yj]=polygon[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;};
const edgeDistance=(polygon:Point2[],[x,y]:Point2)=>{let d=Infinity;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [ax,ay]=polygon[j],[bx,by]=polygon[i],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));d=Math.min(d,Math.hypot(x-ax-t*dx,y-ay-t*dy));}return d;};
/** Whether a disc of radius r around a point lies wholly inside a piece. */
export const holdsDisc=(piece:Piece,point:Point2,r:number)=>inPolygon(piece.outline,point)&&edgeDistance(piece.outline,point)>=r&&(piece.holes??[]).every(h=>!inPolygon(h,point)&&edgeDistance(h,point)>=r);
/** Widest |x| of a closed outline at height y. */
export const halfWidthAt=(outline:Point2[],y:number)=>{let w=0;for(let i=0;i<outline.length;i++){const [x1,y1]=outline[i],[x2,y2]=outline[(i+1)%outline.length];if(y1!==y2&&(y1-y)*(y2-y)<=0)w=Math.max(w,Math.abs(x1+(x2-x1)*(y-y1)/(y2-y1)));}return w;};
export interface BodyLayout {build:number;pivot:number;top:Piece;bottom:Piece|null;hipX:number;}
/**
 * Pieces of a character's body. Two pieces overlap by twice the seam margin along the centre line, with the pivot in
 * the middle of the overlap. Proportions: Torso width scales the top (or only) piece, Pelvis the bottom piece, and
 * Torso height moves the seam (the other piece grows to meet it). Narrow-bottomed pieces reach lower when the hip
 * joints would not fit inside them.
 */
export function bodyLayout(spec:CharacterSpec,prop:Proportions=defaultProportions):BodyLayout{
 const build=spec.parts.spine_lower.variant,topShape=spec.parts.spine_upper.variant,bottomShape=spec.parts.root.variant,[topW,bottomW]=widths[build];
 const pivot=build===single?seams[single]:Math.min(.5,Math.max(.04,bodyTop-(bodyTop-seams[build])*prop.torsoHeight));
 // The piece that carries the hips: lower its bottom until both hip joints fit inside, a hip apart at most 0.105.
 const fit=(make:(bottom:number)=>Piece)=>{
  for(let bottom=bodyBottom;bottom>-.36;bottom-=.02){const piece=make(bottom);for(let x=.105;x>=.07;x-=.005)if(holdsDisc(piece,[x,hipY],hipClearance))return {piece,hipX:x};}
  const piece=make(bodyBottom);let x=.105;while(x>.03&&!holdsDisc(piece,[x,hipY],hipClearance))x-=.005;return {piece,hipX:x};
 };
 if(build===single){const {piece,hipX}=fit(bottom=>scaleX(shapeOutline(topShape,topW,bottom,bodyTop-bottom),prop.torsoWidth));return {build,pivot,top:piece,bottom:null,hipX};}
 const top=scaleX(shapeOutline(topShape,topW,pivot-seamMargin,bodyTop-pivot+seamMargin),prop.torsoWidth);
 const {piece,hipX}=fit(bottom=>scaleX(shapeOutline(bottomShape,bottomW,bottom,pivot+seamMargin-bottom),prop.pelvis));
 return {build,pivot,top,bottom:piece,hipX};
}

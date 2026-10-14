import {signedArea,clipConvex,roundCorners,ellipse2d,type Point2} from './geometry';
import {defaultProportions,single,donut,type CharacterSpec,type Proportions} from './model';
/**
 * Layout of the body pieces (see bodyShapes in model.ts), in the pelvis (root) bone's space at rest.
 * Bone heights do not change: the hip joints, shoulders and neck stay where they were, and the pieces fill the space
 * between them. Two pieces meet at the waist pivot, which the rig moves to the seam, so the top piece swings about it.
 */
export const bodyTop=.64,bodyBottom=-.14,hipY=-.03,shoulderY=.535;
/**
 * Two body pieces are stacked, not overlapped (Nam, 2026-10-14): they meet with just this much overlap along the centre
 * line, so no hairline shows, and the waist pivot sits in it. A waist ball behind both pieces fills the gap a bend opens.
 */
export const seamOverlap=.014,waistRadius=.055;
/** Donut holes keep this much ring around them. */
const ringMargin=.045;
/** Circles and donuts are as wide as they are tall; half circles (Bowl, Dome) twice as wide. They are never stretched (Nam, 2026-10-14). */
export const isRound=(v:number)=>v===0||v===donut,isHalf=(v:number)=>v===2||v===3;
/** Share of the stacked height that goes to the top piece, per build. */
const topShare=[1,.5,.65,.37];
/** Width of the free-shaped pieces (Block, Funnel, A-line, Diamond) as [top, bottom], per build. */
const widths=[[.62,0],[.48,.48],[.62,.42],[.42,.62]];
/** Tallest a round piece or half circle may be in each role, so it stays about as wide as a free piece in that role. */
const caps={big:{round:.8,half:.45},small:{round:.56,half:.3},pair:{round:.8,half:.45}};
const roles=[['big',''],['pair','pair'],['big','small'],['small','big']] as const;
/** Hip joints (balls of radius 0.045) sit this far inside the piece that carries them. */
const hipClearance=.055;
/** `sharp`: outline corners left unrounded (where a piece meets another exactly). */
export interface Piece {outline:Point2[];holes?:Point2[][];sharp?:boolean[]}
/** Rounded rectangle with corner radius r. */
const roundedBox=(w:number,y0:number,h:number,r:number):Point2[]=>[
 ...ellipse2d(w/2-r,y0+r,r,r,-Math.PI/2,0,8),...ellipse2d(w/2-r,y0+h-r,r,r,0,Math.PI/2,8),
 ...ellipse2d(-w/2+r,y0+h-r,r,r,Math.PI/2,Math.PI,8),...ellipse2d(-w/2+r,y0+r,r,r,Math.PI,Math.PI*1.5,8)];
/**
 * One body shape standing on height y0 with height h. Free shapes take the width w; circles and donuts take the
 * height as their diameter, half circles as their radius.
 */
export function shapeOutline(v:number,w:number,y0:number,h:number):Piece{
 const y1=y0+h,narrow=Math.max(.16,w*.34)/2;
 if(isRound(v)){const r=h/2,piece:Piece={outline:ellipse2d(0,y0+r,r,r)};if(v===donut){const hole=Math.min(r*.4,r-2*ringMargin-.03);piece.holes=[ellipse2d(0,y0+r,hole,hole,0,Math.PI*2,40)];}return piece;}
 if(v===1)return {outline:roundedBox(w,y0,h,Math.min(.07,w*.18,h*.2))};
 if(v===2)return {outline:ellipse2d(0,y1,h,h,Math.PI,Math.PI*2,48)};
 if(v===3)return {outline:ellipse2d(0,y0,h,h,0,Math.PI,48)};
 if(v===4)return {outline:[[-narrow,y0],[narrow,y0],[w/2,y1],[-w/2,y1]]};
 if(v===5)return {outline:[[-w/2,y0],[w/2,y0],[narrow,y1],[-narrow,y1]]};
 const end=Math.max(.08,w*.17);
 return {outline:[[-end,y0],[end,y0],[w/2,y0+h/2],[end,y1],[-end,y1],[-w/2,y0+h/2]]};
}
/** Width sliders scale free shapes only; round shapes keep their true proportions. */
const widen=(piece:Piece,v:number,s:number):Piece=>isRound(v)||isHalf(v)?piece:{outline:piece.outline.map(([x,y])=>[x*s,y]),holes:piece.holes?.map(h=>h.map(([x,y])=>[x*s,y] as Point2))};
/** Whether a point lies inside a polygon. */
const inPolygon=(polygon:Point2[],[x,y]:Point2)=>{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,yi]=polygon[i],[xj,yj]=polygon[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;};
const edgeDistance=(polygon:Point2[],[x,y]:Point2)=>{let d=Infinity;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [ax,ay]=polygon[j],[bx,by]=polygon[i],dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));d=Math.min(d,Math.hypot(x-ax-t*dx,y-ay-t*dy));}return d;};
/** Whether a disc of radius r around a point lies wholly inside a piece (inside the outline, clear of its holes). */
export const holdsDisc=(piece:Piece,point:Point2,r:number)=>inPolygon(piece.outline,point)&&edgeDistance(piece.outline,point)>=r&&(piece.holes??[]).every(h=>!inPolygon(h,point)&&edgeDistance(h,point)>=r);
/** Widest |x| of a closed outline at height y. */
export const halfWidthAt=(outline:Point2[],y:number)=>{let w=0;for(let i=0;i<outline.length;i++){const [x1,y1]=outline[i],[x2,y2]=outline[(i+1)%outline.length];if(y1!==y2&&(y1-y)*(y2-y)<=0)w=Math.max(w,Math.abs(x1+(x2-x1)*(y-y1)/(y2-y1)));}return w;};
/**
 * Hip joints sit outside the piece that carries them (Nam, 2026-10-14): straight below hipX, as high as they can go
 * while a disc of radius r stays clear of the outline, so the joint just touches the piece's lower edge on any shape
 * and at any slider setting. Returns the joint centre's y.
 */
export const hipBelow=(piece:Piece,x:number,r:number)=>{
 let low=Infinity;
 for(let i=0,j=piece.outline.length-1;i<piece.outline.length;j=i++){const [ax,ay]=piece.outline[j],[bx,by]=piece.outline[i];if(ax!==bx&&(ax-x)*(bx-x)<=0)low=Math.min(low,ay+(by-ay)*(x-ax)/(bx-ax));}
 if(!Number.isFinite(low))low=Math.min(...piece.outline.map(p=>p[1]));
 let y=low-r;
 while(inPolygon(piece.outline,[x,y])||edgeDistance(piece.outline,[x,y])<r-1e-6)y-=.0005;
 return y;
};
/**
 * Shoulder joints sit outside the top piece too (Nam, 2026-10-14): at height y, as close to the piece as they can go
 * while a disc of radius r stays clear of its outline, so the joint just touches the piece's side. Returns x (> 0).
 */
export const shoulderBeside=(piece:Piece,y:number,r:number)=>{
 let x=halfWidthAt(piece.outline,y)+r;
 while(inPolygon(piece.outline,[x,y])||edgeDistance(piece.outline,[x,y])<r-1e-6)x+=.0005;
 return x;
};
/** Corner rounding of the flat parts (m); rig.ts draws with it, so the seam below matches the drawn bottom piece. */
export const bodyRound=.022;
/**
 * Clean seam (Nam, 2026-10-14): the top piece reaches the seam overlap down into the bottom piece, and where the bottom
 * piece is narrower or curved there, the top piece's lower corners used to poke out beside it as small slivers. Now
 * the top piece keeps its shape above the bottom piece's top line and, below it, only what lies inside the bottom
 * piece as drawn (rounded corners and all), so the two read as one clean silhouette: a straight ledge where the top
 * piece is wider, the bottom piece's own edge below.
 */
export function seatOn(top:Piece,bottom:Piece):Piece{
 const s=Math.max(...bottom.outline.map(p=>p[1])),ccw=(p:Point2[])=>signedArea(p)>0?p:[...p].reverse();
 const cut=(keepAbove:boolean)=>clipConvex(top.outline,keepAbove?[[-9,s],[9,s],[9,9],[-9,9]]:[[-9,-9],[9,-9],[9,s],[-9,s]]);
 const above=ccw(cut(true)),inside=ccw(clipConvex(cut(false),roundCorners(bottom.outline,bodyRound).map(v=>[v.x,v.y] as Point2)));
 if(above.length<3||inside.length<3)return top;
 // Above: from its lower right corner round the top to its lower left; inside: from its upper left round the bottom to its upper right.
 const on=(p:Point2)=>Math.abs(p[1]-s)<1e-9,pick=(p:Point2[],want:(a:Point2,b:Point2)=>boolean)=>p.reduce((best,q,i)=>on(q)&&(best<0||want(q,p[best]))?i:best,-1);
 // (When a part meets the line at a single point, as a circle's top does, the walk goes all the way round from it.)
 const walk=(p:Point2[],from:number,to:number)=>{const out:Point2[]=[];for(let i=from,n=0;n<p.length;i=(i+1)%p.length,n++){out.push(p[i]);if(i===to&&(n>0||from!==to))break;}return out;};
 const a0=pick(above,(q,b)=>q[0]>b[0]),a1=pick(above,(q,b)=>q[0]<b[0]),b0=pick(inside,(q,b)=>q[0]<b[0]),b1=pick(inside,(q,b)=>q[0]>b[0]);
 if(a0<0||a1<0||b0<0||b1<0)return top;
 const own=(p:Point2)=>top.outline.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<1e-9);
 const upper=walk(above,a0,a1).map(p=>({p,sharp:false})),lower=walk(inside,b0,b1).map(p=>({p,sharp:!own(p)}));
 const merged=[...upper,...lower].filter((v,i,all)=>{const n=all[(i+1)%all.length];return Math.hypot(v.p[0]-n.p[0],v.p[1]-n.p[1])>1e-7;});
 return {...top,outline:merged.map(v=>v.p),sharp:merged.map(v=>v.sharp)};
}
/** `crown`: the top line of the body; `shoulderY`: shoulder height (both move with a body type's body length). */
export interface BodyLayout {build:number;pivot:number;top:Piece;bottom:Piece|null;hipX:number;crown:number;shoulderY:number;}
/**
 * Pieces of a character's body. The top piece hangs from the neck, the bottom piece stands on the body's bottom line,
 * and together they are just the seam overlap taller than that span, so the top piece sits on the bottom one with the
 * pivot where they meet. The build sets how the height is shared; a round piece or half circle takes no
 * more than its cap (so it never has to stretch) and the other piece grows to meet it. Torso height moves the share.
 * The piece that carries the hips reaches lower when the hip joints would not fit inside it. `length` (a body type's
 * body height) moves the top line, so the body is that much taller or shorter; shapes are rebuilt, never stretched.
 */
export function bodyLayout(spec:CharacterSpec,prop:Proportions=defaultProportions,length=1):BodyLayout{
 const crown=bodyBottom+(bodyTop-bodyBottom)*length,shoulders=crown-(bodyTop-shoulderY);
 const build=spec.parts.spine_lower.variant,topShape=spec.parts.spine_upper.variant,bottomShape=spec.parts.root.variant,[topW,bottomW]=widths[build];
 // Lower the carrying piece's bottom, keeping its top, until both hip joints fit inside, a hip apart at most 0.105.
 const fit=(make:(lower:number)=>Piece)=>{
  for(let lower=bodyBottom;lower>-.36;lower-=.02){const piece=make(lower);for(let x=.105;x>=.07;x-=.005)if(holdsDisc(piece,[x,hipY],hipClearance))return {piece,hipX:x};}
  const piece=make(bodyBottom);let x=.105;while(x>.03&&!holdsDisc(piece,[x,hipY],hipClearance))x-=.005;return {piece,hipX:x};
 };
 if(build===single){const {piece,hipX}=fit(lower=>widen(shapeOutline(topShape,topW,lower,crown-lower),topShape,prop.torsoWidth));return {build,pivot:.07,top:piece,bottom:null,hipX,crown,shoulderY:shoulders};}
 const span=crown-bodyBottom,total=span+seamOverlap,[topRole,bottomRole]=roles[build];
 const cap=(v:number,role:'big'|'small'|'pair')=>isRound(v)?caps[role].round:isHalf(v)?caps[role].half:Infinity;
 let topH=total*Math.min(.78,Math.max(.25,topShare[build]*prop.torsoHeight)),bottomH=total-topH;
 if(topH>cap(topShape,topRole)){topH=cap(topShape,topRole);bottomH=total-topH;}
 if(bottomH>cap(bottomShape,bottomRole as 'big'|'small'|'pair')){bottomH=cap(bottomShape,bottomRole as 'big'|'small'|'pair');topH=Math.min(cap(topShape,topRole),total-bottomH);}
 // Both capped and short of the span: the bottom piece grows past its cap rather than leave a gap.
 if(topH+bottomH<total)bottomH=total-topH;
 const pivot=crown-topH+seamOverlap/2,seamTop=bodyBottom+bottomH;
 const top=widen(shapeOutline(topShape,topW,crown-topH,topH),topShape,prop.torsoWidth);
 const {piece,hipX}=fit(lower=>widen(shapeOutline(bottomShape,bottomW,lower,seamTop-lower),bottomShape,prop.pelvis));
 // A round top piece has no corners to poke out, and a circle is never reshaped.
 return {build,pivot,top:isRound(topShape)?top:seatOn(top,piece),bottom:piece,hipX,crown,shoulderY:shoulders};
}

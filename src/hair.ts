import {ellipse2d,type Point2} from './geometry';
/**
 * Hair (Nam, 2026-10-14): big, bold, genderless shapes, like the spiky crown on the reference poster; no small bits.
 * Styles are drawn in a design box of 200 × 200 px, y down, with a round head centred at (100,112), radius 38 (the space
 * docs/hair-proposal.html draws them in, from this file). A style has back pieces (drawn behind the head, some in a
 * second, accent colour) and an optional front cap: the head's own outline above a cut line, grown a little, so it fits
 * every head shape and never reaches the face mark.
 */
export const design={cx:100,cy:112,r:38};
export interface HairPiece {points:Point2[];accent?:boolean;}
/** `left`/`right`: design y of the cut line at the head's left and right edge (slanted for a sweep); `grow`: px around the head. */
export interface HairCap {left:number;right:number;grow:number;}
export interface HairStyle {name:string;back:HairPiece[];cap?:HairCap;}
const {cx,cy,r}=design;
const piece=(points:Point2[],accent=false):HairPiece=>({points,accent});
const circle=(x:number,y:number,radius:number,accent=false)=>piece(ellipse2d(x,y,radius,radius,0,Math.PI*2,48),accent);
const box=(x:number,y:number,w:number,h:number,accent=false)=>piece([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],accent);
/** Rounded box with corner radius k (y down). */
const roundBox=(x:number,y:number,w:number,h:number,k:number)=>piece([
 ...ellipse2d(x+w-k,y+k,k,k,-Math.PI/2,0,10),...ellipse2d(x+w-k,y+h-k,k,k,0,Math.PI/2,10),
 ...ellipse2d(x+k,y+h-k,k,k,Math.PI/2,Math.PI,10),...ellipse2d(x+k,y+k,k,k,Math.PI,Math.PI*1.5,10)]);
/** A point at angle a (0 = right, π/2 = up) and distance d from (x0, y0), in the y-down design box. */
const at=(a:number,d:number,x0=cx,y0=cy):Point2=>[x0+Math.cos(a)*d,y0-Math.sin(a)*d];
/** A spike from the head: base half-width w (rad) at radius `inner`, tip at radius `outer`. */
const spike=(a:number,inner:number,outer:number,w:number)=>piece([at(a-w,inner),at(a,outer),at(a+w,inner)]);
const cap=(left:number,right=left,grow=3):HairCap=>({left,right,grow});
/** Points along a quadratic curve from p0 through control c to p1. */
const curve=(p0:Point2,c:Point2,p1:Point2,n=12):Point2[]=>Array.from({length:n+1},(_,i)=>{const t=i/n,u=1-t;return [u*u*p0[0]+2*u*t*c[0]+t*t*p1[0],u*u*p0[1]+2*u*t*c[1]+t*t*p1[1]] as Point2;});
const arc=(a0:number,a1:number,d:number,x0=cx,y0=cy,n=24):Point2[]=>Array.from({length:n+1},(_,i)=>at(a0+(a1-a0)*i/n,d,x0,y0));
const mirror=(p:HairPiece)=>({...p,points:p.points.map(([x,y])=>[2*cx-x,y] as Point2)});
export const hairStyles:HairStyle[]=[
 {name:'None',back:[]},
 // The reference: long uneven spikes leaning to one side.
 {name:'Spikes',back:[.07,.24,.41,.58,.75,.92].map((t,i)=>spike(Math.PI*t,r*.5,r*[2.8,2.5,2.25,2,1.8,1.6][i],.36))},
 {name:'Sunburst',back:Array.from({length:8},(_,i)=>spike(Math.PI*(.05+.9*i/7),r*.8,r*1.85,.24))},
 {name:'Afro',back:[circle(cx,104,62)]},
 {name:'Cloud',back:Array.from({length:6},(_,i)=>{const p=at(Math.PI*(1-i/5),48,cx,cy+2);return circle(p[0],p[1],24);}),cap:cap(cy-10)},
 {name:'Fan',back:Array.from({length:8},(_,i)=>piece([[cx,cy],...arc(Math.PI*(1-i/8),Math.PI*(1-(i+1)/8),68,cx,cy,8)],i%2===1))},
 {name:'Flame',back:[piece([[60,104],...curve([60,104],[46,56],[72,34]),...curve([72,34],[78,62],[92,66]).slice(1),...curve([92,66],[88,30],[104,8]).slice(1),...curve([104,8],[112,44],[120,60]).slice(1),...curve([120,60],[126,40],[140,30]).slice(1),...curve([140,30],[152,70],[140,104]).slice(1)])]},
 {name:'Fin',back:[roundBox(84,26,32,72,16)]},
 {name:'Flat top',back:[box(60,38,80,50)],cap:cap(cy-20)},
 {name:'Bowl',back:[],cap:cap(cy-2,cy-2,5)},
 {name:'Helmet',back:[roundBox(50,64,100,94,42)],cap:cap(cy-12)},
 {name:'Halo',back:[piece([...arc(-.15,Math.PI+.15,66,cx,104),...arc(Math.PI+.15,-.15,50,cx,116)])]},
 {name:'Waves',back:[circle(72,84,22),circle(cx,68,24),circle(128,84,22)],cap:cap(cy-14)},
 {name:'Horns',back:[piece([[70,96],[50,24],[94,80]]),mirror(piece([[70,96],[50,24],[94,80]]))]},
 {name:'Blocks',back:[box(62,52,24,44),box(88,30,24,66,true),box(114,58,24,38)]},
 {name:'Sweep',back:[],cap:cap(cy+8,cy-30,5)},
 {name:'Ball top',back:[circle(cx,50,32)],cap:cap(cy-18)},
 {name:'Ears',back:[circle(62,72,28),circle(138,72,28)],cap:cap(cy-16)},
 {name:'Leaves',back:[piece([...curve([96,86],[52,64],[44,14]),...curve([44,14],[96,34],[96,86]).slice(1)]),piece([...curve([104,86],[150,60],[160,20]),...curve([160,20],[104,40],[104,86]).slice(1)],true)]},
 {name:'Crown',back:[piece([[56,96],[56,48],[76,72],[88,28],[cx,62],[112,28],[124,72],[144,48],[144,96]])]},
 {name:'Gem',back:[piece([[cx,10],[138,52],[cx,94],[62,52]])]},
 {name:'Ridge',back:[.15,.38,.62,.85].map(t=>{const p=at(Math.PI*t,40);return circle(p[0],p[1],20);})},
 {name:'Swoosh',back:[piece([...arc(Math.PI*1.02,Math.PI*.12,62),...curve(at(Math.PI*.12,62),[118,70],[64,100]).slice(1)])]},
];
export const hairStyleNames=hairStyles.map(s=>s.name);
/** Keeps the part of a convex polygon on the side of the line a→b where `keep` is (Sutherland–Hodgman, one edge). */
function clip(polygon:Point2[],a:Point2,b:Point2,keep:Point2):Point2[]{
 const side=(p:Point2)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]),s=Math.sign(side(keep)),out:Point2[]=[];
 for(let i=0;i<polygon.length;i++){
  const p=polygon[i],q=polygon[(i+1)%polygon.length],sp=side(p)*s,sq=side(q)*s;
  if(sp>=0)out.push(p);
  if(sp*sq<0){const t=sp/(sp-sq);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}
 }
 return out;
}
/**
 * A style placed on a head, in the head bone's space (y up): `outline` is the head's outline as drawn, `markTop` the top
 * of the face mark, `size` the Hair slider. Design px map to metres by the head's size (the mean of its width and
 * height against the design head's 76 px), centred on the head; the cap never comes below the mark.
 */
export function placeHair(style:HairStyle,outline:Point2[],markTop:number,size=1){
 const xs=outline.map(p=>p[0]),ys=outline.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const mx=(minX+maxX)/2,my=(minY+maxY)/2,unit=((maxX-minX)+(maxY-minY))/2/(2*r)*size;
 const map=([x,y]:Point2):Point2=>[mx+(x-cx)*unit,my+(cy-y)*unit];
 const back=style.back.map(p=>({points:p.points.map(map),accent:!!p.accent}));
 let front:Point2[]|null=null;
 if(style.cap){
  const floor=markTop+.008,left:Point2=[minX-1,Math.max(map([cx-r,style.cap.left])[1],floor)],right:Point2=[maxX+1,Math.max(map([cx+r,style.cap.right])[1],floor)];
  const grow=1+style.cap.grow/r*size,kept=clip(outline,left,right,[mx,maxY+1]);
  if(kept.length>2)front=kept.map(([x,y])=>[mx+(x-mx)*grow,my+(y-my)*grow] as Point2);
 }
 return {back,front};
}

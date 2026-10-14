import {ellipse2d,type Point2} from './geometry';
/**
 * Hair (Nam, 2026-10-14, second round): big, bold, symmetrical, genderless shapes. From the first round stay the styles
 * Nam picked (Crown, Gem, Fin, Flame, Ball top, Halo, Bowl, Flat top, Sunburst, Helmet, Leaves), made symmetrical and
 * sturdier; the others gave way to helmets (the focus), robot hair and everyday cuts. Nothing gendered or tied to one
 * culture, no thin spikes, no ear-like circles, no half-moons.
 *
 * Styles are drawn in a design box of 200 × 200 px, y down, with a round head centred at (100,112), radius 38 (the space
 * docs/hair-proposal.html draws them in, from this file). A style has:
 * - back pieces, drawn behind the head;
 * - an optional cap: the head's own outline above a cut line, grown a little, so it fits every head shape;
 * - front pieces: solid shapes over the head (helmets, hats). Their lower edge never comes below the face mark (the whole
 *   style moves up if it would), and they grow just enough to cover the top of every head shape;
 * - dangles: ragdoll chains of touching circles (an antenna, a plume, a pompom) that swing as the figure moves
 *   (hairPhysics.ts).
 * Pieces marked accent take the hair's second colour.
 */
export const design={cx:100,cy:112,r:38};
export interface HairPiece {points:Point2[];accent?:boolean;}
/** `left`/`right`: design y of the cut line at the head's left and right edge; `grow`: px around the head. */
export interface HairCap {left:number;right:number;grow:number;}
/**
 * A ragdoll chain: the first circle hangs `rope` px from `anchor`, each next one touches the one before, and at rest the
 * chain points at `angle` (0 = straight up, positive = leaning left). With `onHead`, the anchor's y is the head's top at
 * that x plus `anchor[1]` px (so it grows out of any head shape).
 */
export interface HairDangle {anchor:Point2;onHead?:boolean;angle:number;rope:number;radii:number[];accent:boolean[];}
export type HairGroup='Helmet'|'Robot'|'Hair';
export interface HairStyle {name:string;group:HairGroup;back:HairPiece[];cap?:HairCap;front?:HairPiece[];dangles?:HairDangle[];}
const {cx,cy,r}=design;
const piece=(points:Point2[],accent=false):HairPiece=>({points,accent});
const circle=(x:number,y:number,radius:number,accent=false)=>piece(ellipse2d(x,y,radius,radius,0,Math.PI*2,48),accent);
const box=(x:number,y:number,w:number,h:number,accent=false)=>piece([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],accent);
/** Rounded box with corner radius k (y down). */
const roundBox=(x:number,y:number,w:number,h:number,k:number,accent=false)=>piece([
 ...ellipse2d(x+w-k,y+k,k,k,-Math.PI/2,0,10),...ellipse2d(x+w-k,y+h-k,k,k,0,Math.PI/2,10),
 ...ellipse2d(x+k,y+h-k,k,k,Math.PI/2,Math.PI,10),...ellipse2d(x+k,y+k,k,k,Math.PI,Math.PI*1.5,10)],accent);
/** Box with only its top corners rounded. */
const topRound=(x:number,y:number,w:number,h:number,k:number,accent=false)=>piece([
 ...ellipse2d(x+w-k,y+k,k,k,-Math.PI/2,0,10),[x+w,y+h],[x,y+h],...ellipse2d(x+k,y+k,k,k,Math.PI,Math.PI*1.5,10)],accent);
/** The upper half of a true circle (never stretched), its flat side at y. */
const half=(x:number,y:number,radius:number,accent=false)=>piece(ellipse2d(x,y,radius,radius,Math.PI,Math.PI*2,36),accent);
/** A half disc cut into n wedges of alternating colour: the Fan pattern Nam liked, on a helmet. */
const wedges=(x:number,y:number,radius:number,n:number)=>Array.from({length:n},(_,i)=>piece([[x,y],...ellipse2d(x,y,radius,radius,Math.PI*(1+i/n),Math.PI*(1+(i+1)/n),8)],i%2===1));
/** The band |x − cx| ≤ w of a half disc (a racing stripe). */
const stripe=(radius:number,y:number,w:number,accent=true)=>{const a=Math.acos(w/radius);return piece([[cx-w,y],...ellipse2d(cx,y,radius,radius,Math.PI*2-(Math.PI-a),Math.PI*2-a,10),[cx+w,y]],accent);};
/** A point at angle a (0 = right, π/2 = up) and distance d from (x0, y0), in the y-down design box. */
const at=(a:number,d:number,x0=cx,y0=cy):Point2=>[x0+Math.cos(a)*d,y0-Math.sin(a)*d];
/** A spike from the head: base half-width w (rad) at radius `inner`, tip at radius `outer`. */
const spike=(a:number,inner:number,outer:number,w:number)=>piece([at(a-w,inner),at(a,outer),at(a+w,inner)]);
const cap=(left:number,right=left,grow=3):HairCap=>({left,right,grow});
/** Points along a quadratic curve from p0 through control c to p1. */
const curve=(p0:Point2,c:Point2,p1:Point2,n=12):Point2[]=>Array.from({length:n+1},(_,i)=>{const t=i/n,u=1-t;return [u*u*p0[0]+2*u*t*c[0]+t*t*p1[0],u*u*p0[1]+2*u*t*c[1]+t*t*p1[1]] as Point2;});
const arc=(a0:number,a1:number,d:number,x0=cx,y0=cy,n=24):Point2[]=>Array.from({length:n+1},(_,i)=>at(a0+(a1-a0)*i/n,d,x0,y0));
const flip=([x,y]:Point2):Point2=>[2*cx-x,y];
const mirror=(p:HairPiece,accent=p.accent)=>({points:p.points.map(flip).reverse(),accent});
/** A symmetrical outline from its left half, drawn from the bottom left to the top on the centre line. */
const symmetric=(left:Point2[],accent=false)=>piece([...left,...left.slice(0,-1).reverse().map(flip)],accent);
/** A cog: `teeth` square teeth between radius `inner` and `outer`, one tooth straight up. */
const gear=(x:number,y:number,inner:number,outer:number,teeth:number)=>piece(Array.from({length:teeth},(_,i)=>{
 const a=Math.PI/2+i*Math.PI*2/teeth,p=Math.PI*2/teeth;
 return [at(a-p*.3,inner,x,y),at(a-p*.22,outer,x,y),at(a+p*.22,outer,x,y),at(a+p*.3,inner,x,y),at(a+p*.5,inner,x,y)];
}).flat());
const leaf=piece([...curve([96,86],[52,64],[44,14]),...curve([44,14],[96,34],[96,86]).slice(1)]);
/** The catalogue. Seeds store a style's index, so a retired first-round style hands its index to a new one. */
export const hairStyles:HairStyle[]=[
 {name:'None',group:'Hair',back:[]},
 // The everyday Vietnamese motorbike half-helmet: a dome with a visor band.
 {name:'Moto',group:'Helmet',back:[],front:[half(cx,100,46),roundBox(56,90,88,12,6,true)]},
 {name:'Sunburst',group:'Hair',back:Array.from({length:7},(_,i)=>spike(Math.PI*(.06+.88*i/6),r*.8,r*1.65,.34))},
 {name:'Hard hat',group:'Helmet',back:[],front:[roundBox(46,92,108,10,5),half(cx,93,40),roundBox(93,50,14,43,7,true)]},
 {name:'Segments',group:'Helmet',back:[],front:[...wedges(cx,100,46,6),circle(cx,55,9,true)]},
 {name:'Beanie',group:'Helmet',back:[],front:[half(cx,80,42),box(58,80,84,20),roundBox(54,84,92,18,6,true)],dangles:[{anchor:[cx,44],angle:0,rope:12,radii:[15],accent:[true]}]},
 {name:'Flame',group:'Hair',back:[symmetric([...curve([62,104],[46,70],[66,36]),...curve([66,36],[74,62],[86,66]).slice(1),...curve([86,66],[86,38],[cx,12]).slice(1)])]},
 {name:'Fin',group:'Hair',back:[roundBox(84,26,32,72,16)]},
 {name:'Flat top',group:'Hair',back:[box(60,38,80,50)],cap:cap(cy-20)},
 {name:'Bowl',group:'Hair',back:[],cap:cap(cy-2,cy-2,5)},
 {name:'Helmet',group:'Helmet',back:[roundBox(50,64,100,94,42)],cap:cap(cy-12)},
 {name:'Halo',group:'Hair',back:[piece([...arc(-.15,Math.PI+.15,66,cx,104),...arc(Math.PI+.15,-.15,50,cx,116)])]},
 {name:'Plume',group:'Helmet',back:[],front:[half(cx,100,44)],dangles:[{anchor:[cx,62],angle:0,rope:12,radii:[15,13,11],accent:[true,true,true]}]},
 {name:'Bucket',group:'Helmet',back:[],front:[piece([[60,92],[68,52],[132,52],[140,92]]),piece([[60,92],[62.4,80],[137.6,80],[140,92]],true),piece([[44,104],[56,92],[144,92],[156,104]])]},
 {name:'Blocks',group:'Robot',back:[-2,-1,0,1,2].map(k=>box(cx+k*18-8,[36,48,62][Math.abs(k)],16,100-[36,48,62][Math.abs(k)],Math.abs(k)===1))},
 {name:'Cap',group:'Helmet',back:[],front:[half(cx,98,42),roundBox(48,92,104,12,6,true),circle(cx,57,9,true)]},
 {name:'Ball top',group:'Hair',back:[],cap:cap(cy-18),dangles:[{anchor:[cx,70],angle:0,rope:20,radii:[32],accent:[false]}]},
 {name:'Knight',group:'Robot',back:[],front:[topRound(54,46,92,56,24),...[72,cx,128].map(x=>circle(x,90,7,true))]},
 {name:'Leaves',group:'Hair',back:[leaf,mirror(leaf,true)]},
 {name:'Crown',group:'Helmet',back:[piece([[56,96],[56,48],[76,72],[88,28],[cx,62],[112,28],[124,72],[144,48],[144,96]])]},
 {name:'Gem',group:'Hair',back:[piece([[cx,10],[138,52],[cx,94],[62,52]])]},
 {name:'Racer',group:'Helmet',back:[],front:[half(cx,100,46),stripe(46,100,11)]},
 {name:'Antenna',group:'Robot',back:[roundBox(88,62,24,20,6)],dangles:[{anchor:[cx,66],angle:0,rope:7,radii:[8,8,15],accent:[false,false,true]}]},
 {name:'Twin antennas',group:'Robot',back:[],dangles:[-1,1].map(s=>({anchor:[cx+s*20,6] as Point2,onHead:true,angle:-s*.4,rope:6,radii:[7,7,13],accent:[false,false,true]}))},
 {name:'Gear',group:'Robot',back:[gear(cx,104,46,58,12)]},
 {name:'Siren',group:'Robot',back:[roundBox(82,56,36,26,6),half(cx,57,19,true)]},
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
const inside=(p:Point2,polygon:Point2[])=>{
 let hit=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [xi,yi]=polygon[i],[xj,yj]=polygon[j];if((yi>p[1])!==(yj>p[1])&&p[0]<(xj-xi)*(p[1]-yi)/(yj-yi)+xi)hit=!hit;}
 return hit;
};
/** A dangle placed on a head (metres, y up): `dir` is its rest direction, rope and radii in metres. */
export interface PlacedDangle {anchor:Point2;dir:Point2;rope:number;radii:number[];accent:boolean[];}
/** Circle centres of a chain at rest. */
export function restCircles(d:PlacedDangle){
 let [x,y]=d.anchor,reach=d.rope;
 return d.radii.map((radius,i)=>{x+=d.dir[0]*reach;y+=d.dir[1]*reach;reach=radius+(d.radii[i+1]??0);return {x,y,r:radius,accent:d.accent[i]};});
}
/**
 * A style placed on a head, in the head bone's space (y up): `outline` is the head's outline as drawn, `markTop` the top
 * of the face mark, `size` the Hair slider. Design px map to metres by the head's size (the mean of its width and
 * height against the design head's 76 px), centred on the head; caps and front pieces never come below the mark.
 */
export function placeHair(style:HairStyle,outline:Point2[],markTop:number,size=1){
 const xs=outline.map(p=>p[0]),ys=outline.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const mx=(minX+maxX)/2,my=(minY+maxY)/2,unit=((maxX-minX)+(maxY-minY))/2/(2*r)*size,floor=markTop+.008;
 const map=([x,y]:Point2):Point2=>[mx+(x-cx)*unit,my+(cy-y)*unit];
 /** The head's top at x (its highest outline crossing), for anchors that grow out of the head. */
 const topAt=(x:number)=>{
  const hx=Math.min(maxX-.01,Math.max(minX+.01,x));let top=-Infinity;
  for(let i=0;i<outline.length;i++){const [ax,ay]=outline[i],[bx,by]=outline[(i+1)%outline.length];if((ax-hx)*(bx-hx)<=0&&ax!==bx)top=Math.max(top,ay+(by-ay)*(hx-ax)/(bx-ax));}
  return Number.isFinite(top)?top:maxY;
 };
 let back=style.back.map(p=>({points:p.points.map(map),accent:!!p.accent}));
 let front=(style.front??[]).map(p=>({points:p.points.map(map),accent:!!p.accent}));
 let dangles:PlacedDangle[]=(style.dangles??[]).map(d=>{
  const [x,y]=map(d.anchor),anchor:Point2=d.onHead?[x,topAt(x)-d.anchor[1]*unit]:[x,y];
  return {anchor,dir:[-Math.sin(d.angle),Math.cos(d.angle)],rope:d.rope*unit,radii:d.radii.map(v=>v*unit),accent:d.accent};
 });
 const move=(f:(p:Point2)=>Point2,k=1)=>{
  back=back.map(p=>({...p,points:p.points.map(f)}));front=front.map(p=>({...p,points:p.points.map(f)}));
  dangles=dangles.map(d=>({...d,anchor:f(d.anchor),rope:d.rope*k,radii:d.radii.map(v=>v*k)}));
 };
 if(front.length){
  // A helmet sits just above the face mark at the lowest, then grows (about the middle of its lower edge) until the
  // head above that edge, plus a 12 mm margin, is inside it.
  let brow=Math.min(...front.flatMap(p=>p.points.map(q=>q[1])));
  if(brow<floor){const lift=floor-brow;move(([x,y])=>[x,y+lift]);brow=floor;}
  const head:Point2[]=[];
  for(let i=0;i<outline.length;i++){
   const a=outline[i],b=outline[(i+1)%outline.length],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.004));
   for(let k=0;k<steps;k++){
    const p:Point2=[a[0]+(b[0]-a[0])*k/steps,a[1]+(b[1]-a[1])*k/steps];if(p[1]<brow)continue;
    // The point itself, and pushed 12 mm out from the head's centre and sideways, so no corner of the head peeks out.
    const dx=p[0]-mx,dy=p[1]-my,d=Math.hypot(dx,dy)||1,y=Math.max(brow+.001,p[1]);
    head.push([p[0],y],[p[0]+dx/d*.012,Math.max(brow+.001,p[1]+dy/d*.012)],[p[0]+Math.sign(dx)*.012,y]);
   }
  }
  const covered=(s:number)=>head.every(([x,y])=>front.some(p=>inside([mx+(x-mx)/s,brow+(y-brow)/s],p.points)));
  let s=1;while(s<3&&!covered(s))s+=.02;
  if(s>1)move(([x,y])=>[mx+(x-mx)*s,brow+(y-brow)*s],s);
 }
 if(style.cap){
  const left:Point2=[minX-1,Math.max(map([cx-r,style.cap.left])[1],floor)],right:Point2=[maxX+1,Math.max(map([cx+r,style.cap.right])[1],floor)];
  const grow=1+style.cap.grow/r*size,kept=clip(outline,left,right,[mx,maxY+1]);
  if(kept.length>2)front.unshift({points:kept.map(([x,y])=>[mx+(x-mx)*grow,my+(y-my)*grow] as Point2),accent:false});
 }
 return {back,front,dangles};
}

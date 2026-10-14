import {ellipse2d,type Point2} from './geometry';
/**
 * Hair and headwear (Nam, 2026-10-14, third round). Built from Nam's references: geometric totems (plain primitives
 * stacked so they touch, never overlap; two-colour splits), punk heads (a mohawk block, spikes with a headband, a star on
 * an antenna, shades pushed up on the head), minimal flat people (one-colour caps, a ball on top) and bold winter
 * headwear (a striped cone, a top hat, a dotted mushroom hat). Kept from earlier rounds: the eleven styles Nam picked
 * (Crown, Gem, Fin, Flame, Ball top, Halo, Bowl, Flat top, Sunburst, Helmet, Leaves) and the helmets and robot hair he did
 * not turn down. Everything is symmetrical (a few split into two colours), genderless and made of big shapes.
 *
 * Styles are drawn in a design box of 200 x 200 px, y down, with a round head centred at (100,112), radius 38 (the space
 * docs/hair-proposal.html draws them in, from this file). A style has:
 * - back pieces, drawn behind the head; with `sits`, the whole style rests on the head's top, touching it (a totem);
 * - an optional cap: the head's own outline above a cut line, grown a little, so it fits every head shape;
 * - an optional band: the head's outline between two lines (a headband), in the accent colour;
 * - front pieces: solid shapes over the head (helmets, hats). Their lower edge never comes below the face mark (the whole
 *   style moves up if it would), and unless `cover` is false they grow just enough to cover the top of every head shape;
 * - dangles: ragdoll chains of touching circles (an antenna, a plume), the last one maybe a star or an asterisk, that
 *   swing as the figure moves (hairPhysics.ts).
 * Pieces marked accent take the hair's second colour.
 */
export const design={cx:100,cy:112,r:38};
export interface HairPiece {points:Point2[];accent?:boolean;}
/** `left`/`right`: design y of the cut line at the head's left and right edge; `grow`: px around the head. */
export interface HairCap {left:number;right:number;grow:number;}
/**
 * A ragdoll chain: the first circle hangs `rope` px from `anchor`, each next one touches the one before, and at rest the
 * chain points at `angle` (0 = straight up, positive = leaning left). With `onHead`, the anchor's y is the head's top at
 * that x plus `anchor[1]` px (so it grows out of any head shape). `tip`: the last circle drawn as this shape instead
 * (px around its centre, pointing up), within the last radius.
 */
export interface HairDangle {anchor:Point2;onHead?:boolean;angle:number;rope:number;radii:number[];accent:boolean[];tip?:Point2[];}
export type HairGroup='Helmet'|'Hat'|'Totem'|'Robot'|'Hair';
export interface HairStyle {name:string;group:HairGroup;back:HairPiece[];cap?:HairCap;band?:{top:number;bottom:number;grow:number};front?:HairPiece[];cover?:boolean;sits?:boolean;dangles?:HairDangle[];}
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
/** The lower half of a true circle, its flat side up at y (a bowl). */
const bowl=(x:number,y:number,radius:number,accent=false)=>piece(ellipse2d(x,y,radius,radius,0,Math.PI,36),accent);
/** A five-point star, point up, around (0,0) (a dangle tip). */
const star=(R:number):Point2[]=>Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,d=i%2?R*.46:R;return [Math.cos(a)*d,Math.sin(a)*d] as Point2;});
/** An eight-arm asterisk of thick arms (width w), around (0,0) (a dangle tip). */
const asterisk=(R:number,w:number):Point2[]=>Array.from({length:8},(_,k)=>{
 const a=-Math.PI/2+k*Math.PI/4,u:Point2=[Math.cos(a),Math.sin(a)],n:Point2=[-u[1],u[0]],b=a+Math.PI/8,inner=w/2/Math.sin(Math.PI/8);
 return [[R*u[0]-w/2*n[0],R*u[1]-w/2*n[1]],[R*u[0]+w/2*n[0],R*u[1]+w/2*n[1]],[Math.cos(b)*inner,Math.sin(b)*inner]] as Point2[];
}).flat();
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
/** The catalogue. Seeds store a style's index, so a retired style hands its index to a new one. */
const cone=piece([[60,92],[140,92],[cx,10]]),wing=piece([[58,98],[24,56],[70,80]],true);
export const hairStyles:HairStyle[]=[
 {name:'None',group:'Hair',back:[]},
 // Futuristic helmets in place of the motorbike helmet and the hard hat: a tall shell with a slot visor, a dome with swept fins.
 {name:'Visor',group:'Helmet',back:[],front:[topRound(52,40,96,62,30),roundBox(58,84,84,14,7,true)]},
 {name:'Sunburst',group:'Hair',back:Array.from({length:7},(_,i)=>spike(Math.PI*(.06+.88*i/6),r*.8,r*1.65,.34))},
 {name:'Jet',group:'Helmet',back:[],front:[half(cx,100,44),wing,mirror(wing)]},
 // Totem: a bowl, flat side up, carrying a diamond that touches it at one point.
 {name:'Saucer',group:'Totem',sits:true,back:[bowl(cx,60,38),piece([[cx,10],[124,35],[cx,60],[76,35]],true)]},
 {name:'Beanie',group:'Hat',back:[],front:[half(cx,80,42),box(58,80,84,20),roundBox(54,84,92,18,6,true)]},
 {name:'Flame',group:'Hair',back:[symmetric([...curve([62,104],[46,70],[66,36]),...curve([66,36],[74,62],[86,66]).slice(1),...curve([86,66],[86,38],[cx,12]).slice(1)])]},
 {name:'Fin',group:'Hair',back:[roundBox(84,26,32,72,16)]},
 {name:'Flat top',group:'Hair',back:[box(60,38,80,50)],cap:cap(cy-20)},
 {name:'Bowl',group:'Hair',back:[],cap:cap(cy-2,cy-2,5)},
 {name:'Helmet',group:'Helmet',back:[roundBox(50,64,100,94,42)],cap:cap(cy-12)},
 {name:'Halo',group:'Hair',back:[piece([...arc(-.15,Math.PI+.15,66,cx,104),...arc(Math.PI+.15,-.15,50,cx,116)])]},
 {name:'Plume',group:'Helmet',back:[],front:[half(cx,100,44)],dangles:[{anchor:[cx,62],angle:0,rope:12,radii:[15,13,11],accent:[true,true,true]}]},
 {name:'Bucket',group:'Hat',back:[],front:[piece([[60,92],[68,52],[132,52],[140,92]]),piece([[60,92],[62.4,80],[137.6,80],[140,92]],true),piece([[44,104],[56,92],[144,92],[156,104]])]},
 {name:'Blocks',group:'Robot',back:[-2,-1,0,1,2].map(k=>box(cx+k*18-8,[36,48,62][Math.abs(k)],16,100-[36,48,62][Math.abs(k)],Math.abs(k)===1))},
 // Winter headwear: a top hat resting on the head, a band round its crown.
 {name:'Top hat',group:'Hat',sits:true,back:[box(64,30,72,54),box(64,64,72,12,true),roundBox(44,82,112,10,5)]},
 {name:'Ball top',group:'Hair',back:[],cap:cap(cy-18),dangles:[{anchor:[cx,70],angle:0,rope:20,radii:[32],accent:[false]}]},
 {name:'Knight',group:'Robot',back:[],front:[topRound(54,46,92,56,24),...[72,cx,128].map(x=>circle(x,90,7,true))]},
 {name:'Leaves',group:'Hair',back:[leaf,mirror(leaf,true)]},
 {name:'Crown',group:'Hat',back:[piece([[56,96],[56,48],[76,72],[88,28],[cx,62],[112,28],[124,72],[144,48],[144,96]])]},
 {name:'Gem',group:'Totem',back:[piece([[cx,10],[138,52],[cx,94],[62,52]])]},
 // A striped cone resting on the head.
 {name:'Cone',group:'Hat',sits:true,back:[cone,piece([[68.8,74],[73.7,64],[126.3,64],[131.2,74]],true),piece([[82.4,46],[86.3,38],[113.7,38],[117.6,46]],true)]},
 {name:'Antenna',group:'Robot',back:[roundBox(88,62,24,20,6)],dangles:[{anchor:[cx,66],angle:0,rope:7,radii:[8,8,15],accent:[false,false,true]}]},
 {name:'Twin antennas',group:'Robot',back:[],dangles:[-1,1].map(s=>({anchor:[cx+s*20,6] as Point2,onHead:true,angle:-s*.4,rope:6,radii:[7,7,13],accent:[false,false,true]}))},
 // Six broad teeth: the twelve small ones looked busy.
 {name:'Gear',group:'Robot',back:[gear(cx,104,46,60,6)]},
 {name:'Siren',group:'Robot',back:[roundBox(82,56,36,26,6),half(cx,57,19,true)]},
 // Totems: a slab resting on the head; four balls in a square; a square split into an hourglass of two colours.
 {name:'Slab',group:'Totem',sits:true,back:[roundBox(46,56,108,22,4)]},
 {name:'Quad',group:'Totem',sits:true,back:[[81,60],[119,60],[81,22],[119,22]].map(([x,y])=>circle(x,y,19))},
 {name:'Bowtie',group:'Totem',sits:true,back:[piece([[62,16],[138,16],[cx,54]]),piece([[62,92],[cx,54],[138,92]]),piece([[62,16],[cx,54],[62,92]],true),piece([[138,16],[138,92],[cx,54]],true)]},
 // Ragdoll: an asterisk on a stalk (the totem's asterisk), and a star on an antenna above a cap (the punk heads).
 {name:'Asterisk',group:'Robot',back:[],dangles:[{anchor:[cx,72],angle:0,rope:6,radii:[7,7,22],accent:[false,false,true],tip:asterisk(22,13)}]},
 {name:'Star',group:'Robot',back:[],cap:cap(cy-14),dangles:[{anchor:[cx,72],angle:0,rope:6,radii:[7,7,23],accent:[false,false,true],tip:star(23)}]},
 // Punk: a block with a zigzag top; big spikes with a headband.
 {name:'Mohawk',group:'Hair',back:[symmetric([[76,100],[72,30],[84,44],[91,12],[cx,32]])]},
 {name:'Punk',group:'Hair',back:Array.from({length:5},(_,i)=>spike(Math.PI*(.12+.76*i/4),r*.8,r*1.8,.3)),band:{top:86,bottom:100,grow:3}},
 // Shades pushed up on the head: an accessory, it does not cover the head.
 {name:'Shades',group:'Hat',back:[],cover:false,front:[roundBox(58,72,38,22,8,true),roundBox(104,72,38,22,8,true),box(94,78,12,7,true)]},
 // A wide dotted mushroom hat.
 {name:'Mushroom',group:'Hat',back:[],front:[half(cx,100,58),circle(cx,66,9,true),circle(75,86,8,true),circle(125,86,8,true),circle(82,58,7,true),circle(118,58,7,true)]},
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
/** A dangle placed on a head (metres, y up): `dir` is its rest direction, rope and radii in metres, `tip` around its centre. */
export interface PlacedDangle {anchor:Point2;dir:Point2;rope:number;radii:number[];accent:boolean[];tip?:Point2[];}
/** Circle centres of a chain at rest. */
export function restCircles(d:PlacedDangle){
 let [x,y]=d.anchor,reach=d.rope;
 return d.radii.map((radius,i)=>{x+=d.dir[0]*reach;y+=d.dir[1]*reach;reach=radius+(d.radii[i+1]??0);return {x,y,r:radius,accent:d.accent[i]};});
}
/** A dangle's tip shape at (x, y), turned to point along `dir` (it is drawn pointing up). */
export const tipAt=(tip:Point2[],x:number,y:number,dir:Point2):Point2[]=>{const a=Math.atan2(dir[1],dir[0])-Math.PI/2,c=Math.cos(a),s=Math.sin(a);return tip.map(([px,py])=>[x+px*c-py*s,y+px*s+py*c] as Point2);};
/**
 * A style placed on a head, in the head bone's space (y up): `outline` is the head's outline as drawn, `markTop` the top
 * of the face mark, `size` the Hair slider. Design px map to metres by the head's size (the mean of its width and
 * height against the design head's 76 px), centred on the head; caps, bands and front pieces never come below the mark.
 */
export function placeHair(style:HairStyle,outline:Point2[],markTop:number,size=1){
 const xs=outline.map(p=>p[0]),ys=outline.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 const mx=(minX+maxX)/2,my=(minY+maxY)/2,unit=((maxX-minX)+(maxY-minY))/2/(2*r)*size,floor=markTop+.008;
 const map=([x,y]:Point2):Point2=>[mx+(x-cx)*unit,my+(cy-y)*unit];
 /** The head's top at x (its highest outline crossing), or -Infinity beside the head. */
 const headTop=(x:number)=>{
  let top=-Infinity;
  for(let i=0;i<outline.length;i++){const [ax,ay]=outline[i],[bx,by]=outline[(i+1)%outline.length];if((ax-x)*(bx-x)<=0&&ax!==bx)top=Math.max(top,ay+(by-ay)*(x-ax)/(bx-ax));}
  return top;
 };
 /** The same, for anchors: x is kept just inside the head. */
 const topAt=(x:number)=>{const top=headTop(Math.min(maxX-.01,Math.max(minX+.01,x)));return Number.isFinite(top)?top:maxY;};
 let back=style.back.map(p=>({points:p.points.map(map),accent:!!p.accent}));
 let front=(style.front??[]).map(p=>({points:p.points.map(map),accent:!!p.accent}));
 let dangles:PlacedDangle[]=(style.dangles??[]).map(d=>{
  const [x,y]=map(d.anchor),anchor:Point2=d.onHead?[x,topAt(x)-d.anchor[1]*unit]:[x,y];
  return {anchor,dir:[-Math.sin(d.angle),Math.cos(d.angle)],rope:d.rope*unit,radii:d.radii.map(v=>v*unit),accent:d.accent,tip:d.tip?.map(([px,py])=>[px*unit,-py*unit] as Point2)};
 });
 const move=(f:(p:Point2)=>Point2,k=1)=>{
  back=back.map(p=>({...p,points:p.points.map(f)}));front=front.map(p=>({...p,points:p.points.map(f)}));
  dangles=dangles.map(d=>({...d,anchor:f(d.anchor),rope:d.rope*k,radii:d.radii.map(v=>v*k),tip:d.tip?.map(([x,y])=>[x*k,y*k] as Point2)}));
 };
 if(style.sits){
  // A totem: the whole style moves up or down until its lowest point over the head just touches the head's top.
  let lift=-Infinity;
  for(const p of [...back,...front])for(let i=0;i<p.points.length;i++){
   const a=p.points[i],b=p.points[(i+1)%p.points.length],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.002));
   for(let k=0;k<steps;k++){const x=a[0]+(b[0]-a[0])*k/steps,y=a[1]+(b[1]-a[1])*k/steps,top=headTop(x);if(x>minX&&x<maxX&&Number.isFinite(top))lift=Math.max(lift,top-y);}
  }
  if(Number.isFinite(lift))move(([x,y])=>[x,y+lift]);
 }
 if(front.length){
  // A helmet sits just above the face mark at the lowest, then grows (about the middle of its lower edge) until the
  // head above that edge, plus a 12 mm margin, is inside it. Accessories (cover: false) only keep above the mark.
  let brow=Math.min(...front.flatMap(p=>p.points.map(q=>q[1])));
  if(brow<floor){const lift=floor-brow;move(([x,y])=>[x,y+lift]);brow=floor;}
  if(style.cover!==false){
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
 }
 if(style.cap){
  const left:Point2=[minX-1,Math.max(map([cx-r,style.cap.left])[1],floor)],right:Point2=[maxX+1,Math.max(map([cx+r,style.cap.right])[1],floor)];
  const grow=1+style.cap.grow/r*size,kept=clip(outline,left,right,[mx,maxY+1]);
  if(kept.length>2)front.unshift({points:kept.map(([x,y])=>[mx+(x-mx)*grow,my+(y-my)*grow] as Point2),accent:false});
 }
 if(style.band){
  // A headband: the head between two level lines, a little wider than the head, never below the mark.
  const bottom=Math.max(map([cx,style.band.bottom])[1],floor),top=bottom+(style.band.bottom-style.band.top)*unit,grow=1+style.band.grow/r*size;
  const kept=clip(clip(outline,[minX-1,bottom],[maxX+1,bottom],[mx,maxY+1]),[minX-1,top],[maxX+1,top],[mx,minY-1]);
  if(kept.length>2)front.push({points:kept.map(([x,y])=>[mx+(x-mx)*grow,y] as Point2),accent:true});
 }
 return {back,front,dangles};
}

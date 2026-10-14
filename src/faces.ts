import {ellipse2d,signedArea,type Point2} from './geometry';
import {bones,palette,rng,type CharacterSpec} from './model';
/**
 * Faces (Trung Bao, 2026-10-14): three libraries, one shown at a time (Look, Face). Minimal: one bold geometric mark,
 * a single piece or a symmetrical pair like eyes (the face mark part: its shape is part of the seed). Expressive: still minimal, the same flat
 * geometry (dots, bars, diamonds, squares, triangles, half discs), put together into faces with feeling: smiles and
 * frowns as thick arcs cut square, crosses for eyes, a ? and a !, wavy and zigzag mouths, winks, commas and lids, after
 * his reference sheet but our own. Many eyes: no mouth, three to nine eyes in rows, rings, clusters and crowns. Each
 * character keeps its own face in each library (drawn from its name). `colour`: the face takes a colour from the
 * character's own palette (the one standing out most on its head) instead of the dark mark colour.
 *
 * Shapes are in the head's units, centred where the mark sits (rig.ts scales them with the head and puts them at the
 * head's mark height), drawn within 7 cm either side and 5 cm up and down and shown `faceScale` times that, so they
 * read boldly and still sit inside every head shape, and never higher than `faceTop` (the hair's caps and helmets stop
 * 5 cm above the mark point: rig.ts hairOn).
 */
export type FaceStyle='minimal'|'expressive'|'eyes';
export const faceStyles:FaceStyle[]=['minimal','expressive','eyes'];
export const faceStyleNames:Record<FaceStyle,string>={minimal:'Minimal',expressive:'Expressive',eyes:'Many eyes'};
export interface FaceSettings {style:FaceStyle;colour:boolean;}
export const defaultFace:FaceSettings={style:'minimal',colour:false};
export const normalizeFace=(value:unknown):FaceSettings=>{const v=(value??{}) as Partial<FaceSettings>;return {style:faceStyles.includes(v.style as FaceStyle)?v.style as FaceStyle:defaultFace.style,colour:v.colour===true};};
export interface FacePiece {outline:Point2[];holes?:Point2[][];}
/** How much larger the expressive and many-eyes faces are shown than they are drawn below. */
export const faceScale=1.25;
const scaled=(pieces:FacePiece[])=>pieces.map(p=>({outline:p.outline.map(([x,y])=>[x*faceScale,y*faceScale] as Point2),holes:p.holes?.map(h=>h.map(([x,y])=>[x*faceScale,y*faceScale] as Point2))}));
const TAU=Math.PI*2,ccw=(p:Point2[])=>signedArea(p)>0?p:[...p].reverse();
// The flat shapes.
const dot=(x:number,y:number,r:number):FacePiece=>({outline:ellipse2d(x,y,r,r,0,TAU,28)});
const ring=(x:number,y:number,r:number,inner=.45):FacePiece=>({outline:ellipse2d(x,y,r,r,0,TAU,32),holes:[ellipse2d(x,y,r*inner,r*inner,0,TAU,24)]});
const turned=(x:number,y:number,a:number,p:Point2[]):Point2[]=>p.map(([u,v])=>[x+u*Math.cos(a)-v*Math.sin(a),y+u*Math.sin(a)+v*Math.cos(a)]);
const bar=(x:number,y:number,length:number,w:number,a=0):FacePiece=>({outline:turned(x,y,a,[[-length/2,-w/2],[length/2,-w/2],[length/2,w/2],[-length/2,w/2]])});
const square=(x:number,y:number,s:number,a=0)=>bar(x,y,s,s,a);
const diamond=(x:number,y:number,w:number,h:number):FacePiece=>({outline:[[x,y-h/2],[x+w/2,y],[x,y+h/2],[x-w/2,y]]});
/** A triangle, `s` across, pointing `a` (0: up). */
const triangle=(x:number,y:number,s:number,a=0):FacePiece=>({outline:turned(x,y,a,[0,1,2].map(i=>{const t=Math.PI/2+i*TAU/3;return [s/Math.sqrt(3)*Math.cos(t),s/Math.sqrt(3)*Math.sin(t)] as Point2;}))});
/** Half a disc: a dome (flat side down) or a bowl (flat side up). */
const dome=(x:number,y:number,r:number):FacePiece=>({outline:ellipse2d(x,y,r,r,0,Math.PI,20)});
const bowl=(x:number,y:number,r:number):FacePiece=>({outline:ellipse2d(x,y,r,r,Math.PI,TAU,20)});
/** A four-point star (`inner`: the waist, as a share of its reach). */
const star=(x:number,y:number,r:number,inner=.36):FacePiece=>({outline:Array.from({length:8},(_,i)=>{const t=Math.PI/2+i*Math.PI/4,k=i%2?r*inner:r;return [x+k*Math.cos(t),y+k*Math.sin(t)] as Point2;})});
/** A regular polygon of `n` corners, one pointing up. */
const regular=(x:number,y:number,r:number,n:number):FacePiece=>({outline:Array.from({length:n},(_,i)=>{const t=Math.PI/2+i*TAU/n;return [x+r*Math.cos(t),y+r*Math.sin(t)] as Point2;})});
/** A pill (two half circles joined straight), `w` × `h`, lying or standing by whichever is longer. */
const pill=(x:number,y:number,w:number,h:number):FacePiece=>{const r=Math.min(w,h)/2,d=Math.max(w,h)/2-r;return {outline:w>=h?[...ellipse2d(x+d,y,r,r,-Math.PI/2,Math.PI/2,12),...ellipse2d(x-d,y,r,r,Math.PI/2,Math.PI*1.5,12)]:[...ellipse2d(x,y+d,r,r,0,Math.PI,12),...ellipse2d(x,y-d,r,r,Math.PI,TAU,12)]};};
/** A plus, `s` across, its arms `w` thick. */
const plus=(x:number,y:number,s:number,w:number):FacePiece=>{const a=s/2,b=w/2;return {outline:([[b,-a],[b,-b],[a,-b],[a,b],[b,b],[b,a],[-b,a],[-b,b],[-a,b],[-a,-b],[-b,-b],[-b,-a]] as Point2[]).map(([u,v])=>[x+u,y+v] as Point2)};};
/** A thick line along `points`, `w` wide, cut square at both ends, its bends mitred. */
function stroke(points:Point2[],w:number):FacePiece{
 const n=points.length,left:Point2[]=[],right:Point2[]=[],unit=([x,y]:Point2):Point2=>{const l=Math.hypot(x,y)||1;return [x/l,y/l];};
 for(let i=0;i<n;i++){
  const p=points[i],t0=unit(i>0?[p[0]-points[i-1][0],p[1]-points[i-1][1]]:[points[1][0]-p[0],points[1][1]-p[1]]),t1=i<n-1?unit([points[i+1][0]-p[0],points[i+1][1]-p[1]]):t0;
  const t=unit([t0[0]+t1[0],t0[1]+t1[1]]),normal:Point2=[-t[1],t[0]],d=w/2/Math.max(.4,normal[0]*-t0[1]+normal[1]*t0[0]);
  left.push([p[0]+normal[0]*d,p[1]+normal[1]*d]);right.push([p[0]-normal[0]*d,p[1]-normal[1]*d]);
 }
 return {outline:ccw([...left,...right.reverse()])};
}
/** A thick arc round (x, y), radius r, from angle a to b (radians, counter-clockwise if b > a). */
const arc=(x:number,y:number,r:number,a:number,b:number,w:number)=>stroke(ellipse2d(x,y,r,r,a,b,24),w);
const smile=(x:number,y:number,r:number,w=.011,open=.7)=>arc(x,y+r*.9,r,Math.PI*(1.5-open/2),Math.PI*(1.5+open/2),w);
const frown=(x:number,y:number,r:number,w=.011,open=.6)=>arc(x,y-r*.9,r,Math.PI*(.5-open/2),Math.PI*(.5+open/2),w);
const cross=(x:number,y:number,s:number,w:number)=>[bar(x,y,s,w,Math.PI/4),bar(x,y,s,w,-Math.PI/4)];
const wave=(x:number,y:number,width:number,amp:number,w:number)=>stroke(Array.from({length:25},(_,i)=>{const t=i/24;return [x-width/2+width*t,y+amp*Math.sin(t*Math.PI*3)] as Point2;}),w);
const zigzag=(x:number,y:number,width:number,amp:number,teeth:number,w:number)=>stroke(Array.from({length:teeth*2+1},(_,i)=>[x-width/2+width*i/(teeth*2),y+(i%2?amp:-amp)] as Point2),w);
/** A comma: a dot with a tail curling down and back. */
const comma=(x:number,y:number,r:number)=>[dot(x,y,r),arc(x-r*.35,y,r*1.15,-Math.PI*.05,-Math.PI*.55,r*.7)];
/** A question mark and an exclamation mark, `s` tall, standing on (x, y − s/2). */
const question=(x:number,y:number,s:number)=>[stroke([...ellipse2d(x,y+s*.22,s*.2,s*.2,Math.PI*.95,-Math.PI*.42,16),[x,y-s*.1]],s*.14),dot(x,y-s*.38,s*.1)];
const bang=(x:number,y:number,s:number)=>[stroke([[x,y+s*.42],[x,y-s*.16]],s*.15),dot(x,y-s*.38,s*.1)];
const eyes=(y:number,r:number,gap=.03)=>[dot(-gap,y,r),dot(gap,y,r)];
/** A symmetrical pair (like eyes): the shape at x, and its mirror image at −x. */
const pair=(x:number,make:(x:number,side:1|-1)=>FacePiece)=>[make(-x,-1),make(x,1)];
/**
 * The minimal library: the face mark part's shapes, in its order (model.ts variants.face, part of the seed, so the
 * first six keep their places), filled and bold, the straight ones thick (3.6 cm, the pairs' 2.4–2.6 cm; Trung Bao,
 * 2026-10-14: more shapes, more symmetrical pairs, still single pieces, thicker straight lines). Within 6 cm either
 * side and 4.5 cm up and down, shown as drawn.
 */
export const minimalFaces:{name:string;pieces:FacePiece[]}[]=[
 {name:'Dot',pieces:[dot(0,0,.03)]},
 {name:'Dash',pieces:[bar(0,0,.036,.09)]},
 {name:'Triangle',pieces:[{outline:ccw([[-.04,.025],[.04,.025],[0,-.04]] as Point2[])}]},
 {name:'Twin dots',pieces:pair(.04,x=>dot(x,0,.022))},
 {name:'Diamond',pieces:[diamond(0,0,.068,.088)]},
 {name:'Bar',pieces:[bar(0,0,.09,.036)]},
 {name:'Square',pieces:[square(0,0,.058)]},
 {name:'Dome',pieces:[dome(0,-.02,.042)]},
 {name:'Bowl',pieces:[bowl(0,.02,.042)]},
 {name:'Hexagon',pieces:[regular(0,0,.036,6)]},
 {name:'Plus',pieces:[plus(0,0,.084,.03)]},
 {name:'Star',pieces:[star(0,0,.044,.42)]},
 {name:'Pill',pieces:[pill(0,0,.09,.036)]},
 {name:'Arc',pieces:[smile(0,-.026,.04,.022,.72)]},
 {name:'Chevron',pieces:[stroke([[-.042,.022],[0,-.02],[.042,.022]],.026)]},
 {name:'Twin dashes',pieces:pair(.034,x=>bar(x,0,.026,.058))},
 {name:'Twin squares',pieces:pair(.036,x=>square(x,0,.036))},
 {name:'Twin diamonds',pieces:pair(.036,x=>diamond(x,0,.036,.05))},
 {name:'Twin triangles',pieces:pair(.038,x=>triangle(x,.004,.044,Math.PI))},
 {name:'Twin domes',pieces:pair(.036,x=>dome(x,-.012,.024))},
 {name:'Twin bowls',pieces:pair(.036,x=>bowl(x,.012,.024))},
 {name:'Twin bars',pieces:pair(.036,x=>bar(x,0,.042,.026))},
 {name:'Twin slants',pieces:pair(.036,(x,side)=>bar(x,0,.044,.024,side*.42))},
 {name:'Twin stars',pieces:pair(.034,x=>star(x,0,.027,.42))},
 {name:'Twin pills',pieces:pair(.034,x=>pill(x,0,.026,.054))},
];
/** Closed happy eyes: thin arcs bowed up. */
const lids=(y:number,r:number,gap=.03)=>[arc(-gap,y,r,Math.PI*.12,Math.PI*.88,.009),arc(gap,y,r,Math.PI*.12,Math.PI*.88,.009)];
/** Angry eyes: wedges slanting down towards the nose. */
const angry=(y:number)=>[{outline:ccw([[-.05,y+.014],[-.014,y-.002],[-.03,y-.016]] as Point2[])},{outline:ccw([[.05,y+.014],[.014,y-.002],[.03,y-.016]] as Point2[])}];
/** The expressive library: name, then its pieces. */
export const expressiveFaces:{name:string;pieces:FacePiece[]}[]=[
 {name:'Smile',pieces:[...eyes(.022,.016),smile(0,-.04,.036,.012)]},
 {name:'Grin',pieces:[...eyes(.022,.016),bowl(0,-.016,.032)]},
 {name:'Shock',pieces:[...cross(-.03,.024,.028,.009),...cross(.03,.024,.028,.009),dot(0,-.03,.019)]},
 {name:'?!',pieces:[...question(-.024,.002,.08),...bang(.026,.002,.08)]},
 {name:'Wobble',pieces:[...eyes(.022,.016),wave(0,-.03,.07,.008,.011)]},
 {name:'Jitter',pieces:[...eyes(.022,.016),zigzag(0,-.03,.07,.009,3,.011)]},
 {name:'Meh',pieces:[bar(-.03,.02,.028,.009),bar(.03,.02,.028,.009),bar(0,-.03,.07,.011)]},
 {name:'Wink',pieces:[bar(-.03,.022,.028,.009),dot(.03,.022,.016),smile(0,-.04,.036,.012)]},
 {name:'Sly',pieces:[...eyes(.022,.016),bar(.006,-.03,.058,.011,.2)]},
 {name:'Frown',pieces:[...eyes(.022,.016),frown(0,-.024,.034,.012)]},
 {name:'Content',pieces:[dome(-.03,.014,.016),dome(.03,.014,.016),smile(0,-.036,.026,.011)]},
 {name:'Cheeky',pieces:[...eyes(.022,.016),smile(0,-.04,.036,.012),bowl(.014,-.036,.011)]},
 {name:'Gem',pieces:[diamond(-.03,.022,.024,.034),diamond(.03,.022,.024,.034),smile(0,-.04,.034,.012)]},
 {name:'Bot',pieces:[square(-.03,.022,.026),square(.03,.022,.026),square(-.022,-.032,.013),square(0,-.032,.013),square(.022,-.032,.013)]},
 {name:'Grump',pieces:[...angry(.024),bar(0,-.032,.05,.011)]},
 {name:'Wow',pieces:[ring(-.031,.022,.019,.42),ring(.031,.022,.019,.42),dot(0,-.034,.011)]},
 {name:'Laugh',pieces:[...lids(.012,.016),bowl(0,-.014,.034)]},
 {name:'Whistle',pieces:[...eyes(.022,.016),ring(.018,-.032,.012,.4)]},
 {name:'Dizzy',pieces:[...cross(-.03,.024,.026,.009),...cross(.03,.024,.026,.009),wave(0,-.032,.066,.007,.011)]},
 {name:'Sparkle',pieces:[star(-.03,.022,.022),star(.03,.022,.022),smile(0,-.038,.026,.011)]},
 {name:'Topsy',pieces:[dome(0,.012,.034),dot(-.019,-.03,.014),dot(.019,-.03,.014)]},
 {name:'Glance',pieces:[dot(-.01,.022,.016),dot(.046,.022,.016),smile(.02,-.036,.028,.011,.6)]},
 {name:'Shout',pieces:[...eyes(.024,.016),{outline:ccw([[-.024,-.014],[.024,-.014],[0,-.05]] as Point2[])}]},
 {name:'Comma',pieces:[...comma(-.03,.024,.015),...comma(.03,.024,.015),smile(0,-.036,.024,.011)]},
 {name:'Hmm',pieces:[dot(-.03,.016,.015),bar(-.03,.044,.028,.008,.25),dot(.03,.016,.015),bar(.012,-.032,.036,.011)]},
 {name:'Yawn',pieces:[bar(-.03,.02,.026,.009),bar(.03,.02,.026,.009),ring(0,-.03,.018,.5)]},
 {name:'Kiss',pieces:[...lids(.014,.015),diamond(.006,-.03,.018,.022)]},
 {name:'Smug',pieces:[bowl(-.03,.026,.016),bowl(.03,.026,.016),smile(.012,-.036,.028,.011,.55)]},
];
/** A cluster of eyes of several sizes, none touching, drawn from `r` inside a 7 × 4.5 cm oval. */
function scatter(r:()=>number,count:number):FacePiece[]{
 const placed:{x:number;y:number;s:number}[]=[];
 for(let tries=0;placed.length<count&&tries<400;tries++){
  const s=.007+r()*.009,a=r()*TAU,k=Math.sqrt(r()),x=Math.cos(a)*k*(.07-s),y=Math.sin(a)*k*(.045-s);
  if(placed.every(p=>Math.hypot(p.x-x,p.y-y)>p.s+s+.006))placed.push({x,y,s});
 }
 return placed.map(p=>dot(p.x,p.y,p.s));
}
const grid=(cols:number[],rows:number[],make:(x:number,y:number)=>FacePiece|FacePiece[])=>rows.flatMap(y=>cols.flatMap(x=>make(x,y)));
/** The many-eyes library (no mouths): name, then its pieces (some drawn from the character's own randomness). */
export const eyeFaces:{name:string;pieces:(r:()=>number)=>FacePiece[]}[]=[
 {name:'Trio',pieces:()=>[dot(-.032,.02,.016),dot(.032,.02,.016),dot(0,-.026,.016)]},
 {name:'Row',pieces:()=>[-.05,0,.05].map(x=>dot(x,.004,.015))},
 {name:'Four',pieces:()=>grid([-.026,.026],[.02,-.02],(x,y)=>dot(x,y,.014))},
 {name:'Six',pieces:()=>grid([-.048,0,.048],[.018,-.018],(x,y)=>dot(x,y,.012))},
 {name:'Spider',pieces:()=>[dot(-.02,.012,.016),dot(.02,.012,.016),dot(-.054,.024,.009),dot(.054,.024,.009),dot(-.036,-.024,.008),dot(.036,-.024,.008),dot(-.062,-.008,.006),dot(.062,-.008,.006)]},
 {name:'Crown',pieces:()=>Array.from({length:5},(_,k)=>{const a=Math.PI*(1.15+.7*k/4);return dot(.058*Math.cos(a),.032+.05*Math.sin(a),.011);})},
 {name:'Columns',pieces:()=>grid([-.022,.022],[.032,0,-.032],(x,y)=>dot(x,y,.011))},
 {name:'Halo',pieces:()=>[dot(0,0,.014),...Array.from({length:6},(_,k)=>{const a=Math.PI/2+k*TAU/6;return dot(.038*Math.cos(a),.038*Math.sin(a),.009);})]},
 {name:'Brows',pieces:()=>[dot(-.03,-.002,.017),dot(.03,-.002,.017),dot(-.03,.034,.008),dot(.03,.034,.008),dot(-.055,.022,.007),dot(.055,.022,.007)]},
 {name:'Rings',pieces:()=>[ring(-.045,.01,.017),ring(0,-.014,.017),ring(.045,.01,.017)]},
 {name:'Big and small',pieces:()=>[ring(-.018,.006,.027,.4),dot(.032,.026,.011),dot(.036,-.014,.009)]},
 {name:'Diamonds',pieces:()=>[-.054,-.018,.018,.054].map(x=>diamond(x,.004,.022,.03))},
 {name:'Lids',pieces:()=>grid([-.026,.026],[.024,-.016],(x,y)=>dome(x,y,.014))},
 {name:'Cluster',pieces:r=>scatter(r,6+Math.floor(r()*3))},
 {name:'Nine',pieces:()=>grid([-.04,0,.04],[.032,0,-.032],(x,y)=>square(x,y,.014))},
 {name:'Cyclops',pieces:()=>[ring(0,.004,.028,.45),...grid([-.054,.054],[.032,-.026],(x,y)=>dot(x,y,.008))]},
 {name:'Triangles',pieces:()=>[triangle(-.044,.014,.03,Math.PI),triangle(0,-.016,.03,Math.PI),triangle(.044,.014,.03,Math.PI)]},
 {name:'Pupils',pieces:()=>[-.042,0,.042].flatMap((x,i)=>[ring(x,i===1?-.012:.01,.018,.62),dot(x+.004,(i===1?-.012:.01)-.002,.006)])},
];
/** Which face of a library a character has (its own, from its name). */
const pickOf=(spec:CharacterSpec,style:FaceStyle,count:number)=>Math.floor(rng(`${spec.label}|face|${style}`)()*count);
/** The highest a face reaches above the mark point (under the hair's caps, 5 cm up), and the lowest. */
export const faceTop=.046,faceBottom=-.066;
/** A face moved down to stay under `faceTop`, and made smaller about its top if it would then reach below `faceBottom`. */
function underHair(pieces:FacePiece[]):FacePiece[]{
 const ys=pieces.flatMap(p=>p.outline.map(q=>q[1])),top=Math.max(...ys),bottom=Math.min(...ys),shift=Math.min(0,faceTop-top),k=Math.min(1,(faceTop-faceBottom)/(top-bottom));
 if(!shift&&k===1)return pieces;
 const move=([x,y]:Point2):Point2=>[x*k,top+shift+(y-top)*k];
 return pieces.map(p=>({outline:p.outline.map(move),holes:p.holes?.map(h=>h.map(move))}));
}
/** The character's face in a library, as shown: its name and pieces (Minimal: the face mark part's shape). */
export function faceOf(spec:CharacterSpec,style:FaceStyle):{name:string;pieces:FacePiece[]}{
 if(style==='expressive'){const face=expressiveFaces[pickOf(spec,style,expressiveFaces.length)];return {name:face.name,pieces:underHair(scaled(face.pieces))};}
 if(style==='eyes'){const face=eyeFaces[pickOf(spec,style,eyeFaces.length)];return {name:face.name,pieces:underHair(scaled(face.pieces(rng(`${spec.label}|face|eyes|shape`))))};}
 return minimalFaces[spec.parts.face_mark.variant]??minimalFaces[0];
}
/** Relative luminance of a hex colour (WCAG). */
const luminance=(hex:string)=>{const n=parseInt(hex.slice(1),16),c=[n>>16&255,n>>8&255,n&255].map(v=>{const s=v/255;return s<=.03928?s/12.92:((s+.055)/1.055)**2.4;});return .2126*c[0]+.7152*c[1]+.0722*c[2];};
const contrast=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
/**
 * The face's colour taken from the character's palette: of the colours its other parts wear (not the dark ones), the
 * one that stands out most on its head; `fallback` (the dark mark colour) if it wears none.
 */
export function faceColourOf(spec:CharacterSpec,colorOf:(index:number)=>string,fallback:string){
 const head=colorOf(spec.parts.head.color);
 const worn=[...new Set(bones.filter(b=>b.kind!=='face'&&b.id!=='head').flatMap(b=>[spec.parts[b.id].color,spec.parts[b.id].accent]).filter(i=>palette[i]&&palette[i].family!=='dark').map(colorOf))].filter(c=>c.toLowerCase()!==head.toLowerCase());
 return worn.reduce<{colour:string;k:number}|null>((best,c)=>{const k=contrast(c,head);return !best||k>best.k?{colour:c,k}:best;},null)?.colour??fallback;
}

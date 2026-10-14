/**
 * Basket-weave pattern for the torso and pelvis.
 * Ported from "Dynamic Basket Weave Generator v5": same palettes, formations, line widths,
 * intersection colours, overlays and grain. The only change is the random source, which is
 * seeded from the character so a seed always reproduces the same cloth.
 */
export const weavePalettes = {
 HFCD: {
  bg: ['#030303','#080808','#101010'],
  main: ['#0564F8','#0A8AF8','#F83EB8','#F779C1','#19B98E','#00A062'],
  secondary: ['#F94A53','#F97A42','#F7C85C','#8C45F5','#B67AF6','#B5E4F2'],
  accent: ['#F7DDEB','#F8AFDE','#0B2D69','#542042','#6ADAA5'],
 },
 XMAS: {
  bg: ['#1344DA','#1F53EA','#2A60EB'],
  main: ['#14D94E','#0FB65A','#FF184A','#FF2348','#F6F6F2','#50D7F9'],
  secondary: ['#F5D925','#FFE44A','#25C2B9','#0F6E71','#8EEBFF','#DFFDFE'],
  accent: ['#FFFFFF','#F7F6E8','#0D2447','#1DD96F','#FFCF1A'],
 },
 TET: {
  bg: ['#CB102E','#D71B36','#E01F35'],
  main: ['#FF2A4E','#FF4B30','#FF8F2F','#FFD31F','#13C9B9','#26D367'],
  secondary: ['#F93FB7','#FD72C4','#F8EFD5','#0AB9A9','#27D0D1','#FFB11F'],
  accent: ['#FFF2C2','#FFDC3A','#00A98C','#FC6FAF','#FC8F29'],
 },
} as const;
export type WeavePaletteName = keyof typeof weavePalettes;
export const weavePaletteNames = Object.keys(weavePalettes) as WeavePaletteName[];
/** Lines per side of one generated tile (the generator's "density"). */
export const weaveDensity = 16;

const FORMATIONS = ['balanced','vertical','horizontal','blocks','offset'] as const;
type Formation = typeof FORMATIONS[number];
type Rng = () => number;
interface Palette {bg:string;main:string[];secondary:string[];accent:string[];all:string[];}

function xmur3(str:string){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return(h^h>>>16)>>>0;};}
function mulberry32(a:number):Rng{return()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const rngFrom=(seed:string)=>mulberry32(xmur3(seed)());
const pick=<T,>(r:Rng,a:readonly T[])=>a[Math.floor(r()*a.length)];
function shuffle<T>(r:Rng,list:readonly T[]){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const hexRgb=(h:string)=>{h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];};
const rgbHex=(c:number[])=>'#'+c.map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('').toUpperCase();
const mix=(a:string,b:string,t:number)=>{const A=hexRgb(a),B=hexRgb(b);return rgbHex(A.map((v,i)=>v+(B[i]-v)*t));};
const tone=(a:string,d:number)=>mix(a,d>=0?'#FFFFFF':'#000000',Math.abs(d));

/**
 * The colours a pattern may use: the palette's, or, under the colour budget (rules.ts colours; Trung Bao, 2026-10-14),
 * only the character's own (`own`, hex), with a lighter and a paler tone of each, so a woven piece stays in the family.
 */
function sourceOf(name:WeavePaletteName,own?:readonly string[]){
 const src=weavePalettes[name];
 return own?.length?{bg:src.bg,main:[...own],secondary:own.map(c=>tone(c,.22)),accent:own.map(c=>mix(c,'#FFFFFF',.62))}:src;
}
function buildPalette(r:Rng,name:WeavePaletteName,own?:readonly string[]):Palette{
 const src=sourceOf(name,own);
 const bg=pick(r,[...src.bg,...src.main,...src.secondary,...src.accent]);
 const main=shuffle(r,src.main.filter(c=>c!==bg)).slice(0,Math.min(4,Math.max(1,src.main.length-1)));
 const secondary=shuffle(r,src.secondary.filter(c=>c!==bg)).slice(0,Math.min(4,Math.max(1,src.secondary.length-1)));
 const accent=shuffle(r,src.accent.filter(c=>c!==bg)).slice(0,Math.min(3,Math.max(1,src.accent.length-1)));
 return {bg,main,secondary,accent,all:[...new Set([...main,...secondary,...accent])]};
}
function weightedColor(r:Rng,p:Pick<Palette,'main'|'secondary'|'accent'|'all'>){
 const q=r();
 if(q<.58)return pick(r,p.main);
 if(q<.88&&p.secondary.length)return pick(r,p.secondary);
 if(p.accent.length)return pick(r,p.accent);
 return pick(r,p.all);
}
function buildLineColors(r:Rng,count:number,p:Palette,repeatChance:number){
 const arr:string[]=[];
 for(let i=0;i<count;i++){let c=weightedColor(r,p),tries=0;while(c===p.bg&&tries<10){c=weightedColor(r,p);tries++;}arr.push(c);}
 for(let i=1;i<count;i++)if(r()<repeatChance)arr[i]=arr[i-1];
 return arr;
}
function chooseCounts(r:Rng,density:number,formation:Formation){
 let cols=density,rows=density;
 if(formation==='vertical'){cols=density+Math.floor(r()*3);rows=density-3+Math.floor(r()*3);}
 else if(formation==='horizontal'){cols=density-3+Math.floor(r()*3);rows=density+Math.floor(r()*3);}
 else if(formation==='blocks'){cols=density-2+Math.floor(r()*4);rows=density-2+Math.floor(r()*4);}
 else if(formation==='offset'){cols=density-1+Math.floor(r()*4);rows=density-1+Math.floor(r()*4);}
 else{cols=density-1+Math.floor(r()*3);rows=density-1+Math.floor(r()*3);}
 return {cols:clamp(cols,8,28),rows:clamp(rows,8,28)};
}
function lineWidths(r:Rng,count:number,cell:number,orientation:'v'|'h',formation:Formation){
 const widths:number[]=[];
 for(let i=0;i<count;i++){
  let w=formation==='blocks'?cell*(.34+r()*.28)
   :formation==='vertical'&&orientation==='v'?cell*(.28+r()*.22)
   :formation==='horizontal'&&orientation==='h'?cell*(.28+r()*.22)
   :cell*(.24+r()*.22);
  if(r()<.18)w*=.78;
  if(r()<.12)w*=1.16;
  widths.push(w);
 }
 return widths;
}
function chooseIntersectionColor(r:Rng,v:string,h:string,p:Palette){
 const q=r();
 if(q<.52)return mix(v,h,.5);
 if(q<.72)return tone(mix(v,h,.35+r()*.3),(r()*2-1)*.12);
 if(q<.84&&p.accent.length)return pick(r,p.accent);
 if(q<.92)return mix(p.bg,mix(v,h,.5),.72);
 return weightedColor(r,{main:p.secondary.length?p.secondary:p.main,secondary:p.main,accent:p.accent,all:p.all});
}
function addTexture(ctx:CanvasRenderingContext2D,W:number,H:number,r:Rng){
 const cell=Math.max(4,Math.round(W/220));
 ctx.save();
 ctx.globalCompositeOperation='soft-light';
 for(let y=0;y<H;y+=cell)for(let x=0;x<W;x+=cell)if(r()<.55){ctx.fillStyle=r()<.5?'rgba(255,255,255,0.05)':'rgba(0,0,0,0.035)';ctx.fillRect(x,y,cell,cell);}
 ctx.globalCompositeOperation='source-over';
 for(let i=0;i<48;i++){
  const vertical=r()<.5,alpha=.016+r()*.024;
  ctx.fillStyle=r()<.5?`rgba(255,255,255,${alpha})`:`rgba(0,0,0,${alpha*.8})`;
  if(vertical)ctx.fillRect(r()*W,0,1+r()*5,H);else ctx.fillRect(0,r()*H,W,1+r()*5);
 }
 ctx.restore();
}

/** Draws one weave tile. `seed` fixes every random choice; returns the number of columns/rows drawn. */
export function drawWeave(canvas:HTMLCanvasElement,seed:string,paletteName:WeavePaletteName,density=weaveDensity,own?:readonly string[]){
 const ctx=canvas.getContext('2d')!,W=canvas.width,H=canvas.height,r=rngFrom(seed);
 const formation=pick(r,FORMATIONS),palette=buildPalette(r,paletteName,own),{cols,rows}=chooseCounts(r,density,formation);
 ctx.clearRect(0,0,W,H);ctx.fillStyle=palette.bg;ctx.fillRect(0,0,W,H);
 const cellW=W/cols,cellH=H/rows,baseCell=Math.min(cellW,cellH);
 const vWidths=lineWidths(r,cols,cellW,'v',formation),hWidths=lineWidths(r,rows,cellH,'h',formation);
 const vColors=buildLineColors(r,cols,palette,.28),hColors=buildLineColors(r,rows,palette,.28);
 const xs=Array.from({length:cols},(_,i)=>(i+.5)*cellW),ys=Array.from({length:rows},(_,i)=>(i+.5)*cellH);
 for(let i=0;i<cols;i++){ctx.fillStyle=vColors[i];ctx.fillRect(xs[i]-vWidths[i]/2,0,vWidths[i],H);}
 for(let j=0;j<rows;j++){ctx.fillStyle=hColors[j];ctx.fillRect(0,ys[j]-hWidths[j]/2,W,hWidths[j]);}
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  let size=Math.min(vWidths[i],hWidths[j])*(.86+r()*.22);
  if(formation==='blocks'&&r()<.16)size*=1.08;
  if(formation==='offset'&&(i+j)%4===0)size*=.9;
  size=Math.min(size,baseCell*.92);
  let c=chooseIntersectionColor(r,vColors[i],hColors[j],palette);
  if(r()<.18)c=tone(c,(r()*2-1)*.1);
  ctx.fillStyle=c;ctx.fillRect(xs[i]-size/2,ys[j]-size/2,size,size);
  if(r()<.08){const size2=size*(.56+r()*.16);ctx.fillStyle=chooseIntersectionColor(r,hColors[j],vColors[i],palette);ctx.fillRect(xs[i]-size2/2,ys[j]-size2/2,size2,size2);}
 }
 const overlays=2+Math.floor(r()*4);
 for(let k=0;k<overlays;k++){
  ctx.save();ctx.globalAlpha=.2+r()*.18;ctx.fillStyle=weightedColor(r,palette);
  if(r()<.5){const i=Math.floor(r()*cols),w=vWidths[i]*(.42+r()*.35);ctx.fillRect(xs[i]-w/2,0,w,H);}
  else{const j=Math.floor(r()*rows),h=hWidths[j]*(.42+r()*.35);ctx.fillRect(0,ys[j]-h/2,W,h);}
  ctx.restore();
 }
 addTexture(ctx,W,H,r);
 return {cols,rows};
}

/**
 * Flow gradient (Nam, 2026-10-14): 2 or 3 of the palette's strong colours in a loop (first, second, [third,] back to the
 * first), drawn as a strip that repeats without a seam, so sliding it along a part keeps the colours moving.
 */
export function drawFlow(canvas:HTMLCanvasElement,seed:string,paletteName:WeavePaletteName,own?:readonly string[]){
 const src=sourceOf(paletteName,own),r=rngFrom(seed),ctx=canvas.getContext('2d')!,bright=[...src.main,...src.secondary].filter(c=>lightness(c)<.85),strong=bright.length>=2?bright:[...src.main,...src.secondary];
 const colours=shuffle(r,strong).slice(0,r()<.5?2:3),gradient=ctx.createLinearGradient(0,0,canvas.width,0);
 colours.forEach((c,i)=>gradient.addColorStop(i/colours.length,c));gradient.addColorStop(1,colours[0]);
 ctx.fillStyle=gradient;ctx.fillRect(0,0,canvas.width,canvas.height);
}
/** Units per side of one patchwork tile; blocks are 2 or 3 units, so a tile repeats without seams. */
export const patchworkUnits=24;
/** Splits n units into a random run of 2s and 3s (never leaving a single unit). */
function blockRuns(r:Rng,n:number){const out:number[]=[];let left=n;while(left>0){const s=left===4?2:left<=3?left:r()<.55?3:2;out.push(s);left-=s;}return out;}
const lightness=(c:string)=>{const v=hexRgb(c);return (Math.max(...v)+Math.min(...v))/510;};
/**
 * Patchwork (Nam, 2026-10-14): a quilt of small blocks, each a two-colour checkerboard or a run of bars across or
 * down, in the palette's colours with plenty of pale ones (from the palette, plus a few strong colours washed out).
 * Rows and columns are runs of 2- and 3-unit blocks.
 */
export function drawPatchwork(canvas:HTMLCanvasElement,seed:string,paletteName:WeavePaletteName,own?:readonly string[]){
 const src=sourceOf(paletteName,own),r=rngFrom(seed),ctx=canvas.getContext('2d')!,u=canvas.width/patchworkUnits,all=[...src.main,...src.secondary,...src.accent];
 const solid=all.filter(c=>lightness(c)<.8),strong=solid.length?solid:all,pale=[...all.filter(c=>lightness(c)>=.8),...shuffle(r,strong).slice(0,3).map(c=>mix(c,'#FFFFFF',.7))];
 const colour=()=>pick(r,strong),soft=()=>pick(r,pale);
 const cell=(x:number,y:number,w:number,h:number,c:string)=>{const x0=Math.round(x*u),y0=Math.round(y*u);ctx.fillStyle=c;ctx.fillRect(x0,y0,Math.round((x+w)*u)-x0,Math.round((y+h)*u)-y0);};
 const rows=blockRuns(r,patchworkUnits),cols=blockRuns(r,patchworkUnits);
 let y=0;
 for(const h of rows){
  let x=0;
  for(const w of cols){
   const kind=r(),a=colour(),b=r()<.65?soft():colour(),c=r()<.4?colour():a;
   if(kind<.45){for(let j=0;j<h;j++)for(let i=0;i<w;i++)cell(x+i,y+j,1,1,(i+j)%2?b:a);}
   else if(kind<.72){for(let j=0;j<h;j++)cell(x,y+j,w,1,j%2?b:j===2?c:a);}
   else if(kind<.97){for(let i=0;i<w;i++)cell(x+i,y,1,h,i%2?b:i===2?c:a);}
   else cell(x,y,w,h,a);
   x+=w;
  }
  y+=h;
 }
}

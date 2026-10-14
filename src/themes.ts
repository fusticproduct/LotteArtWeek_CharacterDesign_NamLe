import {bones,palette,rng,stageColors,type CharacterSpec} from './model';
import type {WeavePaletteName} from './weave';
/**
 * The palette switch (HFCD / XMAS / TET) colours the whole figure, not only the weave. HFCD keeps each part's own
 * colour from palette.json; XMAS and TET repaint every part at render time from colours sampled from Nam's poster
 * references (2026-10-14), so a seed stays palette-free like the weave. `stage` is the dark stage background.
 */
export const paletteLooks:Record<WeavePaletteName,{stage:string;mark?:string;body?:string[]}>={
 HFCD:{stage:stageColors.dark},
 XMAS:{stage:'#114DDC',mark:'#0D1A4A',body:['#04D55D','#03924F','#FD0848','#FEFEFE','#49E8FE','#FDD52A']},
 TET:{stage:'#C01E2E',mark:'#261D33',body:['#FEC316','#EE1566','#FD432A','#FF8F2F','#FEF6D7','#21C9BA','#1DD478','#F95C7B','#1C8861']},
};
export const stageColor=(name:WeavePaletteName,dark:boolean)=>dark?paletteLooks[name].stage:stageColors.light;
/** Hue (0–1) and lightness (0–1) of a hex colour. */
const tone=(hex:string)=>{const n=parseInt(hex.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
 return {h:d?(max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4)/6:0,l:(max+min)/2};};
/**
 * Hex colour of each palette index for one character in a palette. Every colour the character uses gets its own
 * colour from the set, chosen by role with the rules of drawScheme (torso A, neck B, hands C, joints J, head H),
 * so parts that differ in HFCD still differ, and the same character always gets the same repaint.
 */
export function partColors(spec:CharacterSpec,name:WeavePaletteName):(index:number)=>string{
 const look=paletteLooks[name],body=look.body;if(!body)return i=>palette[i].hex;
 const tones=body.map(tone),random=rng(`${spec.label}|${name}`),map=new Map<number,number>();
 const hueGap=(a:number,b:number)=>{const d=Math.abs(tones[a].h-tones[b].h)%1;return Math.min(d,1-d)*360;},lightGap=(a:number,b:number)=>Math.abs(tones[a].l-tones[b].l);
 const pick=<T,>(a:T[])=>a[Math.floor(random()*a.length)];
 // A colour is placed once; once the set runs out, colours repeat.
 const assign=(c:number,prefer:(i:number)=>boolean=()=>true)=>{
  if(map.has(c)||palette[c].family==='dark')return;
  const taken=[...map.values()],open=body.map((_,i)=>i).filter(i=>!taken.includes(i)),pool=open.length?open:body.map((_,i)=>i),good=pool.filter(prefer);
  map.set(c,pick(good.length?good:pool));
 };
 const p=spec.parts,A=p.spine_upper.color,B=p.neck.color,of=(c:number,fallback:number)=>map.get(c)??fallback;
 assign(A);const a=of(A,0);
 const pairing=pick([(i:number)=>hueGap(i,a)<=70&&lightGap(i,a)>=.08,(i:number)=>hueGap(i,a)>=120,(i:number)=>lightGap(i,a)>=.2]);
 assign(B,pairing);const b=of(B,a);
 assign(p.hand_L.color,i=>hueGap(i,a)>=60&&hueGap(i,b)>=60);
 assign(p.shoulder_L.color,i=>Math.abs(tones[i].l-(tones[a].l+tones[b].l)/2)>=.15);
 assign(p.head.color);
 for(const bone of bones){assign(p[bone.id].color);assign(p[bone.id].accent);}
 return i=>palette[i].family==='dark'?look.mark!:body[of(i,a)];
}

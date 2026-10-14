/**
 * Riso look settings (Nam, 2026-10-14): every colour printed as a fine halftone that sticks to the parts (the dots are
 * laid out in each part's own space, so they move and turn with it). Between the dots (or, inverted, in them) a riso
 * colour is laid over the part's colour with a blend mode. All of it is adjustable in the Parts panel.
 */
export const risoBlends=['Normal','Multiply','Screen','Overlay','Darken','Lighten'] as const;
export type RisoBlend=typeof risoBlends[number];
/**
 * `size`: dot spacing on the figure (m); `coverage`: how much of the colour the ink dots cover; `angle`: screen angle
 * (degrees); `grain`: how uneven the dots are; `opacity`: strength of the riso colour; `invert`: the colour goes in
 * the dots instead of between them.
 */
export interface RisoSettings {on:boolean;color:string;blend:RisoBlend;opacity:number;size:number;coverage:number;angle:number;grain:number;invert:boolean;}
export const defaultRiso:RisoSettings={on:false,color:'#f3eee2',blend:'Normal',opacity:1,size:.008,coverage:.84,angle:45,grain:.3,invert:false};
export const risoRanges={opacity:{min:0,max:1},size:{min:.003,max:.04},coverage:{min:.3,max:1},angle:{min:0,max:90},grain:{min:0,max:1}};
/** Any stored value (also the older on/off switch) as complete, in-range settings. */
export const normalizeRiso=(value:unknown):RisoSettings=>{
 if(typeof value==='boolean')return {...defaultRiso,on:value};
 const v=(value??{}) as Partial<RisoSettings>,num=(k:keyof typeof risoRanges)=>{const n=Number(v[k]),r=risoRanges[k];return Number.isFinite(n)?Math.min(r.max,Math.max(r.min,n)):defaultRiso[k];};
 return {on:v.on===true,color:typeof v.color==='string'&&/^#[0-9a-f]{6}$/i.test(v.color)?v.color:defaultRiso.color,blend:risoBlends.includes(v.blend as RisoBlend)?v.blend as RisoBlend:defaultRiso.blend,
  opacity:num('opacity'),size:num('size'),coverage:num('coverage'),angle:num('angle'),grain:num('grain'),invert:v.invert===true};
};
export const sameRiso=(a:RisoSettings,b:RisoSettings)=>JSON.stringify(a)===JSON.stringify(b);

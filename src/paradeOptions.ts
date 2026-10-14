import saved from './parade.json';
/**
 * Parade settings (Parade.tsx): what each browser keeps, and the project default that "Save as default" writes to
 * src/parade.json under `npm run dev` (scripts/vite-defaults.js checks it the same way).
 *
 * `view`: the parade's canvas, flat, or that same canvas wrapped on the cylinder in 3D (Trung Bao: what the canvas
 * shows is exactly what the cylinder shows; the earlier 3:1 wall and "unwrapped" open as the canvas). `size`: the
 * figures against the canvas's height (1 = the tallest head at the head line); `spacing` is kept for older settings
 * but unused (fifteen share the circumference); `background`: the studio's stage, black, or the off-white paper;
 * `theme`: the colour theme (HFCD, XMAS or TET; studio: whichever the studio has);
 * `ids`: each character's ID number at the top of its place (paradeLabels.ts);
 * `equal`: everyone at the tallest one's height; `rotate`: everyone changes pose every `hold` seconds or so;
 * `shapes`: how many squares (solid, checkered or woven) move behind them (0: none), `squareSpeed` times the cast's
 * speed, `squareSize` times their size, `squareVariety` how much their sizes differ (0: all one size); `push`: how hard
 * a character shooting off the top pushes the others and the squares round it away a little (0: not at all), `pushReach`
 * how far it is felt (tallest heights), `pushIn` and `pushBack` the seconds it takes to push them out and to let them
 * back, `flipPush` how hard a flip pushes against that (0: not at all); `castPool`: how many characters are in the parade (more than stand on the
 * canvas at once); `swapEvery`: seconds between swaps, one jumping off the top and the next coming in (0: none);
 * `syncEvery`: seconds of the usual parade before the whole cast does one thing together (0: never), `syncFor`: how long
 * it stays together.
 */
export const paradeViews=['canvas','cylinder'] as const;
export type ParadeView=typeof paradeViews[number];
export const paradeBackgrounds=['studio','black','white'] as const;
export type ParadeBackground=typeof paradeBackgrounds[number];
export const paradeThemes=['studio','HFCD','XMAS','TET'] as const;
export type ParadeTheme=typeof paradeThemes[number];
export interface ParadeOptions {view:ParadeView;speed:number;size:number;spacing:number;background:ParadeBackground;theme:ParadeTheme;ids:boolean;equal:boolean;rotate:boolean;hold:number;shapes:number;squareSpeed:number;squareSize:number;squareVariety:number;push:number;pushReach:number;pushIn:number;pushBack:number;flipPush:number;castPool:number;swapEvery:number;syncEvery:number;syncFor:number;}
export const paradeRanges={speed:{min:0,max:1.5,step:.05},size:{min:.7,max:1.25,step:.01},spacing:{min:.22,max:.8,step:.01},hold:{min:2,max:20,step:.5},shapes:{min:0,max:48,step:2},squareSpeed:{min:0,max:2,step:.05},squareSize:{min:.4,max:2,step:.05},squareVariety:{min:0,max:1,step:.05},push:{min:0,max:3,step:.05},pushReach:{min:.3,max:3,step:.05},pushIn:{min:.05,max:1,step:.01},pushBack:{min:.2,max:4,step:.05},flipPush:{min:0,max:1,step:.05},castPool:{min:10,max:100,step:1},swapEvery:{min:0,max:20,step:.5},syncEvery:{min:0,max:120,step:1},syncFor:{min:3,max:40,step:1}};
const fallback:ParadeOptions={view:'canvas',speed:.35,size:1,spacing:.48,background:'studio',theme:'studio',ids:true,equal:true,rotate:true,hold:7,shapes:16,squareSpeed:1,squareSize:1,squareVariety:.45,push:1,pushReach:.9,pushIn:.18,pushBack:1.2,flipPush:.5,castPool:50,swapEvery:5,syncEvery:20,syncFor:10};
export function normalizeParadeOptions(value:unknown):ParadeOptions{
 const v=(value??{}) as Partial<ParadeOptions>,num=(k:keyof typeof paradeRanges)=>{const n=Number(v[k]),r=paradeRanges[k];return Number.isFinite(n)?Math.min(r.max,Math.max(r.min,n)):fallback[k];};
 return {view:v.view==='cylinder'?'cylinder':'canvas',speed:num('speed'),size:num('size'),spacing:num('spacing'),hold:num('hold'),shapes:Math.round(num('shapes')),squareSpeed:num('squareSpeed'),squareSize:num('squareSize'),squareVariety:num('squareVariety'),push:num('push'),pushReach:num('pushReach'),pushIn:num('pushIn'),pushBack:num('pushBack'),flipPush:num('flipPush'),castPool:Math.round(num('castPool')),swapEvery:num('swapEvery'),syncEvery:num('syncEvery'),syncFor:num('syncFor'),
  background:paradeBackgrounds.includes(v.background as ParadeBackground)?v.background as ParadeBackground:fallback.background,theme:paradeThemes.includes(v.theme as ParadeTheme)?v.theme as ParadeTheme:fallback.theme,equal:v.equal!==false,rotate:v.rotate!==false,ids:v.ids!==false};
}
/** The project default (src/parade.json). */
export const projectParadeOptions=normalizeParadeOptions(saved);
/**
 * The round LED screen at the show (Trung Bao, 2026-10-14): a cylinder 4.20 m across and 4.01 m tall (only its size
 * is used). Unwrapped, its canvas is the circumference (π × 4.20 = 13.19 m) by the height: 3.29 : 1.
 */
export const ledCylinder={diameter:4.2,height:4.01};
export const ledCircumference=Math.PI*ledCylinder.diameter;
export const ledRatio=ledCircumference/ledCylinder.height;

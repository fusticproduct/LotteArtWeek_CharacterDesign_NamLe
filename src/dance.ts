/**
 * The Dance pose: motion recorded from mediapipe/test_video.mp4 and baked by scripts/bake-dance.ts, so it plays
 * in the browser without the pose server. Angles are local Z rotations (as Live pose applies them), stored as
 * int16 milliradians in base64; layers hold the depth stacking per frame as bit flags.
 */
import type {LayerDepth} from './model';
export const danceFps=15;
export const danceBones=['root','spine_lower','head','upperarm_L','forearm_L','hand_L','upperarm_R','forearm_R','hand_R','thigh_L','shin_L','foot_L','thigh_R','shin_R','foot_R'];
export interface DanceData {fps:number;bones:string[];angles:string;layers:string;}
const toBase64=(bytes:Uint8Array)=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};
const fromBase64=(text:string)=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
export function encodeDance(angles:number[][],layers:number[]):DanceData{
 const values=new Int16Array(angles.flat().map(a=>Math.round(a*1000)));
 return {fps:danceFps,bones:danceBones,angles:toBase64(new Uint8Array(values.buffer)),layers:toBase64(Uint8Array.from(layers))};
}
export function decodeDance(data:DanceData){
 const bytes=fromBase64(data.angles),values=new Int16Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/2),layers=fromBase64(data.layers),n=data.bones.length;
 const frames=Array.from({length:layers.length},(_,i)=>Array.from(values.subarray(i*n,(i+1)*n),v=>v/1000));
 const depth=Array.from(layers,(f):LayerDepth=>({frontArm:f&1?'R':'L',frontLeg:f&2?'R':'L',behind:{L:!!(f&4),R:!!(f&8)}}));
 return {fps:data.fps,bones:data.bones,frames,depth};
}

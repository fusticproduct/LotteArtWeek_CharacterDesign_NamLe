import {ease} from './paradePoses';
/**
 * The push of a power jump (Trung Bao, 2026-10-14: "like a force field", "just a bit"; Parade.tsx): when one shoots off
 * the top (not the one coming up from below), the others near it slide away along the line a little and back, and the
 * squares near it drift outward and back; a flip leaving the floor pushes too, as hard as the Flip push slider says.
 * `shove` and `drift`: the most the nearest move, in tallest heights at full strength; the squares feel it a little
 * further (`squareReach` times the Push reach). How hard, how far, and how long it takes to push them out and let them
 * back are the Push sliders (ParadeOptions push, pushReach, pushIn, pushBack).
 */
export const field={shove:.1,drift:.12,squareReach:1.2};
/** A jump that pushes: the slot (place round the canvas) it jumps from, when it pushes (s), and how hard (1: a swap). */
export interface Jump {slot:number;at:number;power:number;}
export interface FieldSettings {push:number;pushReach:number;pushIn:number;pushBack:number;}
/** How far a push has come, `tau` seconds after the jump: eased out over `out` seconds, eased back over `back`. */
export const pushed=(tau:number,out:number,back:number)=>tau<=0?0:tau<out?ease(tau/out):1-ease((tau-out)/back);
/** Whether a jump still pushes at `time`. */
export const pushing=(j:Jump,time:number,o:FieldSettings)=>time-j.at<o.pushIn+o.pushBack;
/**
 * How far character `i` of the `n` round the loop (`gap` apart; `tallest`: the figures' height) slides along the line
 * at `time`: away from each jump by how near it is (a bell curve over the distance, the loop's shorter way round) and
 * how far that push has come. The jumper itself stays put.
 */
export function shoveOf(jumps:Jump[],i:number,n:number,gap:number,tallest:number,time:number,o:FieldSettings){
 let x=0;
 for(const j of jumps){
  if(j.slot===i)continue;
  let d=((i-j.slot)%n+n)%n;if(d>n/2)d-=n;
  x+=Math.sign(d)*field.shove*o.push*tallest*j.power*Math.exp(-(((d*gap)/(o.pushReach*tallest))**2))*pushed(time-j.at,o.pushIn,o.pushBack);
 }
 return x;
}
/**
 * The squares' push at `time`: each square at (x, y) moves straight away from each jump's middle (at `x` of the jump,
 * `middle` up), on the seamless canvas `w` wide, by how near it is and how far that push has come. Undefined when
 * nothing is pushing.
 */
export function driftOf(sources:{x:number;power:number;at:number}[],w:number,middle:number,tallest:number,time:number,o:FieldSettings):((x:number,y:number)=>[number,number])|undefined{
 const live=sources.map(s=>({x:s.x,k:field.drift*o.push*tallest*s.power*pushed(time-s.at,o.pushIn,o.pushBack)})).filter(s=>s.k>1e-6);
 if(!live.length)return undefined;
 const reach=field.squareReach*o.pushReach*tallest;
 return (x,y)=>{
  let dx=0,dy=0;
  for(const s of live){const ox=((x-s.x)%w+w*1.5)%w-w/2,oy=y-middle,d=Math.hypot(ox,oy)||1e-6,f=s.k*Math.exp(-((d/reach)**2));dx+=ox/d*f;dy+=oy/d*f;}
  return [dx,dy];
 };
}

import * as THREE from 'three';
import {mergeGeometries as mergeBuffers} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Profile corner: [x, y, fillet]. x is the lathe radius, fillet is the rounding distance along each adjacent edge. */
export type ProfilePoint = [number, number, number?];

export function mergeGeometries(parts:THREE.BufferGeometry[]){
 const normalized=parts.map(g=>{if(g.index)return g;const copy=g.clone();copy.setIndex(Array.from({length:g.getAttribute('position').count},(_,i)=>i));return copy;});
 const merged=mergeBuffers(normalized);normalized.forEach((g,i)=>{if(g!==parts[i])g.dispose();});parts.forEach(g=>g.dispose());
 if(!merged)throw new Error('Incompatible part geometry');return merged;
}

/** Elliptical arc sampled as profile points (no fillets). Angles in radians, measured from +x towards +y. */
export function arc(cx:number,cy:number,rx:number,ry:number,from:number,to:number,steps=24):ProfilePoint[]{
 return Array.from({length:steps+1},(_,i)=>{const a=from+(to-from)*i/steps;return [Math.max(0,cx+rx*Math.cos(a)),cy+ry*Math.sin(a),0] as ProfilePoint;});
}

/** Replaces each flagged corner with a quadratic fillet that starts/ends `fillet` units along the neighbouring path. */
function filletProfile(profile:ProfilePoint[],steps=12){
 const pts=profile.map(p=>new THREE.Vector2(p[0],p[1])),out:THREE.Vector2[]=[];
 let i=0;
 while(i<pts.length){
  const f=profile[i][2]??0,corner=pts[i];
  if(!f||i===0||i===pts.length-1){out.push(corner.clone());i++;continue;}
  // Walk back along the emitted path.
  let remaining=f,a=corner.clone();
  // The first emitted point (the axis) is never removed, so bottom rims get the same fillet as top rims.
  while(out.length){const last=out[out.length-1],d=last.distanceTo(a);if(d>=remaining){a=a.clone().lerp(last,remaining/d);break;}remaining-=d;if(out.length===1){a=last.clone();break;}a=out.pop()!;}
  // Walk forward along the source path.
  remaining=f;let b=corner.clone(),j=i+1;
  while(j<pts.length){const d=pts[j].distanceTo(b);if(d>=remaining){b=b.clone().lerp(pts[j],remaining/d);break;}remaining-=d;b=pts[j].clone();j++;}
  out.push(a);
  for(let s=1;s<steps;s++){const t=s/steps;out.push(a.clone().multiplyScalar((1-t)*(1-t)).addScaledVector(corner,2*(1-t)*t).addScaledVector(b,t*t));}
  out.push(b);
  i=j;
 }
 return out.filter((p,k,all)=>!k||p.distanceTo(all[k-1])>1e-6);
}

/** Closed surface of revolution; profile runs from the bottom axis, outwards, to the top axis. */
export function lathe(profile:ProfilePoint[],segments=64){
 const points=filletProfile(profile);
 points.forEach(p=>{p.x=Math.max(0,p.x);});
 const geometry=new THREE.LatheGeometry(points,segments);
 // LatheGeometry spaces V by point index; use arc length so patterns keep even cells over fillets and long sides.
 const lengths=[0];for(let j=1;j<points.length;j++)lengths.push(lengths[j-1]+points[j].distanceTo(points[j-1]));
 const total=lengths[lengths.length-1]||1,uv=geometry.getAttribute('uv');
 for(let i=0;i<=segments;i++)for(let j=0;j<points.length;j++)uv.setY(i*points.length+j,lengths[j]/total);
 geometry.userData={radialSegments:segments};
 return geometry;
}

/** Flat-shaded copy for intentionally faceted parts (octagon, wedge). */
export function faceted(g:THREE.BufferGeometry){const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();return flat;}

/** Truncated cone with rounded rims. Bottom at y=0, top at y=h. */
export function frustum(bottom:number,top:number,h:number,fillet=.02,segments=64){
 const f=Math.min(fillet,h*.45,Math.max(bottom,top)*.45);
 return lathe([[0,0],[bottom,0,bottom>.002?f:0],[top,h,top>.002?f:0],[0,h]],segments);
}
/** Closed lathed cylinder/cone centred on the origin (legacy helper used by arms, head and hands). */
export function beveledCylinder(top:number,bottom:number,height:number,segments=64,bevel=.008){
 const g=frustum(bottom,Math.max(top,.001),height,bevel,segments);g.translate(0,-height/2,0);g.userData={radialSegments:segments,bevelRadius:bevel};return g;
}
/** Hemisphere bowl: round underside at y=0, flat filleted rim/top at y=h. */
export function bowl(r:number,h:number,fillet=.03,segments=64){return lathe([...arc(0,h,r,h,-Math.PI/2,0,28),[r,h,fillet],[0,h]],segments);}
/** Dome: flat filleted base at y=0, round top at y=h. */
export function dome(r:number,h:number,fillet=.03,segments=64){return lathe([[0,0],[r,0,fillet],...arc(0,0,r,h,0,Math.PI/2,28).slice(1)],segments);}
/** Soft rounded disc / puck. */
export function puck(r:number,h:number,fillet=h*.4,segments=64){return frustum(r,r,h,fillet,segments);}
/** Concave flare (trumpet/bell) from `top` radius down to `bottom` radius. */
export function flare(bottom:number,top:number,h:number,power=2.2,fillet=.02,segments=64){
 const curve:ProfilePoint[]=Array.from({length:18},(_,i)=>{const t=i/17;return [top+(bottom-top)*Math.pow(1-t,power),h*t,0] as ProfilePoint;});
 curve[0][2]=fillet;curve[17][2]=fillet;
 return lathe([[0,0],...curve,[0,h]],segments);
}
/** Double frustum: widest at y=mid. */
export function bicone(bottom:number,middle:number,mid:number,top:number,h:number,fillet=.025,segments=64){return lathe([[0,0],[bottom,0,fillet],[middle,mid,fillet],[top,h,fillet],[0,h]],segments);}
/** Capsule whose two ends can have different radii (bottom at y=0). */
export function taperedPill(bottom:number,top:number,h:number,segments=64){return lathe([...arc(0,bottom,bottom,bottom,-Math.PI/2,0,16),...arc(0,h-top,top,top,0,Math.PI/2,16).slice(0)],segments);}
export function sphere(r:number){return new THREE.SphereGeometry(r,48,32);}

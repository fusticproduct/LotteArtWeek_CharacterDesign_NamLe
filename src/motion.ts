/**
 * Motion without a camera: a slow breathing sway on the preset poses, and the Dance pose (recorded motion,
 * see src/dance.ts). Both produce local Z angles for rig.applyAngles, like Live pose.
 */
import {bones,poseRotation,type LayerDepth,type Pose} from './model';
import {decodeDance} from './dance';
import danceData from './dance.json';

const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
/** Local angles of a preset pose. */
export const presetAngles=(pose:Pose)=>Object.fromEntries(bones.map(b=>[b.id,poseRotation(b.id,pose)[2]]));
/** One breath every 3.6 s: the body sways a little, the head lags behind, the arms float out and back. */
export function breathe(pose:Pose,t:number){
 const a=presetAngles(pose),w=Math.PI*2/3.6,s=(phase:number)=>Math.sin(w*t+phase);
 a.spine_lower+=.018*s(0);a.head+=.03*s(.8);
 a.upperarm_L+=.035*s(.4);a.upperarm_R-=.035*s(.4);a.forearm_L+=.025*s(1.1);a.forearm_R-=.025*s(1.1);
 return a;
}
let dance:ReturnType<typeof decodeDance>|null=null;
/** The Dance pose at time t (seconds), looping; frames are blended so playback stays smooth at any frame rate. */
export function danceFrame(t:number):{angles:Record<string,number>;depth:LayerDepth}{
 dance??=decodeDance(danceData);
 const f=t*dance.fps,count=dance.frames.length,i=Math.floor(f)%count,k=f-Math.floor(f),a=dance.frames[i],b=dance.frames[(i+1)%count];
 return {angles:Object.fromEntries(dance.bones.map((id,j)=>[id,a[j]+wrap(b[j]-a[j])*k])),depth:dance.depth[i]};
}

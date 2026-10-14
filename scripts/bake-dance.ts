/**
 * Bakes the Dance pose: landmarks from scripts/extract_landmarks.py go through the same solver, smoothing and
 * depth stacking as Live pose, and are stored as local angles at 15 fps in src/dance.json.
 *
 *   npx vite-node scripts/bake-dance.ts /tmp/landmarks.json
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {solvePose,smoothPose,toLocal,updateLayers,initialLayerState,type Landmark} from '../src/pose';
import {danceBones,danceFps,encodeDance} from '../src/dance';

const data=JSON.parse(readFileSync(process.argv[2],'utf8')) as {fps:number;width:number;height:number;frames:(number[][]|null)[]};
const aspect=data.width/data.height,step=Math.round(data.fps/danceFps);
let screen:Record<string,number>|null=null,depth=initialLayerState(),local:Record<string,number>={};
const angles:number[][]=[],layers:number[]=[];
// MediaPipe sometimes misreads a limb for a frame (a forearm folds and unfolds within 1/15 s). Real moves in the clip
// stay under ~0.9 rad per baked frame, so larger steps are capped and the bone catches up on the next frames.
const maxStep=.9,wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
data.frames.forEach((f,i)=>{
 const solved=f&&solvePose(f.map(([x,y,z,visibility],id):Landmark=>({id,x,y,z,visibility})),aspect);
 if(solved){screen=smoothPose(screen,solved,.35);local={...local,...toLocal(screen)};depth=updateLayers(depth,solved.depth);}
 if(i%step)return;
 const previous=angles.at(-1);
 angles.push(danceBones.map((id,j)=>{const a=local[id]??0;if(!previous)return a;const step=wrap(a-previous[j]);return wrap(previous[j]+Math.max(-maxStep,Math.min(maxStep,step)));}));
 const {frontArm,frontLeg,behind}=depth.layers;layers.push((frontArm==='R'?1:0)|(frontLeg==='R'?2:0)|(behind.L?4:0)|(behind.R?8:0));
});
writeFileSync(new URL('../src/dance.json',import.meta.url),JSON.stringify(encodeDance(angles,layers))+'\n');
console.log(`${angles.length} frames at ${danceFps} fps (${(angles.length/danceFps).toFixed(0)} s)`);

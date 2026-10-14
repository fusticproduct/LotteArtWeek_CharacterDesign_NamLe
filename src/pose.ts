/**
 * Live pose from the MediaPipe server in `mediapipe/server.py` (ws://localhost:8080).
 * The server sends 33 normalised landmarks plus the JPEG frame they came from; here they are
 * smoothed and turned into one in-plane angle per bone, which the rig applies each frame.
 */
import {bones,defaultDepth,type LayerDepth} from './model';
export type PoseSource = 'webcam'|'video';
export type PoseStatus = 'off'|'connecting'|'starting'|'live'|'no-body'|'error';
export interface Landmark {id:number;x:number;y:number;z:number;visibility?:number;}
export const poseServerUrl = 'ws://localhost:8080';
const VISIBILITY = .5;
// MediaPipe Pose landmark indices. The server mirrors the webcam, so "left" landmarks sit on the
// right of the image, which is also the figure's own left (+X) when it faces the viewer.
const LM = {nose:0,earL:7,earR:8,shoulderL:11,shoulderR:12,elbowL:13,elbowR:14,wristL:15,wristR:16,indexL:19,indexR:20,hipL:23,hipR:24,kneeL:25,kneeR:26,ankleL:27,ankleR:28} as const;

type Point = {x:number;y:number};
const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
/** Angle that turns a bone resting along -Y (limbs) onto the direction a→b. */
const down=(a:Point,b:Point)=>Math.atan2(b.x-a.x,-(b.y-a.y));
/** Angle that turns a bone resting along +Y (spine, head) onto the direction a→b. */
const up=(a:Point,b:Point)=>Math.atan2(-(b.x-a.x),b.y-a.y);
const mid=(a:Point,b:Point)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});

const clampAngle=(a:number,limit:number)=>Math.max(-limit,Math.min(limit,a));
const length=(a:Point,b:Point)=>Math.hypot(b.x-a.x,b.y-a.y);
/**
 * Tilt of a left–right pair (hips, shoulders). The pair is treated as an undirected line: when the
 * body turns side-on or away from the camera the two points swap sides on screen, and reading the
 * line as a direction would then report a half-turn and flip everything attached to it.
 */
const tilt=(left:Point,right:Point)=>{let dx=left.x-right.x,dy=left.y-right.y;if(dx<0){dx=-dx;dy=-dy;}return Math.atan2(dy,dx);};
/** Bones the solver measures. Every other bone (joints, neck, upper spine) keeps local angle 0 and rides on its parent. */
const driven=new Set(['root','spine_lower','head','upperarm_L','forearm_L','hand_L','upperarm_R','forearm_R','hand_R','thigh_L','shin_L','foot_L','thigh_R','shin_R','foot_R']);
const parentOf:Record<string,string|null>=Object.fromEntries(bones.map(b=>[b.id,b.parent]));
/** Nearest measured ancestor: a bone's local angle is its screen angle minus that ancestor's. */
const driverOf=(id:string)=>{let p=parentOf[id];while(p&&!driven.has(p))p=parentOf[p];return p;};
/** The head only nods and a hand only bends this far (radians, relative to the neck/wrist). */
const localLimit:Record<string,number>={head:.6,hand_L:.54,hand_R:.54};
/** Screen angles → the local Z rotations the rig applies. */
export function toLocal(world:Record<string,number>){
 const local:Record<string,number>={};
 for(const [id,angle] of Object.entries(world)){const d=driverOf(id),a=wrap(angle-(d?world[d]??0:0));local[id]=id in localLimit?clampAngle(a,localLimit[id]):a;}
 return local;
}
/**
 * Depth cues from MediaPipe's z (smaller = nearer the camera), used to restack the figure:
 * `arm`/`leg` = left minus right (above 0: the right one is nearer), `behind` = wrist behind the shoulders.
 */
export interface DepthCues {arm?:number;leg?:number;behindL?:number;behindR?:number;}
export interface SolvedPose {/** Screen angle per measured bone (0 = resting direction). */world:Record<string,number>;/** 0–1 per bone: how much to trust this frame's angle. */confidence:Record<string,number>;depth:DepthCues;}

/**
 * Landmarks → screen angle per measured bone. Image space is converted to a y-up plane with square
 * units (`aspect` = frame width / height). Bones whose landmarks are not visible are left out,
 * so the caller keeps their previous angle.
 *
 * A limb pointing at the camera projects to a very short segment whose 2D direction is mostly
 * noise, so each bone also gets a confidence from its projected length (relative to the torso).
 */
export function solvePose(landmarks:Landmark[],aspect:number):SolvedPose|null{
 if(landmarks.length<29)return null;
 const seen=(i:number)=>(landmarks[i].visibility??1)>=VISIBILITY;
 const at=(i:number):Point=>({x:landmarks[i].x*aspect,y:-landmarks[i].y});
 const z=(...ids:number[])=>ids.every(seen)?ids.reduce((sum,i)=>sum+landmarks[i].z,0)/ids.length:undefined;
 if(!seen(LM.shoulderL)||!seen(LM.shoulderR))return null;
 const world:Record<string,number>={},confidence:Record<string,number>={};
 const shoulders=mid(at(LM.shoulderL),at(LM.shoulderR));
 const hipsSeen=seen(LM.hipL)&&seen(LM.hipR),hips=hipsSeen?mid(at(LM.hipL),at(LM.hipR)):null;
 // Body size on screen: torso length, or shoulder width when the hips are out of frame.
 const unit=Math.max(hips?length(hips,shoulders):length(at(LM.shoulderL),at(LM.shoulderR))*1.4,1e-4);
 const trust=(a:Point,b:Point,full:number)=>Math.min(1,Math.max(.03,(length(a,b)/unit-.06)/full));
 const put=(id:string,angle:number,c=1)=>{world[id]=wrap(angle);confidence[id]=c;};
 const pelvis=hips?clampAngle(tilt(at(LM.hipL),at(LM.hipR)),.45)*.6:0;
 const torso=hips?up(hips,shoulders):clampAngle(tilt(at(LM.shoulderL),at(LM.shoulderR)),.6);
 put('root',pelvis);
 put('spine_lower',torso);
 // Head follows the direction shoulders → ears (nose as fallback), never the ear line itself, and stays within a nod.
 const headPoint=seen(LM.earL)&&seen(LM.earR)?mid(at(LM.earL),at(LM.earR)):seen(LM.nose)?at(LM.nose):null;
 if(headPoint)put('head',torso+clampAngle(wrap(up(shoulders,headPoint)-torso),.6),trust(shoulders,headPoint,.25));
 for(const [side,s,e,w,i] of [['L',LM.shoulderL,LM.elbowL,LM.wristL,LM.indexL],['R',LM.shoulderR,LM.elbowR,LM.wristR,LM.indexR]] as const){
  if(!seen(e))continue;
  const upper=down(at(s),at(e));put(`upperarm_${side}`,upper,trust(at(s),at(e),.3));
  if(!seen(w))continue;
  const fore=down(at(e),at(w));put(`forearm_${side}`,fore,trust(at(e),at(w),.3));
  // The wrist → finger segment is tiny and jittery: follow it only partly, and only when it is clearly visible.
  if(seen(i))put(`hand_${side}`,fore+clampAngle(wrap(down(at(w),at(i))-fore),.9)*.6,trust(at(w),at(i),.25)*.5);
 }
 for(const [side,h,k,a] of [['L',LM.hipL,LM.kneeL,LM.ankleL],['R',LM.hipR,LM.kneeR,LM.ankleR]] as const){
  if(!seen(h)||!seen(k))continue;
  put(`thigh_${side}`,down(at(h),at(k)),trust(at(h),at(k),.35));
  if(!seen(a))continue;
  put(`shin_${side}`,down(at(k),at(a)),trust(at(k),at(a),.35));
  put(`foot_${side}`,0); // the sole stays level with the floor
 }
 const armL=z(LM.elbowL,LM.wristL),armR=z(LM.elbowR,LM.wristR),legL=z(LM.kneeL,LM.ankleL),legR=z(LM.kneeR,LM.ankleR),chest=z(LM.shoulderL,LM.shoulderR)!;
 const wristL=z(LM.wristL),wristR=z(LM.wristR);
 const depth:DepthCues={arm:armL!==undefined&&armR!==undefined?armL-armR:undefined,leg:legL!==undefined&&legR!==undefined?legL-legR:undefined,behindL:wristL!==undefined?wristL-chest:undefined,behindR:wristR!==undefined?wristR-chest:undefined};
 return {world,confidence,depth};
}
/** Local angles of a single frame, unsmoothed (used by tests and simple callers). */
export const solveAngles=(landmarks:Landmark[],aspect:number)=>{const solved=solvePose(landmarks,aspect);return solved?toLocal(solved.world):null;};
/**
 * One smoothing step in screen space: every bone eases towards its own measured direction, at a rate
 * scaled by its confidence. Smoothing screen angles (not local ones) keeps a slow, uncertain upper arm
 * from dragging its forearm off course, and keeps the feet exactly level.
 */
export function smoothPose(previous:Record<string,number>|null,solved:SolvedPose,smoothing:number){
 const next:Record<string,number>={...previous};
 for(const [id,angle] of Object.entries(solved.world)){const k=(1-smoothing)*solved.confidence[id];next[id]=previous&&id in previous?wrap(previous[id]+wrap(angle-previous[id])*k):angle;}
 return next;
}
/** Eased depth cues and the stacking they imply, with a dead band and a short hold so the order never flickers when two limbs are level. */
export interface LayerState {cues:DepthCues;layers:LayerDepth;/** Frames each pending change has held. */pending:Record<'arm'|'leg'|'L'|'R',number>;}
export const initialLayerState=():LayerState=>({cues:{},layers:defaultDepth,pending:{arm:0,leg:0,L:0,R:0}});
const HOLD=5;
export function updateLayers(state:LayerState,cues:DepthCues):LayerState{
 const eased:DepthCues={...state.cues},pending={...state.pending};
 for(const key of ['arm','leg','behindL','behindR'] as const){const v=cues[key];if(v!==undefined)eased[key]=eased[key]===undefined?v:eased[key]!+(v-eased[key]!)*.3;}
 /** Keeps `current` until `wanted` has differed from it for HOLD frames in a row. */
 const settle=<T,>(key:keyof LayerState['pending'],current:T,wanted:T)=>{if(wanted===current){pending[key]=0;return current;}return ++pending[key]>=HOLD?(pending[key]=0,wanted):current;};
 const {frontArm,frontLeg,behind}=state.layers;
 const front=(was:'L'|'R',d:number|undefined,band:number)=>d===undefined?was:was==='L'&&d>band?'R':was==='R'&&d< -band?'L':was;
 const back=(was:boolean,d:number|undefined)=>d===undefined?was:was?d>.05:d>.2;
 return {cues:eased,pending,layers:{frontArm:settle('arm',frontArm,front(frontArm,eased.arm,.12)),frontLeg:settle('leg',frontLeg,front(frontLeg,eased.leg,.1)),behind:{L:settle('L',behind.L,back(behind.L,eased.behindL)),R:settle('R',behind.R,back(behind.R,eased.behindR))}}};
}

export interface PoseSnapshot {status:PoseStatus;source:PoseSource|null;error:string;frame:string|null;}
/**
 * Connection + per-frame state. React reads `snapshot` through `subscribe`; the render loop reads
 * `angles` directly so pose updates never re-render the UI.
 */
export function createPoseClient(){
 let socket:WebSocket|null=null,retry:ReturnType<typeof setTimeout>|null=null,wanted=false,aspect=16/9,lastFrameAt=0,asked=false,wantedSource:PoseSource|null=null;
 let screen:Record<string,number>|null=null,depth=initialLayerState();
 let snapshot:PoseSnapshot={status:'off',source:null,error:'',frame:null};
 const listeners=new Set<()=>void>();
 const set=(patch:Partial<PoseSnapshot>)=>{snapshot={...snapshot,...patch};listeners.forEach(f=>f());},isOpen=()=>socket?.readyState===WebSocket.OPEN;
 // `npm run dev` can launch the pose server itself (mediapipe/vite-plugin.js); a static build answers 404 here.
 const server=async(action:'start'|'stop'|'status')=>{try{const r=await fetch(`/__pose/${action}?source=${wantedSource??'webcam'}`,{method:'POST',headers:{'X-Geofolk':'1'}});return r.ok?await r.json() as {running:boolean;error:string}:null;}catch{return null;}};
 const client={
  /** Smoothed local angles, or null until a body has been seen. */
  angles:null as Record<string,number>|null,
  /** Which arm and leg are in front, and which arms are behind the body. */
  layers:defaultDepth as LayerDepth,
  /** 0 = raw, towards 1 = smoother but laggier (same meaning as the source app's Motion Smoothing). */
  smoothing:.35,
  get snapshot(){return snapshot;},
  subscribe(f:()=>void){listeners.add(f);return()=>{listeners.delete(f);};},
  connect(){
   wanted=true;if(retry)clearTimeout(retry);retry=null;if(socket)return;
   if(snapshot.status==='off')set({status:'connecting',error:''});
   const ws=socket=new WebSocket(poseServerUrl);
   ws.onopen=()=>{set({status:'connecting',error:''});if(wantedSource)ws.send(JSON.stringify({type:'switch_source',source:wantedSource}));};
   ws.onmessage=event=>{
    let message:{type?:string;landmarks?:Landmark[];frame?:string|null;source?:PoseSource;error?:string|null};
    try{message=JSON.parse(event.data);}catch{return;}
    // Remember the running source, so a server started later by the app opens the same one (and never the camera by surprise).
    if(message.type==='source_status'){wantedSource=message.source??wantedSource;set({source:message.source??null,error:message.error??''});return;}
    if(message.type!=='pose')return;
    const target=solvePose(message.landmarks??[],aspect);
    if(target){
     screen=smoothPose(screen,target,client.smoothing);client.angles=toLocal(screen);
     depth=updateLayers(depth,target.depth);client.layers=depth.layers;
    }
    // The preview is a small thumbnail, so refreshing it ~10×/s is enough and keeps React idle.
    const now=performance.now(),status:PoseStatus=target?'live':'no-body';
    if(message.frame&&now-lastFrameAt>100){lastFrameAt=now;set({status,frame:message.frame});}
    else if(status!==snapshot.status)set({status});
   };
   // No server yet: ask the dev server to start one, once per Start/source click, then keep retrying while it loads.
   // A server that goes away later is not relaunched on its own: that would open the camera without a click.
   ws.onclose=async()=>{socket=null;if(!wanted)return;retry=setTimeout(()=>client.connect(),2000);
    const state=await server(asked?'status':'start');asked=true;if(!wanted||isOpen())return;
    set(state?.running?{status:'starting',error:'The first start can take a minute while Python and MediaPipe load.'}:{status:'error',error:state?.error||`Pose server not reachable. Start it with: npm run ${wantedSource==='video'?'pose:video':'pose'}`});
   };
   ws.onerror=()=>ws.close();
  },
  disconnect(){
   if(wanted)void server('stop');
   wanted=false;asked=false;if(retry)clearTimeout(retry);retry=null;socket?.close();socket=null;client.angles=screen=null;client.layers=defaultDepth;depth=initialLayerState();
   set({status:'off',frame:null,error:''});
  },
  /** Picks webcam or demo video; when not connected yet this also starts live pose with that source. */
  switchSource(source:PoseSource){wantedSource=source;if(socket&&isOpen()){socket.send(JSON.stringify({type:'switch_source',source}));return;}asked=false;client.connect();},
  /** Frame width / height, measured from the preview image once it has loaded. */
  setAspect(value:number){if(Number.isFinite(value)&&value>0)aspect=value;},
 };
 return client;
}
export type PoseClient = ReturnType<typeof createPoseClient>;

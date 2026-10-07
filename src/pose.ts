/**
 * Live pose from the MediaPipe server in `mediapipe/server.py` (ws://localhost:8080).
 * The server sends 33 normalised landmarks plus the JPEG frame they came from; here they are
 * smoothed and turned into one in-plane angle per bone, which the rig applies each frame.
 */
export type PoseSource = 'webcam'|'video';
export type PoseStatus = 'off'|'connecting'|'live'|'no-body'|'error';
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
export interface SolvedPose {angles:Record<string,number>;/** 0–1 per bone: how much to trust this frame's angle. */confidence:Record<string,number>;}

/**
 * Landmarks → local Z rotation per bone. Image space is converted to a y-up plane with square
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
 if(!seen(LM.shoulderL)||!seen(LM.shoulderR))return null;
 const angles:Record<string,number>={},confidence:Record<string,number>={};
 const shoulders=mid(at(LM.shoulderL),at(LM.shoulderR));
 const hipsSeen=seen(LM.hipL)&&seen(LM.hipR),hips=hipsSeen?mid(at(LM.hipL),at(LM.hipR)):null;
 // Body size on screen: torso length, or shoulder width when the hips are out of frame.
 const unit=Math.max(hips?length(hips,shoulders):length(at(LM.shoulderL),at(LM.shoulderR))*1.4,1e-4);
 const trust=(a:Point,b:Point,full:number)=>Math.min(1,Math.max(.03,(length(a,b)/unit-.06)/full));
 const put=(id:string,angle:number,c=1)=>{angles[id]=wrap(angle);confidence[id]=c;};
 const pelvis=hips?clampAngle(tilt(at(LM.hipL),at(LM.hipR)),.45)*.6:0;
 const torso=hips?up(hips,shoulders):clampAngle(tilt(at(LM.shoulderL),at(LM.shoulderR)),.6);
 put('root',pelvis);
 put('spine_lower',torso-pelvis);
 // Head follows the direction shoulders → ears (nose as fallback), never the ear line itself, and stays within a nod.
 const headPoint=seen(LM.earL)&&seen(LM.earR)?mid(at(LM.earL),at(LM.earR)):seen(LM.nose)?at(LM.nose):null;
 if(headPoint)put('head',clampAngle(wrap(up(shoulders,headPoint)-torso),.6),trust(shoulders,headPoint,.25));
 for(const [side,s,e,w,i] of [['L',LM.shoulderL,LM.elbowL,LM.wristL,LM.indexL],['R',LM.shoulderR,LM.elbowR,LM.wristR,LM.indexR]] as const){
  if(!seen(e))continue;
  const upper=down(at(s),at(e));put(`upperarm_${side}`,upper-torso,trust(at(s),at(e),.3));
  if(!seen(w))continue;
  const fore=down(at(e),at(w));put(`forearm_${side}`,fore-upper,trust(at(e),at(w),.3));
  // The wrist → finger segment is tiny and jittery: follow it only partly, and only when it is clearly visible.
  if(seen(i))put(`hand_${side}`,clampAngle(wrap(down(at(w),at(i))-fore),.9)*.6,trust(at(w),at(i),.25)*.5);
 }
 for(const [side,h,k,a] of [['L',LM.hipL,LM.kneeL,LM.ankleL],['R',LM.hipR,LM.kneeR,LM.ankleR]] as const){
  if(!seen(h)||!seen(k))continue;
  const thigh=down(at(h),at(k));put(`thigh_${side}`,thigh-pelvis,trust(at(h),at(k),.35));
  if(!seen(a))continue;
  const shin=down(at(k),at(a));put(`shin_${side}`,shin-thigh,trust(at(k),at(a),.35));
  put(`foot_${side}`,-shin,trust(at(k),at(a),.35)); // keep the sole level with the floor
 }
 return {angles,confidence};
}
/** Angles only (used by tests and simple callers). */
export const solveAngles=(landmarks:Landmark[],aspect:number)=>solvePose(landmarks,aspect)?.angles??null;

export interface PoseSnapshot {status:PoseStatus;source:PoseSource|null;error:string;frame:string|null;}
/**
 * Connection + per-frame state. React reads `snapshot` through `subscribe`; the render loop reads
 * `angles` directly so pose updates never re-render the UI.
 */
export function createPoseClient(){
 let socket:WebSocket|null=null,retry:ReturnType<typeof setTimeout>|null=null,wanted=false,aspect=16/9,lastFrameAt=0;
 let snapshot:PoseSnapshot={status:'off',source:null,error:'',frame:null};
 const listeners=new Set<()=>void>();
 const set=(patch:Partial<PoseSnapshot>)=>{snapshot={...snapshot,...patch};listeners.forEach(f=>f());};
 const client={
  /** Smoothed local angles, or null until a body has been seen. */
  angles:null as Record<string,number>|null,
  /** 0 = raw, towards 1 = smoother but laggier (same meaning as the source app's Motion Smoothing). */
  smoothing:.35,
  get snapshot(){return snapshot;},
  subscribe(f:()=>void){listeners.add(f);return()=>{listeners.delete(f);};},
  connect(){
   wanted=true;if(socket)return;
   set({status:'connecting',error:''});
   const ws=socket=new WebSocket(poseServerUrl);
   ws.onmessage=event=>{
    let message:{type?:string;landmarks?:Landmark[];frame?:string|null;source?:PoseSource;error?:string|null};
    try{message=JSON.parse(event.data);}catch{return;}
    if(message.type==='source_status'){set({source:message.source??null,error:message.error??''});return;}
    if(message.type!=='pose')return;
    const target=solvePose(message.landmarks??[],aspect);
    if(target){
     // Per-bone smoothing: uncertain bones (foreshortened limbs) move towards the new angle more slowly.
     const previous=client.angles,next:Record<string,number>={...previous};
     for(const [id,angle] of Object.entries(target.angles)){const k=(1-client.smoothing)*target.confidence[id];next[id]=previous&&id in previous?previous[id]+wrap(angle-previous[id])*k:angle;}
     client.angles=next;
    }
    // The preview is a small thumbnail, so refreshing it ~10×/s is enough and keeps React idle.
    const now=performance.now(),status:PoseStatus=target?'live':'no-body';
    if(message.frame&&now-lastFrameAt>100){lastFrameAt=now;set({status,frame:message.frame});}
    else if(status!==snapshot.status)set({status});
   };
   ws.onclose=()=>{socket=null;if(!wanted)return;set({status:'error',error:'Pose server not reachable. Start it with: npm run pose'});retry=setTimeout(()=>client.connect(),2000);};
   ws.onerror=()=>ws.close();
  },
  disconnect(){
   wanted=false;if(retry)clearTimeout(retry);retry=null;socket?.close();socket=null;client.angles=null;
   set({status:'off',frame:null,error:''});
  },
  switchSource(source:PoseSource){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'switch_source',source}));},
  /** Frame width / height, measured from the preview image once it has loaded. */
  setAspect(value:number){if(Number.isFinite(value)&&value>0)aspect=value;},
 };
 return client;
}
export type PoseClient = ReturnType<typeof createPoseClient>;

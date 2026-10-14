import {useState,useSyncExternalStore} from 'react';
import {Play,Square} from 'lucide-react';
import type {PoseClient,PoseSource} from './pose';
const statusText={off:'Off',connecting:'Connecting…',starting:'Starting pose server…',live:'Tracking',['no-body']:'No body in frame',error:'Not connected'} as const;
/** Live pose tab: connects to the MediaPipe server and shows the frame it is tracking. */
export default function PosePanel({client}:{client:PoseClient}){
 const state=useSyncExternalStore(client.subscribe,()=>client.snapshot);
 const [smoothing,setSmoothing]=useState(client.smoothing);
 const on=state.status!=='off';
 return <div className="look-panel" role="tabpanel" aria-label="Live pose">
  <div className="look-heading"><span>Drive the figure with your body through the MediaPipe pose server.</span></div>
  <section>
   <button className={`pose-toggle ${on?'active':''}`} onClick={()=>on?client.disconnect():client.connect()}>{on?<><Square size={14}/>Stop live pose</>:<><Play size={14}/>Start live pose</>}</button>
   <div className={`pose-status ${state.status}`}><span/>{statusText[state.status]}</div>
   {state.error&&<p className="pose-error">{state.error}</p>}
  </section>
  <section>
   <h4>Source</h4>
   <div className="look-tone"><span>Input</span>{(['webcam','video'] as PoseSource[]).map(s=><button key={s} className={state.source===s?'active':''} aria-pressed={state.source===s} onClick={()=>client.switchSource(s)}>{s==='webcam'?'Webcam':'Demo video'}</button>)}</div>
   <label className="look-slider"><span>Motion smoothing<em>{smoothing.toFixed(2)}</em></span><input type="range" min={0} max={.9} step={.01} value={smoothing} onChange={e=>{const v=Number(e.target.value);client.smoothing=v;setSmoothing(v);}}/></label>
  </section>
  <section>
   <h4>Camera</h4>
   {state.frame?<img className="pose-preview" src={state.frame} alt="Frame being tracked" onLoad={e=>client.setAspect(e.currentTarget.naturalWidth/e.currentTarget.naturalHeight)}/>:<div className="pose-preview empty">{on?'Waiting for frames…':'Preview appears here'}</div>}
  </section>
  <section>
   <h4>Pose server</h4>
   <p className="pose-help">Starts by itself when the app runs with <code>npm run dev</code>. Otherwise run <code>npm run pose</code> in the geofolk folder (webcam), or <code>npm run pose:video</code> for the demo clip. It listens on <code>ws://localhost:8080</code>.</p>
  </section>
 </div>;
}

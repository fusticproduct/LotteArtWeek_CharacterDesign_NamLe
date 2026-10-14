import {useEffect,useMemo,useRef,Suspense,Component,type ReactNode} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {SkeletonHelper,Color,NoToneMapping,TOUCH,type OrthographicCamera as OrthographicCameraImpl,type WebGLRenderer,type Scene,type Camera} from 'three';
import type {OrbitControls as OrbitControlsImpl} from 'three-stdlib';
import {panMouseButtons} from './controls';
import {createCharacter,type CharacterRig,type LayerGroup} from './rig';
import {theme,restHeight,type CharacterSpec,type Pose,type Proportions} from './model';
import type {PoseClient} from './pose';
import {breathe,danceFrame} from './motion';
import type {WeavePaletteName} from './weave';
import {stageColor} from './themes';
import type {RisoSettings} from './riso';
import type {PixelSettings} from './pixelate';
import type {SpraySettings} from './spray';
export interface SceneHandle {rig:CharacterRig;renderer:WebGLRenderer;scene:Scene;camera:Camera;}
interface Props {spec:CharacterSpec;pose:Pose;showRig:boolean;weavePalette:WeavePaletteName;layerOrder:LayerGroup[];proportions:Proportions;dark:boolean;paper:boolean;riso:RisoSettings;pixel:PixelSettings;spray:SpraySettings;live:PoseClient|null;resetView:number;onReady:(handle:SceneHandle)=>void;}
/** World height the default view shows: the figure with arms raised plus a margin. */
const viewHeight=restHeight*1.5,centerY=restHeight*.56;
function World(p:Props){
 const rig=useMemo(()=>createCharacter(p.spec,p.weavePalette,undefined,p.proportions),[p.spec,p.weavePalette,p.proportions]);
 const {gl,scene,camera,size}=useThree();
 const controls=useRef<OrbitControlsImpl>(null),posed=useRef(false);
 useEffect(()=>{rig.applyPose(p.pose);posed.current=true;p.onReady({rig,renderer:gl,scene,camera});},[rig,p.pose,gl,scene,camera,p.onReady]);
 useEffect(()=>rig.setLayerOrder(p.layerOrder),[rig,p.layerOrder]);
 useEffect(()=>rig.setPaper(p.paper),[rig,p.paper]);
 useEffect(()=>rig.setRiso(p.riso),[rig,p.riso]);
 useEffect(()=>rig.setPixel(p.pixel),[rig,p.pixel]);
 useEffect(()=>rig.setSpray(p.spray),[rig,p.spray]);
 // Donut and Ring holes show the stage colour (rig.ts plugFor).
 useEffect(()=>rig.setStage(stageColor(p.weavePalette,p.dark)),[rig,p.weavePalette,p.dark]);
 useEffect(()=>()=>rig.dispose(),[rig]);
 // Fit the figure to the viewport; re-fit when the canvas is resized, the camera is swapped in or the view is reset.
 const fitted=useRef('');
 // Live pose drives the bones every frame; otherwise the Dance pose plays, or the preset pose breathes gently.
 const calm=useMemo(()=>typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches,[]);
 useFrame(({clock},delta)=>{
  const fitKey=`${camera.uuid}|${size.width}|${size.height}|${p.resetView}`;
  if(fitted.current!==fitKey&&(camera as OrthographicCameraImpl).isOrthographicCamera){
   fitted.current=fitKey;const ortho=camera as OrthographicCameraImpl;
   ortho.position.set(0,centerY,10);ortho.zoom=Math.min(size.height/viewHeight,size.width/(restHeight*1.05));ortho.updateProjectionMatrix();
   controls.current?.target.set(0,centerY,0);controls.current?.update();
  }
  const live=p.live?.angles,t=clock.getElapsedTime();
  if(live){rig.applyAngles(live);rig.setDepth(p.live!.layers);posed.current=false;}
  else if(p.pose==='dance'){const frame=danceFrame(t);rig.applyAngles(frame.angles);rig.setDepth(frame.depth);posed.current=false;}
  else if(!calm){rig.applyAngles(breathe(p.pose,t));rig.setDepth(null);posed.current=false;}
  else if(!posed.current){rig.applyPose(p.pose);rig.setDepth(null);posed.current=true;}
  rig.tick(delta);
 });
 const helper=useMemo(()=>{const h=new SkeletonHelper(rig.group);(Array.isArray(h.material)?h.material:[h.material]).forEach(m=>m.depthTest=false);const colors=h.geometry.getAttribute('color');const tint=new Color(p.dark?theme.paper:theme.ink);for(let i=0;i<colors.count;i++)colors.setXYZ(i,tint.r,tint.g,tint.b);h.renderOrder=99;return h;},[rig,p.dark]);
 useEffect(()=>()=>{helper.geometry.dispose();(Array.isArray(helper.material)?helper.material:[helper.material]).forEach(m=>m.dispose());},[helper]);
 return <>
  <color attach="background" args={[stageColor(p.weavePalette,p.dark)]}/>
  <primitive object={rig.group}/>
  {p.showRig&&<primitive object={helper}/>}
  <OrbitControls ref={controls} makeDefault target={[0,centerY,0]} enableRotate={false} enablePan screenSpacePanning mouseButtons={panMouseButtons} touches={{ONE:TOUCH.PAN,TWO:TOUCH.DOLLY_PAN}} minZoom={60} maxZoom={1600}/>
 </>;
}
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="scene-error"><strong>The character view could not start.</strong><p>Enable WebGL or try a browser with hardware acceleration.</p><button onClick={()=>location.reload()}>Reload studio</button></div>:this.props.children;}}
export default function CharacterScene(props:Props){return <SceneBoundary><Canvas flat orthographic camera={{position:[0,centerY,10],zoom:150,near:.1,far:50}} dpr={[1,2]} gl={{antialias:true,preserveDrawingBuffer:true,alpha:false,toneMapping:NoToneMapping}}><Suspense fallback={null}><World {...props}/></Suspense></Canvas></SceneBoundary>;}

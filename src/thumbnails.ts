import * as THREE from 'three';
import {createCharacter,type LayerGroup} from './rig';
import {type CharacterSpec,type Pose,type Proportions} from './model';
import {danceFrame} from './motion';
import type {WeavePaletteName} from './weave';
import {stageColor} from './themes';
export interface ThumbnailLook {weavePalette:WeavePaletteName;layerOrder:LayerGroup[];proportions:Proportions;dark:boolean;paper:boolean;pose:Pose;}
let renderer:THREE.WebGLRenderer|null=null;
/** Renders one character off screen, in the stage's front view and look, and returns a PNG data URL. `danceTime` picks the Dance frame. */
export function renderThumbnail(spec:CharacterSpec,look:ThumbnailLook,width:number,height:number,danceTime=0){
 renderer??=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.toneMapping=THREE.NoToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setSize(width,height,false);
 const scene=new THREE.Scene();scene.background=new THREE.Color(stageColor(look.weavePalette,look.dark));
 const rig=createCharacter(spec,look.weavePalette,look.layerOrder,look.proportions);rig.setPaper(look.paper);
 if(look.pose==='dance'){const frame=danceFrame(danceTime);rig.applyAngles(frame.angles);rig.setDepth(frame.depth);}else rig.applyPose(look.pose);
 scene.add(rig.group);
 // 3.3 m tall window from just below the floor, wide enough for raised or stretched arms.
 const span=3.3,aspect=width/height,camera=new THREE.OrthographicCamera(-span*aspect/2,span*aspect/2,3.12,3.12-span,.1,50);camera.position.set(0,0,10);
 renderer.render(scene,camera);const url=renderer.domElement.toDataURL('image/png');rig.dispose();
 return url;
}

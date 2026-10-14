import * as THREE from 'three';
import {createCharacter,type LayerGroup} from './rig';
import {type CharacterSpec,type Pose,type Proportions} from './model';
import {danceFrame} from './motion';
import type {WeavePaletteName} from './weave';
import {stageColor} from './themes';
import type {RisoSettings} from './riso';
import type {PixelSettings} from './pixelate';
import type {SpraySettings} from './spray';
import type {CurtainSettings} from './curtains';
import {defaultDigits,type DigitSettings} from './fingers';
import {defaultFace,type FaceSettings} from './faces';
export interface ThumbnailLook {weavePalette:WeavePaletteName;layerOrder:LayerGroup[];proportions:Proportions;dark:boolean;paper:boolean;riso:RisoSettings;pixel:PixelSettings;spray:SpraySettings;digits?:DigitSettings;face?:FaceSettings;curtains:CurtainSettings;rules?:unknown;pose:Pose;}
let renderer:THREE.WebGLRenderer|null=null;
/** A held pose instead of the look's pose (Parade poses, PoseSheet.tsx): local angles, a lift off the floor (m), and the window's top and height (m). */
export interface HeldPose {angles:Record<string,number>;lift:number;top:number;span:number;
 /** Facing right as in the Parade: near arm and leg in front, far arm behind, the face mark toward the right. */
 facingRight?:boolean;}
/** Renders one character off screen, in the stage's front view and look, and returns a PNG data URL. `danceTime` picks the Dance frame. */
export function renderThumbnail(spec:CharacterSpec,look:ThumbnailLook,width:number,height:number,danceTime=0,held?:HeldPose){
 renderer??=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.toneMapping=THREE.NoToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setSize(width,height,false);
 const scene=new THREE.Scene();scene.background=new THREE.Color(stageColor(look.weavePalette,look.dark));
 const rig=createCharacter(spec,look.weavePalette,look.layerOrder,look.proportions);rig.setPaper(look.paper);rig.setRiso(look.riso);rig.setPixel(look.pixel);rig.setSpray(look.spray);rig.setDigits(look.digits??defaultDigits);rig.setFace(look.face??defaultFace);rig.setCurtains(look.curtains);rig.setStage(stageColor(look.weavePalette,look.dark));
 if(held){if(held.facingRight){rig.setDepth({frontArm:'L',frontLeg:'L',behind:{L:false,R:true}});const mark=rig.map.get('face_mark');if(mark)mark.position.x+=mark.position.y*.35;}rig.applyAngles(held.angles);rig.group.position.y+=held.lift;}else if(look.pose==='dance'){const frame=danceFrame(danceTime);rig.applyAngles(frame.angles);rig.setDepth(frame.depth);}else rig.applyPose(look.pose);
 rig.settleFingers();
 scene.add(rig.group);
 // 3.3 m tall window from just below the floor, wide enough for raised or stretched arms.
 const span=held?.span??3.3,top=held?.top??3.12,aspect=width/height,camera=new THREE.OrthographicCamera(-span*aspect/2,span*aspect/2,top,top-span,.1,50);camera.position.set(0,0,10);
 renderer.render(scene,camera);const url=renderer.domElement.toDataURL('image/png');rig.dispose();
 return url;
}

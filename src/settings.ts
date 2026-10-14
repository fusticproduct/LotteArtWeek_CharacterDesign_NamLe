import saved from './settings.json';
import {normalizeLayerOrder,type LayerGroup} from './rig';
import {weavePaletteNames,type WeavePaletteName} from './weave';
import {normalizeRiso,sameRiso,type RisoSettings} from './riso';
import {normalizePixel,type PixelSettings} from './pixelate';
import {normalizeSpray,type SpraySettings} from './spray';
import {normalizeCurtains,type CurtainSettings} from './curtains';
import {normalizeDigits,type DigitSettings} from './fingers';
import {normalizeFace,type FaceSettings} from './faces';
import {normalizeRules,sameRules,type PatternRules} from './rules';
import {normalizeProportions,studioProportions,type Proportions} from './model';
/**
 * Look settings that "Save all as default" keeps next to the proportions (src/settings.json, written by the dev server):
 * the palette, the layer order, paper texture, riso, the black stage and the pattern scale new characters start with. Each browser keeps its current values; these are
 * what a new browser starts with and what Reset returns to.
 */
export interface LookSettings {palette:WeavePaletteName;layerOrder:LayerGroup[];paper:boolean;riso:RisoSettings;pixel:PixelSettings;spray:SpraySettings;digits:DigitSettings;face:FaceSettings;curtains:CurtainSettings;rules:PatternRules;darkStage:boolean;patternScale:number;}
export const normalizeSettings=(value:unknown):LookSettings=>{
 const v=(value??{}) as Partial<LookSettings>;
 return {palette:weavePaletteNames.includes(v.palette as WeavePaletteName)?v.palette as WeavePaletteName:'HFCD',layerOrder:normalizeLayerOrder(v.layerOrder),paper:v.paper!==false,riso:normalizeRiso(v.riso),pixel:normalizePixel(v.pixel),spray:normalizeSpray(v.spray),digits:normalizeDigits(v.digits),face:normalizeFace(v.face),curtains:normalizeCurtains(v.curtains),rules:normalizeRules(v.rules),darkStage:v.darkStage!==false,patternScale:Number.isInteger(v.patternScale)&&v.patternScale!>=2&&v.patternScale!<=12?v.patternScale!:3};
};
export const studioSettings=normalizeSettings(saved);
export const sameSettings=(a:LookSettings,b:LookSettings)=>a.palette===b.palette&&a.paper===b.paper&&sameRiso(a.riso,b.riso)&&JSON.stringify(a.pixel)===JSON.stringify(b.pixel)&&JSON.stringify(a.spray)===JSON.stringify(b.spray)&&JSON.stringify(a.digits)===JSON.stringify(b.digits)&&JSON.stringify(a.face)===JSON.stringify(b.face)&&JSON.stringify(a.curtains)===JSON.stringify(b.curtains)&&sameRules(a.rules,b.rules)&&a.darkStage===b.darkStage&&a.layerOrder.join()===b.layerOrder.join()&&a.patternScale===b.patternScale;
/**
 * The look this browser shows in the studio now (the same keys the studio keeps per browser), with its proportions:
 * for views that follow the studio, like the Parade (Parade.tsx).
 */
export function browserLook():{look:LookSettings;proportions:Proportions}{
 const get=(key:string)=>{try{return localStorage.getItem(key);}catch{return null;}},json=<T,>(key:string,read:(v:unknown)=>T,fallback:T):T=>{const v=get(key);if(!v)return fallback;try{return read(JSON.parse(v));}catch{return fallback;}};
 const saved=json('geofolk.settingsDefault',normalizeSettings,studioSettings),palette=get('geofolk.weavePalette') as WeavePaletteName|null,riso=get('geofolk.riso');
 const look:LookSettings={...saved,
  rules:json('geofolk.rules',normalizeRules,saved.rules),layerOrder:json('geofolk.layerOrder',normalizeLayerOrder,saved.layerOrder),
  palette:palette&&weavePaletteNames.includes(palette)?palette:saved.palette,darkStage:get('geofolk.stage')?get('geofolk.stage')!=='light':saved.darkStage,
  paper:get('geofolk.paper')?get('geofolk.paper')!=='off':saved.paper,riso:riso==='on'||riso==='off'?normalizeRiso(riso==='on'):json('geofolk.riso',normalizeRiso,saved.riso),
  pixel:json('geofolk.pixel',normalizePixel,saved.pixel),spray:json('geofolk.spray',normalizeSpray,saved.spray),digits:json('geofolk.digits',normalizeDigits,saved.digits),face:json('geofolk.face',normalizeFace,saved.face),curtains:json('geofolk.curtains',normalizeCurtains,saved.curtains)};
 return {look,proportions:json('geofolk.proportions',normalizeProportions,json('geofolk.proportionsDefault',normalizeProportions,studioProportions))};
}

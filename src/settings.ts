import saved from './settings.json';
import {normalizeLayerOrder,type LayerGroup} from './rig';
import {weavePaletteNames,type WeavePaletteName} from './weave';
import {normalizeRiso,sameRiso,type RisoSettings} from './riso';
import {normalizePixel,type PixelSettings} from './pixelate';
/**
 * Look settings that "Save all as default" keeps next to the proportions (src/settings.json, written by the dev server):
 * the palette, the layer order, paper texture, riso, the black stage and the pattern scale new characters start with. Each browser keeps its current values; these are
 * what a new browser starts with and what Reset returns to.
 */
export interface LookSettings {palette:WeavePaletteName;layerOrder:LayerGroup[];paper:boolean;riso:RisoSettings;pixel:PixelSettings;darkStage:boolean;patternScale:number;}
export const normalizeSettings=(value:unknown):LookSettings=>{
 const v=(value??{}) as Partial<LookSettings>;
 return {palette:weavePaletteNames.includes(v.palette as WeavePaletteName)?v.palette as WeavePaletteName:'HFCD',layerOrder:normalizeLayerOrder(v.layerOrder),paper:v.paper!==false,riso:normalizeRiso(v.riso),pixel:normalizePixel(v.pixel),darkStage:v.darkStage!==false,patternScale:Number.isInteger(v.patternScale)&&v.patternScale!>=2&&v.patternScale!<=12?v.patternScale!:3};
};
export const studioSettings=normalizeSettings(saved);
export const sameSettings=(a:LookSettings,b:LookSettings)=>a.palette===b.palette&&a.paper===b.paper&&sameRiso(a.riso,b.riso)&&JSON.stringify(a.pixel)===JSON.stringify(b.pixel)&&a.darkStage===b.darkStage&&a.layerOrder.join()===b.layerOrder.join()&&a.patternScale===b.patternScale;

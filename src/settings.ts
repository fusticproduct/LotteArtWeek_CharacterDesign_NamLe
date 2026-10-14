import saved from './settings.json';
import {normalizeLayerOrder,type LayerGroup} from './rig';
import {weavePaletteNames,type WeavePaletteName} from './weave';
/**
 * Look settings that "Save all as default" keeps next to the proportions (src/settings.json, written by the dev server):
 * the palette, the layer order, paper texture and the black stage. Each browser keeps its current values; these are
 * what a new browser starts with and what Reset returns to.
 */
export interface LookSettings {palette:WeavePaletteName;layerOrder:LayerGroup[];paper:boolean;darkStage:boolean;}
export const normalizeSettings=(value:unknown):LookSettings=>{
 const v=(value??{}) as Partial<LookSettings>;
 return {palette:weavePaletteNames.includes(v.palette as WeavePaletteName)?v.palette as WeavePaletteName:'HFCD',layerOrder:normalizeLayerOrder(v.layerOrder),paper:v.paper!==false,darkStage:v.darkStage!==false};
};
export const studioSettings=normalizeSettings(saved);
export const sameSettings=(a:LookSettings,b:LookSettings)=>a.palette===b.palette&&a.paper===b.paper&&a.darkStage===b.darkStage&&a.layerOrder.join()===b.layerOrder.join();

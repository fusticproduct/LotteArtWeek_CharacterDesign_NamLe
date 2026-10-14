/**
 * Pattern rules (Nam, 2026-10-14): how many parts take each surface treatment and which placement rules apply, edited
 * in the Rules panel at the bottom of the page and saved with the other defaults. Generation (model.ts generate,
 * normalizeSpec) and drawing (rig.ts) read the current rules, so a change re-settles the character on screen.
 * The defaults are the rules Nam set over the earlier rounds.
 */
export interface PatternRules {
 /** Woven body pieces: 0, 1 (of two stacked pieces exactly one, as they touch) or 2; a Single body has one piece. */
 weave:number;
 /** Chance (0–1) that an arm or leg segment is split into two colour layers. */
 twoTone:number;
 /** Checker spots on arm and leg segments, and whether they are never a mirrored pair. */
 checker:number;checkerApart:boolean;
 /** Which checker looks may be drawn: Patchwork, Stripes across, Stripes down, Checkerboard. */
 checkerStyles:boolean[];
 /** Sliding-gradient (Flow) parts, and whether they are never a mirrored pair. */
 flow:number;flowApart:boolean;
 /** Two parts that touch are never both patterned (a joint must sit between them). */
 touching:boolean;
 /** Parts drawn on the pixel grid, and spray-blurred parts (when Spray blur is on); never joints. */
 pixel:number;spray:number;
 /** Colours per character (model.ts withinBudget): 4–8; 8 is the full scheme. Patterns and curtains keep to them too. */
 colours:number;
 /** Body type shares (bodyTypes.ts), 0–100 each; Geofolk today has the most by default. */
 bodyTypes:Record<string,number>;
 /** Curtain look shares (curtains.ts curtainLooks), 0–100 each; None has the most by default. */
 curtainLooks:Record<string,number>;
}
export const bodyTypeIds=['today','orb','baby','lolly','brick','wedge','brute','pear','hour','pole','strider'] as const;
export const defaultBodyWeights:Record<string,number>=Object.fromEntries(bodyTypeIds.map(id=>[id,id==='today'?40:6]));
/** Curtain looks (curtains.ts curtainLooks, same order) and their default shares. */
export const curtainLookIds=['none','hair','body','shirt','earring','pants','longShirt'] as const;
export const defaultCurtainWeights:Record<string,number>={none:50,hair:5,body:5,shirt:10,earring:10,pants:10,longShirt:10};
export const defaultRules:PatternRules={colours:4,curtainLooks:defaultCurtainWeights,weave:1,twoTone:.55,checker:2,checkerApart:true,checkerStyles:[true,true,true,true],flow:4,flowApart:true,touching:true,pixel:2,spray:2,bodyTypes:defaultBodyWeights};
export const ruleRanges={weave:{min:0,max:2},twoTone:{min:0,max:1},checker:{min:0,max:6},flow:{min:0,max:8},pixel:{min:0,max:4},spray:{min:0,max:4},colours:{min:4,max:8}};
export const normalizeRules=(value:unknown):PatternRules=>{
 const v=(value??{}) as Partial<PatternRules>,num=(k:keyof typeof ruleRanges,round=true)=>{const n=Number(v[k]),r=ruleRanges[k];if(!Number.isFinite(n))return defaultRules[k];const c=Math.min(r.max,Math.max(r.min,n));return round?Math.round(c):c;};
 const styles=Array.isArray(v.checkerStyles)&&v.checkerStyles.length===4?v.checkerStyles.map(Boolean):defaultRules.checkerStyles;
 const weights=Object.fromEntries(bodyTypeIds.map(id=>{const n=Number((v.bodyTypes as Record<string,number>|undefined)?.[id]);return [id,Number.isFinite(n)?Math.min(100,Math.max(0,Math.round(n))):defaultBodyWeights[id]];}));
 if(!Object.values(weights).some(w=>w>0))weights.today=100;
 const looks=Object.fromEntries(curtainLookIds.map(id=>{const n=Number((v.curtainLooks as Record<string,number>|undefined)?.[id]);return [id,Number.isFinite(n)?Math.min(100,Math.max(0,Math.round(n))):defaultCurtainWeights[id]];}));
 return {colours:num('colours'),bodyTypes:weights,curtainLooks:looks,weave:num('weave'),twoTone:num('twoTone',false),checker:num('checker'),checkerApart:v.checkerApart!==false,checkerStyles:styles.some(Boolean)?styles:defaultRules.checkerStyles,flow:num('flow'),flowApart:v.flowApart!==false,touching:v.touching!==false,pixel:num('pixel'),spray:num('spray')};
};
export const sameRules=(a:PatternRules,b:PatternRules)=>JSON.stringify(a)===JSON.stringify(b);
let current:PatternRules=defaultRules;
/** The rules in force (the app sets them from the panel; tests and scripts get the defaults). */
export const rules=()=>current;
export const setRules=(next:PatternRules)=>{current=normalizeRules(next);};

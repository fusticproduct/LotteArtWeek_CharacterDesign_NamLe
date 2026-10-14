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
}
export const defaultRules:PatternRules={weave:1,twoTone:.55,checker:2,checkerApart:true,checkerStyles:[true,true,true,true],flow:4,flowApart:true,touching:true,pixel:2,spray:2};
export const ruleRanges={weave:{min:0,max:2},twoTone:{min:0,max:1},checker:{min:0,max:6},flow:{min:0,max:8},pixel:{min:0,max:4},spray:{min:0,max:4}};
export const normalizeRules=(value:unknown):PatternRules=>{
 const v=(value??{}) as Partial<PatternRules>,num=(k:keyof typeof ruleRanges,round=true)=>{const n=Number(v[k]),r=ruleRanges[k];if(!Number.isFinite(n))return defaultRules[k];const c=Math.min(r.max,Math.max(r.min,n));return round?Math.round(c):c;};
 const styles=Array.isArray(v.checkerStyles)&&v.checkerStyles.length===4?v.checkerStyles.map(Boolean):defaultRules.checkerStyles;
 return {weave:num('weave'),twoTone:num('twoTone',false),checker:num('checker'),checkerApart:v.checkerApart!==false,checkerStyles:styles.some(Boolean)?styles:defaultRules.checkerStyles,flow:num('flow'),flowApart:v.flowApart!==false,touching:v.touching!==false,pixel:num('pixel'),spray:num('spray')};
};
export const sameRules=(a:PatternRules,b:PatternRules)=>JSON.stringify(a)===JSON.stringify(b);
let current:PatternRules=defaultRules;
/** The rules in force (the app sets them from the panel; tests and scripts get the defaults). */
export const rules=()=>current;
export const setRules=(next:PatternRules)=>{current=normalizeRules(next);};

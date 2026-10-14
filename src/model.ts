import paletteData from './palette.json';
import savedProportions from './proportions.json';
export const palette = paletteData.colors;
export const color = (id: string) => palette.find(c => c.id === id)!.hex;
export const theme = {paper:color('neutral_1'),ink:color('dark_1'),green:color('green_1'),blue:color('blue_1'),pink:color('pink_2')};
/** Stage background: black like the reference video, or the studio paper. */
export const stageColors={dark:'#000000',light:theme.paper};
export type Vec3 = [number, number, number];
export type SlotKind = 'pelvis'|'connector'|'torso'|'head'|'face'|'limb'|'leg'|'hand'|'foot';
export interface BoneDefinition {id:string;parent:string|null;headPosition:Vec3;length:number;kind:SlotKind;label:string;section:string;}
export const bones: BoneDefinition[] = [
 {id:'root',parent:null,headPosition:[0,1.39,0],length:.07,kind:'pelvis',label:'Bottom piece',section:'Body'},
 // The waist pivot; its variant is the body build, and the rig moves it to the seam between the two body pieces (body.ts).
 {id:'spine_lower',parent:'root',headPosition:[0,.07,0],length:.14,kind:'connector',label:'Build',section:'Body'},
 {id:'spine_upper',parent:'spine_lower',headPosition:[0,.14,0],length:.42,kind:'torso',label:'Top piece',section:'Body'},
 {id:'neck',parent:'spine_upper',headPosition:[0,.42,0],length:.07,kind:'connector',label:'Neck',section:'Body'},
 {id:'head',parent:'neck',headPosition:[0,.07,0],length:.31,kind:'head',label:'Head',section:'Body'},
 {id:'face_mark',parent:'head',headPosition:[0,.145,.163],length:.07,kind:'face',label:'Face mark',section:'Body'},
 ...(['L','R'] as const).flatMap(side => {
  const x=side==='L'?1:-1, section=side==='L'?'Left arm':'Right arm';
  return [
   // x and y are nominal: the rig moves each shoulder to the edge of the top body piece (rig.ts shoulderX, body.ts).
   {id:`shoulder_${side}`,parent:'spine_upper',headPosition:[x*.33,.325,0] as Vec3,length:.055,kind:'connector' as const,label:'Shoulder',section},
   {id:`upperarm_${side}`,parent:`shoulder_${side}`,headPosition:[x*.02,0,0] as Vec3,length:.30,kind:'limb' as const,label:'Upper arm',section},
   // Elbow ball joint sits at the upper-arm end; arm lengths are unchanged.
   {id:`elbow_${side}`,parent:`upperarm_${side}`,headPosition:[0,-.30,0] as Vec3,length:.09,kind:'connector' as const,label:'Elbow',section},
   {id:`forearm_${side}`,parent:`elbow_${side}`,headPosition:[0,0,0] as Vec3,length:.28,kind:'limb' as const,label:'Forearm',section},
   {id:`hand_${side}`,parent:`forearm_${side}`,headPosition:[0,-.28,0] as Vec3,length:.13,kind:'hand' as const,label:'Hand',section},
  ];
 }),
 ...(['L','R'] as const).flatMap(side => {
  const x=side==='L'?1:-1, section=side==='L'?'Left leg':'Right leg';
  return [
   {id:`hip_${side}`,parent:'root',headPosition:[x*.105,-.03,0] as Vec3,length:.065,kind:'connector' as const,label:'Hip',section},
   {id:`thigh_${side}`,parent:`hip_${side}`,headPosition:[0,0,0] as Vec3,length:.60,kind:'leg' as const,label:'Thigh',section},
   // Knee is a visible ball joint of its own; it sits exactly at the thigh end so leg lengths and height are unchanged.
   {id:`knee_${side}`,parent:`thigh_${side}`,headPosition:[0,-.60,0] as Vec3,length:.1,kind:'connector' as const,label:'Knee',section},
   {id:`shin_${side}`,parent:`knee_${side}`,headPosition:[0,0,0] as Vec3,length:.60,kind:'leg' as const,label:'Shin',section},
   {id:`foot_${side}`,parent:`shin_${side}`,headPosition:[0,-.60,0] as Vec3,length:.15,kind:'foot' as const,label:'Foot',section},
  ];
 }),
];
/**
 * Body (Nam, 2026-10-14): no fixed torso + pelvis any more, but one or two flat pieces from one catalogue, in one of
 * four builds: Single (one big piece), Pair (two equal pieces, same or mirrored shape), Big top (big piece over a small
 * one) and Big bottom. The top piece is the torso bone, the bottom piece the pelvis bone, the build the waist bone.
 */
export const bodyShapes=['Circle','Block','Bowl','Dome','Funnel','A-line','Donut','Diamond'];
export const bodyBuilds=['Single','Pair','Big top','Big bottom'];
export const single=0,pair=1,bigTop=2,bigBottom=3,donut=6;
/** How often each build comes up in Generate. */
const buildWeights=[.25,.3,.25,.2];
/** Mirrored partner of a body shape (Bowl <-> Dome, Funnel <-> A-line); the others mirror onto themselves. */
export const mirrorShape=(v:number)=>v===2?3:v===3?2:v===4?5:v===5?4:v;
/** Bottom shapes a Pair may use under a top shape: the same shape or its mirror (two funnels, or an hourglass). */
export const pairPartners=(top:number)=>[...new Set([top,mirrorShape(top)])];
/** The small piece of Big top / Big bottom is never a Donut (its hole would shrink to a dot). */
const smallShapes=bodyShapes.map((_,i)=>i).filter(i=>i!==donut);
export const variants:Record<SlotKind,string[]>={
 // Head, body pieces and face mark are flat 2D shapes (seed version 3); the other parts are still turned 3D shapes.
 head:['Circle','Triangle','Hexagon','Down triangle','Square','Dome'],
 torso:bodyShapes,
 pelvis:bodyShapes,
 connector:['Sphere','Bead','Cylinder','Capsule'],
 limb:['Cylinder','Cone','Capsule','Box','Chain','Octagon'],
 leg:['Taper','Bell','Stack','Chain','Octagon','Pill'],
 hand:['Sphere','Cube','Ring','Cone','Octagon','Capsule'],
 foot:['Flare','Dome','Wedge','Puck','Bell','Octagon'],
 face:['Dot','Dash','Triangle','Twin dots','Ring','Bar'],
};
export const restHeight=2.4;
/**
 * Global look proportions (Proportions tab): 1 = the studio default. Kept per browser like the weave palette,
 * not in the seed. Bone lengths never change; only the parts' size, and the shoulders follow the torso edge.
 */
export const proportionKeys=['head','torsoWidth','torsoHeight','pelvis','arms','legs','hands','feet','joints'] as const;
export type Proportions=Record<typeof proportionKeys[number],number>;
export const defaultProportions:Proportions={head:1,torsoWidth:1,torsoHeight:1,pelvis:1,arms:1,legs:1,hands:1,feet:1,joints:1};
export const proportionRange={min:.5,max:1.5};
export const normalizeProportions=(value:unknown):Proportions=>Object.fromEntries(proportionKeys.map(k=>{const v=Number((value as Partial<Proportions>|null)?.[k]);return [k,Number.isFinite(v)?Math.min(proportionRange.max,Math.max(proportionRange.min,v)):1];})) as Proportions;
/** Project default set with the Proportions tab's "Save as default" (src/proportions.json). The rig itself defaults to 100%. */
export const studioProportions=normalizeProportions(savedProportions);
export const variantNames=(bone:BoneDefinition)=>/^(shoulder|elbow|knee)_/.test(bone.id)?['Sphere']:bone.id==='spine_lower'?bodyBuilds:variants[bone.kind];
/** Name shown for a part; a Single body has no bottom piece. */
export const partName=(spec:CharacterSpec,bone:BoneDefinition)=>bone.id==='root'&&spec.parts.spine_lower.variant===single?'None':variantNames(bone)[spec.parts[bone.id].variant]??variantNames(bone)[0];
export const patterns=['Solid','Checker','Stripes','Gradient','Weave','Two-tone'] as const;
/** Two-tone (index 5) splits a limb segment into two colour layers; it is the only texture allowed on arms and legs. */
export const twoTone=5;
export interface PartChoice {variant:number;color:number;accent:number;pattern:number;}
export interface CharacterSpec {version:1;label:string;parts:Record<string,PartChoice>;density:number;}
/** Preset poses; 'dance' plays the recorded motion in src/dance.ts and rests in the idle pose for exports. */
export type Pose = 'idle'|'reach'|'stride'|'dance';
/** Live stacking from camera depth: which arm and leg are drawn in front, and which arms tuck behind the body. */
export interface LayerDepth {frontArm:'L'|'R';frontLeg:'L'|'R';behind:{L:boolean;R:boolean};}
export const defaultDepth:LayerDepth={frontArm:'L',frontLeg:'L',behind:{L:false,R:false}};
export function rng(seed:string) {let h=2166136261; for(let i=0;i<seed.length;i++)h=Math.imul(h^seed.charCodeAt(i),16777619); return ()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
const vibrant=palette.map((_,i)=>i).filter(i=>!['neutral','dark'].includes(palette[i].family));
/** Only the torso and the pelvis (hip area) carry texture patterns; every other part is a solid colour. */
export const patternedKinds:SlotKind[]=['torso','pelvis'];
/** Left/right pairs that share shape and colour (hands, feet and the joints). */
export const mirrorsFully=(id:string)=>/^(shoulder|elbow|hip|knee|hand|foot)_[LR]$/.test(id);
/** Left/right pairs that share shape only (thighs and shins have equal silhouettes, colours stay free). */
export const mirrorsShape=(id:string)=>/^(thigh|shin)_[LR]$/.test(id);
/** Segments made of repeated beads/discs. Two in a row on one limb reads as a pile of spheres, so only one is allowed. */
export const isBeaded=(b:BoneDefinition,variant:number)=>b.kind==='leg'?variant===2||variant===3:b.kind==='limb'&&variant===4;
const lowerSegment:Record<string,string>={upperarm:'forearm',thigh:'shin'};
const upperSegment:Record<string,string>={forearm:'upperarm',shin:'thigh'};
/** The other segment of the same limb (upper arm ↔ forearm, thigh ↔ shin). */
export const pairedSegment=(id:string)=>{const [part,side]=id.split('_');const other=lowerSegment[part]??upperSegment[part];return other?`${other}_${side}`:undefined;};
const boneById=(id:string)=>bones.find(b=>b.id===id)!;
export const twinOf=(id:string)=>/_[LR]$/.test(id)?id.slice(0,-1)+(id.endsWith('L')?'R':'L'):undefined;
/** Ball joints. They share one colour per character (Nam, 2026-10-11), so they lock and reroll as one group. */
export const isJoint=(id:string)=>/^(shoulder|elbow|knee|hip)_[LR]$/.test(id);
/** Bones that are locked/rerolled together with `id`. */
export const linkedIds=(id:string)=>{if(isJoint(id))return bones.filter(b=>isJoint(b.id)).map(b=>b.id);const twin=twinOf(id);return twin&&(mirrorsFully(id)||mirrorsShape(id))?[id,twin]:[id];};
const kindOf=(id:string)=>bones.find(b=>b.id===id)!.kind;
/** Applies the design rules to any spec, including specs decoded from older seeds. */
export function normalizeSpec(spec:CharacterSpec):CharacterSpec{
 const parts:Record<string,PartChoice>={};
 for(const b of bones){
  const p={...spec.parts[b.id]};
  p.variant=Math.min(p.variant,variantNames(b).length-1);
  if(b.id.endsWith('_R')&&mirrorsFully(b.id))Object.assign(p,parts[twinOf(b.id)!]);
  if(b.id.endsWith('_R')&&mirrorsShape(b.id))p.variant=parts[twinOf(b.id)!].variant;
  if(b.id.startsWith('forearm_')||b.id.startsWith('shin_')){const upper=parts[pairedSegment(b.id)!];if(isBeaded(b,p.variant)&&upper&&isBeaded(boneById(pairedSegment(b.id)!),upper.variant))p.variant=0;}
  const layered=(b.kind==='limb'||b.kind==='leg')&&!isBeaded(b,p.variant);
  if(!patternedKinds.includes(b.kind)&&!(layered&&p.pattern===twoTone))p.pattern=0;
  if(patternedKinds.includes(b.kind)&&p.pattern===twoTone)p.pattern=0;
  parts[b.id]=p;
 }
 const build=parts.spine_lower.variant;
 if(build===pair&&!pairPartners(parts.spine_upper.variant).includes(parts.root.variant))parts.root.variant=parts.spine_upper.variant;
 if(build===bigTop&&parts.root.variant===donut)parts.root.variant=0;
 if(build===bigBottom&&parts.spine_upper.variant===donut)parts.spine_upper.variant=0;
 return {...spec,parts};
}
/**
 * A character's colour scheme (A1): two body colours spread over the limbs by `layout`, an accent for hands, feet
 * and pelvis, one joint colour and a head colour. Every character draws its own (55,536 schemes × 4 layouts from
 * the 15 vibrant colours), so a crowd rarely repeats while each figure stays to five colours. Not stored in the
 * seed: the seed keeps each part's colour.
 */
export const schemeLayouts=['arms-legs','upper-lower','alternate','sides'] as const;
export interface Scheme {A:number;B:number;C:number;J:number;H:number;layout:typeof schemeLayouts[number];}
const dark=palette.findIndex(c=>c.id==='dark_1');
/** Hue and lightness (0–1) of each palette colour. */
const tones=palette.map(c=>{const n=parseInt(c.hex.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
 return {h:d?(max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4)/6:0,l:(max+min)/2};});
const hueGap=(a:number,b:number)=>{const d=Math.abs(tones[a].h-tones[b].h)%1;return Math.min(d,1-d)*360;};
const lightGap=(a:number,b:number)=>Math.abs(tones[a].l-tones[b].l);
/** How body colour B relates to A: same family but lighter or darker, across the colour wheel, or light against dark. */
const pairings=[(a:number,b:number)=>hueGap(a,b)<=70&&lightGap(a,b)>=.08,(a:number,b:number)=>hueGap(a,b)>=120,(a:number,b:number)=>lightGap(a,b)>=.2];
/** Draws a scheme. Roles pinned by locked parts (hands/feet → accent, joints, head) keep their colour. */
export function drawScheme(random:()=>number,pinned:Partial<Scheme>={}):Scheme{
 const pick=<T,>(a:readonly T[])=>a[Math.floor(random()*a.length)],either=(rule:number[],fallback:number[])=>rule.length?rule:fallback;
 const taken=[pinned.C,pinned.J,pinned.H].filter((c):c is number=>c!==undefined),free=(...used:number[])=>vibrant.filter(c=>!used.includes(c)&&!taken.includes(c));
 const A=pick(free()),pairing=pick(pairings),B=pick(either(free(A).filter(c=>pairing(A,c)),free(A)));
 // The accent sits away from both body colours; the joints are clearly lighter or darker than them.
 const C=pinned.C??pick(either(free(A,B).filter(c=>hueGap(c,A)>=60&&hueGap(c,B)>=60),free(A,B)));
 const others=vibrant.filter(c=>![A,B,C].includes(c)),J=pinned.J??pick(either(others.filter(c=>Math.abs(tones[c].l-(tones[A].l+tones[B].l)/2)>=.15),others));
 return {A,B,C,J,H:pinned.H??pick(vibrant.filter(c=>![A,B,J].includes(c))),layout:pick(schemeLayouts)};
}
/** Colour and two-tone accent of a part under a scheme. Neighbours always differ: limbs A/B, joints J, hands, feet and pelvis C, neck and waist B, head H, torso A. */
export function schemeColor(id:string,s:Scheme):[number,number]{
 const [part,side]=id.split('_');
 if(isJoint(id))return [s.J,s.C];
 if(['upperarm','forearm','thigh','shin'].includes(part)){
  const upper=part==='upperarm'||part==='thigh',arm=part==='upperarm'||part==='forearm';
  const c=s.layout==='arms-legs'?(arm?s.A:s.B):s.layout==='upper-lower'?(upper?s.A:s.B):s.layout==='alternate'?(upper===arm?s.A:s.B):(side==='L'?s.A:s.B);
  return [c,c===s.A?s.B:s.A];
 }
 if(part==='hand'||part==='foot'||id==='root')return [s.C,s.A];
 if(id==='head')return [s.H,s.A];
 if(id==='neck'||id==='spine_lower')return [s.B,s.A];
 if(id==='spine_upper')return [s.A,s.C];
 return [dark,s.H];
}
const adjacent=(id:string)=>bones.filter(n=>n.id===boneById(id).parent||n.parent===id).map(n=>n.id);
/** Colours every part that is not frozen from a fresh scheme that fits around the frozen (locked) parts. */
function paint(parts:Record<string,PartChoice>,frozen:Set<string>,random:()=>number){
 const kept=(id:string)=>frozen.has(id)?parts[id].color:undefined,pinned:Partial<Scheme>={};
 for(const id of ['hand_L','foot_L'])pinned.C??=kept(id);
 pinned.J=bones.filter(b=>isJoint(b.id)).map(b=>kept(b.id)).find(c=>c!==undefined);pinned.H=kept('head');
 const clashes=(s:Scheme)=>bones.some(b=>!frozen.has(b.id)&&adjacent(b.id).some(n=>frozen.has(n)&&parts[n].color===schemeColor(b.id,s)[0]));
 // Usually the first scheme fits; with many locks, try a few more before patching single parts.
 let scheme=drawScheme(random,pinned);for(let i=0;i<60&&clashes(scheme);i++)scheme=drawScheme(random,pinned);
 for(const b of bones)if(!frozen.has(b.id))[parts[b.id].color,parts[b.id].accent]=schemeColor(b.id,scheme);
 for(const b of bones){
  if(frozen.has(b.id)||b.kind==='face')continue;
  const group=isJoint(b.id)?bones.filter(j=>isJoint(j.id)).map(j=>j.id):mirrorsFully(b.id)?linkedIds(b.id):[b.id];
  const near=group.flatMap(adjacent).filter(id=>!group.includes(id)).map(id=>parts[id].color);
  if(!near.includes(parts[b.id].color))continue;
  const pool=vibrant.filter(c=>!near.includes(c)),c=pool[Math.floor(random()*pool.length)];
  for(const id of group)parts[id].color=c;
 }
}
/** A build that fits the body pieces that cannot change (locked or kept): a Pair needs partner shapes, a small piece is never a Donut. */
function drawBuild(random:()=>number,bottom?:number,top?:number){
 const fits=[true,bottom===undefined||top===undefined||pairPartners(top).includes(bottom),bottom!==donut,top!==donut];
 const total=buildWeights.reduce((sum,w,i)=>sum+(fits[i]?w:0),0);let r=random()*total;
 for(let i=0;i<4;i++){if(!fits[i])continue;r-=buildWeights[i];if(r<0)return i;}
 return single;
}
/**
 * Makes the two body pieces suit the build and gives them their patterns. The piece the user locked, or else the
 * piece being rerolled, leads; the other follows (a Pair's bottom takes the top's shape or its mirror).
 */
function fitBody(parts:Record<string,PartChoice>,frozen:Set<string>,locked:Set<string>,only:Set<string>|undefined,random:()=>number){
 const build=parts.spine_lower.variant,top=parts.spine_upper,bottom=parts.root,pick=<T,>(a:T[])=>a[Math.floor(random()*a.length)];
 if(build===pair&&!pairPartners(top.variant).includes(bottom.variant)){
  const bottomLeads=locked.has('root')||(!locked.has('spine_upper')&&!!only?.has('root'));
  if(bottomLeads)top.variant=pick(pairPartners(bottom.variant));else bottom.variant=pick(pairPartners(top.variant));
 }
 if(build===bigTop&&bottom.variant===donut&&!locked.has('root'))bottom.variant=pick(smallShapes);
 if(build===bigBottom&&top.variant===donut&&!locked.has('spine_upper'))top.variant=pick(smallShapes);
 // Patterns: a Single body is woven 70% of the time; of two pieces, one or both are woven.
 const woven=()=>1+Math.floor(random()*4),r=random(),free=(id:string)=>!frozen.has(id);
 if(build===single){if(free('spine_upper'))top.pattern=r<.7?woven():0;if(free('root'))bottom.pattern=0;return;}
 if(free('spine_upper'))top.pattern=r<.65?woven():0;
 if(free('root'))bottom.pattern=r>=.3?woven():0;
 // Two plain pieces (e.g. after a Single becomes a Pair) get a weave on a piece the user has not locked.
 if(!top.pattern&&!bottom.pattern){if(!locked.has('spine_upper'))top.pattern=woven();else if(!locked.has('root'))bottom.pattern=woven();}
}
export function generate(label:string, previous?:CharacterSpec, locked:Set<string>=new Set(), only?:string):CharacterSpec {
 const random=rng(label),parts:Record<string,PartChoice>={};
 const lockedLinked=new Set([...locked].flatMap(linkedIds)),onlyLinked=only?new Set(linkedIds(only)):undefined;
 const frozen=new Set(bones.filter(b=>previous&&(lockedLinked.has(b.id)||(onlyLinked&&!onlyLinked.has(b.id)))).map(b=>b.id));
 // Shapes and patterns first; colours come from the scheme below.
 for(const b of bones){
  if(previous&&frozen.has(b.id)){parts[b.id]={...previous.parts[b.id]};continue;}
  const twin=twinOf(b.id);
  if(b.id.endsWith('_R')&&mirrorsFully(b.id)&&parts[twin!]){parts[b.id]={...parts[twin!]};continue;}
  // Body pieces get their pattern in fitBody, once the build is known.
  const pattern=(b.kind==='limb'||b.kind==='leg')&&random()<.55?twoTone:0;
  // Never pair two beaded segments on the same limb.
  const pair=pairedSegment(b.id),pairChoice=pair?(parts[pair]??(frozen.has(pair)?previous?.parts[pair]:undefined)):undefined;
  const options=variantNames(b).map((_,i)=>i).filter(i=>!(pairChoice&&isBeaded(b,i)&&isBeaded(boneById(pair!),pairChoice.variant)));
  let variant=b.id==='spine_lower'?drawBuild(random,frozen.has('root')?previous!.parts.root.variant:undefined,frozen.has('spine_upper')?previous!.parts.spine_upper.variant:undefined):options[Math.floor(random()*options.length)];
  if(b.id.endsWith('_R')&&mirrorsShape(b.id)&&parts[twin!])variant=parts[twin!].variant;
  parts[b.id]={variant,color:dark,accent:dark,pattern};
 }
 fitBody(parts,frozen,lockedLinked,onlyLinked,random);
 if(previous&&onlyLinked){
  // Rerolling one part changes its shape and keeps the colours; the joints have no other shape, so they get a new joint colour.
  for(const id of onlyLinked){parts[id].color=previous.parts[id].color;parts[id].accent=previous.parts[id].accent;}
  if(isJoint(only!)){const joints=[...onlyLinked],near=joints.flatMap(adjacent).filter(id=>!isJoint(id)).map(id=>parts[id].color),pool=vibrant.filter(c=>!near.includes(c)&&c!==parts[only!].color);const c=pool[Math.floor(random()*pool.length)];if(c!==undefined)for(const id of joints)parts[id].color=c;}
 }
 else paint(parts,frozen,random);
 return normalizeSpec({version:1,label,parts,density:previous?.density??3});
}
/** New colours, same shapes: a fresh scheme for every part that is not locked. `salt` varies the draw. */
export function recolor(spec:CharacterSpec,locked:Set<string>=new Set(),salt:string=randomLabel()):CharacterSpec{
 const lockedLinked=new Set([...locked].flatMap(linkedIds)),parts=structuredClone(spec.parts);
 paint(parts,new Set(bones.filter(b=>lockedLinked.has(b.id)).map(b=>b.id)),rng(`${spec.label}|colours|${salt}`));
 return normalizeSpec({...spec,parts});
}
export function encodeSeed(spec:CharacterSpec) {return `${spec.label}~3${spec.density.toString(36)}${bones.map(b=>{const p=spec.parts[b.id];return [p.variant,p.color,p.accent,p.pattern].map(n=>n.toString(36)).join('');}).join('')}`;}
/**
 * Seed versions: 1 = the turned 3D catalogue (11 torsos), 2 = flat head, torso and face mark, 3 = body pieces and builds.
 * A version-1 torso maps to the nearest version-2 one (Bowl→Bowl, Goblet/Martini/Cup/Vase→Funnel, Mushroom→Fan,
 * Hourglass/Stack→Column, Diamond/Orb→Orb, Donut→Donut); heads and marks keep their index. Older torsos and pelvises
 * then map onto the body catalogue as a Big top build (big torso over a small pelvis, like before):
 * Column→Block, Fan→Dome, Orb→Circle; pelvis Orb→Circle, Tire→Donut, Puck→Block; the rest keep their name.
 */
const legacyTorso=[3,1,4,0,1,1,5,0,5,6,1],torsoV3=[1,4,5,2,3,0,6],pelvisV3=[0,6,2,3,1,7];
/** Slot orders of older seeds: before elbows (24 slots) and before knees and elbows (22 slots). */
const legacyOrders=[bones.filter(b=>!b.id.startsWith('elbow_')),bones.filter(b=>!b.id.startsWith('elbow_')&&!b.id.startsWith('knee_'))];
export function decodeSeed(input:string):CharacterSpec {
 const seed=input.trim();if(!seed||seed.length>600)throw new Error('Enter a seed between 1 and 600 characters.');
 if(!seed.includes('~'))return generate(seed);
 const [label,packed,...rest]=seed.split('~');
 const order=[bones,...legacyOrders].find(o=>packed?.length===o.length*4+2);
 const version=packed?.[0];
 if(rest.length||!label||!order||!['1','2','3'].includes(version)||!/^[a-z0-9]+$/.test(packed))throw new Error('This character seed is incomplete. Copy the full seed.');
 const density=parseInt(packed[1],36);if(density<2||density>12)throw new Error('Invalid pattern scale in seed.');
 // Joints missing from older seeds are derived from the label so they stay deterministic.
 const fallback=generate(label),parts:Record<string,PartChoice>=Object.fromEntries(bones.filter(b=>!order.includes(b)).map(b=>[b.id,fallback.parts[b.id]]));
 order.forEach((b,i)=>{
  let [variant,c,accent,pattern]=packed.slice(2+i*4,6+i*4).split('').map(x=>parseInt(x,36));
  const old=version!=='3',count=old&&b.kind==='torso'?(version==='1'?legacyTorso.length:torsoV3.length):old&&b.kind==='pelvis'?pelvisV3.length:variants[b.kind].length;
  if(variant>=count||c>=palette.length||accent>=palette.length||pattern>=patterns.length)throw new Error('This seed contains an unknown part.');
  if(old&&b.kind==='torso')variant=torsoV3[version==='1'?legacyTorso[variant]:variant];
  if(old&&b.kind==='pelvis')variant=pelvisV3[variant];
  if(old&&b.id==='spine_lower')variant=bigTop;
  parts[b.id]={variant,color:c,accent,pattern};
 });
 return normalizeSpec({version:1,label,parts,density});
}
export function randomLabel(){const values=new Uint32Array(2);crypto.getRandomValues(values);return `folk-${values[0].toString(36)}${values[1].toString(36).slice(0,3)}`;}
/** Preset poses. The figure is 2D, so every pose is an in-plane (Z) rotation. */
export function poseRotation(id:string,pose:Pose):Vec3 {
 const side=id.endsWith('_L')?1:-1,z=(angle:number):Vec3=>[0,0,side*angle];
 if(id.startsWith('upperarm'))return pose==='reach'?z(2.45):pose==='stride'?(side>0?z(1.25):z(.5)):z(.17);
 if(id.startsWith('forearm'))return pose==='reach'?z(.30):pose==='stride'?(side>0?z(.9):z(-.75)):z(.12);
 if(id.startsWith('thigh'))return pose==='stride'?(side>0?z(.42):z(.1)):z(.085);
 if(id.startsWith('shin'))return pose==='stride'?(side>0?z(-.5):z(0)):z(0);
 if(id.startsWith('foot'))return pose==='stride'&&side>0?z(.08):z(0);
 if(id==='head')return pose==='reach'?[0,0,-.08]:pose==='stride'?[0,0,.1]:[0,0,0];
 if(id==='spine_lower')return pose==='stride'?[0,0,-.06]:[0,0,0];
 return [0,0,0];
}

import paletteData from './palette.json';
export const palette = paletteData.colors;
export const color = (id: string) => palette.find(c => c.id === id)!.hex;
export const theme = {paper:color('neutral_1'),ink:color('dark_1'),green:color('green_1'),blue:color('blue_1'),pink:color('pink_2')};
export type Vec3 = [number, number, number];
export type SlotKind = 'pelvis'|'connector'|'torso'|'head'|'face'|'limb'|'leg'|'hand'|'foot';
export interface BoneDefinition {id:string;parent:string|null;headPosition:Vec3;length:number;kind:SlotKind;label:string;section:string;}
export const bones: BoneDefinition[] = [
 {id:'root',parent:null,headPosition:[0,1.39,0],length:.07,kind:'pelvis',label:'Pelvis',section:'Body'},
 {id:'spine_lower',parent:'root',headPosition:[0,.07,0],length:.14,kind:'connector',label:'Lower spine',section:'Body'},
 {id:'spine_upper',parent:'spine_lower',headPosition:[0,.14,0],length:.42,kind:'torso',label:'Torso',section:'Body'},
 {id:'neck',parent:'spine_upper',headPosition:[0,.42,0],length:.07,kind:'connector',label:'Neck',section:'Body'},
 {id:'head',parent:'neck',headPosition:[0,.07,0],length:.31,kind:'head',label:'Head',section:'Body'},
 {id:'face_mark',parent:'head',headPosition:[0,.145,.163],length:.07,kind:'face',label:'Face mark',section:'Body'},
 ...(['L','R'] as const).flatMap(side => {
  const x=side==='L'?1:-1, section=side==='L'?'Left arm':'Right arm';
  return [
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
export const variants:Record<SlotKind,string[]>={
 head:['Sphere','Cone','Octagon','Capsule','Cube','Hemisphere'],
 torso:['Bowl','Goblet','Mushroom','Hourglass','Martini','Cup','Diamond','Stack','Orb','Donut','Vase'],
 pelvis:['Orb','Tire','Bowl','Dome','Puck','Diamond'],
 connector:['Sphere','Bead','Cylinder','Capsule'],
 limb:['Cylinder','Cone','Capsule','Box','Chain','Octagon'],
 leg:['Taper','Bell','Stack','Chain','Octagon','Pill'],
 hand:['Sphere','Cube','Ring','Cone','Octagon','Capsule'],
 foot:['Flare','Dome','Wedge','Puck','Bell','Octagon'],
 face:['Dot','Dash','Triangle','Twin dots','Ring','Cross'],
};
export const restHeight=2.4;
export const variantNames=(bone:BoneDefinition)=>/^(shoulder|elbow|knee)_/.test(bone.id)?['Sphere']:variants[bone.kind];
export const patterns=['Solid','Checker','Stripes','Gradient','Weave','Two-tone'] as const;
/** Two-tone (index 5) splits a limb segment into two colour layers; it is the only texture allowed on arms and legs. */
export const twoTone=5;
export interface PartChoice {variant:number;color:number;accent:number;pattern:number;}
export interface CharacterSpec {version:1;label:string;parts:Record<string,PartChoice>;density:number;}
export type Pose = 'idle'|'reach'|'stride';
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
/** Bones that are locked/rerolled together with `id`. */
export const linkedIds=(id:string)=>{const twin=twinOf(id);return twin&&(mirrorsFully(id)||mirrorsShape(id))?[id,twin]:[id];};
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
 return {...spec,parts};
}
export function generate(label:string, previous?:CharacterSpec, locked:Set<string>=new Set(), only?:string):CharacterSpec {
 const random=rng(label),parts:Record<string,PartChoice>={};
 const lockedLinked=new Set([...locked].flatMap(linkedIds)),onlyLinked=only?new Set(linkedIds(only)):undefined;
 const frozen=new Set(bones.filter(b=>lockedLinked.has(b.id)||(onlyLinked&&!onlyLinked.has(b.id))).map(b=>b.id));
 const colorOf=(id:string)=>{
  if(parts[id])return parts[id].color;
  const twin=twinOf(id);if(twin&&mirrorsFully(id)&&parts[twin])return parts[twin].color;
  return frozen.has(id)?previous?.parts[id].color:undefined;
 };
 const adjacent=(id:string)=>bones.filter(n=>n.id===bones.find(b=>b.id===id)!.parent||n.parent===id).map(n=>n.id);
 for(const b of bones){
  if(previous&&frozen.has(b.id)){parts[b.id]={...previous.parts[b.id]};continue;}
  const twin=twinOf(b.id);
  if(b.id.endsWith('_R')&&mirrorsFully(b.id)&&parts[twin!]){parts[b.id]={...parts[twin!]};continue;}
  // A mirrored part must also differ from the neighbours of its twin.
  const around=mirrorsFully(b.id)&&twin?[...adjacent(b.id),...adjacent(twin)]:adjacent(b.id);
  const neighbors=around.filter(id=>id!==twin).map(colorOf);
  const pool=vibrant.filter(c=>!neighbors.includes(c));
  const c= b.kind==='face'?palette.findIndex(c=>c.id==='dark_1'):pool[Math.floor(random()*pool.length)];
  const accents=vibrant.filter(v=>v!==c);
  const pattern=b.kind==='torso'?1+Math.floor(random()*4):b.kind==='pelvis'&&random()>=.35?1+Math.floor(random()*4):(b.kind==='limb'||b.kind==='leg')&&random()<.55?twoTone:0;
  // Never pair two beaded segments on the same limb.
  const pair=pairedSegment(b.id),pairChoice=pair?(parts[pair]??(frozen.has(pair)?previous?.parts[pair]:undefined)):undefined;
  const options=variantNames(b).map((_,i)=>i).filter(i=>!(pairChoice&&isBeaded(b,i)&&isBeaded(boneById(pair!),pairChoice.variant)));
  let variant=options[Math.floor(random()*options.length)];
  if(b.id.endsWith('_R')&&mirrorsShape(b.id)&&parts[twin!])variant=parts[twin!].variant;
  parts[b.id]={variant,color:c,accent:accents[Math.floor(random()*accents.length)],pattern};
 }
 return normalizeSpec({version:1,label,parts,density:previous?.density??6});
}
export function encodeSeed(spec:CharacterSpec) {return `${spec.label}~1${spec.density.toString(36)}${bones.map(b=>{const p=spec.parts[b.id];return [p.variant,p.color,p.accent,p.pattern].map(n=>n.toString(36)).join('');}).join('')}`;}
/** Slot orders of older seeds: before elbows (24 slots) and before knees and elbows (22 slots). */
const legacyOrders=[bones.filter(b=>!b.id.startsWith('elbow_')),bones.filter(b=>!b.id.startsWith('elbow_')&&!b.id.startsWith('knee_'))];
export function decodeSeed(input:string):CharacterSpec {
 const seed=input.trim();if(!seed||seed.length>600)throw new Error('Enter a seed between 1 and 600 characters.');
 if(!seed.includes('~'))return generate(seed);
 const [label,packed,...rest]=seed.split('~');
 const order=[bones,...legacyOrders].find(o=>packed?.length===o.length*4+2);
 if(rest.length||!label||!order||packed[0]!=='1'||!/^[a-z0-9]+$/.test(packed))throw new Error('This character seed is incomplete. Copy the full seed.');
 const density=parseInt(packed[1],36);if(density<2||density>12)throw new Error('Invalid pattern scale in seed.');
 // Joints missing from older seeds are derived from the label so they stay deterministic.
 const fallback=generate(label),parts:Record<string,PartChoice>=Object.fromEntries(bones.filter(b=>!order.includes(b)).map(b=>[b.id,fallback.parts[b.id]]));
 order.forEach((b,i)=>{const [variant,c,accent,pattern]=packed.slice(2+i*4,6+i*4).split('').map(x=>parseInt(x,36));if(variant>=variants[b.kind].length||c>=palette.length||accent>=palette.length||pattern>=patterns.length)throw new Error('This seed contains an unknown part.');parts[b.id]={variant,color:c,accent,pattern};});
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

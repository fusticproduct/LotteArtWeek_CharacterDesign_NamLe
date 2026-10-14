import {rng} from './model';
/**
 * Parade poses (Trung Bao, 2026-10-14): a large library taken from his reference photos (joggers by the lake, a drum
 * dancer, áo dài with a nón lá, street dance, a morning stretch, aerobics, a basketball layup, a shoulder line, a run
 * cycle, mid-air strides, jumps for joy, a leap), all facing right, the way the parade moves, plus upright floating
 * poses (his sixth round: "some floating poses more", "up down more"). Poses with flat feet stay on the floor; jumps
 * and floats are in the air (seventh round). Nobody turns over, except in the two flips. The Parade rotates every
 * character through the library (Parade.tsx), hopping into each new pose, and keeps the wall about half on the floor
 * and half in the air. Now and then a held pose raises one arm and waves (holdPose).
 *
 * The figures are drawn from the front, so facing right is told by the legs and body: knees point forward, legs
 * swing ahead and behind, the body leans into a run (and the face mark moves to the right of the head). Arms always
 * reach outward on their own side, never across the body (his ninth round: inward arms look messy): the near arm and
 * its hand stay right of its shoulder, the far arm's left of its own, each elbow folding outward and up. The walk and
 * run cycles alone swing their arms across, as walkers and runners do (tenth round).
 *
 * Angles are on screen, in degrees from straight down, counter-clockwise: + is forward (to the right), 90 is level
 * ahead, 180 straight up, −90 level behind. Each limb is [upper, lower] (upper arm and forearm, thigh and shin), both
 * absolute; `near` is the character's left side (on the right of the screen, drawn in front), `far` its right.
 * `lean` tips the body forward, `head` tilts it (+ back), `lift` raises a jump or a float (m, for a 2.6 m figure).
 */
export type ParadeKind='stand'|'step'|'jump'|'float';
type Limb=[number,number];
/**
 * A moving pose (Trung Bao: a walk cycle, a run cycle and a dance; then a hop on the spot, a back flip and a front flip,
 * and five more dances, more kinds of moving but no more of it): see cycleAngles and bounceFrame.
 */
export type ParadeCycle='walk'|'jog'|'run'|'dance'|'disco'|'robot'|'twist'|'armwave'|'charleston'|'cheer'|ExerciseCycle|'hop'|'backflip'|'frontflip';
/** The six morning exercises (only when the cast exercises together: syncPose). */
export type ExerciseCycle='armraise'|'sidestretch'|'squat'|'toetouch'|'jacks'|'kneelift';
/** The moving poses that stay on the floor (cycleAngles), and those that leave it (bounceFrame). */
export type FloorCycle=Exclude<ParadeCycle,'hop'|'backflip'|'frontflip'>;
export interface PoseDef {name:string;kind:ParadeKind;from:string;arm:{near:Limb;far:Limb};leg:{near:Limb;far:Limb};lean?:number;head?:number;lift?:number;cycle?:ParadeCycle;}
const base:PoseDef[]=[
 // Standing
 {name:'Áo dài',kind:'stand',from:'áo dài with a nón lá',arm:{near:[10,22],far:[-15,-98]},leg:{near:[6,2],far:[-4,-10]},head:5},
 {name:'Street dance',kind:'stand',from:'street dance',arm:{near:[92,96],far:[-165,-185]},leg:{near:[22,12],far:[-22,-22]},lean:-3},
 {name:'Morning stretch',kind:'stand',from:'morning stretch by the lake',arm:{near:[150,165],far:[-160,-170]},leg:{near:[12,6],far:[-12,-12]}},
 {name:'Aerobics',kind:'stand',from:'aerobics in the park',arm:{near:[140,172],far:[-60,-185]},leg:{near:[20,10],far:[-20,-20]},head:-4},
 {name:'Shoulder line',kind:'stand',from:'the shoulder line',arm:{near:[80,86],far:[-74,-82]},leg:{near:[4,0],far:[-4,-6]},lean:12,head:-4},
 {name:'Wave hello',kind:'stand',from:'the drum dancer',arm:{near:[130,175],far:[-5,-15]},leg:{near:[6,0],far:[-6,-6]},head:5},
 {name:'Point ahead',kind:'stand',from:'street dance',arm:{near:[95,98],far:[-10,-50]},leg:{near:[14,4],far:[-10,-10]},lean:3},
 {name:'Look far',kind:'stand',from:'a hand at the brow',arm:{near:[120,185],far:[-15,-40]},leg:{near:[10,4],far:[-8,-8]},head:6},
 {name:'Clap overhead',kind:'stand',from:'aerobics in the park',arm:{near:[165,185],far:[-160,-180]},leg:{near:[16,8],far:[-16,-16]}},
 {name:'Cheer',kind:'stand',from:'the morning stretch',arm:{near:[150,168],far:[-140,-160]},leg:{near:[18,8],far:[-18,-18]},head:6},
 {name:'Squat',kind:'stand',from:'street dance',arm:{near:[80,110],far:[-70,-120]},leg:{near:[50,-15],far:[35,-30]},lean:8},
 {name:'Tai chi',kind:'stand',from:'the morning exercise',arm:{near:[80,120],far:[-30,-60]},leg:{near:[25,10],far:[-20,-20]},lean:4},
 // Stepping
 {name:'Jog',kind:'step',from:'joggers by the lake',arm:{near:[25,125],far:[-30,-120]},leg:{near:[30,6],far:[-20,-72]},lean:6},
 {name:'Drum dance',kind:'step',from:'the drum dancer',arm:{near:[140,185],far:[-20,-100]},leg:{near:[12,0],far:[-10,-28]},head:6},
 {name:'Run (contact)',kind:'step',from:'the run cycle',arm:{near:[40,130],far:[-45,-130]},leg:{near:[35,20],far:[-30,-72]},lean:8},
 {name:'Run (knee drive)',kind:'step',from:'the run cycle',arm:{near:[45,130],far:[-55,-140]},leg:{near:[75,-10],far:[-35,-48]},lean:10},
 {name:'Stride',kind:'step',from:'mid-air strides',arm:{near:[25,40],far:[-25,-48]},leg:{near:[32,10],far:[-28,-52]},lean:3},
 {name:'Leap',kind:'step',from:'jump ahead',arm:{near:[120,132],far:[-100,-118]},leg:{near:[55,25],far:[-45,-72]},lean:10},
 {name:'Calm walk',kind:'step',from:'jump ahead (the last one)',arm:{near:[8,56],far:[-10,-22]},leg:{near:[12,0],far:[-10,-22]}},
 {name:'March',kind:'step',from:'the run cycle',arm:{near:[30,100],far:[-60,-150]},leg:{near:[70,0],far:[-8,-8]}},
 {name:'Sneak',kind:'step',from:'the shoulder line',arm:{near:[40,140],far:[-30,-130]},leg:{near:[25,-5],far:[-25,-60]},lean:8},
 {name:'Skip',kind:'step',from:'jump ahead',arm:{near:[140,170],far:[-40,-70]},leg:{near:[60,-20],far:[-15,-40]},head:5},
 {name:'Power walk',kind:'step',from:'joggers by the lake',arm:{near:[45,110],far:[-60,-130]},leg:{near:[38,20],far:[-35,-55]},lean:5},
 {name:'Lunge',kind:'step',from:'jump ahead',arm:{near:[100,120],far:[-60,-70]},leg:{near:[60,10],far:[-50,-55]},lean:6},
 // Moving: a walk cycle and a run cycle (cycleAngles), the arm and leg pairs swinging against each other, and a dance:
 // a slight vibe on the beat.
 {name:'Dance',kind:'stand',from:'street dance',arm:{near:[40,110],far:[-40,-110]},leg:{near:[10,-4],far:[-10,-24]},cycle:'dance'},
 {name:'Walk cycle',kind:'step',from:'joggers by the lake',arm:{near:[18,44],far:[-18,-44]},leg:{near:[22,14],far:[-22,-40]},lean:3,cycle:'walk'},
 {name:'Run cycle',kind:'step',from:'the run cycle',arm:{near:[45,135],far:[-45,-135]},leg:{near:[48,22],far:[-32,-112]},lean:8,cycle:'run'},
 // Five dances (Trung Bao, 2026-10-14: five different styles), on the spot, on the floor.
 {name:'Disco',kind:'stand',from:'disco',arm:{near:[155,165],far:[-40,-130]},leg:{near:[16,8],far:[-8,-16]},head:6,cycle:'disco'},
 {name:'Robot',kind:'stand',from:'the robot',arm:{near:[90,180],far:[-20,-110]},leg:{near:[6,2],far:[-6,-6]},cycle:'robot'},
 {name:'Twist',kind:'stand',from:'the twist',arm:{near:[40,120],far:[-40,-120]},leg:{near:[30,-22],far:[14,-38]},lean:6,cycle:'twist'},
 {name:'Arm wave',kind:'stand',from:'street dance',arm:{near:[88,112],far:[-88,-112]},leg:{near:[10,2],far:[-10,-14]},cycle:'armwave'},
 {name:'Charleston',kind:'stand',from:'the Charleston',arm:{near:[40,100],far:[-40,-100]},leg:{near:[40,22],far:[-6,-10]},lean:4,cycle:'charleston'},
 // Bouncing on the spot, and two flips (bounceFrame): they leave the floor and come back down on it.
 {name:'Hop',kind:'stand',from:'jumps for joy',arm:{near:[50,110],far:[-50,-110]},leg:{near:[16,-14],far:[12,-18]},cycle:'hop'},
 {name:'Back flip',kind:'jump',from:'jumps for joy',arm:{near:[60,110],far:[-60,-110]},leg:{near:[115,-10],far:[105,-18]},lean:10,cycle:'backflip'},
 {name:'Front flip',kind:'jump',from:'jump ahead',arm:{near:[60,110],far:[-60,-110]},leg:{near:[115,-10],far:[105,-18]},lean:10,cycle:'frontflip'},
 // Jumping: caught in the air, as high as the floaters (his seventh round: jumps float, flat feet stay down)
 // In the air one foot is always clearly higher than the other (his eighth round).
 {name:'Layup',kind:'jump',from:'the basketball layup',arm:{near:[170,176],far:[-160,-185]},leg:{near:[80,0],far:[-15,-26]},lean:-4,head:8,lift:0.6},
 {name:'Run (flight)',kind:'jump',from:'the run cycle',arm:{near:[40,125],far:[-40,-125]},leg:{near:[45,-40],far:[-25,-120]},lean:8,lift:0.55},
 {name:'Salute',kind:'jump',from:'mid-air, a hand at the brow',arm:{near:[120,185],far:[-70,-82]},leg:{near:[55,-30],far:[-10,-22]},lift:0.6},
 {name:'Joy jump',kind:'jump',from:'jumps for joy',arm:{near:[150,176],far:[-150,-162]},leg:{near:[28,-30],far:[-10,-95]},head:6,lift:0.65},
 {name:'Kick-back',kind:'jump',from:'jumps for joy',arm:{near:[165,176],far:[-140,-185]},leg:{near:[14,-6],far:[-12,-95]},head:4,lift:0.65},
 {name:'Split jump',kind:'jump',from:'jump ahead',arm:{near:[130,140],far:[-110,-125]},leg:{near:[70,45],far:[-75,-95]},lean:6,lift:0.7},
 {name:'Tuck jump',kind:'jump',from:'jumps for joy',arm:{near:[160,175],far:[-150,-170]},leg:{near:[100,-10],far:[45,-50]},head:6,lift:0.75},
 {name:'Star jump',kind:'jump',from:'jumps for joy',arm:{near:[150,160],far:[-150,-155]},leg:{near:[55,40],far:[-30,-35]},lift:0.7},
 {name:'Hurdle',kind:'jump',from:'the run cycle',arm:{near:[70,90],far:[-60,-80]},leg:{near:[90,90],far:[-40,-110]},lean:12,lift:0.6},
 // Floating: upright, hovering
 {name:'Float',kind:'float',from:'mid-air strides',arm:{near:[60,70],far:[-60,-70]},leg:{near:[30,-60],far:[-5,-20]},lift:0.8},
 {name:'Float wave',kind:'float',from:'mid-air, waving',arm:{near:[140,180],far:[-30,-50]},leg:{near:[50,-50],far:[-10,-30]},head:5,lift:0.75},
 {name:'Float sit',kind:'float',from:'the morning exercise',arm:{near:[30,90],far:[-20,-80]},leg:{near:[75,5],far:[65,-60]},lift:0.8},
 {name:'Hover',kind:'float',from:'jumps for joy',arm:{near:[175,178],far:[-10,-20]},leg:{near:[35,-40],far:[-4,-14]},lift:0.85},
 {name:'Float dance',kind:'float',from:'street dance',arm:{near:[110,185],far:[-80,-140]},leg:{near:[60,-30],far:[-20,-40]},head:-4,lift:0.7},
 {name:'Air run',kind:'float',from:'the run cycle',arm:{near:[40,140],far:[-50,-150]},leg:{near:[60,-30],far:[-30,-100]},lean:8,lift:0.7},
];
/**
 * The same pose on the other foot: the legs swapped (both still facing right) and each arm taking the other's pose,
 * mirrored onto its own side so it still reaches outward, when that makes a different pose.
 */
const mirror=([u,f]:Limb):Limb=>[-u,-f];
const swapped=(d:PoseDef):PoseDef|null=>{
 // A cycle's other side is the same cycle half a stride on.
 if(d.cycle)return null;
 const differ=[d.arm.near[0]+d.arm.far[0],d.arm.near[1]+d.arm.far[1],d.leg.near[0]-d.leg.far[0],d.leg.near[1]-d.leg.far[1]].some(v=>Math.abs(v)>15);
 return differ?{...d,name:`${d.name} (other side)`,arm:{near:mirror(d.arm.far),far:mirror(d.arm.near)},leg:{near:d.leg.far,far:d.leg.near}}:null;
};
/** Poses he turned down (ninth round; then the Hurdle, its legs spread wide). */
const removed=new Set(['Hurdle','Shoulder line','Aerobics (other side)','Point ahead (other side)','Tai chi (other side)','Leap (other side)','Run (knee drive)','March','Sneak (other side)','Skip (other side)','Lunge (other side)','Star jump (other side)','Hurdle (other side)','Run (flight) (other side)','Joy jump (other side)','Salute (other side)','Split jump (other side)','Float wave (other side)','Float dance (other side)']);
export const paradePoses:PoseDef[]=[...base,...base.map(swapped).filter((d):d is PoseDef=>!!d)].filter(d=>!removed.has(d.name));
/**
 * A posed parade character: its held angles (rig.applyAngles), lift, and its own phase and pace for the motion; `wave`:
 * the arm that is raised and waving, if one is (L near, R far); `period`: its cycle's seconds, if not the usual
 * (cyclePeriod; a dance on a shared beat, a cheer at its own rate: syncPose).
 */
export interface ParadePose {name:string;kind:ParadeKind;angles:Record<string,number>;lift:number;phase:number;pace:number;cycle?:ParadeCycle;wave?:'L'|'R';period?:number;}
/** A frame of a pose: local angles, the height off the floor, and `pivot` (0–1, flips only): see bounceFrame. */
export interface ParadeFrame {angles:Record<string,number>;lift:number;pivot?:number;}
const rad=(d:number)=>d*Math.PI/180;
/**
 * A pose's local Z angles. Local angles turn counter-clockwise on both sides (as the screen angles do), so an upper
 * limb takes its screen angle and the lower one the difference to it; `jitter` nudges each (radians).
 */
export function poseAngles(def:PoseDef,jitter:()=>number=()=>0){
 const a:Record<string,number>={};
 for(const [side,key] of [['L','near'],['R','far']] as const){
  const [u,f]=def.arm[key],[t,s]=def.leg[key];
  a[`upperarm_${side}`]=rad(u)+jitter();a[`forearm_${side}`]=rad(f-u)+jitter();
  a[`thigh_${side}`]=rad(t)+jitter();a[`shin_${side}`]=rad(s-t)+jitter();
 }
 a.spine_lower=-rad(def.lean??0)+jitter()*.3;a.head=rad(def.head??0)+jitter()*.5;
 return a;
}
/**
 * The wave (Trung Bao, 2026-10-14): a quarter of the held poses, on the floor or in the air, raise one arm (either, at
 * random) up and out on its own side, the forearm up, and wave the hand (paradeFrame). The moving poses never do.
 */
export const waveChance=.25,wavePeriod=.5;
const waveArm={upper:140,elbow:30,swing:22};
/** Raises a held pose's arm on `side` to wave (paradeFrame waves its hand). */
const raiseWave=(p:ParadePose,side:'L'|'R',r:()=>number)=>{const out=side==='L'?1:-1;p.wave=side;p.angles[`upperarm_${side}`]=out*rad(waveArm.upper)+(r()-.5)*.08;p.angles[`forearm_${side}`]=out*rad(waveArm.elbow);};
/** A pose ready to hold: nudged a little, with its own phase and pace, and now and then a waving arm. */
export const holdPose=(def:PoseDef,r:()=>number):ParadePose=>{
 const p:ParadePose={name:def.name,kind:def.kind,angles:poseAngles(def,()=>(r()-.5)*.08),lift:def.lift??0,phase:r()*Math.PI*2,pace:.8+r()*.45,cycle:def.cycle};
 if(!def.cycle&&r()<waveChance)raiseWave(p,r()<.5?'L':'R',r);
 return p;
};
/** Seconds per stride (two steps), per round of a dance, per hop, per flip. The run and the hop a little slower than at first (Trung Bao). */
export const cyclePeriod:Record<ParadeCycle,number>={walk:1.15,jog:.92,run:.86,dance:.95,disco:1.5,robot:2,twist:1.05,armwave:1.6,charleston:1.25,cheer:.7,armraise:2.4,sidestretch:3.2,squat:2.2,toetouch:2.8,jacks:1.4,kneelift:1.8,hop:.95,backflip:2.5,frontflip:2.5};
/**
 * A cycle's local angles at phase u (0–1), facing right, in the screen angles of the pose table (degrees from straight
 * down, + forward). Walk and run: each thigh swings forward and back (the far one half a stride behind); the knee folds
 * while that leg swings through (a little for a walk, the heel kicked high for a run) and stays almost straight while it
 * carries the body; the arms swing across the body against the legs, the elbow folding more as each comes forward.
 * Dance (a slight vibe, two beats a cycle): both knees dip on each beat, the hips sway once, the arms pump a little,
 * bent and out to the sides, and the head nods. The rig stands the lower foot on the floor every frame, so the body
 * rises and falls with it and never leaves the floor.
 */
export function cycleAngles(cycle:FloorCycle,u:number){
 const wave=(k:number,phase=0)=>Math.sin(Math.PI*2*(k*u+phase));
 if(exercises.includes(cycle as ExerciseCycle))return exerciseAngles(cycle as ExerciseCycle,u);
 if(cycle!=='walk'&&cycle!=='jog'&&cycle!=='run'&&cycle!=='dance')return danceAngles(cycle as Exclude<FloorCycle,'walk'|'jog'|'run'|'dance'|ExerciseCycle>,u);
 if(cycle==='dance'){
  const dip=8+12*(1+Math.cos(Math.PI*4*u))/2,sway=5*wave(1);
  const arm=(side:1|-1,phase:number):Limb=>{const up=40+10*wave(2,phase),bend=70+15*wave(2,phase+.1);return [side*up,side*(up+bend)];};
  return poseAngles({name:cycle,kind:'stand',from:'',arm:{near:arm(1,0),far:arm(-1,.5)},leg:{near:[10+sway,10+sway-dip],far:[-10+sway,-10+sway-dip]},lean:2*wave(1),head:4*wave(2,.15)});
 }
 // A jog (the marathon pace of a run together: syncPose) is between the two: a shorter stride, the heel lower, the
 // arms swinging less, elbows bent like a runner's.
 const run=cycle==='run',jog=cycle==='jog',pick=(r:number,j:number,w:number)=>run?r:jog?j:w;
 const swing=pick(40,28,22),ahead=pick(8,5,2),fold=pick(95,70,42),carry=pick(14,10,6),arm=pick(42,30,18),bend=pick(88,80,16),armBend=pick(14,12,26);
 // The knee folds on a smooth bump, ((1 + cos)/2)^n, highest as the leg swings through, easing in and out (no corner).
 const leg=(phase:number):Limb=>{const s=wave(1,phase),c=Math.cos(Math.PI*2*(u+phase)),t=ahead+swing*s,knee=carry+fold*Math.pow((1+c)/2,pick(2.2,2.3,2.6));return [t,t-knee];};
 // The arms swing forward and back across the body against the legs, elbows bent forward, as a walker's and a
 // runner's do (his tenth round: the two cycles keep the arms swinging across; every held pose keeps them outward).
 const limb=(phase:number):Limb=>{const s=wave(1,phase),up=-arm*s;return [up,up+bend+armBend*Math.max(0,-s)];};
 return poseAngles({name:cycle,kind:'step',from:'',arm:{near:limb(0),far:limb(.5)},leg:{near:leg(0),far:leg(.5)},lean:pick(8,6,3)});
}
/**
 * The five dances at phase u (0–1), all on the spot, the arms on their own sides, the lower foot on the floor (the rig
 * stands it there). Each moves smoothly through the whole round and comes back to where it began.
 *
 * Disco: the near arm points up and out, then down and out, holding each point a moment; the far hand on the hip;
 * the knees bounce twice a round and the head follows the point. Robot: four stiff poses a round, the arms bent square
 * at the elbows, each reached with a quick smooth move and held, the head ticking with them, the knees giving a
 * little on each. Twist: low, knees bent, the legs swinging against each other, the arms bent out at the sides
 * swinging with the hips, the body leaning against them. Arm wave: the arms out level, a wave running from the near
 * hand through the shoulders out to the far hand, the knees bobbing with it. Charleston: the near leg kicks forward
 * and swings back, heel up, over the bouncing far leg, the arms swinging against the kick. Cheer (only when the cast
 * cheers together: syncPose): both arms up in a V, punching higher on each beat and dropping a little between, the
 * knees giving as the arms come down, the head tipping back as they go up.
 */
function danceAngles(cycle:Exclude<FloorCycle,'walk'|'jog'|'run'|'dance'|ExerciseCycle>,u:number){
 const wave=(k:number,phase=0)=>Math.sin(Math.PI*2*(k*u+phase)),dip=(k:number)=>(1+Math.cos(Math.PI*2*k*u))/2,pose=(d:Omit<PoseDef,'name'|'kind'|'from'>)=>poseAngles({name:cycle,kind:'stand',from:'',...d});
 if(cycle==='disco'){
  const p=ease((1-Math.cos(Math.PI*2*u))/2),bob=7*dip(2);
  return pose({arm:{near:[35+122*p,48+120*p],far:[-40,-130]},leg:{near:[14+bob,8-bob],far:[-8+bob,-18-bob]},lean:2-4*p,head:-5+12*p});
 }
 if(cycle==='robot'){
  const keys:{near:Limb;far:Limb;head:number}[]=[{near:[90,180],far:[-20,-110],head:7},{near:[20,110],far:[-90,-180],head:-7},{near:[90,92],far:[-90,-92],head:0},{near:[22,112],far:[-22,-112],head:5}];
  // (Any phase, before 0 too: the step index wraps round.)
  const x=u*keys.length-Math.floor(u*keys.length),n=((Math.floor(u*keys.length)%keys.length)+keys.length)%keys.length,a=keys[n],b=keys[(n+1)%keys.length],e=ease(x/.56),give=4*Math.sin(Math.PI*Math.min(1,x/.56))**2;
  return pose({arm:{near:mixLimb(a.near,b.near,e),far:mixLimb(a.far,b.far,e)},leg:{near:[6+give,2-give],far:[-6+give,-6-give]},head:mix(a.head,b.head,e)});
 }
 if(cycle==='twist'){
  const s=wave(1),sway=wave(1,.08);
  return pose({arm:{near:[38+22*sway,122+22*sway],far:[-38+22*sway,-122+22*sway]},leg:{near:[26+16*s,-24+10*s],far:[26-16*s,-24-10*s]},lean:8-5*sway,head:-4*sway});
 }
 if(cycle==='armwave'){
  const bob=6*dip(2),near=(phase:number)=>wave(1,phase),up=(k:number)=>14*near(-.12*k),bend=(k:number)=>28+24*near(-.12*k-.08);
  return pose({arm:{near:[86+up(0),86+up(0)+bend(0)],far:[-(86+up(3)),-(86+up(3)+bend(3))]},leg:{near:[10+bob,2-bob],far:[-10+bob,-14-bob]},lean:2*wave(2),head:4*near(-.18)});
 }
 if(cycle==='cheer'){
  const p=ease((1-Math.cos(Math.PI*2*u))/2),bob=9*(1-p);
  return pose({arm:{near:[118+46*p,138+42*p],far:[-118-46*p,-138-42*p]},leg:{near:[12+.6*bob,6-bob],far:[-8+.6*bob,-16-bob]},lean:2-3*p,head:2+6*p});
 }
 // Charleston.
 const k=wave(1),bob=8*dip(2),heel=40*Math.pow((1-k)/2,2);
 return pose({arm:{near:[42-28*k,102-28*k],far:[-42-28*k,-102-28*k]},leg:{near:[12+32*k,12+32*k-14-heel],far:[-6+bob,-12-bob]},lean:4*k,head:3*wave(2)});
}
export const exercises:ExerciseCycle[]=['armraise','sidestretch','squat','toetouch','jacks','kneelift'];
export const exerciseNames:Record<ExerciseCycle,string>={armraise:'Arm raise',sidestretch:'Side stretch',squat:'Squat',toetouch:'Toe touch',jacks:'Star jacks',kneelift:'Knee lift'};
/**
 * The morning exercises at phase u (0–1) (Trung Bao, 2026-10-14: a set of six for exercising together), unhurried like a
 * radio exercise class, on the floor, the arms on their own sides, each move eased into and out of its ends.
 *
 * Arm raise: both arms sweep up at the sides from the hips to overhead and back down, the knees giving as they come
 * down, the head lifting with them. Side stretch: feet apart, the body tips one way then the other, the arm on the far
 * side of the bend reaching up overhead. Squat: down with the knees forward and the body leaning to balance, the arms
 * lifting out level, and back up. Toe touch: arms up and tall, then a fold from the waist reaching down to the toes,
 * the knees soft, and up again. Star jacks: step the feet apart and the arms up overhead to a star, then back together
 * (the feet never leave the floor). Knee lift: one knee up, then the other, the opposite arm reaching up with each.
 */
function exerciseAngles(cycle:ExerciseCycle,u:number){
 const swing=(phase=0)=>ease((1-Math.cos(Math.PI*2*(u+phase)))/2),pose=(d:Omit<PoseDef,'name'|'kind'|'from'>)=>poseAngles({name:cycle,kind:'stand',from:'',...d});
 const arms=(up:number,lo:Limb,hi:Limb):{near:Limb;far:Limb}=>{const l=mixLimb(lo,hi,up);return {near:l,far:[-l[0],-l[1]]};};
 if(cycle==='armraise'){
  const up=swing(),bob=8*(1-up);
  return pose({arm:arms(up,[8,14],[170,176]),leg:{near:[6+.6*bob,2-bob],far:[-6+.6*bob,-8-bob]},head:-2+8*up});
 }
 if(cycle==='sidestretch'){
  const s=Math.sin(Math.PI*2*u),near=((1-s)/2)**2,far=((1+s)/2)**2;
  return pose({arm:{near:mixLimb([20,62],[158,176],near),far:mixLimb([-20,-62],[-158,-176],far)},leg:{near:[13,8],far:[-13,-18]},lean:17*s,head:-5*s});
 }
 if(cycle==='squat'){
  const d=swing();
  return pose({arm:arms(d,[10,20],[88,96]),leg:{near:[6+68*d,2-52*d],far:[-2+62*d,-8-54*d]},lean:20*d,head:-4*d});
 }
 if(cycle==='toetouch'){
  const d=swing();
  return pose({arm:arms(d,[166,175],[6,9]),leg:{near:[4+6*d,0-6*d],far:[-4+6*d,-6-6*d]},lean:44*d,head:6-14*d});
 }
 if(cycle==='jacks'){
  const j=swing(),bob=5*Math.sin(Math.PI*j);
  return pose({arm:arms(j,[8,14],[162,178]),leg:{near:[4+16*j+.6*bob,2+12*j-bob],far:[-4-16*j+.6*bob,-6-20*j-bob]},head:4*j});
 }
 // Knee lift: each knee in turn (a smooth bump each half), the opposite arm up.
 const near=((1+Math.cos(Math.PI*2*(u-.25)))/2)**2,far=((1+Math.cos(Math.PI*2*(u-.75)))/2)**2;
 return pose({arm:{near:[22+128*far,42+122*far],far:[-22-128*near,-42-122*near]},leg:{near:[4+80*near,-2-6*near],far:[-4+80*far,-10-2*far]},lean:3*(near+far),head:2});
}
/** The cycles that leave the floor (a hop, the flips): they start and end a pose change only at their rest moment. */
export const bounces=(cycle?:ParadeCycle)=>cycle==='hop'||cycle==='backflip'||cycle==='frontflip';
const seg=(u:number,a:number,b:number)=>Math.min(1,Math.max(0,(u-a)/(b-a))),mix=(a:number,b:number,k:number)=>a+(b-a)*k,mixLimb=(a:Limb,b:Limb,k:number):Limb=>[mix(a[0],b[0],k),mix(a[1],b[1],k)];
/** In and out again: 0 before a, up to 1 by b, held, back to 0 from c to d (smooth at every end). */
const bump=(u:number,a:number,b:number,c:number,d:number)=>ease(seg(u,a,b))*(1-ease(seg(u,c,d)));
/**
 * A hop or a flip at phase u (0–1): local angles, the height off the floor (m, for a 2.6 m figure) and `pivot`. Each
 * is at rest at u = 0, on the floor and not moving, so a pose change can start and end there (Parade.tsx waits for it).
 *
 * Hop on the spot (Trung Bao: unhurried and smooth; u = 0 at the bottom of the bounce, knees bent): the knees straighten and the body springs up, the
 * feet leave the floor with the legs still straightening, tuck a little at the top and reach for the floor again, the
 * arms flapping up and out on their own sides and down again; landing, the knees take the weight back to the bottom.
 *
 * Flips (lấy đà, power, a full turn, a landing): a deep crouch with the arms swung down and back, the legs driving
 * straight and the arms shooting up overhead as it leaves the floor, then a tight tuck, knees to the chest and hands
 * at the shins, that turns the whole body once round its hips (a back flip turns backward, counter-clockwise on the
 * screen, the head going back first; a front flip clockwise, the head going forward), opening out, arms wide, legs
 * reaching down a little bent, landing on its feet and squashing into the knees, then standing up. `pivot` 1: the
 * hips carry the flight (they stay on its arc while the body turns round them); 0: the lowest point does, as for
 * every other pose. Gravity: the height is a parabola, fastest off the floor, still at the top, fastest into the
 * landing.
 */
export function bounceFrame(cycle:'hop'|'backflip'|'frontflip',u:number):ParadeFrame{
 u=u-Math.floor(u);
 if(cycle==='hop'){
  const c=Math.cos(Math.PI*2*u),bend=((1+c)/2)**2,up=(1-c)/2,s=seg(u,.28,.72);
  const leg=(t:number):Limb=>{const thigh=t+34*bend+10*up;return [thigh,thigh-66*bend-24*up];};
  const arm=(out:1|-1):Limb=>[out*(18+40*up),out*(40+70*up)];
  return {angles:poseAngles({name:cycle,kind:'stand',from:'',arm:{near:arm(1),far:arm(-1)},leg:{near:leg(4),far:leg(-2)},lean:6*bend-2*up,head:-4*bend+3*up}),lift:s>0&&s<1?.32*Math.pow(4*s*(1-s),1.8):0};
 }
 const back=cycle==='backflip',turn=back?1:-1,{wind,sink,hold,push,leave,top,land,settle}=flipTimeline;
 // Lấy đà, deliberately: the arms swing up in front (the wind-up), then down and back as the body sinks into a deep
 // crouch, which it holds a moment; then the push.
 const windUp=bump(u,wind,sink,sink,sink+.08),crouch=bump(u,sink,hold,push,leave+.02);
 // Landing: the knees start to give just before the feet touch, take it softly and deep, and it stands up slowly.
 const absorb=bump(u,land-.03,land+.05,land+.05,settle),knees=crouch+.9*absorb;
 const tuck=bump(u,leave+.04,leave+.15,top+.05,land-.04),reach=bump(u,push-.03,leave+.02,leave+.04,leave+.16),open=bump(u,top+.05,land-.04,land+.03,settle),landing=bump(u,top+.06,land-.04,land+.02,settle);
 const rest={arm:[8,14] as Limb,leg:[3,0] as Limb};
 const arm=(out:1|-1):Limb=>{
  let a:Limb=[out*rest.arm[0],out*rest.arm[1]];
  a=mixLimb(a,[out*80,out*96],windUp);
  a=mixLimb(a,out>0?[4,32]:[-48,-62],bump(u,sink+.04,hold,push,leave));
  a=mixLimb(a,back?[out*172,out*178]:[out*152,out*166],reach);
  a=mixLimb(a,[out*60,out*110],tuck);
  return mixLimb(a,[out*102,out*112],open);
 };
 const leg=(near:boolean):Limb=>{
  let l:Limb=near?rest.leg:[-rest.leg[0],-rest.leg[0]];
  l=mixLimb(l,near?[24,-14]:[18,-20],landing);
  l=mixLimb(l,near?[115,-10]:[105,-18],tuck);
  return [l[0]+62*knees+6*windUp,l[1]-8*knees];
 };
 const sp=seg(u,leave,land-.02),fl=seg(u,leave,land);
 const angles=poseAngles({name:cycle,kind:'jump',from:'',arm:{near:arm(1),far:arm(-1)},leg:{near:leg(true),far:leg(false)},lean:22*crouch-3*windUp+(back?-8:7)*reach+18*tuck+12*absorb,head:-6*crouch+3*windUp+(back?9:-5)*reach-10*tuck});
 // A full turn (2π, the same as none, so it is dropped once it is complete), easing in and out (smootherstep).
 angles.root=sp>0&&sp<1?turn*Math.PI*2*ease(sp):0;
 // The height: a parabola (gravity), its start and its end eased a little so neither leaving nor landing is a jolt.
 const lift=fl>0&&fl<1?1.3*4*fl*(1-fl)*ease(fl/.22)*ease((1-fl)/.2):0;
 return {angles,lift,pivot:bump(u,leave,leave+.08,land-.1,land)};
}
/**
 * A flip's timing, as shares of its cycle (Trung Bao, 2026-10-14, second round: smoother, a little slower, the
 * anticipation more deliberate): the wind-up from `wind`, sinking into the crouch from `sink`, held from `hold`, the
 * push from `push`, off the floor at `leave`, the top of the flight at `top`, down at `land`, standing at `settle`.
 */
export const flipTimeline={wind:.03,sink:.15,hold:.36,push:.42,leave:.48,top:.64,land:.8,settle:.97};
/** Seconds per round of a pose's cycle: its own (a dance or a cheer together), else the cycle's. */
export const periodOf=(p:ParadePose)=>p.period??cyclePeriod[p.cycle!];
/** Where a cycle is at time t: its phase (a whole number at a hop's or a flip's rest moment). */
export const cyclePhase=(p:ParadePose,t:number)=>t/periodOf(p)+p.phase/(Math.PI*2);
/** A cycle's frame at phase u: walk, run and dance on the floor (cycleAngles), the hop and the flips (bounceFrame). */
export const cycleFrame=(cycle:ParadeCycle,u:number):ParadeFrame=>cycle==='hop'||cycle==='backflip'||cycle==='frontflip'?bounceFrame(cycle,u):{angles:cycleAngles(cycle,u),lift:0};
/** A hop's or a flip's frame at its rest moment (any other pose: its frame at time 0). */
export const restFrame=(p:ParadePose):ParadeFrame=>p.cycle&&bounces(p.cycle)?bounceFrame(p.cycle,0):paradeFrame(p,0);
/** The first moment from t on that a hop or a flip is at rest (any other pose: t itself). */
export function restAt(p:ParadePose,t:number){
 if(!bounces(p.cycle))return t;
 return (Math.ceil(cyclePhase(p,t)-1e-6)-p.phase/(Math.PI*2))*periodOf(p);
}
/** The pose, a hop or a flip timed to be at its rest moment at time `at` (any other pose unchanged). */
export function alignCycle(p:ParadePose,at:number):ParadePose{
 if(!bounces(p.cycle))return p;
 const x=at/periodOf(p);return {...p,phase:-Math.PI*2*(x-Math.floor(x))};
}
/**
 * Moments together (Trung Bao, 2026-10-14): every so often the whole cast does one thing at once for a while (Parade.tsx,
 * Sync every and Sync for), one of these at random: walking, jogging like a marathon, dancing (one dance for all, a
 * different one each time), cheering (each at its own rate), standing and waving (all the same arm) or a morning
 * exercise (one of six for all, a different one each time). They move
 * together, each a little ahead or behind the others (`syncSpread`), so it reads as one movement with life in it.
 */
export type SyncMode='walk'|'jog'|'dance'|'cheer'|'wave'|'exercise';
export const syncModes:SyncMode[]=['walk','jog','dance','cheer','wave','exercise'];
export const syncModeNames:Record<SyncMode,string>={walk:'Walking',jog:'Jogging',dance:'Dancing',cheer:'Cheering',wave:'Waving',exercise:'Morning exercise'};
export const syncDances:FloorCycle[]=['dance','disco','robot','twist','armwave','charleston'];
/** How far ahead or behind of the others each one is, at most (a share of the movement's round). */
export const syncSpread=.06;
/** The cheer's rates (seconds per punch): each cheerer its own, within this range. */
export const cheerRates=[.6,.85] as const;
const jogDef:PoseDef={name:'Jog (together)',kind:'step',from:'a marathon',arm:{near:[30,110],far:[-30,-110]},leg:{near:[30,0],far:[-24,-80]},lean:6,cycle:'jog'};
const cheerDef:PoseDef={name:'Cheer (together)',kind:'stand',from:'cheering together',arm:{near:[150,165],far:[-150,-165]},leg:{near:[12,6],far:[-8,-16]},cycle:'cheer'};
const standDef:PoseDef={name:'Stand (together)',kind:'stand',from:'standing together',arm:{near:[10,24],far:[-10,-24]},leg:{near:[5,1],far:[-5,-7]},head:3};
/**
 * The pose a character takes for a moment together: `dance` is the dance everyone dances this time, `exercise` the
 * exercise everyone does, `side` the arm everyone waves; `r` the randomness (how far ahead or behind each one is, each
 * cheerer's rate).
 */
export function syncPose(mode:SyncMode,r:()=>number,{dance='dance',exercise='armraise',side='L'}:{dance?:FloorCycle;exercise?:ExerciseCycle;side?:'L'|'R'}={}):ParadePose{
 const offset=()=>(r()*2-1)*syncSpread*Math.PI*2;
 if(mode==='exercise'){const p=holdPose({name:exerciseNames[exercise],kind:'stand',from:'morning exercise',arm:{near:[8,14],far:[-8,-14]},leg:{near:[5,1],far:[-5,-7]},cycle:exercise},r);return {...p,phase:offset()};}
 if(mode==='walk'||mode==='jog'){const p=holdPose(mode==='walk'?paradePoses.find(d=>d.cycle==='walk')!:jogDef,r);return {...p,phase:offset()};}
 if(mode==='dance'){const p=holdPose(paradePoses.find(d=>d.cycle===dance)!,r);return {...p,phase:offset()};}
 if(mode==='cheer'){const p=holdPose(cheerDef,r);return {...p,phase:offset(),period:cheerRates[0]+r()*(cheerRates[1]-cheerRates[0])};}
 const p=holdPose(standDef,r),other=side==='L'?'R':'L',plain=poseAngles(standDef);
 // Everyone waves the same arm (a random wave from holdPose on the other arm is put down again).
 if(p.wave===other){p.angles[`upperarm_${other}`]=plain[`upperarm_${other}`];p.angles[`forearm_${other}`]=plain[`forearm_${other}`];}
 raiseWave(p,side,r);return {...p,phase:offset()};
}
/** In the air: jumps and floats; on the floor: standing and stepping. */
export const airborne=(kind:ParadeKind)=>kind==='jump'||kind==='float';
/**
 * How much of the cast is moving, shared evenly by all the moving poses (Trung Bao, 2026-10-14): first the share the
 * walk, the run and the dance had between them (3.8%, about one character in 26) as the hop, the flips and the dances
 * came in (more variety, not more moving); then 15 points more (18.8%, about one in five).
 */
export const movingShare=.25/19+.5/20+.15;
/**
 * Each pose's chance within its half (on the floor or in the air, chosen first): each kind half of its half; each
 * moving pose its even part of movingShare; the held poses of a kind sharing the rest of the kind evenly.
 */
const weights=(()=>{
 const moving=paradePoses.filter(p=>p.cycle),each=movingShare/moving.length/.5;
 return new Map(paradePoses.map(p=>{
  if(p.cycle)return [p,each];
  const kind=paradePoses.filter(q=>q.kind===p.kind),held=kind.filter(q=>!q.cycle).length;
  return [p,(.5-each*(kind.length-held))/held];
 }));
})();
const weightOf=(p:PoseDef)=>weights.get(p)!;
/**
 * A pose for the wall that no one else is holding (`used`: names): in the air with chance `air`, on the floor
 * otherwise, then any pose of that half (by weight). `allow`: only poses it passes.
 */
export function pickPose(used:Set<string>,r:()=>number,air=.5,allow:(p:PoseDef)=>boolean=()=>true):PoseDef{
 // A free pose of the chosen half; else a free one of the other half; only when every pose is held, any of the half.
 const up=r()<air,poses=paradePoses.filter(allow),half=poses.filter(p=>airborne(p.kind)===up),free=half.filter(p=>!used.has(p.name)),other=poses.filter(p=>airborne(p.kind)!==up&&!used.has(p.name)),pool=free.length?free:other.length?other:half.length?half:poses;
 let x=r()*pool.reduce((sum,p)=>sum+weightOf(p),0);
 for(const p of pool){x-=weightOf(p);if(x<0)return p;}
 return pool[pool.length-1];
}
/**
 * The chance a character's next pose is in the air, keeping the wall mixed: towards half the cast in the air, and
 * away from what both neighbours are doing, so neither the floor nor the air fills up in one stretch.
 */
export function airChance(airShare:number,neighbours:boolean[]){
 let p=.5+(.5-airShare)*1.6;
 if(neighbours.length&&neighbours.every(n=>n))p*=.35;
 else if(neighbours.length&&neighbours.every(n=>!n))p=1-(1-p)*.35;
 return Math.min(.9,Math.max(.1,p));
}
/** The cast's first poses: all different and mixed the same way. Drawn from the cast's labels, so the same cast starts the same. */
export function castPoses(labels:string[]):ParadePose[]{
 const r=rng(`${labels.join('|')}|parade`),used=new Set<string>(),out:ParadePose[]=[];
 for(let i=0;i<labels.length;i++){
  const up=out.filter(p=>airborne(p.kind)).length,share=out.length?up/out.length:.5,prev=out.slice(-2).map(p=>airborne(p.kind));
  const def=pickPose(used,r,airChance(share,prev.length===2?prev:[]));used.add(def.name);out.push(holdPose(def,r));
 }
 return out;
}
/**
 * The pose at time t (s): the held angles plus a slow motion, and the height off the floor. Everyone breathes (body,
 * head, arms); steppers pulse in their stride; jumpers bob at the top of their jump; floaters drift up and down and let
 * their limbs sway. Amplitudes stay small: the pose is always the one that was picked.
 */
export function paradeFrame(p:ParadePose,t:number):ParadeFrame{
 const w=Math.PI*2/3.8*p.pace,s=(k:number,phase=0)=>Math.sin(w*k*t+p.phase+phase);
 // A cycle moves through its stride; a hop and a flip carry their own height (and turn); the held poses keep their angles.
 if(p.cycle&&bounces(p.cycle))return cycleFrame(p.cycle,cyclePhase(p,t));
 const a=p.cycle?cycleAngles(p.cycle as FloorCycle,cyclePhase(p,t)):{...p.angles};
 if(p.cycle){a.spine_lower+=.012*s(1);return {angles:a,lift:0};}
 a.spine_lower+=.018*s(1);a.head+=.035*s(1,.8);
 for(const side of ['L','R'] as const){const off=side==='L'?0:1.7;a[`upperarm_${side}`]+=.045*s(1,.4+off);a[`forearm_${side}`]+=.04*s(1.3,1.1+off);}
 let lift=p.lift;
 if(p.kind==='step'){const pulse=s(1.4,.3);a.thigh_L+=.035*pulse;a.thigh_R-=.035*pulse;a.upperarm_L-=.04*pulse;a.upperarm_R+=.04*pulse;}
 if(p.kind==='jump'){lift+=.07*s(.9,.5);a.shin_L+=.04*s(.9,1.2);a.shin_R+=.04*s(.9,2.1);}
 if(p.kind==='float'){lift+=.13*s(.6,.5);for(const [id,k,ph] of [['upperarm_L',.06,0],['upperarm_R',.06,2],['thigh_L',.05,1],['thigh_R',.05,3],['shin_L',.06,1.6],['shin_R',.06,2.6]] as const)a[id]+=k*s(.75,ph);}
 // The wave: the hand swings side to side from the elbow, the upper arm going with it a little.
 if(p.wave){const out=p.wave==='L'?1:-1,beat=Math.sin(Math.PI*2*t/wavePeriod+p.phase);a[`forearm_${p.wave}`]+=out*rad(waveArm.swing)*beat;a[`upperarm_${p.wave}`]+=out*.06*Math.sin(Math.PI*2*t/wavePeriod+p.phase-.6);}
 return {angles:a,lift};
}
/** Smooth start and stop for a pose change (0 → 1). */
export const ease=(x:number)=>{const t=Math.min(1,Math.max(0,x));return t*t*t*(t*(t*6-15)+10);};
/** Between two posed frames: angles and lift blended by k (0 = from, 1 = to; past 1 overshoots). */
export function blendFrames(from:ParadeFrame,to:ParadeFrame,k:number){
 const angles:Record<string,number>={};for(const id of new Set([...Object.keys(from.angles),...Object.keys(to.angles)]))angles[id]=(from.angles[id]??0)+((to.angles[id]??0)-(from.angles[id]??0))*k;
 return {angles,lift:from.lift+(to.lift-from.lift)*k};
}
/**
 * A pose change, as shares of its length (Trung Bao, 2026-10-14: anticipation, gravity, overshoot): a crouch into the
 * take-off (lấy đà), a flight on a parabola (fast off the floor, still at the top, fast into the landing), then the
 * pose goes a little past the new one and settles back.
 */
export const changeTimeline={takeoff:.24,release:.14,land:.78,overshoot:.16,squash:.55};
/**
 * A fall from the air onto the floor (any change from a jump or a float to a pose on the floor, into a moment together
 * or not; Trung Bao, 2026-10-14: fast, with gravity, heavy in the legs): it drops in `seconds` (from still, faster and
 * faster), the legs reaching for the floor as it falls (settling into their new pose over `legs` times that), and lands heavily: the knees crouch `depth` times a crouch,
 * fastest at `peak` of the rest of the change (bracing from `brace` of the fall, just before the feet touch), and stand
 * up again slowly by its end, the torso dipping a little; the
 * upper body carries on into its new pose as if nothing happened.
 */
export const fallTimeline={seconds:.3,legs:3,brace:.7,depth:1.15,peak:.2,spine:.08};
/**
 * The landing's give: in fast, out slowly (an alpha curve, eased away over the second half), 0 → 1 → 0 over v 0–1; its
 * first few frames ease in, so the knees take the weight hard but never snap.
 */
const landing=(v:number)=>v<=0||v>=1?0:(v/fallTimeline.peak)*Math.exp(1-v/fallTimeline.peak)*(1-ease((v-.5)/.5))*ease(v/.1);
const legJoint=(id:string)=>id.startsWith('thigh_')||id.startsWith('shin_');
/**
 * The crouch, in local radians, with the range each joint keeps while it is added: knees forward and bent, the body
 * dipped forward, the arms dropped toward the sides and folded (each on its own side, never across the body).
 */
const crouchPose:Record<string,{d:number;lo:number;hi:number}>={
 thigh_L:{d:.5,lo:-Math.PI,hi:2},thigh_R:{d:.5,lo:-Math.PI,hi:2},shin_L:{d:-.95,lo:-2.35,hi:.05},shin_R:{d:-.95,lo:-2.35,hi:.05},
 spine_lower:{d:-.16,lo:-Infinity,hi:Infinity},head:{d:.06,lo:-Infinity,hi:Infinity},
 upperarm_L:{d:-.45,lo:0,hi:Math.PI},upperarm_R:{d:.45,lo:-Math.PI,hi:0},forearm_L:{d:.35,lo:-.1,hi:2.8},forearm_R:{d:-.35,lo:-2.8,hi:.1},
};
/**
 * x plus d, but never past lo or hi: the step shrinks smoothly as the joint nears its limit (room·(1 − e^(−|d|/room))),
 * so a joint eases into a limit instead of hitting a stop (a stop is a sudden change of speed, a visible jerk).
 */
const softAdd=(x:number,d:number,lo:number,hi:number)=>{
 if(d<0){const room=x-lo;return room===Infinity?x+d:room>1e-6?x-room*(1-Math.exp(d/room)):x;}
 if(d>0){const room=hi-x;return room===Infinity?x+d:room>1e-6?x+room*(1-Math.exp(-d/room)):x;}
 return x;
};
/**
 * How each body part follows a change (Trung Bao, 2026-10-14: each part with its own overshoot and easing, by how much
 * it changes; seamless, nothing sudden). Overlapping action: the torso and thighs lead, the upper arms a moment after,
 * the head and shins after them, the forearms last, each later the more it has to move (`followLag`, shares of the
 * flight). Each part then moves like a spring set going from still: its overshoot is larger the more it changes (2%
 * of the change for a twitch, 18% for a big swing, never more than about 17°), the spring's swing past the new pose and
 * back, and in the last 28% of its time the rest of the swing is eased away, so it arrives on the new pose exactly,
 * moving no more, when the change ends.
 */
export const followLag:Record<string,number>={spine_lower:0,root:0,thigh:.02,upperarm:.03,head:.06,shin:.06,forearm:.09};
const lagOf=(id:string)=>followLag[id]??followLag[id.replace(/_[LR]$/,'')]??.03;
/**
 * How far through its own change a part is (0 → 1, past 1 while it overshoots) at k, for a change of `delta` (rad).
 * `glide`: a change without a hop (into a moment together): it starts at once, from still and gathering speed gently
 * (the spring set going along a smoothstep, so not even its acceleration jumps).
 */
export function follow(id:string,delta:number,k:number,glide=false){
 const begin=glide?0:changeTimeline.takeoff,size=Math.abs(delta),s=Math.min(1,size/1.2),lag=lagOf(id)*(.5+s),x=Math.min(1,Math.max(0,(k-begin-lag)/(1-begin-lag)));
 if(x<=0)return 0;if(x>=1)return 1;
 // The overshoot asked for sets the spring's damping (ζ); its first swing past the new pose comes at 62% of its time.
 const over=Math.max(.02,Math.min(.04+.14*s,size>1e-6?.3/size:1)),l=Math.log(over),zeta=-l/Math.sqrt(Math.PI*Math.PI+l*l),wd=Math.PI/.62,w=wd/Math.sqrt(1-zeta*zeta);
 const y=glide?x*x*(3-2*x):x,spring=1-Math.exp(-zeta*w*y)*(Math.cos(wd*y)+zeta*w/wd*Math.sin(wd*y));
 return 1-(1-spring)*(1-ease((x-.72)/.28));
}
/** How far a part may go when it overshoots: knees never past straight, elbows never folding inward (local radians). */
const overshootRoom:Record<string,[number,number]>={shin_L:[-2.35,.02],shin_R:[-2.35,.02],forearm_L:[-.05,2.8],forearm_R:[-2.8,.05]};
/**
 * The pose k (0–1) of the way through a change from one pose to the next, at time t, with a hop of `hop` (m, for a
 * 2.6 m figure) at the top of the flight. Landing on the floor, the feet stay planted (the rig stands its lowest point
 * on the floor) and the body takes the overshoot: a squash at the knees, within limits. Landing in the air, the torso
 * and the bottom piece lock at the new pose (its height and lean, no overshoot) and the limbs and head overshoot.
 * Each part keeps its own time and overshoot through the change (follow).
 *
 * `glide` (into a moment together, Trung Bao: no jumping up and down to get in step): no crouch, no hop, the feet
 * staying on the floor, every part on its own eased curve from the first moment. From the air onto the floor (glide or
 * not), it falls instead (fallTimeline). `duration`: the change's seconds. (The step slides into time only for the
 * strides, walk, jog and run; a dance or an exercise already in it morphs like any other, as sliding would rush it.) Going into
 * the same movement it is already doing (walking into walking together), it does not blend two strides: it simply
 * eases its step into time with the others (the cycle's phase slides over, the stride stays whole).
 */
export function changeFrame(from:ParadePose,to:ParadePose,k:number,t:number,hop=.5,since=0,glide=false,duration=1.6){
 if(glide&&from.cycle&&from.cycle===to.cycle&&(from.cycle==='walk'||from.cycle==='jog'||from.cycle==='run')){
  const e=ease(k),uf=cyclePhase(from,t),ut=cyclePhase(to,t),u=uf+(ut-uf-Math.round(ut-uf))*e,at=(p:ParadePose)=>({...p,phase:Math.PI*2*(u-t/periodOf(p))});
  return blendFrames(paradeFrame(at(from),t),paradeFrame(at(to),t),e);
 }
 // The old pose's own motion (a cycle, a breath) eases to a stop as it blends out, and the new one's starts from still
 // (`since`: seconds since the change began, so the change lasts since/k). The old clock's speed falls as (1 − k)²,
 // never backwards; the new one's rises as 4k − 3k² and meets the plain clock exactly when the change ends, so a
 // running leg never adds its speed to the jump and nothing skips at the hand-over.
 // A hop or a flip changes only at its rest moment (Parade.tsx waits for it, and times the next one to be at its own
 // when the change ends): it holds its rest frame through the change, on the floor.
 const slow=k>1e-6?(1-Math.pow(1-k,3))/(3*k):1,start=t-since,{takeoff,release,land,squash}=changeTimeline;
 const a=bounces(from.cycle)?restFrame(from):paradeFrame(from,start+since*slow),b=bounces(to.cycle)?restFrame(to):paradeFrame(to,t-since*(1-k)*(1-k)),grounded=!airborne(to.kind)||bounces(to.cycle);
 // Falling from the air onto the floor: down by gravity in fallTimeline.seconds, the legs reaching for the floor by
 // then, the upper body moving on into its new pose; then the heavy landing in the legs.
 if(airborne(from.kind)&&!bounces(from.cycle)&&grounded){
  const landK=Math.min(.4,fallTimeline.seconds/duration),fall=Math.min(1,k/landK),legs=Math.min(1,k/Math.min(1,landK*fallTimeline.legs)),brace=landK*fallTimeline.brace,hit=landing((k-brace)/(1-brace)),f:Record<string,number>={};
  for(const id of new Set([...Object.keys(a.angles),...Object.keys(b.angles)])){
   const from=a.angles[id]??0,to=b.angles[id]??0,q=follow(id,to-from,legJoint(id)?legs:k,true),room=overshootRoom[id];
   f[id]=q<=1?from+(to-from)*q:room?softAdd(to,(to-from)*(q-1),room[0],room[1]):to+(to-from)*(q-1);
  }
  for(const id of ['thigh_L','thigh_R','shin_L','shin_R']){const {d,lo,hi}=crouchPose[id];f[id]=softAdd(f[id]??0,d*fallTimeline.depth*hit,lo,hi);}
  f.spine_lower=(f.spine_lower??0)-fallTimeline.spine*hit;
  return {angles:f,lift:k<landK?a.lift*(1-fall*fall):0};
 }
 const crouch=glide?0:k<takeoff?ease(k/takeoff):k<takeoff+release?1-ease((k-takeoff)/release):0;
 const u=Math.min(1,Math.max(0,(k-takeoff)/(land-takeoff))),v=Math.min(1,Math.max(0,(k-land)/(1-land)));
 const p=glide?ease(k):k<takeoff?0:k<land?ease(u):1;
 const knees=!glide&&grounded&&k>=land?squash*Math.sin(Math.PI*v)*(1-.3*v):0,bend=crouch+knees;
 const locked=blendFrames(a,b,p),f:{angles:Record<string,number>}={angles:{}};
 for(const id of new Set([...Object.keys(a.angles),...Object.keys(b.angles)])){
  // The body's core (torso lean, the whole body's turn) never overshoots in the air (it locks at the new pose as it
  // lands); on the floor the squash carries it. Every other part follows in its own time, past the new pose and back,
  // within the joint's room.
  const from=a.angles[id]??0,to=b.angles[id]??0,q=follow(id,to-from,k,glide);
  if(!grounded&&(id==='spine_lower'||id==='root')){f.angles[id]=locked.angles[id];continue;}
  const room=overshootRoom[id];
  f.angles[id]=q<=1?from+(to-from)*q:room?softAdd(to,(to-from)*(q-1),room[0],room[1]):to+(to-from)*(q-1);
 }
 for(const [id,{d,lo,hi}] of Object.entries(crouchPose))f.angles[id]=softAdd(f.angles[id]??0,d*bend,lo,hi);
 // Gravity: 4h·u(1−u) is a parabola, rising fastest at take-off and still at its top. The new pose's height is
 // reached without overshoot, on the floor (never below it) and in the air (the body locks there). A floater dips as
 // it gathers itself.
 const base=locked.lift,flight=!glide&&k>takeoff&&k<land?4*hop*u*(1-u):0;
 return {angles:f.angles,lift:Math.max(0,base+flight-(airborne(from.kind)&&!bounces(from.cycle)?.12*crouch:0))};
}
/**
 * The swap (Trung Bao, 2026-10-14): now and then one character leaves by shooting off the top of the canvas and the
 * next of the cast comes in by shooting up from below it and landing on its feet in the same spot. Both fly as a
 * pencil, straight body, legs together, arms straight down at the sides, and stretch with the speed (squash and
 * stretch), so the jump has power: no floating.
 */
export const pencil:ParadePose={name:'Pencil',kind:'jump',lift:0,phase:0,pace:1,
 angles:poseAngles({name:'Pencil',kind:'jump',from:'',arm:{near:[7,7],far:[-7,-7]},leg:{near:[3,3],far:[-3,-3]}})};
/**
 * Leaving, k 0–1 over the exit: half of it a deep crouch (lấy đà, 2.4 times a pose change's, the body squashed), then
 * an explosive snap into the pencil (12% of the exit) and the launch: from 56% on it shoots up at full speed, a little
 * faster all the way (rise · s^1.2), stretched tall, gone off the top long before it would slow. `rise` (m, for a 2.6 m
 * figure) must clear the top edge. `stretch`: [width, height] factors for the figure.
 */
export const swapTimeline={crouchEnd:.5,snap:.12,launch:.56,crouch:2.4,entryLand:.7,entryOpen:.25};
/** The pencil holds dead still: no breath, no bob. */
const pencilFrame=():ParadeFrame=>({angles:{...pencil.angles},lift:0});
const crouchBy=(f:{angles:Record<string,number>},amount:number)=>{for(const [id,{d,lo,hi}] of Object.entries(crouchPose))f.angles[id]=softAdd(f.angles[id]??0,d*amount,lo,hi);};
export function exitFrame(from:ParadePose,k:number,t:number,rise:number,since=0){
 const {crouchEnd,snap,launch,crouch:deep}=swapTimeline;
 const crouch=k<crouchEnd?ease(k/crouchEnd):1-ease((k-crouchEnd)/snap),fire=ease((k-crouchEnd)/snap);
 // The old pose's motion slows to still as it gathers itself (as in changeFrame).
 const slow=k>1e-6?(1-Math.pow(1-k,3))/(3*k):1,a=paradeFrame(from,t-since+since*slow);
 const f=blendFrames(a,pencilFrame(),fire);crouchBy(f,crouch*deep);
 const s=Math.min(1,Math.max(0,(k-launch)/(1-launch)));
 return {angles:f.angles,lift:a.lift+rise*Math.pow(s,1.2),stretch:[1+.06*crouch-.1*fire,1-.1*crouch+.22*fire] as [number,number]};
}
/**
 * Coming in, k 0–1 over the entry: a pencil shooting up from `depth` below the floor (out of sight under the canvas),
 * stretched while it is fast, on a gravity arc up to `apex` above the floor (a parabola: fastest at the bottom, still
 * at the top) and down onto it at entryLand. Near the top it opens into its pose; landing, the limbs overshoot and
 * settle, the knees and the body take a squash, the feet stay on the floor.
 */
export function entryFrame(ground:ParadePose,k:number,t:number,depth:number,apex=.6){
 const {entryLand:land,entryOpen}=swapTimeline,{overshoot,squash}=changeTimeline,u=Math.min(1,k/land),v=Math.min(1,Math.max(0,(k-land)/(1-land)));
 const q=Math.sqrt((apex+depth)/apex),top=q/(1+q),c=apex/((1-top)*(1-top)),open=Math.max(0,top-entryOpen);
 const lift=k<land?apex-c*(u-top)*(u-top):0;
 const p=k<land?ease((u-open)/(1-open)):1+overshoot*Math.sin(Math.PI*v)*(1-v),f=blendFrames(pencilFrame(),paradeFrame(ground,t),p);
 const hit=k>=land?Math.sin(Math.PI*v)*(1-.3*v):0;crouchBy(f,squash*hit);
 // Stretched by its speed on the way up (most at the bottom, none at the top), squashed a moment as it lands.
 const fast=k<land&&u<top?1-u/top:0;
 return {angles:f.angles,lift,stretch:[1-.08*fast+.05*hit,1+.18*fast-.08*hit] as [number,number]};
}

import {rng,type CharacterSpec} from './model';
import {rules} from './rules';
/**
 * Body types (Nam, 2026-10-14): art direction for proportions, from the archetypes Nam picked on
 * docs/proportion-plan.html. Each character gets one, drawn from its name with the weights in the Rules panel; the
 * Geofolk of today has the largest share. A type scales the head, body height and width (with a taper from shoulders
 * to bottom), arm and leg length, limb thickness, hands and feet and the neck, on top of the Proportions sliders, and
 * prefers a build and body shapes when the character is generated (those are kept in the seed like any shape).
 * Not stored in the seed: the same name and weights always give the same type.
 */
export interface BodyType {
 id:string;name:string;vi:string;
 /** Multipliers: head size, body height, body width, shoulder:bottom taper, arm and leg length, limb thickness, hands and feet, neck length. */
 head:number;torsoL:number;torsoW:number;taper:number;arms:number;legs:number;thick:number;ends:number;neck:number;
 /** Preferred build and shapes (bodyShapes indices: 0 Circle, 1 Block, 4 Funnel, 6 Donut, 7 Diamond). */
 body?:{build:number;top:number[];bottom?:number[]};
 /** Retired: never drawn; it keeps its place (seeds store the index) and opens as this type instead. */
 retired?:string;
}
const t=(id:string,name:string,vi:string,d:Partial<BodyType>={}):BodyType=>({id,name,vi,head:1,torsoL:1,torsoW:1,taper:1,arms:1,legs:1,thick:1,ends:1,neck:1,...d});
// Builds by number (model.ts imports this file, so its constants are not ready here): 0 Single, 2 Big top, 3 Big bottom.
const single=0,bigTop=2,bigBottom=3;
export const bodyTypes:BodyType[]=[
 t('today','Geofolk today','Hiện tại'),
 t('orb','Orb & Strings','Hạt nhân & dây',{head:.8,torsoL:.45,torsoW:.55,arms:1.75,legs:1.05,thick:.65,ends:.8,body:{build:single,top:[0,6]}}),
 t('baby','Bobble Baby','Em bé đầu to',{head:1.9,torsoL:.8,torsoW:.95,arms:.6,legs:.42,thick:1.2,ends:1.1,body:{build:single,top:[0]},retired:'today'}),
 // Bobble Baby retired (Trung Bao, 2026-10-14): "get rid of these baby proportions".
 // Lollipop's head down from 2.3 (then 1.5) and Brick's limbs, joints, hands and feet slimmed from 1.4 / 1.3 (Trung Bao, 2026-10-14:
 // the big head, and the Brick's joints and legs too big and messy).
 t('lolly','Lollipop','Kẹo mút',{head:1.1,torsoL:.5,torsoW:.45,arms:.8,legs:.72,thick:.55,ends:.8,body:{build:single,top:[1]}}),
 t('brick','Brick','Viên gạch',{head:.85,torsoL:1.3,torsoW:1.5,arms:.8,legs:.45,thick:.95,ends:.95,body:{build:single,top:[1]}}),
 t('wedge','Wedge Hero','Tam giác ngược',{head:.75,torsoL:1.15,torsoW:1.3,taper:2.2,arms:1.05,legs:.85,ends:1.2,body:{build:bigTop,top:[4],bottom:[1,0]}}),
 t('brute','Brute','Đô vật',{head:.7,torsoL:1.2,torsoW:1.55,taper:1.5,arms:1.45,legs:.5,thick:1.35,ends:1.4,body:{build:bigTop,top:[4],bottom:[1]}}),
 t('pear','Pear','Quả lê',{head:.9,torsoL:1.1,torsoW:1.25,taper:.5,arms:.75,legs:.6,thick:.9,ends:1.1,body:{build:bigBottom,top:[0],bottom:[0]}}),
 t('hour','Hourglass','Đồng hồ cát',{head:.9,torsoW:1.1,thick:.85,ends:.9,body:{build:bigTop,top:[4],bottom:[0]}}),
 t('pole','Beanpole','Cây sào',{head:.8,torsoL:1.3,torsoW:.55,arms:1.3,legs:1.12,thick:.6,ends:1.3,neck:2,body:{build:single,top:[1]}}),
 t('strider','Strider','Cà kheo',{head:.7,torsoL:.75,torsoW:.9,taper:1.4,arms:.85,legs:1.5,thick:.7,ends:.8,body:{build:bigTop,top:[4],bottom:[1,7]}}),
];
/** A character's body type: drawn from its name with the current weights (rules.ts bodyTypes). */
export function bodyTypeOf(spec:Pick<CharacterSpec,'label'>):BodyType{
 const weights=bodyTypes.map(b=>b.retired?0:Math.max(0,rules().bodyTypes[b.id]??0)),total=weights.reduce((a,b)=>a+b,0);
 if(!total)return bodyTypes[0];
 let r=rng(`${spec.label}|body type`)()*total;
 for(let i=0;i<bodyTypes.length;i++){r-=weights[i];if(r<0)return bodyTypes[i];}
 return bodyTypes[0];
}
/** A type by id; a retired type gives its stand-in. */
export const bodyTypeById=(id:string|undefined):BodyType=>{const type=bodyTypes.find(b=>b.id===id)??bodyTypes[0];return type.retired?bodyTypeById(type.retired):type;};
/** The types Generate can draw (the Rules panel lists these). */
export const liveBodyTypes=bodyTypes.filter(b=>!b.retired);
/** Length multiplier of a segment (upper arm, forearm, thigh, shin, neck) and of the offset of the bone after it (elbow, hand, knee, foot, head). */
export const lengthScale=(type:BodyType,id:string)=>/^(upperarm|forearm|elbow|hand)_/.test(id)?type.arms:/^(thigh|shin|knee|foot)_/.test(id)?type.legs:id==='neck'||id==='head'?type.neck:1;
/** The Proportions sliders as a body type changes them. */
export const typedProportions=<P extends {head:number;torsoWidth:number;pelvis:number;arms:number;legs:number;hands:number;feet:number;fingers:number;joints:number}>(p:P,type:BodyType):P=>({...p,head:p.head*type.head,torsoWidth:p.torsoWidth*type.torsoW*Math.sqrt(type.taper),pelvis:p.pelvis*type.torsoW/Math.sqrt(type.taper),arms:p.arms*type.thick,legs:p.legs*type.thick,hands:p.hands*type.ends,feet:p.feet*type.ends,fingers:p.fingers*type.ends,joints:p.joints*Math.sqrt(type.thick)});

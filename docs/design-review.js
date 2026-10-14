// Live renders for docs/design-review.html: the real rig from src/, with the proposed design changes applied
// on top (colour schemes, joints, proportions, pattern size, paper grain). Nothing here changes the app.
import * as THREE from 'three';
import {createCharacter} from '/src/rig.ts';
import {generate,palette,studioProportions} from '/src/model.ts';

const P=Object.fromEntries(palette.map((c,i)=>[c.id,i]));
/** Curated four-role schemes from the 18-colour palette: two body colours, an accent (hands, feet), one joint colour, a head colour. */
export const schemes=[
 {name:'Biển & kẹo',base:['blue_1','blue_3'],accent:'pink_1',joint:'pink_2',head:'yellow_1'},
 {name:'Hoàng hôn',base:['red_1','orange_1'],accent:'violet_1',joint:'yellow_1',head:'pink_3'},
 {name:'Rừng',base:['green_1','green_2'],accent:'orange_1',joint:'pink_2',head:'cyan_1'},
 {name:'Tím hồng',base:['violet_1','pink_1'],accent:'yellow_1',joint:'blue_3',head:'violet_2'},
 {name:'Ngọc & đỏ',base:['cyan_1','blue_2'],accent:'red_1',joint:'yellow_1',head:'green_2'},
 {name:'Ô liu',base:['yellow_2','green_1'],accent:'pink_1',joint:'orange_1',head:'blue_3'},
];
const presets={
 current:{...studioProportions},
 sturdy:{...studioProportions,head:1.1,pelvis:1.1,arms:1.35,legs:1.45,hands:1.3,feet:1.3,joints:.85},
 slim:{...studioProportions,head:.95,arms:.85,legs:.85,hands:.9,feet:.9,joints:.8},
 bighead:{...studioProportions,head:1.45,torsoWidth:1.05,arms:1.2,legs:1.25,hands:1.25,feet:1.25,joints:.9},
};
const hash=s=>{let h=0;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
/** Re-colours a spec by role. Joints share one colour; the same body colours repeat, so the figure reads as one design. */
function withScheme(spec,s=schemes[hash(spec.label)%schemes.length]){
 const out=structuredClone(spec);
 for(const [id,p] of Object.entries(out.parts)){
  const part=id.split('_')[0],set=(c,a)=>{p.color=P[c];if(a)p.accent=P[a];};
  if(['shoulder','elbow','knee','hip'].includes(part))set(s.joint);
  else if(part==='upperarm')set(s.base[0],s.base[1]);else if(part==='forearm')set(s.base[1],s.base[0]);
  else if(part==='thigh')set(s.base[1],s.base[0]);else if(part==='shin')set(s.base[0],s.base[1]);
  else if(part==='hand'||part==='foot')set(s.accent);
  else if(id==='head')set(s.head);else if(id==='neck'||id==='spine_lower')set(s.base[0]);
  else if(id==='root')set(s.base[0],s.accent);else if(id==='spine_upper')set(s.base[1],s.accent);
 }
 return out;
}
/** Only the joints change: one colour (unused by the limbs, so neighbours still differ) and 85% size. */
function withJoints(spec){
 const out=structuredClone(spec),limbs=Object.entries(out.parts).filter(([id])=>/^(upperarm|forearm|thigh|shin|hand|foot|spine_upper|root|head|neck)/.test(id)).map(([,p])=>p.color);
 const joint=[16,5,17,12,8,4].find(c=>!limbs.includes(c))??16;
 for(const [id,p] of Object.entries(out.parts))if(/^(shoulder|elbow|knee|hip)_/.test(id))p.color=joint;
 return out;
}
// Poses sampled from the Live pose demo video (local angles from src/pose.ts toLocal).
const dance=[
 {root:-.012,spine_lower:.04,head:.219,upperarm_L:2.614,forearm_L:1.377,hand_L:-.019,upperarm_R:-2.325,forearm_R:-1.195,hand_R:-.056,thigh_L:.035,shin_L:.032,foot_L:-.067,thigh_R:-.193,shin_R:.305,foot_R:-.112},
 {root:.215,spine_lower:.024,head:.211,upperarm_L:1.599,forearm_L:-1.661,hand_L:-.338,upperarm_R:-.671,forearm_R:-2.459,hand_R:-.158,thigh_L:-.638,shin_L:.769,foot_L:-.346,thigh_R:-.203,shin_R:.275,foot_R:-.287},
 {root:.155,spine_lower:.171,head:-.469,upperarm_L:.421,forearm_L:-.171,hand_L:.087,upperarm_R:-.475,forearm_R:1.825,hand_R:-.217,thigh_L:.726,shin_L:-1.133,foot_L:.252,thigh_R:-.103,shin_R:.017,foot_R:-.069},
 {root:-.223,spine_lower:.259,head:-.181,upperarm_L:-.467,forearm_L:-3.056,hand_L:-.127,upperarm_R:-.504,forearm_R:-3.1,hand_R:.083,thigh_L:.419,shin_L:-.016,foot_L:-.18,thigh_R:.185,shin_R:.106,foot_R:-.068},
 {root:.119,spine_lower:.014,head:-.552,upperarm_L:1.03,forearm_L:2.62,hand_L:.045,upperarm_R:-3.124,forearm_R:-1.268,hand_R:.131,thigh_L:.097,shin_L:-.097,foot_L:-.119,thigh_R:.022,shin_R:-.078,foot_R:-.063},
 {root:.095,spine_lower:.061,head:-.343,upperarm_L:.669,forearm_L:.094,hand_L:-.102,upperarm_R:-.811,forearm_R:-2.495,hand_R:-.354,thigh_L:.284,shin_L:-.276,foot_L:-.103,thigh_R:-.195,shin_R:.556,foot_R:-.455},
];

const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.toneMapping=THREE.NoToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
/** Soft paper look: per-pixel grain plus a gentle top-to-bottom tone shift, only on the figure (not the background). */
function paperize(canvas,bg){
 const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const g=c.getContext('2d');g.drawImage(canvas,0,0);
 const img=g.getImageData(0,0,c.width,c.height),d=img.data,b=new THREE.Color(bg),br=b.r*255,bgG=b.g*255,bb=b.b*255;let seed=7;
 const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 for(let i=0;i<d.length;i+=4){if(Math.abs(d[i]-br)+Math.abs(d[i+1]-bgG)+Math.abs(d[i+2]-bb)<24)continue;const y=(i/4/c.width)/c.height,k=1.07-y*.18,n=(rand()-.5)*30;for(let j=0;j<3;j++)d[i+j]=Math.max(0,Math.min(255,d[i+j]*k+n));}
 g.putImageData(img,0,0);return c.toDataURL();
}
/** One character as an image URL. */
function shot({spec,pose='idle',angles,proportions=presets.current,bg='#000000',w=220,h=300,paper=false}){
 renderer.setSize(w,h,false);
 const scene=new THREE.Scene();scene.background=new THREE.Color(bg);
 const rig=createCharacter(spec,'HFCD',undefined,proportions);
 if(angles)rig.applyAngles(angles);else rig.applyPose(pose);
 scene.add(rig.group);
 const span=3.4,cam=new THREE.OrthographicCamera(-span*w/h/2,span*w/h/2,3.2,3.2-span,.1,50);cam.position.set(0,0,10);
 renderer.render(scene,cam);
 const url=paper?paperize(renderer.domElement,bg):renderer.domElement.toDataURL();
 rig.dispose();return url;
}
const variants={
 current:spec=>({spec}),
 scheme:spec=>({spec:withScheme(spec)}),
 joints:spec=>({spec:withJoints(spec),proportions:{...presets.current,joints:.85}}),
 pattern:spec=>({spec:{...spec,density:3}}),
 paper:spec=>({spec,paper:true}),
 combined:spec=>({spec:{...withScheme(spec),density:3},proportions:presets.sturdy,paper:true}),
};
let labels=[];
const newLabels=()=>{labels=Array.from({length:6},()=>`folk-${Math.random().toString(36).slice(2,8)}`);};
const poses=['idle','reach','stride','idle','stride','reach'];
const img=(url,alt)=>`<img src="${url}" alt="${alt}" loading="lazy">`;
function fill(el){
 const kind=el.dataset.render,count=Number(el.dataset.count||6),bg=el.dataset.bg||'#000000';
 const specs=labels.slice(0,count).map(l=>generate(l));
 let html='';
 if(kind==='presets')html=Object.entries({current:'Hiện tại',sturdy:'Chắc khỏe',slim:'Thanh mảnh',bighead:'Đầu to'}).map(([k,t])=>`<figure>${img(shot({spec:withScheme(specs[0]),pose:'stride',proportions:presets[k],bg}),t)}<figcaption>${t}</figcaption></figure>`).join('');
 else if(kind==='dance')html=dance.map((a,i)=>`<figure>${img(shot({...variants.combined(specs[1]),angles:a,bg}),`Tư thế ${i+1}`)}</figure>`).join('');
 else if(kind==='schemes')html=schemes.map((s,i)=>`<figure>${img(shot({spec:withScheme(specs[i%specs.length],s),pose:poses[i],bg}),s.name)}<figcaption><span class="sw">${[...s.base,s.accent,s.joint,s.head].map(c=>`<i style="background:${palette[P[c]].hex}"></i>`).join('')}</span>${s.name}</figcaption></figure>`).join('');
 else if(kind==='single')html=img(shot({...variants[el.dataset.variant](specs[Number(el.dataset.index||0)]),pose:el.dataset.pose||'idle',bg,w:Number(el.dataset.w||220),h:Number(el.dataset.h||300)}),'Nhân vật');
 else if(kind==='strip')html=specs.map((s,i)=>img(shot({...variants.combined(s),pose:poses[i],bg,w:90,h:120}),'Lịch sử')).join('');
 else html=specs.map((s,i)=>`<figure>${img(shot({...variants[kind](s),pose:poses[i],bg}),kind)}</figure>`).join('');
 el.innerHTML=html;
}
function renderAll(){newLabels();document.querySelectorAll('[data-render]').forEach(fill);}
document.getElementById('reshuffle').addEventListener('click',renderAll);
renderAll();

// Picks: every proposal card has a checkbox; "Copy" turns the picks into a message to paste into the chat.
const summary=document.getElementById('picks');
function updatePicks(){const picked=[...document.querySelectorAll('[data-pick]:checked')].map(c=>`- ${c.dataset.pick}`);summary.value=picked.length?`Tôi chọn làm:\n${picked.join('\n')}`:'';document.getElementById('pick-count').textContent=String(picked.length);}
document.addEventListener('change',e=>{if(e.target.matches('[data-pick]'))updatePicks();});
document.getElementById('copy-picks').addEventListener('click',async()=>{summary.select();try{await navigator.clipboard.writeText(summary.value);document.getElementById('copy-picks').textContent='Đã sao chép';}catch{document.execCommand('copy');}});
updatePicks();

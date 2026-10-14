// Lets "Save all as default" (Proportions tab) write src/proportions.json and src/settings.json under `npm run dev`, so
// the chosen proportions and look settings become the project default in every browser (and are committed with the code).
// Plain JS because the project has no Node typings (see vite-defaults.d.ts).
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const proportionsFile=fileURLToPath(new URL('../src/proportions.json',import.meta.url));
const settingsFile=fileURLToPath(new URL('../src/settings.json',import.meta.url));
/** Every proportion key and its slider range (model.ts proportionKeys / rangeOf). */
const ranges={head:[.5,1.5],torsoWidth:[.5,1.5],torsoHeight:[.5,1.5],pelvis:[.5,1.5],arms:[.5,1.5],legs:[.5,1.5],hands:[.5,1.5],feet:[.5,1.5],joints:[.5,1.5],fingers:[.5,1.5],fingerStiffness:[.5,1.5],toes:[.5,1.5],hair:[.5,1.5],checker:[.4,2.5],flowSpeed:[-3,3]};
const risoBlends=['Normal','Multiply','Screen','Overlay','Darken','Lighten'];
/** Riso settings (riso.ts normalizeRiso). */
const riso=s=>{
 if(!s||typeof s.on!=='boolean'||typeof s.invert!=='boolean'||!risoBlends.includes(s.blend)||!/^#[0-9a-f]{6}$/i.test(s.color))throw new Error('Invalid riso');
 const n=(k,min,max)=>{const v=Number(s[k]);if(!Number.isFinite(v)||v<min||v>max)throw new Error(`Invalid riso ${k}`);return Math.round(v*1000)/1000;};
 return {on:s.on,color:s.color,blend:s.blend,opacity:n('opacity',0,1),size:n('size',.003,.04),coverage:n('coverage',.3,1),angle:n('angle',0,90),grain:n('grain',0,1),invert:s.invert};
};
/** Pixel part settings (pixelate.ts normalizePixel). */
const pixel=s=>{
 const size=Number(s?.size);
 if(!s||typeof s.on!=='boolean'||!Number.isFinite(size)||size<.015||size>.08||![0,24,12,8,4].includes(s.fps))throw new Error('Invalid pixel');
 return {on:s.on,size:Math.round(size*1000)/1000,fps:s.fps};
};
/** Spray blur settings (spray.ts normalizeSpray). */
const spray=s=>{
 const amount=Number(s?.amount);
 if(!s||typeof s.on!=='boolean'||!Number.isFinite(amount)||amount<.005||amount>.15)throw new Error('Invalid spray');
 return {on:s.on,amount:Math.round(amount*1000)/1000};
};
/** Pattern rules (rules.ts normalizeRules). */
const rules=s=>{
 const int=(k,min,max)=>{const v=s?.[k];if(!Number.isInteger(v)||v<min||v>max)throw new Error(`Invalid rule ${k}`);return v;};
 if(!s||typeof s.checkerApart!=='boolean'||typeof s.flowApart!=='boolean'||typeof s.touching!=='boolean'||!Array.isArray(s.checkerStyles)||s.checkerStyles.length!==4||!s.checkerStyles.every(v=>typeof v==='boolean')||!s.checkerStyles.some(Boolean))throw new Error('Invalid rules');
 const twoTone=Number(s.twoTone);if(!Number.isFinite(twoTone)||twoTone<0||twoTone>1)throw new Error('Invalid rule twoTone');
 const ids=['today','orb','baby','lolly','brick','wedge','brute','pear','hour','pole','strider'];
 if(!s.bodyTypes||!ids.every(id=>Number.isInteger(s.bodyTypes[id])&&s.bodyTypes[id]>=0&&s.bodyTypes[id]<=100)||!ids.some(id=>s.bodyTypes[id]>0))throw new Error('Invalid body types');
 return {bodyTypes:Object.fromEntries(ids.map(id=>[id,s.bodyTypes[id]])),weave:int('weave',0,2),twoTone:Math.round(twoTone*100)/100,checker:int('checker',0,6),checkerApart:s.checkerApart,checkerStyles:s.checkerStyles,flow:int('flow',0,8),flowApart:s.flowApart,touching:s.touching,pixel:int('pixel',0,4),spray:int('spray',0,4)};
};
/** Curtain settings (curtains.ts normalizeCurtains). */
const curtains=s=>{
 if(!s||typeof s.on!=='boolean'||!['one','random'].includes(s.colors)||!Number.isInteger(s.density)||s.density<2||s.density>16)throw new Error('Invalid curtains');
 const n=(k,min,max)=>{const v=Number(s[k]);if(!Number.isFinite(v)||v<min||v>max)throw new Error(`Invalid curtains ${k}`);return Math.round(v*100)/100;};
 return {on:s.on,colors:s.colors,density:s.density,length:n('length',.4,2.5),size:n('size',.4,2.5),spacing:n('spacing',.4,3)};
};
const palettes=['HFCD','XMAS','TET'],groups=['arms','head','torso','neck','pelvis','legs'];

const proportions=data=>{
 const out={};
 for(const [key,[min,max]] of Object.entries(ranges)){if(!(key in data))continue;const v=Number(data[key]);if(!Number.isFinite(v)||v<min||v>max)throw new Error(`Invalid ${key}`);out[key]=Math.round(v*100)/100;}
 return [proportionsFile,out];
};
const settings=data=>{
 if(!palettes.includes(data.palette))throw new Error('Invalid palette');
 if(!Array.isArray(data.layerOrder)||data.layerOrder.length!==groups.length||!groups.every(g=>data.layerOrder.includes(g)))throw new Error('Invalid layer order');
 if(typeof data.paper!=='boolean'||typeof data.darkStage!=='boolean')throw new Error('Invalid switches');
 if(!Number.isInteger(data.patternScale)||data.patternScale<2||data.patternScale>12)throw new Error('Invalid pattern scale');
 return [settingsFile,{palette:data.palette,layerOrder:data.layerOrder,paper:data.paper,riso:riso(data.riso),pixel:pixel(data.pixel),spray:spray(data.spray),curtains:curtains(data.curtains),rules:rules(data.rules),darkStage:data.darkStage,patternScale:data.patternScale}];
};

export function defaultsWriter(){
 const route=check=>(req,res)=>{
  // A custom header forces a CORS preflight, so other web pages cannot post here.
  if(req.method!=='POST'||req.headers['x-geofolk']!=='1'){res.statusCode=403;res.end();return;}
  let body='';
  req.on('data',chunk=>{body+=chunk;if(body.length>8192)req.destroy();});
  req.on('end',()=>{
   try{
    const [file,out]=check(JSON.parse(body));
    writeFileSync(file,JSON.stringify(out,null,1)+'\n');
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify(out));
   }catch(e){res.statusCode=400;res.end(String(e.message));}
  });
 };
 return {name:'geofolk-defaults',configureServer:server=>{server.middlewares.use('/__defaults/proportions',route(proportions));server.middlewares.use('/__defaults/settings',route(settings));}};
}

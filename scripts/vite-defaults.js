// Lets the Proportions tab's "Save as default" write src/proportions.json under `npm run dev`, so the chosen
// proportions become the project default in every browser (and are committed with the code).
// Plain JS because the project has no Node typings (see vite-defaults.d.ts).
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const file=fileURLToPath(new URL('../src/proportions.json',import.meta.url));

export function defaultsWriter(){
 const handle=(req,res)=>{
  // A custom header forces a CORS preflight, so other web pages cannot post here.
  if(req.method!=='POST'||req.headers['x-geofolk']!=='1'){res.statusCode=403;res.end();return;}
  let body='';
  req.on('data',chunk=>{body+=chunk;if(body.length>4096)req.destroy();});
  req.on('end',()=>{
   try{
    // Only the keys already in the file, each 0.5–1.5 like the sliders.
    const data=JSON.parse(body),out={};
    for(const key of Object.keys(JSON.parse(readFileSync(file,'utf8')))){const v=Number(data[key]);if(!Number.isFinite(v)||v<.5||v>1.5)throw new Error(`Invalid ${key}`);out[key]=Math.round(v*100)/100;}
    writeFileSync(file,JSON.stringify(out,null,1)+'\n');
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify(out));
   }catch(e){res.statusCode=400;res.end(String(e.message));}
  });
 };
 return {name:'geofolk-defaults',configureServer:server=>{server.middlewares.use('/__defaults/proportions',handle);}};
}

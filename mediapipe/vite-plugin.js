// Lets the Live pose tab start server.py by itself under `npm run dev` / `npm run preview`, so nobody
// has to open a terminal. A static build has no /__pose route and the app falls back to the
// "run npm run pose" hint. Plain JS because the project has no Node typings (see vite-plugin.d.ts).
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const cwd=fileURLToPath(new URL('.',import.meta.url));

export function poseServer(){
 let child=null,log=[],failure='';
 const stop=()=>{child?.kill('SIGTERM');child=null;};
 const start=source=>{
  log=[];failure='';
  // Same command as `npm run pose`: uv brings its own Python 3.11 because the system one is too old.
  const proc=child=spawn('uv',['run','--python','3.11','--with-requirements','requirements.txt','server.py','--source',source],{cwd,env:{...process.env,PYTHONUNBUFFERED:'1'}});
  const keep=chunk=>{for(const line of String(chunk).split('\n'))if(line.trim()){console.log(`[pose] ${line}`);log.push(line);}log=log.slice(-20);};
  proc.stdout.on('data',keep);proc.stderr.on('data',keep);
  proc.on('error',e=>{if(child===proc)child=null;failure=e.code==='ENOENT'?'uv is not installed, so the pose server cannot start. See README section 2.':e.message;});
  // A Python crash ends with the exception line (e.g. no camera permission), uv errors with "error: …".
  // stop() clears `child` first, so a deliberate stop is not reported as a failure.
  proc.on('exit',code=>{if(child!==proc)return;child=null;if(code&&!failure)failure=log.at(-1)||`Pose server stopped (exit code ${code}).`;});
 };
 const handle=(req,res)=>{
  // A custom header forces a CORS preflight, so other web pages cannot start the camera.
  if(req.headers['x-geofolk']!=='1'){res.statusCode=403;res.end();return;}
  const url=new URL(req.url??'/','http://x'),action=url.pathname.slice(1),source=url.searchParams.get('source')==='video'?'video':'webcam';
  if(action==='start'&&!child)start(source);else if(action==='stop')stop();
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({running:!!child,error:failure}));
 };
 const attach=server=>{server.middlewares.use('/__pose',handle);server.httpServer?.on('close',stop);};
 process.once('exit',stop);
 return {name:'geofolk-pose-server',configureServer:attach,configurePreviewServer:attach};
}

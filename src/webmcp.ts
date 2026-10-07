import {useEffect,useRef} from 'react';
import {flushSync} from 'react-dom';
import type {CharacterSpec} from './model';
import {decodeSeed,encodeSeed,generate,randomLabel} from './model';
interface Tool {name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown)=>unknown|Promise<unknown>;}
interface Context {registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>;}
export function useCharacterTools(spec:CharacterSpec,locked:Set<string>,apply:(next:CharacterSpec,restore:boolean)=>void){
 const current=useRef({spec,locked,apply});current.current={spec,locked,apply};
 useEffect(()=>{const context=(document as Document&{modelContext?:Context}).modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();
  const result=()=>({seed:encodeSeed(current.current.spec),parts:current.current.spec.parts,locked:[...current.current.locked],patternDensity:current.current.spec.density});
  const tools:Tool[]=[
   {name:'get_character',description:'Read the current character, its full reproducible seed, part choices and locked slots.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>result()},
   {name:'generate_character',description:'Generate a new character while preserving locked parts. Supply a seed to restore that exact character and clear locks, just like Apply seed.',inputSchema:{type:'object',properties:{seed:{type:'string',minLength:1,maxLength:600}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async(input:unknown)=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>k!=='seed'))throw new Error('Expected an object with an optional seed string.');const seed=(input as {seed?:unknown}).seed;if(seed!==undefined&&typeof seed!=='string')throw new Error('seed must be a string.');const next=seed!==undefined?decodeSeed(seed):generate(randomLabel(),current.current.spec,current.current.locked);flushSync(()=>current.current.apply(next,seed!==undefined));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return result();}},
  ];
  for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Unsupported experimental browser API does not affect the editor. */}}
  return()=>lifecycle.abort();
 },[]);
}

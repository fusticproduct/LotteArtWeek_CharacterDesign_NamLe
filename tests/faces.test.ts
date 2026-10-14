import {describe,expect,it} from 'vitest';
import {SkinnedMesh,type MeshBasicMaterial} from 'three';
import {defaultFace,eyeFaces,expressiveFaces,faceColourOf,faceOf,faceScale,faceStyles,faceTop,minimalFaces,normalizeFace,type FacePiece} from '../src/faces';
import {createCharacter,headOutlines} from '../src/rig';
import {generate,palette,rng,variants} from '../src/model';
import {partColors} from '../src/themes';
import {normalizeSettings,sameSettings,studioSettings} from '../src/settings';
import {signedArea,type Point2} from '../src/geometry';
const inside=([x,y]:Point2,poly:Point2[])=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;};
const points=(pieces:FacePiece[])=>pieces.flatMap(p=>[...p.outline,...(p.holes??[]).flat()]);
describe('faces',()=>{
 it('has three libraries: the minimal marks, a whole expressive set and a many-eyes set without mouths',()=>{
  expect(faceStyles).toEqual(['minimal','expressive','eyes']);expect(expressiveFaces.length).toBeGreaterThanOrEqual(24);expect(eyeFaces.length).toBeGreaterThanOrEqual(16);
  for(const lib of [expressiveFaces.map(f=>f.name),eyeFaces.map(f=>f.name)])expect(new Set(lib).size).toBe(lib.length);
  const r=rng('faces');
  for(const face of [...expressiveFaces,...eyeFaces.map(f=>({name:f.name,pieces:f.pieces(r)}))]){
   expect(face.pieces.length,face.name).toBeGreaterThanOrEqual(2);
   for(const piece of face.pieces){
    expect(piece.outline.length,face.name).toBeGreaterThanOrEqual(3);expect(Math.abs(signedArea(piece.outline)),face.name).toBeGreaterThan(1e-5);
    for(const [x,y] of [...piece.outline,...(piece.holes??[]).flat()]){expect(Number.isFinite(x)&&Number.isFinite(y)).toBe(true);expect(Math.abs(x),face.name).toBeLessThanOrEqual(.075);expect(Math.abs(y),face.name).toBeLessThanOrEqual(.056);}
   }
  }
  // Many eyes: at least three eyes each.
  for(const face of eyeFaces)for(let k=0;k<20;k++)expect(face.pieces(r).length,face.name).toBeGreaterThanOrEqual(3);
 });
 it('makes the minimal set bold: the six first marks in their places, more single shapes and symmetrical pairs, thick straight lines',()=>{
  expect(minimalFaces.map(f=>f.name)).toEqual(variants.face);expect(variants.face.slice(0,6)).toEqual(['Dot','Dash','Triangle','Twin dots','Diamond','Bar']);
  const singles=minimalFaces.filter(f=>f.pieces.length===1),pairs=minimalFaces.filter(f=>f.pieces.length===2);
  expect(singles.length).toBeGreaterThanOrEqual(12);expect(pairs.length).toBeGreaterThanOrEqual(10);expect(singles.length+pairs.length).toBe(minimalFaces.length);
  for(const f of pairs){
   // A pair is a mirror image: each point of the right one has its mirror in the left one.
   const [a,b]=f.pieces;expect(a.outline.length,f.name).toBe(b.outline.length);
   for(const [x,y] of b.outline)expect(Math.min(...a.outline.map(([u,v])=>Math.hypot(u+x,v-y))),f.name).toBeLessThan(1e-9);
   expect(Math.max(...a.outline.map(p=>p[0])),f.name).toBeLessThan(0);
  }
  // Straight lines thick: the dash and the bar 3.6 cm, the pairs' dashes and bars at least 2.4 cm.
  const size=(p:FacePiece)=>{const xs=p.outline.map(q=>q[0]),ys=p.outline.map(q=>q[1]);return [Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];};
  const named=(n:string)=>minimalFaces.find(f=>f.name===n)!.pieces;
  expect(size(named('Dash')[0])[0]).toBeCloseTo(.036,9);expect(size(named('Bar')[0])[1]).toBeCloseTo(.036,9);expect(Math.min(...size(named('Plus')[0]))).toBeGreaterThan(.08);
  for(const n of ['Twin dashes','Twin bars'])expect(Math.min(...size(named(n)[0])),n).toBeGreaterThanOrEqual(.024);
  for(const f of minimalFaces)for(const p of f.pieces)for(const [x,y] of p.outline){expect(Math.abs(x),f.name).toBeLessThanOrEqual(.062);expect(Math.abs(y),f.name).toBeLessThanOrEqual(.045+1e-9);}
  // The character's own mark is its face in the minimal set; old seeds keep theirs.
  const s=generate('mark');for(let v=0;v<minimalFaces.length;v++){s.parts.face_mark.variant=v;expect(faceOf(s,'minimal').name).toBe(variants.face[v]);}
  const seen=new Set<number>();for(let i=0;i<400;i++)seen.add(generate(`mark-${i}`).parts.face_mark.variant);expect(seen.size).toBe(minimalFaces.length);
 });
 it('fits every face, at the size it is shown, inside every head shape, where the mark sits, and under the hair',()=>{
  // (The cluster is drawn anew for each character: many draws of it.)
  const r=rng('fit');
  // As shown: each library through faceOf, over many characters (so every face, and many clusters).
  const cast=Array.from({length:300},(_,i)=>generate(`fit-${i}`)),shown=cast.flatMap(s=>faceStyles.map(style=>faceOf(s,style)));
  for(const [style,lib] of [['minimal',minimalFaces],['expressive',expressiveFaces],['eyes',eyeFaces]] as const)expect(new Set(cast.map(s=>faceOf(s,style).name)).size,style).toBe(lib.length);
  for(const [v,head] of headOutlines.entries())for(const face of shown)for(const [x,y] of points(face.pieces)){expect(inside([x,y+head.markY],head.outline),`${face.name} on head ${v}`).toBe(true);expect(y,face.name).toBeLessThanOrEqual(faceTop+1e-9);}
  void r;void faceScale;
 },30000);
 it('gives each character its own face in each library, the same every time, and many different ones across a cast',()=>{
  const a=generate('face-a');expect(faceOf(a,'minimal').name).toBe(variants.face[a.parts.face_mark.variant]);
  // Shown larger than drawn.
  // Shown larger than drawn (and moved down under the hair if it would reach it).
  const e=faceOf(a,'expressive'),drawn=expressiveFaces.find(f=>f.name===e.name)!,width=(f:FacePiece[])=>{const xs=f.flatMap(p=>p.outline.map(q=>q[0]));return Math.max(...xs)-Math.min(...xs);};expect(width(e.pieces)/width(drawn.pieces)).toBeGreaterThan(1.05);expect(faceScale).toBeGreaterThan(1);expect(faceOf(a,'expressive')).toEqual(faceOf(a,'expressive'));expect(faceOf(a,'eyes')).toEqual(faceOf(a,'eyes'));
  const seen={expressive:new Set<string>(),eyes:new Set<string>()};
  for(let i=0;i<300;i++){const s=generate(`face-${i}`);seen.expressive.add(faceOf(s,'expressive').name);seen.eyes.add(faceOf(s,'eyes').name);}
  expect(seen.expressive.size).toBe(expressiveFaces.length);expect(seen.eyes.size).toBe(eyeFaces.length);
 });
 it('shows the chosen face on the face mark, in the mark colour or a colour from the palette, and back',()=>{
  for(const name of ['HFCD','XMAS','TET'] as const)for(let i=0;i<6;i++){
   const spec=generate(`face-rig-${i}`),rig=createCharacter(spec,name),mesh=rig.group.getObjectByName('face_mark_mesh') as SkinnedMesh,minimal=mesh.geometry,colorOf=partColors(spec,name),mark=colorOf(spec.parts.face_mark.color);
   expect((mesh.material as MeshBasicMaterial).color.getHexString()).toBe(mark.replace('#','').toLowerCase());
   rig.setFace({style:'expressive',colour:false});const expressive=mesh.geometry;expect(expressive).not.toBe(minimal);
   // Skinned to the face mark's bone, where the mark is.
   const index=expressive.getAttribute('skinIndex');for(let k=0;k<index.count;k++)expect(index.getX(k)).toBe(rig.skeleton.bones.findIndex(b=>b.name==='face_mark'));
   expressive.computeBoundingBox();minimal.computeBoundingBox();expect(Math.abs((expressive.boundingBox!.min.y+expressive.boundingBox!.max.y)/2-(minimal.boundingBox!.min.y+minimal.boundingBox!.max.y)/2)).toBeLessThan(.03);
   rig.setFace({style:'eyes',colour:true});expect(mesh.geometry).not.toBe(minimal);expect(mesh.geometry).not.toBe(expressive);
   const coloured=(mesh.material as MeshBasicMaterial).color.getHexString(),expected=faceColourOf(spec,colorOf,mark).replace('#','').toLowerCase();expect(coloured).toBe(expected);
   // A colour the character wears, not its head's, not the dark mark's.
   expect(coloured).not.toBe(colorOf(spec.parts.head.color).replace('#','').toLowerCase());
   const worn=new Set(Object.values(spec.parts).flatMap(p=>[p.color,p.accent]).filter(c=>palette[c].family!=='dark').map(c=>colorOf(c).replace('#','').toLowerCase()));expect(worn.has(coloured)).toBe(true);
   rig.setFace({style:'expressive',colour:false});expect(mesh.geometry).toBe(expressive);expect((mesh.material as MeshBasicMaterial).color.getHexString()).toBe(mark.replace('#','').toLowerCase());
   rig.setFace(defaultFace);expect(mesh.geometry).toBe(minimal);
   rig.applyAngles({});rig.dispose();
  }
 });
 it('keeps the face setting with the look, and checks it',()=>{
  expect(normalizeFace(undefined)).toEqual(defaultFace);expect(normalizeFace({style:'eyes',colour:true})).toEqual({style:'eyes',colour:true});expect(normalizeFace({style:'emoji',colour:'yes'})).toEqual(defaultFace);
  expect(normalizeSettings({}).face).toEqual(defaultFace);expect(studioSettings.face).toBeTruthy();
  expect(sameSettings(studioSettings,{...studioSettings,face:{style:'expressive',colour:false}})).toBe(false);expect(sameSettings(studioSettings,{...studioSettings})).toBe(true);
 });
});

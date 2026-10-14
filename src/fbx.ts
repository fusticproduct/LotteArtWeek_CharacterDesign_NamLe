/** Binary FBX 7.4 writer for rigidly skinned geometric characters.
 * All model transforms are in meters, Y-up; every mesh has one skin cluster.
 * The active pose becomes the exported bind pose, preserving the visible shape.
 */
import * as THREE from 'three';
import {bones,type CharacterSpec} from './model';
import type {CharacterRig} from './rig';
type Property={type:'S'|'I'|'L'|'D'|'C'|'R'|'d'|'i';value:string|number|boolean|number[]|Uint8Array};
interface Element {name:string;props:Property[];children:Element[];}
const S=(value:string):Property=>({type:'S',value}), I=(value:number):Property=>({type:'I',value}), L=(value:number):Property=>({type:'L',value}), D=(value:number):Property=>({type:'D',value}), A=(value:number[]):Property=>({type:'d',value}), IA=(value:number[]):Property=>({type:'i',value});
const N=(name:string,props:Property[]=[],children:Element[]=[]):Element=>({name,props,children});
const text=(name:string,value:string)=>N(name,[S(value)]),int=(name:string,value:number)=>N(name,[I(value)]);
const property=(name:string,type:string,values:Property[],flags='A')=>N('P',[S(name),S(type),S(type==='double'?'Number':type==='int'?'Integer':''),S(type==='enum'?'':flags),...values]);
const vector=(name:string,type:string,v:number[])=>property(name,type,v.map(D));
const cname=(name:string,kind:string)=>`${name}\x00\x01${kind}`;
const utf8=new TextEncoder();
function concat(chunks:Uint8Array[]) {const out=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length;}return out;}
function encodeProperty(p:Property):Uint8Array {
 const tag=utf8.encode(p.type);
 if(p.type==='S'||p.type==='R'){const body=p.type==='S'?utf8.encode(p.value as string):p.value as Uint8Array;const header=new Uint8Array(4);new DataView(header.buffer).setUint32(0,body.length,true);return concat([tag,header,body]);}
 if(p.type==='d'||p.type==='i'){const values=p.value as number[],stride=p.type==='d'?8:4,data=new Uint8Array(12+values.length*stride),view=new DataView(data.buffer);view.setUint32(0,values.length,true);view.setUint32(4,0,true);view.setUint32(8,values.length*stride,true);values.forEach((v,i)=>p.type==='d'?view.setFloat64(12+i*stride,v,true):view.setInt32(12+i*stride,v,true));return concat([tag,data]);}
 const data=new Uint8Array(p.type==='I'?4:p.type==='C'?1:8),view=new DataView(data.buffer);
 if(p.type==='I')view.setInt32(0,p.value as number,true);else if(p.type==='L')view.setBigInt64(0,BigInt(p.value as number),true);else if(p.type==='C')view.setUint8(0,p.value?1:0);else view.setFloat64(0,p.value as number,true);
 return concat([tag,data]);
}
function encodeNode(e:Element,start:number):Uint8Array {
 const name=utf8.encode(e.name),props=concat(e.props.map(encodeProperty));let offset=start+13+name.length+props.length;
 const children=e.children.map(c=>{const bytes=encodeNode(c,offset);offset+=bytes.length;return bytes;});
 const sentinel=e.children.length?new Uint8Array(13):new Uint8Array();offset+=sentinel.length;
 const header=new Uint8Array(13),v=new DataView(header.buffer);v.setUint32(0,offset,true);v.setUint32(4,e.props.length,true);v.setUint32(8,props.length,true);v.setUint8(12,name.length);
 return concat([header,name,props,...children,sentinel]);
}
function encodeFile(elements:Element[]) {
 const magic=utf8.encode('Kaydara FBX Binary  \x00\x1a\x00'),version=new Uint8Array(4);new DataView(version.buffer).setUint32(0,7400,true);let offset=27;
 const data=elements.map(e=>{const b=encodeNode(e,offset);offset+=b.length;return b;});
 const footerId=new Uint8Array([250,188,171,9,208,200,212,102,177,118,251,131,28,247,38,126]);
 const prefix=concat([magic,version,...data,new Uint8Array(13),footerId,new Uint8Array(4)]);
 const padding=new Uint8Array(16-prefix.length%16);
 return concat([prefix,padding,version,new Uint8Array(120),new Uint8Array([248,90,140,106,222,245,217,126,236,233,12,227,117,143,41,11])]);
}
function transformProperties(matrix:THREE.Matrix4){const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();matrix.decompose(p,q,s);const e=new THREE.Euler().setFromQuaternion(q,'XYZ');return [vector('Lcl Translation','Lcl Translation',p.toArray()),vector('Lcl Rotation','Lcl Rotation',[e.x,e.y,e.z].map(THREE.MathUtils.radToDeg)),vector('Lcl Scaling','Lcl Scaling',s.toArray()),property('RotationOrder','enum',[I(0)]),property('InheritType','enum',[I(1)]),property('RotationActive','bool',[I(1)])];}
function pngBytes(canvas:HTMLCanvasElement){const raw=atob(canvas.toDataURL('image/png').split(',')[1]);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
export function exportFBX(rig:CharacterRig,spec:CharacterSpec):Uint8Array {
 rig.group.updateMatrixWorld(true);rig.skeleton.update();
 const objects:Element[]=[],connections:Element[]=[],poseNodes:Element[]=[];
 const connect=(child:number,parent:number,prop?:string)=>connections.push(N('C',[S(prop?'OP':'OO'),L(child),L(parent),...(prop?[S(prop)]:[])]));
 const model=(id:number,name:string,type:string,matrix:THREE.Matrix4)=>N('Model',[L(id),S(cname(name,'Model')),S(type)],[int('Version',232),N('Properties70',[],transformProperties(matrix)),int('Shading',1),text('Culling','CullingOff')]);
 const poseNode=(id:number,matrix:THREE.Matrix4)=>N('PoseNode',[],[N('Node',[L(id)]),N('Matrix',[A(matrix.toArray())])]);
 const identity=new THREE.Matrix4();objects.push(model(100,'Armature','Null',identity));connect(100,0);poseNodes.push(poseNode(100,identity));
 bones.forEach((b,i)=>{
  const bone=rig.map.get(b.id)!,boneId=1000+i,attributeId=2000+i;
  objects.push(model(boneId,b.id,'LimbNode',b.parent?bone.matrix:bone.matrixWorld));
  objects.push(N('NodeAttribute',[L(attributeId),S(cname(b.id,'NodeAttribute')),S('LimbNode')],[text('TypeFlags','Skeleton'),N('Properties70',[],[property('Size','double',[D(b.length*20)]),property('LimbLength','double',[D(b.length)])])]));
  connect(attributeId,boneId);connect(boneId,b.parent?1000+bones.findIndex(n=>n.id===b.parent):100);poseNodes.push(poseNode(boneId,bone.matrixWorld));
  const mesh=rig.group.getObjectByName(`${b.id}_mesh`) as THREE.SkinnedMesh,geometry=mesh.geometry;
  const geometryId=3000+i,meshId=4000+i,matId=5000+i,skinId=6000+i,clusterId=7000+i;
  const positions=Array.from(geometry.getAttribute('position').array),uv=Array.from(geometry.getAttribute('uv').array),normal=geometry.getAttribute('normal');
  const index=geometry.index?Array.from(geometry.index.array):Array.from({length:positions.length/3},(_,j)=>j);
  const normals=index.flatMap(j=>[normal.getX(j),normal.getY(j),normal.getZ(j)]);
  const layerElement=(type:string)=>N('LayerElement',[],[text('Type',type),int('TypedIndex',0)]);
  objects.push(N('Geometry',[L(geometryId),S(cname(mesh.name,'Geometry')),S('Mesh')],[int('GeometryVersion',124),N('Vertices',[A(positions)]),N('PolygonVertexIndex',[IA(index.map((v,j)=>j%3===2?-v-1:v))]),
   N('LayerElementNormal',[I(0)],[int('Version',101),text('Name',''),text('MappingInformationType','ByPolygonVertex'),text('ReferenceInformationType','Direct'),N('Normals',[A(normals)])]),
   N('LayerElementUV',[I(0)],[int('Version',101),text('Name','UVMap'),text('MappingInformationType','ByPolygonVertex'),text('ReferenceInformationType','IndexToDirect'),N('UV',[A(uv)]),N('UVIndex',[IA(index)])]),
   N('LayerElementMaterial',[I(0)],[int('Version',101),text('Name',''),text('MappingInformationType','AllSame'),text('ReferenceInformationType','IndexToDirect'),N('Materials',[IA([0])])]),
   N('Layer',[I(0)],[int('Version',100),layerElement('LayerElementNormal'),layerElement('LayerElementUV'),layerElement('LayerElementMaterial')])
  ]));
  objects.push(model(meshId,mesh.name,'Mesh',bone.matrixWorld));connect(meshId,0);connect(geometryId,meshId);poseNodes.push(poseNode(meshId,bone.matrixWorld));
  const material=mesh.material as THREE.MeshStandardMaterial;const rgb=material.map?[1,1,1]:material.color.clone().convertLinearToSRGB().toArray();
  objects.push(N('Material',[L(matId),S(cname(`${b.id}_material`,'Material')),S('')],[int('Version',102),text('ShadingModel','phong'),int('MultiLayer',0),N('Properties70',[],[vector('DiffuseColor','Color',rgb),property('DiffuseFactor','Number',[D(1)]),vector('SpecularColor','Color',[.04,.04,.04]),property('Shininess','Number',[D(8)]),property('TransparencyFactor','Number',[D(0)]),property('Opacity','Number',[D(1)])])]));connect(matId,meshId);
  if(material.map){const textureId=8000+i,videoId=9000+i,filename=`textures/${b.id}.png`,bytes=pngBytes(material.map.image as HTMLCanvasElement);
   objects.push(N('Video',[L(videoId),S(cname(b.id,'Video')),S('Clip')],[text('Type','Clip'),N('Properties70',[],[property('Path','KString',[S(filename)])]),text('Filename',filename),text('RelativeFilename',filename),N('Content',[{type:'R',value:bytes}])]));
   objects.push(N('Texture',[L(textureId),S(cname(b.id,'Texture')),S('')],[text('Type','TextureVideoClip'),int('Version',202),text('TextureName',cname(b.id,'Texture')),text('Media',cname(b.id,'Video')),text('FileName',filename),text('RelativeFilename',filename),N('ModelUVTranslation',[D(0),D(0)]),N('ModelUVScaling',[D(1),D(1)]),text('Texture_Alpha_Source','None'),N('Properties70',[],[property('UVSet','KString',[S('UVMap')])])]));
   connect(videoId,textureId);connect(textureId,matId,'DiffuseColor');
  }
  objects.push(N('Deformer',[L(skinId),S(cname(b.id,'Deformer')),S('Skin')],[int('Version',101),N('Link_DeformAcuracy',[D(50)])]));
  objects.push(N('Deformer',[L(clusterId),S(cname(b.id,'SubDeformer')),S('Cluster')],[int('Version',100),N('UserData',[S(''),S('')]),N('Indexes',[IA(Array.from({length:positions.length/3},(_,j)=>j))]),N('Weights',[A(Array(positions.length/3).fill(1))]),N('Transform',[A(identity.toArray())]),N('TransformLink',[A(bone.matrixWorld.toArray())]),N('TransformAssociateModel',[A(identity.toArray())])]));
  connect(skinId,geometryId);connect(clusterId,skinId);connect(boneId,clusterId);
 });
 objects.push(N('Pose',[L(10000),S(cname('BindPose','Pose')),S('BindPose')],[text('Type','BindPose'),int('Version',100),int('NbPoseNodes',poseNodes.length),...poseNodes]));
 const counts=new Map<string,number>();objects.forEach(o=>counts.set(o.name,(counts.get(o.name)??0)+1));
 return encodeFile([
  N('FBXHeaderExtension',[],[int('FBXHeaderVersion',1003),int('FBXVersion',7400),int('EncryptionType',0),N('CreationTimeStamp',[],[int('Version',1000),int('Year',2026),int('Month',1),int('Day',1),int('Hour',0),int('Minute',0),int('Second',0),int('Millisecond',0)]),text('Creator','Geofolk Character Studio')]),
  N('GlobalSettings',[],[int('Version',1000),N('Properties70',[],[property('UpAxis','int',[I(1)]),property('UpAxisSign','int',[I(1)]),property('FrontAxis','int',[I(2)]),property('FrontAxisSign','int',[I(1)]),property('CoordAxis','int',[I(0)]),property('CoordAxisSign','int',[I(1)]),property('OriginalUpAxis','int',[I(1)]),property('OriginalUpAxisSign','int',[I(1)]),property('UnitScaleFactor','double',[D(100)]),property('OriginalUnitScaleFactor','double',[D(100)])])]),
  N('Documents',[],[int('Count',1),N('Document',[L(99999),S('Scene'),S('Scene')],[N('Properties70'),N('RootNode',[L(0)])])]),N('References'),
  N('Definitions',[],[int('Version',100),int('Count',objects.length),...Array.from(counts,([name,count])=>N('ObjectType',[S(name)],[int('Count',count)]))]),
  N('Objects',[],objects),N('Connections',[],connections),N('Takes',[],[text('Current','')]),
 ]);
}

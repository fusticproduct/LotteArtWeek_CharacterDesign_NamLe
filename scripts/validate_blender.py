"""Round-trip FBX validation in Blender, executed headlessly."""
import bpy, json, sys
from pathlib import Path
from mathutils import Vector
folder=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(folder/'character.fbx'),use_anim=True)
armatures=[o for o in bpy.data.objects if o.type=='ARMATURE']
meshes=[o for o in bpy.data.objects if o.type=='MESH']
expected=json.loads((folder/'expected.json').read_text())
assert len(armatures)==1, f'Expected one armature, got {len(armatures)}'
arm=armatures[0]
assert set(b.name for b in arm.data.bones)==set(expected['bones'])
assert len(meshes)==26
for mesh in meshes:
    modifiers=[m for m in mesh.modifiers if m.type=='ARMATURE']
    assert len(modifiers)==1 and modifiers[0].object==arm, f'{mesh.name}: armature missing'
    assert all(len(v.groups)==1 and abs(v.groups[0].weight-1)<1e-6 for v in mesh.data.vertices), f'{mesh.name}: non-rigid weights'
# Verify imported mesh positions and the evaluated posed surface coincide.
max_displacement=0
for mesh in meshes:
    evaluated=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
    for original,posed in zip(mesh.data.vertices,evaluated.vertices):
        max_displacement=max(max_displacement,(original.co-posed.co).length)
assert max_displacement<1e-4, f'Bind pose mismatch: {max_displacement}'
# Check all named pivots have the expected world position (Y-up to Blender Z-up).
max_pivot_error=0
for name,xyz in expected['positions'].items():
    actual=arm.matrix_world@arm.data.bones[name].head_local
    target=Vector((xyz[0],-xyz[2],xyz[1]))
    max_pivot_error=max(max_pivot_error,(actual-target).length)
assert max_pivot_error<1e-4, f'Bone pivot mismatch: {max_pivot_error}'
texture_images=[n.image for m in bpy.data.materials if m.use_nodes for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image]
assert len(texture_images)>0, 'Expected embedded pattern textures'
assert all(tuple(image.size)==(256,256) for image in texture_images), 'Invalid embedded texture dimensions'
# Rotating the upper arm must move its descendant hand and its rigidly weighted mesh.
hand=next(o for o in meshes if o.name=='hand_L_mesh')
def centroid(o):
    eo=o.evaluated_get(bpy.context.evaluated_depsgraph_get());me=eo.to_mesh()
    p=sum((eo.matrix_world@v.co for v in me.vertices),Vector())/len(me.vertices)
    eo.to_mesh_clear();return p
before=centroid(hand)
arm.pose.bones['upperarm_L'].rotation_mode='XYZ'
arm.pose.bones['upperarm_L'].rotation_euler.z+=.5
bpy.context.view_layer.update()
movement=(centroid(hand)-before).length
assert movement>.05, f'Arm bone did not deform descendant hand: {movement}'
report={'armatures':len(armatures),'bones':len(arm.data.bones),'meshes':len(meshes),'maxBindError':max_displacement,'maxPivotError':max_pivot_error,'handMovementAfterArmRotation':movement,'materials':len(bpy.data.materials),'embeddedTextures':len(texture_images),'result':'PASS'}
(folder/'blender-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
# The OBJ package must import as 26 named mesh objects with UVs and materials.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=str(folder/'character.obj'),forward_axis='Z',up_axis='Y')
obj_meshes=[o for o in bpy.data.objects if o.type=='MESH']
assert len(obj_meshes)==26
assert all(len(o.data.uv_layers)>0 and len(o.data.materials)==1 for o in obj_meshes)
report['objMeshes']=len(obj_meshes)
report['objMaterialsAndUVs']='PASS'
(folder/'blender-report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))

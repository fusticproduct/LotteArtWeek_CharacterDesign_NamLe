"""Deterministic, saturation-stratified median-cut quantization of the reference.
Usage: python scripts/extract_palette.py [source] [destination]
Requires Pillow. Each color is a quantized centroid, never a hand-picked hex.
"""
from PIL import Image
import colorsys, json, sys, hashlib
from pathlib import Path
source = Path(sys.argv[1] if len(sys.argv) > 1 else 'public/reference.png')
destination = Path(sys.argv[2] if len(sys.argv) > 2 else 'src/palette.json')
im = Image.open(source).convert('RGB')
im.thumbnail((1000, 1000))
groups = {'neutral': [], 'dark': [], 'red': [], 'orange': [], 'yellow': [], 'green': [], 'cyan': [], 'blue': [], 'violet': [], 'pink': []}
for rgb in im.getdata():
    h,s,v = colorsys.rgb_to_hsv(*(x/255 for x in rgb))
    h *= 360
    family = 'dark' if v < .48 else 'neutral' if s < .20 else ('red' if h < 12 or h >= 350 else 'orange' if h < 40 else 'yellow' if h < 75 else 'green' if h < 165 else 'cyan' if h < 200 else 'blue' if h < 252 else 'violet' if h < 285 else 'pink')
    groups[family].append(rgb)
colors=[]
for family, pixels in groups.items():
    count = {'neutral':1,'dark':2,'red':1,'orange':1,'yellow':2,'green':2,'cyan':1,'blue':3,'violet':2,'pink':3}[family]
    sample = Image.new('RGB', (len(pixels),1))
    sample.putdata(pixels)
    q=sample.quantize(colors=count, method=Image.Quantize.MEDIANCUT)
    pal=q.getpalette()
    entries=sorted(q.getcolors(), reverse=True)
    for n, index in entries:
        rgb=pal[index*3:index*3+3]
        colors.append({'id':f'{family}_{len([c for c in colors if c["family"]==family])+1}', 'family':family,'hex':'#'+''.join(f'{x:02x}' for x in rgb),'rgb':rgb,'sampleCount':n})
result={'source':'reference.png','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'method':'saturation-stratified median-cut, 18 centroids stratified by hue and value','colors':colors}
destination.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps([(c['id'],c['hex']) for c in colors]))

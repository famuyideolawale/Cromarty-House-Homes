import json,sys
from PIL import Image,ImageDraw
from lab import lab
M=json.load(open('model_geo.json'))
k,L=sys.argv[1],sys.argv[2];x0,z0,x1,z1=2,3.5,19.5,16.8;S=60
lab(k,x0,z0,x1,z1,S=S,name='tmp.png')
im=Image.open('tmp.png').convert('RGBA');ov=Image.new('RGBA',im.size,(0,0,0,0));g=ImageDraw.Draw(ov)
T=lambda p:((p[0]-x0)*S,(p[1]-z0)*S)
lev=M['levels'][L]
for p in lev['ext']:g.polygon([T(q) for q in p['o']],fill=(0,120,0,120))
for p in lev['part']:g.polygon([T(q) for q in p['o']],fill=(230,0,60,170))
Image.alpha_composite(im,ov).convert('RGB').save(f'ovl_{k}.png')

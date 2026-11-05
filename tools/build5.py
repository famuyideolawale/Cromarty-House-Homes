import numpy as np, json, math
import pymupdf as fitz
from PIL import Image, ImageDraw
PX=0.0125; S=1.4112; X0,Y0=95,120;K=S*PX
def key(c):return None if c is None else tuple(round(v,3) for v in c)
w=fitz.open('warrant.pdf')[0];dr=w.get_drawings()
M=np.load('masks.npz');WALL=M['ext']|M['tan']|M['pink'];H_,W_=WALL.shape
objs=[]
for d in dr:
    if key(d.get('color'))!=(0.0,0.486,0.69):continue
    r=d['rect']
    if (r.x0>520 and r.y1<330) or r.y1<130:continue
    x0,z0,x1,z1=(r.x0-X0)*K,(r.y0-Y0)*K,(r.x1-X0)*K,(r.y1-Y0)*K
    if max(x1-x0,z1-z0)<0.25 or min(x1-x0,z1-z0)<0.08:continue
    objs.append({'b':[x0,z0,x1,z1],'n':len(d['items']),'k':''.join(i[0][0] for i in d['items'])})
# containment
def inside(a,b,t=0.03):return a[0]>=b[0]-t and a[1]>=b[1]-t and a[2]<=b[2]+t and a[3]<=b[3]+t
objs.sort(key=lambda o:-(o['b'][2]-o['b'][0])*(o['b'][3]-o['b'][1]))
top=[]
for o in objs:
    par=next((t for t in top if inside(o['b'],t['b'])),None)
    if par is None:o['ch']=[];top.append(o)
    else:par['ch'].append(o)
def walld(x,z,dx,dz,lim=0.5):
    for s in np.arange(0,lim,0.0125):
        X,Z=int((x+dx*s)/PX),int((z+dz*s)/PX)
        if 0<=X<W_ and 0<=Z<H_ and WALL[Z,X]:return s
    return 9
furn=[]
for o in top:
    x0,z0,x1,z1=o['b'];wd,dp=x1-x0,z1-z0;a,b=sorted((wd,dp));cx,cz=(x0+x1)/2,(z0+z1)/2
    pil=[c for c in o['ch'] if 0.35<=min(c['b'][2]-c['b'][0],c['b'][3]-c['b'][1])<=0.5 and 0.55<=max(c['b'][2]-c['b'][0],c['b'][3]-c['b'][1])<=0.85]
    t=None;rot=0
    if b>=1.75 and a>=1.25 and pil:t='bed2'
    elif 1.75<=b<=2.1 and 0.8<=a<=1.05 and pil:t='bed1'
    elif 1.5<=b<=2.6 and 0.75<=a<=1.05:t='sofa'
    elif b>=1.3 and a>=1.25 and o['k'].count('l')>=6:t='sofaL'
    elif 1.3<=b<=1.5 and 1.3<=a:t='tableR'      # round dining sets drawn 1.4 dia
    elif 0.7<=a<=1.0 and 1.1<=b<=1.4:t='table'
    elif 0.6<=a<=1.0 and b<=1.0:t='table' if a>=0.68 else 'chair'
    elif 0.4<=a<=0.62 and 1.2<=b<=2.0:t='unit'
    elif 0.4<=a<=0.62 and 0.8<=b<1.2:t='desk'
    elif 0.35<=a and b<0.62:t='chair' if not any(abs(cx-f['x'])<1.6 and abs(cz-f['z'])<1.6 and f['t'] in('bed1','bed2') for f in furn) else 'bedside'
    else:continue
    # orientation: which side faces a wall (back)
    if t in('bed1','bed2') and pil:
        px_=np.mean([(c['b'][0]+c['b'][2])/2 for c in pil]);pz_=np.mean([(c['b'][1]+c['b'][3])/2 for c in pil])
        dx,dz=px_-cx,pz_-cz
        rot=(0 if dz<0 else 2) if abs(dz)*wd>abs(dx)*dp else (3 if dx<0 else 1)   # head side: 0=-z,1=+x,2=+z,3=-x
    else:
        ds=[walld(cx,z0,0,-1),walld(x1,cz,1,0),walld(cx,z1,0,1),walld(x0,cz,-1,0)]
        if t in('sofa','unit','desk'):
            if wd>dp: ds[1]=ds[3]=9
            else: ds[0]=ds[2]=9
        rot=int(np.argmin(ds))
    furn.append({'t':t,'x':round(cx,3),'z':round(cz,3),'w':round(wd,3),'d':round(dp,3),'r':rot})
for o in top:pass
# re-run bedside classification now beds known
for f in furn:
    if f['t']=='chair' and min(f['w'],f['d'])<0.5 and any(g['t'] in('bed1','bed2') and abs(f['x']-g['x'])<1.4 and abs(f['z']-g['z'])<1.4 for g in furn):f['t']='bedside'
from collections import Counter;print(Counter(f['t'] for f in furn))
json.dump(furn,open('furn.json','w'))
pix=w.get_pixmap(matrix=fitz.Matrix(S*0.5,S*0.5),clip=fitz.Rect(95,120,1975,1525))
im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples);im=Image.blend(im,Image.new('RGB',im.size,'white'),0.55)
g=ImageDraw.Draw(im);k=0.5/PX
C={'bed2':(200,0,0),'bed1':(255,120,0),'sofa':(0,150,0),'sofaL':(0,90,0),'tableR':(0,0,200),'table':(0,0,255),'chair':(150,0,150),'unit':(0,150,150),'desk':(120,120,0),'bedside':(255,0,255)}
for f in furn:
    g.rectangle([(f['x']-f['w']/2)*k,(f['z']-f['d']/2)*k,(f['x']+f['w']/2)*k,(f['z']+f['d']/2)*k],outline=C[f['t']],width=2)
    g.text(((f['x']-f['w']/2)*k+2,(f['z']-f['d']/2)*k+2),f"{f['t']}{f['r']}",fill=C[f['t']])
im.save('furn_dbg.png')

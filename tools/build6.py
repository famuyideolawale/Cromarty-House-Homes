import numpy as np, json
import pymupdf as fitz
from PIL import Image, ImageDraw
from scipy import ndimage as nd
PX=0.0125; S=1.4112; X0,Y0=95,120;K=S*PX
def key(c):return None if c is None else tuple(round(v,3) for v in c)
w=fitz.open('warrant.pdf')[0];dr=w.get_drawings()
M=np.load('masks.npz');WALL=M['ext']|M['tan']|M['pink'];H_,W_=WALL.shape
im=Image.new('L',(W_,H_),0);g=ImageDraw.Draw(im)
pp=lambda q:((q.x-X0)*S,(q.y-Y0)*S)
def bez(p0,p1,p2,p3,n=10):
    return [((1-t)**3*p0[0]+3*(1-t)**2*t*p1[0]+3*(1-t)*t*t*p2[0]+t**3*p3[0],(1-t)**3*p0[1]+3*(1-t)**2*t*p1[1]+3*(1-t)*t*t*p2[1]+t**3*p3[1]) for t in np.linspace(0,1,n)]
for d in dr:
    if key(d.get('color'))!=(0.0,0.486,0.69):continue
    r=d['rect']
    if (r.x0>520 and r.y1<330) or r.y1<130:continue
    for it in d['items']:
        if it[0]=='l':g.line([pp(it[1]),pp(it[2])],fill=255,width=2)
        elif it[0]=='re':g.rectangle([*pp(it[1].tl),*pp(it[1].br)],outline=255,width=2)
        elif it[0]=='qu':g.polygon([pp(z) for z in (it[1].ul,it[1].ur,it[1].lr,it[1].ll)],outline=255)
        elif it[0]=='c':g.line(bez(*[pp(z) for z in it[1:5]]),fill=255,width=2)
m=np.array(im)>0
m=nd.binary_closing(m,iterations=2)
f=nd.binary_fill_holes(m)
f=nd.binary_opening(f,iterations=3)   # drop pure lines
lab,n=nd.label(f)
furn=json.load(open('furn.json'))
beds=[x for x in furn if x['t'] in('bed1','bed2','bedside')]
def overl(b,x):
    return not(b[2]<x['x']-x['w']/2 or b[0]>x['x']+x['w']/2 or b[3]<x['z']-x['d']/2 or b[1]>x['z']+x['d']/2)
def walld(x,z,dx,dz,lim=0.6):
    for s in np.arange(0,lim,0.0125):
        X,Z=int((x+dx*s)/PX),int((z+dz*s)/PX)
        if 0<=X<W_ and 0<=Z<H_ and WALL[Z,X]:return s
    return 9
out=list(beds)
for i,sl in enumerate(nd.find_objects(lab)):
    comp=lab[sl]==i+1
    x0,z0,x1,z1=sl[1].start*PX,sl[0].start*PX,sl[1].stop*PX,sl[0].stop*PX
    wd,dp=x1-x0,z1-z0;a,b=sorted((wd,dp));fill=comp.mean();cx,cz=(x0+x1)/2,(z0+z1)/2
    if any(overl([x0,z0,x1,z1],x) for x in beds) or b<0.3:continue
    if a>=1.2 and b>=1.2 and fill<0.7: t='sofaL'
    elif 1.3<=b<=2.8 and 0.7<=a<=1.1: t='sofa'
    elif 1.1<=b<=2.1 and 0.38<=a<0.7: t='unit'
    elif 0.75<=b<=1.1 and 0.38<=a<0.7: t='coffee'
    elif 1.2<=a and b<=1.6: t='dining'
    elif 0.65<=a and b<=1.4: t='table'
    elif 0.3<=a and b<0.65: t='chair'
    else: continue
    ds=[walld(cx,z0,0,-1),walld(x1,cz,1,0),walld(cx,z1,0,1),walld(x0,cz,-1,0)]
    if t in('sofa','unit','coffee'):
        if wd>dp: ds[1]=ds[3]=9
        else: ds[0]=ds[2]=9
    rec={'t':t,'x':round(cx,3),'z':round(cz,3),'w':round(wd,3),'d':round(dp,3),'r':int(np.argmin(ds))}
    if t=='sofaL':
        # L-shape: store mask-derived arms: which corner is filled
        q=[comp[:comp.shape[0]//2,:comp.shape[1]//2].mean(),comp[:comp.shape[0]//2,comp.shape[1]//2:].mean(),comp[comp.shape[0]//2:,comp.shape[1]//2:].mean(),comp[comp.shape[0]//2:,:comp.shape[1]//2].mean()]
        rec['corner']=int(np.argmax(q))
    out.append(rec)
from collections import Counter;print(Counter(x['t'] for x in out))
json.dump(out,open('furn2.json','w'))
pix=w.get_pixmap(matrix=fitz.Matrix(S*0.5,S*0.5),clip=fitz.Rect(95,120,1975,1525))
bg=Image.frombytes('RGB',(pix.width,pix.height),pix.samples);bg=Image.blend(bg,Image.new('RGB',bg.size,'white'),0.55)
g=ImageDraw.Draw(bg);k=0.5/PX
for x in out:
    g.rectangle([(x['x']-x['w']/2)*k,(x['z']-x['d']/2)*k,(x['x']+x['w']/2)*k,(x['z']+x['d']/2)*k],outline=(220,0,0),width=2)
    g.text(((x['x']-x['w']/2)*k+2,(x['z']-x['d']/2)*k+2),f"{x['t']}{x['r']}",fill=(0,0,200))
bg.save('furn2_dbg.png')

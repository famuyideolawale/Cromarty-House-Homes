import pymupdf as fitz, numpy as np
from PIL import Image, ImageDraw
def key(c):return None if c is None else tuple(round(v,3) for v in c)
p=fitz.open('plan1.pdf')[0];dr=p.get_drawings()
S=0.01764/0.0125;W,H=2654,1984
def T(q,dx):
    wx=2382.78-2*q.y; wy=-2873.08+2*(q.x+dx); return ((wx-95)*S,(wy-120)*S)
def raster(x0,x1,dx,pred):
    im=Image.new('L',(W,H),0);g=ImageDraw.Draw(im)
    for d in dr:
        r=d['rect']
        if not(r.x0>=x0 and r.x1<=x1 and r.y0>=150 and r.y1<=1160):continue
        if not pred(d):continue
        pts=[]
        for it in d['items']:
            if it[0]=='l':pts+=[T(it[1],dx),T(it[2],dx)]
            elif it[0]=='re':
                rr=it[1];g.polygon([T(fitz.Point(rr.x0,rr.y0),dx),T(fitz.Point(rr.x1,rr.y0),dx),T(fitz.Point(rr.x1,rr.y1),dx),T(fitz.Point(rr.x0,rr.y1),dx)],fill=255)
            elif it[0]=='qu':
                q=it[1];g.polygon([T(z,dx) for z in (q.ul,q.ur,q.lr,q.ll)],fill=255)
            elif it[0]=='c':pts+=[T(it[1],dx),T(it[4],dx)]
        if d.get('fill') is not None and len(pts)>=3:g.polygon(pts,fill=255)
        elif d.get('fill') is None:
            for it in d['items']:
                if it[0]=='l':g.line([T(it[1],dx),T(it[2],dx)],fill=255,width=2)
                elif it[0]=='c':g.line([T(it[1],dx),T(it[4],dx)],fill=255,width=2)
    return np.array(im)>0
grey=lambda d:key(d.get('fill'))==(0.859,0.859,0.859)
lines=lambda d:d.get('fill') is None and d['type']=='s'
G=raster(760,1480,718.56,grey);Gl=raster(760,1480,718.56,lines)
Bm=raster(40,760,1437.12,grey);Bl=raster(40,760,1437.12,lines)
np.savez_compressed('gfb.npz',G=G,Gl=Gl,B=Bm,Bl=Bl)
for n,(a,b) in {'gf':(G,Gl),'bs':(Bm,Bl)}.items():
    v=np.full((H,W,3),255,np.uint8);v[b]=(150,150,150);v[a]=(20,20,20)
    Image.fromarray(v).resize((W*2//5,H*2//5)).save(n+'_mask.png')
# labels
import re
lab=[]
for b in p.get_text('dict')['blocks']:
    for l in b.get('lines',[]):
        t=' '.join(s['text'] for s in l['spans']).strip()
        x0,y0,x1,y1=l['bbox'];cx,cy=(x0+x1)/2,(y0+y1)/2
        if 150<cy<1160 and t and not re.fullmatch(r'[\d\s,.]+(mm)?',t):
            for nm,(a,b,dx) in {'G':(760,1480,718.56),'B':(40,760,1437.12)}.items():
                if a<cx<b: X,Y=T(fitz.Point(cx,cy),dx);lab.append([nm,t,round(X),round(Y)])
import json;json.dump(lab,open('gf_labels.json','w'));print(lab)

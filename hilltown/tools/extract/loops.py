from ht import *
import json,math
from shapely.geometry import Polygon
C=json.load(open('clips.json'))
SH={'GF':(0.6,-0.6),'FF':(0.7,-0.5),'SF':(0,0)}
GX,GY=-1.0,-1.0
out={}
for k in SH:
    sh,cl,sc=C[k];P=Plan(sh,fitz.Rect(*cl),75,1.0);dx,dy=SH[k]
    M=lambda pt:(round(P.T(pt)[0]+dx-GX,4),round(P.T(pt)[1]+dy-GY,4))
    loops=[]
    for d in P.dr:
        w=round(d.get('width') or 0,2);c=d.get('color')
        if not c or w<0.8 or any(abs(v)>0.01 for v in c):continue
        pts=[]
        for it in d['items']:
            if it[0]=='l':
                if not pts:pts=[M(it[1])]
                pts.append(M(it[2]))
            elif it[0]=='re':
                r=it[1];loops.append([M(r.tl),M(r.tr),M(r.br),M(r.bl)])
        if len(pts)>3 and math.dist(pts[0],pts[-1])<0.02:loops.append(pts[:-1])
        elif d.get('closePath') and len(pts)>2:loops.append(pts)
    good=[]
    for L in loops:
        try:
            p=Polygon(L).buffer(0)
        except Exception:continue
        if p.area<0.03 or p.area>12:continue
        mr=p.minimum_rotated_rectangle;xs=list(mr.exterior.coords)
        e=sorted([math.dist(xs[0],xs[1]),math.dist(xs[1],xs[2])])
        if e[0]>0.7:continue   # thin elements only
        good.append([[round(a,3),round(b,3)] for a,b in p.exterior.coords[:-1]])
    out[k]=good;print(k,len(loops),'thin loops',len(good))
json.dump(out,open('loops.json','w'))

from ht import *
import json,math
C=json.load(open('clips.json'))
SH={'GF':(0.6,-0.6),'FF':(0.7,-0.5),'SF':(0,0),'RF':(0.55,0)}
GX,GY=-1.0,-1.0
def kcol(c): return None if c is None else tuple(round(v,3) for v in c)
def extract(k):
    sh,cl,sc=C[k];P=Plan(sh,fitz.Rect(*cl),75,1.0)   # res=1m => T gives metres
    dx,dy=SH[k]
    def M(pt):x,y=P.T(pt);return (round(x+dx-GX,4),round(y+dy-GY,4))
    out={'polys':[],'segs':[],'curves':[]}
    for d in P.dr:
        f=kcol(d.get('fill'));c=kcol(d.get('color'));w=round(d.get('width') or 0,2)
        if f and f!=(0.0,0.0,0.0):
            # polygon(s)
            pts=[];polys=[]
            for it in d['items']:
                if it[0]=='re':r=it[1];polys.append([M(r.tl),M(r.tr),M(r.br),M(r.bl)])
                elif it[0]=='qu':q=it[1];polys.append([M(q.ul),M(q.ur),M(q.lr),M(q.ll)])
                elif it[0]=='l':
                    if not pts:pts=[M(it[1])]
                    pts.append(M(it[2]))
                elif it[0]=='c':
                    if not pts:pts=[M(it[1])]
                    pts.append(M(it[4]))
            if len(pts)>2:polys.append(pts)
            for p in polys: out['polys'].append({'fill':f,'pts':p})
        if c is not None and d['type'] in ('s','fs'):
            for it in d['items']:
                if it[0]=='l':out['segs'].append({'c':c,'w':w,'a':M(it[1]),'b':M(it[2])})
                elif it[0]=='re':
                    r=it[1];q=[M(r.tl),M(r.tr),M(r.br),M(r.bl)]
                    for i in range(4):out['segs'].append({'c':c,'w':w,'a':q[i],'b':q[(i+1)%4],'re':1})
                elif it[0]=='c':out['curves'].append({'c':c,'w':w,'p':[M(it[1]),M(it[2]),M(it[3]),M(it[4])]})
    return out
V={k:extract(k) for k in ['GF','FF','SF','RF']}
json.dump(V,open('vec.json','w'))
for k,v in V.items():print(k,len(v['polys']),len(v['segs']),len(v['curves']))

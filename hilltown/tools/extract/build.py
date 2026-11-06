import json,numpy as np,math
from shapely.geometry import Polygon,MultiPolygon,box,LineString
from shapely.ops import unary_union
V=json.load(open('vec.json'));PR=json.load(open('pairs.json'));TH=json.load(open('thin.json'));TK=json.load(open('thick.json'))
LV={'GF':0,'FF':1,'SF':2}
Y={0:0.17,1:3.62,2:7.437}
FOOT=Polygon([(2.75,4.1),(19.3,5.38),(18.95,15.9),(2.3,15.9)])
BAYS=[Polygon([(3.25,15.85),(3.77,16.54),(5.4,16.54),(5.75,15.85)]),Polygon([(15.05,15.85),(15.4,16.54),(17.17,16.54),(17.55,15.85)])]
def r2(a):return [round(float(v),3) for v in a]
def ring(g):
    c=list(g.exterior.coords)[:-1];return [r2(p) for p in c]
def polys(g):
    if g.is_empty:return []
    gs=g.geoms if hasattr(g,'geoms') else [g]
    out=[]
    for p in gs:
        if p.geom_type!='Polygon' or p.area<0.004:continue
        p=p.simplify(0.008)
        out.append({'o':ring(p),'h':[[r2(q) for q in list(h.coords)[:-1]] for h in p.interiors]})
    return out
rear_out=lambda x:4.1+0.0773*(x-2.75)
model={'levels':{}}
for k,L in LV.items():
    lim=FOOT.buffer(0.03)
    if L>0: lim=unary_union([lim]+[b.buffer(0.02) for b in BAYS])
    G=[Polygon(p['pts']).buffer(0) for p in V[k]['polys'] if p['fill']==[0.762,0.762,0.762] and len(p['pts'])>2]
    tk=[Polygon(q).buffer(0) for q in TK[k]]
    tk=[p for p in tk if FOOT.buffer(-0.2).contains(p.centroid) and p.centroid.y<15.3 and abs(p.centroid.y-(rear_out(p.centroid.x)+0.25))>0.45]
    ext=unary_union([g for g in G if g.is_valid]+tk).intersection(lim)
    # partitions: wall-pair quads inside the footprint, clear of masonry, windows and the rear stair
    parts=[]
    inner=FOOT.buffer(-0.3)
    for q in PR[k]+TH[k]:
        P=Polygon(q)
        if P.area<0.02: continue
        mr=P.minimum_rotated_rectangle.exterior.coords;e=sorted([math.dist(mr[0],mr[1]),math.dist(mr[1],mr[2])])
        if e[1]<0.8 and e[1]/max(e[0],0.01)<3.2: continue
        c=P.centroid
        if not inner.contains(c): continue
        if ext.buffer(0.02).contains(c): continue
        if c.y>15.25: continue
        if abs(c.y-(rear_out(c.x)+0.25))<0.4: continue
        parts.append(P)
    part=unary_union([p.buffer(0.004) for p in parts]).difference(ext)
    lev={'y':Y[L],'ext':polys(ext),'part':polys(part)}
    # flats
    tint={'yel':[1.0,1.0,0.898],'blu':[0.961,0.98,1.0]}
    names={'GF':{'yel':1},'FF':{'yel':2,'blu':3},'SF':{'yel':4,'blu':5}}[k]
    lev['flatFloor']={}
    for t,n in names.items():
        g=unary_union([Polygon(p['pts']).buffer(0) for p in V[k]['polys'] if p['fill']==tint[t] and len(p['pts'])>2])
        lev['flatFloor'][n]=polys(g)
        lev.setdefault('flatBox',{})[n]=r2(g.bounds)
        lev.setdefault('flatArea',{})[n]=round(g.area,2)
    model['levels'][L]=lev
    print(k,'ext',len(lev['ext']),'part',len(lev['part']),{n:lev['flatArea'][n] for n in lev['flatArea']})
model['foot']=ring(FOOT);model['bays']=[ring(b) for b in BAYS]
json.dump(model,open('model_geo.json','w'))
# preview
from PIL import Image,ImageDraw
for L in (0,1,2):
    S=50;im=Image.new('RGB',(22*S,18*S),'white');g=ImageDraw.Draw(im)
    lev=model['levels'][L]
    for n,ps in lev['flatFloor'].items():
        for p in ps:g.polygon([(x*S,z*S) for x,z in p['o']],fill=(255,245,190) if n in (1,2,4) else (205,225,255))
    for p in lev['ext']:
        g.polygon([(x*S,z*S) for x,z in p['o']],fill=(120,110,100))
        for h in p['h']:g.polygon([(x*S,z*S) for x,z in h],fill=(255,255,255))
    for p in lev['part']:g.polygon([(x*S,z*S) for x,z in p['o']],fill=(200,0,60))
    im.save(f'geo_{L}.png')

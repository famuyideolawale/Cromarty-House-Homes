import json,math
from shapely.geometry import Polygon,box
from shapely.ops import unary_union
G=json.load(open('model_geo.json'))
V=json.load(open('vec.json'))
def r3(v):return round(float(v),3)
FOOT=Polygon(G['foot']);BAYS=[Polygon(b) for b in G['bays']]
Y=[0.17,3.62,7.437];EAVES=10.472;RIDGE=13.157
rear_out=lambda x:4.1+0.0773*(x-2.75)
def ring(p):return [[r3(a),r3(b)] for a,b in list(p.exterior.coords)[:-1]]
def polys(g):
    out=[]
    for p in getattr(g,'geoms',[g]):
        if p.geom_type!='Polygon' or p.area<0.01:continue
        p=p.simplify(0.01);out.append({'o':ring(p),'h':[[[r3(a),r3(b)] for a,b in list(h.coords)[:-1]] for h in p.interiors]})
    return out
def U(ps):return unary_union([Polygon(p['o'],p['h']).buffer(0) for p in ps])
# ---------- openings: (facade, x0, x1, kind, sill, head) ----------
FR=[('f',2.62,5.78,'gate',0,3.0),('f',6.5,7.56,'door',0,2.95),('f',9.92,10.9,'win',.95,2.85),('f',12.82,13.8,'win',.95,2.85),
    ('f',15.04,15.72,'win',.95,2.85),('f',15.96,16.62,'win',.95,2.85),('f',16.88,17.56,'win',.95,2.85),
    ('r',7.25,9.58,'screen',0.46,2.75),('r',13.02,14.19,'win',1.1,2.3),('r',16.59,18.04,'door',0,2.4)]
UP=lambda s,h,hb:[('f',7.02,8.0,'win',s,h),('f',9.92,10.9,'win',s,h),('f',12.82,13.8,'win',s,h),('f',3.38,5.64,'bay',0,hb),('f',15.14,17.42,'bay',0,hb),
    ('r',3.32,4.02,'win',0.0,2.35),('r',4.24,4.93,'door',0,2.35),('r',5.15,5.85,'win',0.0,2.35),('r',7.25,8.81,'screen',0,2.35),
    ('r',13.73,14.31,'win',1.1,2.1),('r',16.59,17.2,'door',0,2.35),('r',17.3,18.04,'win',0.0,2.35)]
OPEN={0:FR,1:UP(.55,2.85,2.95),2:UP(.6,2.55,2.65)}
def oquad(f,x0,x1):
    if f=='f':return [[x0,15.33],[x1,15.33],[x1,15.92],[x0,15.92]]
    zo=lambda x:rear_out(x)-0.05;zi=lambda x:rear_out(x)+0.5
    return [[x0,r3(zo(x0))],[x1,r3(zo(x1))],[x1,r3(zi(x1))],[x0,r3(zi(x0))]]
M={'name':'Hilltown','address':'112–114 Hilltown, Dundee DD3 7BG','levels':{},'eaves':EAVES,'ridge':RIDGE,'north':225}
# bathroom fittings from the drawing's fills
FIX={}
for k,L in [('GF',0),('FF',1),('SF',2)]:
    g=unary_union([Polygon(p['pts']).buffer(0.01) for p in V[k]['polys'] if p['fill']==[0.922,0.98,1.0] and len(p['pts'])>2])
    out=[]
    for p in getattr(g,'geoms',[g]):
        b=p.bounds;cx,cz=(b[0]+b[2])/2,(b[1]+b[3])/2
        if not(2.5<cx<19.2 and 4.3<cz<15.5):continue
        a=p.area;w,d=b[2]-b[0],b[3]-b[1]
        t=('bath' if w>d else 'shower') if a>1.0 else 'sink' if abs(a-0.38)<.05 else 'fx'
        out.append({'t':t,'b':[r3(v) for v in b]})
    FIX[L]=out
# walls nearest each small fitting decide basin vs WC orientation in the viewer; tag by shape
from shapely.geometry import Point
for L,k in [(0,'GF'),(1,'FF'),(2,'SF')]:
    gl=G['levels'][str(L)];W=unary_union([Polygon(p['o'],p['h']).buffer(0) for p in gl['ext']+gl['part']])
    for f in FIX[L]:
        x0,z0,x1,z1=f['b'];mids={0:(.5*(x0+x1),z0),1:(x1,.5*(z0+z1)),2:(.5*(x0+x1),z1),3:(x0,.5*(z0+z1))}
        side=min(mids,key=lambda s:W.distance(Point(mids[s])));f['r']=side
    sm=[f for f in FIX[L] if f['t']=='fx']
    for f in sm:
        mate=min([g for g in sm if g is not f],key=lambda g:math.dist(g['b'][:2],f['b'][:2]))
        md=lambda q:min(q['b'][2]-q['b'][0],q['b'][3]-q['b'][1])
        f['t']='basin' if md(f)<md(mate) else 'wc'
    for f in FIX[L]:
        x0,z0,x1,z1=f['b'];w,d=x1-x0,z1-z0
        mids={0:(.5*(x0+x1),z0),1:(x1,.5*(z0+z1)),2:(.5*(x0+x1),z1),3:(x0,.5*(z0+z1))}
        if f['t'] in ('basin','sink','bath'): cand=[0,2] if w>d else [1,3]
        elif f['t']=='wc': cand=[0,2] if w<d else [1,3]
        else: cand=[0,1,2,3]
        f['r']=min(cand,key=lambda s:W.distance(Point(mids[s])))
# ---------- rooms ----------
F2=[('Master bedroom',4.9,6.1),('Shower room',4.6,9.6),('Kitchen',4.9,11.6),('Lounge and dining',5.1,13.7),('Hall',7.4,10.9),('Bedroom 2',9.9,13.7)]
F3=[('Bathroom',12.3,6.6),('Master bedroom',17.3,7.0),('Hall',12.0,8.3),('Kitchen',16.4,10.0),('Lounge and dining',16.4,13.7),('Bedroom 2',13.0,13.7)]
ROOMS={0:[(1,n,x,z) for n,x,z in [('Shower room',12.4,6.5),('Master bedroom',16.4,7.1),('Hall',14.4,9.3),('Bedroom 2',9.7,12.9),('Kitchen and dining',13.0,12.9),('Lounge',16.6,12.9)]]+
          [(0,n,x,z) for n,x,z in [('Entrance hall',7.1,13.0),('Pend',4.4,13.0),('Cycle store',4.5,7.4),('Protected lobby',7.6,8.9),('Upper hall',7.7,6.0),('Terrace',16.6,3.4),('Stair',10.2,3.1)]],
       1:[(2,*r) for r in F2]+[(3,*r) for r in F3]+[(0,'Protected lobby',8.6,6.0),(2,'Balcony',4.8,3.0),(3,'Balcony',16.4,3.4)],
       2:[(4,*r) for r in F2]+[(5,*r) for r in F3]+[(0,'Protected lobby',8.6,6.0),(4,'Balcony',4.8,3.0),(5,'Balcony',16.4,3.4)]}
# ---------- furniture: t,x,z,w,d,r (r: side the head/back faces: 0=-z,1=+x,2=+z,3=-x) ----------
FU2=[('bed2',4.2,6.05,2.0,1.45,3),('ward',4.7,7.85,3.2,0.6,2),('sofa',3.4,13.75,0.85,2.3,3),('coffee',4.65,13.7,0.9,0.6,0),('chair',5.6,12.95,0.8,0.8,1),
     ('dining',7.15,14.0,1.1,1.1,0),('bed2',10.3,13.75,1.95,1.45,1),('ward',10.45,11.85,1.6,0.6,0),('tv',3.3,12.1,0.4,1.2,3)]
KIT2=[[3.03,10.27,6.45,10.9,'n'],[3.57,11.0,5.03,12.55,'i']]
FU3=[('bed2',17.65,7.15,1.95,1.45,1),('ward',15.05,6.2,1.3,1.6,0),('sofa',17.85,13.6,0.85,2.4,1),('coffee',16.75,13.4,0.75,1.1,0),('tv',14.75,13.7,0.45,1.9,3),
     ('chair',16.35,14.85,0.8,0.8,2),('bed2',13.3,13.5,1.95,1.45,1),('ward',13.6,11.78,1.5,0.6,0),('stools',17.2,11.6,1.6,0.4,0)]
KIT3=[[14.43,8.93,18.5,9.6,'n'],[17.86,9.6,18.5,10.4,'e'],[15.86,10.5,18.3,11.25,'i']]
FU1=[('bed2',15.3,7.05,1.95,1.45,3),('ward',18.3,7.4,0.6,2.1,1),('bed2',9.55,13.85,1.95,1.45,3),('ward',8.68,11.25,0.6,1.7,3),
     ('dining',12.9,13.95,1.15,1.15,0),('sofa',18.05,13.5,0.85,2.2,1),('sofa',17.2,14.6,1.8,0.8,2),('chair',17.05,11.6,0.8,0.8,1),('coffee',16.4,13.3,0.9,0.6,0),('tv',14.9,12.85,0.4,1.4,3)]
KIT1=[[11.82,10.3,14.0,10.86,'n'],[11.82,10.86,12.45,12.86,'w'],[13.9,11.0,14.55,12.35,'i']]
FURN={0:[(1,)+f for f in FU1],1:[(2,)+f for f in FU2]+[(3,)+f for f in FU3],2:[(4,)+f for f in FU2]+[(5,)+f for f in FU3]}
KIT={0:[(1,k) for k in KIT1],1:[(2,k) for k in KIT2]+[(3,k) for k in KIT3],2:[(4,k) for k in KIT2]+[(5,k) for k in KIT3]}
TALL={0:[[11.82,10.86,12.45,12.86]],1:[[5.3,10.27,6.45,10.9],[14.43,8.93,15.86,9.6]],2:[[5.3,10.27,6.45,10.9],[14.43,8.93,15.86,9.6]]}
FLATS={0:[1],1:[2,3],2:[4,5]}
for L in (0,1,2):
    g=G['levels'][str(L)]
    ext=U(g['ext']);part=U(g['part'])
    slab=FOOT if L==0 else unary_union([FOOT]+BAYS)
    flats={n:U(ps) for n,ps in g['flatFloor'].items()}
    common=slab.difference(unary_union(list(flats.values()))).difference(ext.buffer(0.01)).buffer(-0.02).buffer(0.02)
    lev={'y':Y[L],'top':Y[L+1] if L<2 else EAVES,'ceil':3.15 if L==0 else 3.45 if L==1 else 2.95,
         'slab':polys(slab),'ext':g['ext'],'part':g['part'],'flatFloor':g['flatFloor'],'common':polys(common),
         'open':[{'f':o[0],'x0':o[1],'x1':o[2],'k':o[3],'s':o[4],'h':o[5],'q':oquad(o[0],o[1],o[2])} for o in OPEN[L]],
         'fix':FIX[L],'rooms':[{'flat':a,'name':b,'x':c,'z':d} for a,b,c,d in ROOMS[L]],
         'furn':[{'flat':f[0],'t':f[1],'x':f[2],'z':f[3],'w':f[4],'d':f[5],'r':f[6]} for f in FURN[L]],
         'kit':[{'flat':a,'b':k[:4],'side':k[4]} for a,k in KIT[L]],'tall':TALL[L],'flats':FLATS[L]}
    M['levels'][L]=lev
M['flats']=[
 {'n':1,'level':0,'beds':2,'area':88.34,'price':165000,'outside':'Terrace, 15.92 m²','outA':15.92,'aspect':'Hilltown and rear terrace','bath':'Shower room'},
 {'n':2,'level':1,'beds':2,'area':66.70,'price':125000,'outside':'Balcony, 9.65 m²','outA':9.65,'aspect':'Hilltown bay and rear balcony','bath':'Shower room'},
 {'n':3,'level':1,'beds':2,'area':75.70,'price':145000,'outside':'Balcony, 15.66 m²','outA':15.66,'aspect':'Hilltown bay and rear balcony','bath':'Bathroom'},
 {'n':4,'level':2,'beds':2,'area':68.15,'price':130000,'outside':'Balcony, 9.65 m²','outA':9.65,'aspect':'Hilltown bay and rear balcony','bath':'Shower room'},
 {'n':5,'level':2,'beds':2,'area':77.15,'price':145000,'outside':'Balcony, 15.66 m²','outA':15.66,'aspect':'Hilltown bay and rear balcony','bath':'Bathroom'}]
for f in M['flats']:
    b=Polygon(unary_union([Polygon(p['o']) for p in M['levels'][f['level']]['flatFloor'][str(f['n'])]]).bounds if False else None)
M['balconies']=[{'flats':[2,4],'L':[1,2],'poly':[[2.92,4.15],[2.92,2.35],[3.45,1.8],[7.05,1.62],[7.05,4.45]]},
                {'flats':[3,5],'L':[1,2],'poly':[[13.45,1.82],[19.05,2.2],[19.2,5.38],[13.45,4.92]]}]
M['terrace']={'flat':1,'poly':[[13.45,1.82],[19.05,2.2],[19.2,5.38],[13.45,4.92]]}
M['tower']={'x0':7.05,'x1':13.45,'z0':1.6,'top':9.3}
M['foot']=G['foot'];M['bays']=G['bays']
json.dump(M,open('/home/claude/hilltown/model.json','w'),separators=(',',':'))
open('/home/claude/hilltown/model.js','w').write('window.HT_MODEL='+json.dumps(M,separators=(',',':'))+';')
import os;print(os.path.getsize('/home/claude/hilltown/model.js'))
print({L:len(M['levels'][L]['fix']) for L in M['levels']},[f['t'] for f in M['levels'][1]['fix']])

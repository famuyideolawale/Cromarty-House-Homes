import numpy as np, json, math
import pymupdf as fitz
from scipy import ndimage as nd
from PIL import Image, ImageDraw
PX=0.0125; S=1.4112; X0,Y0=95,120
def key(c):return None if c is None else tuple(round(v,3) for v in c)
M=np.load('masks.npz'); ext,tan,pink,fp=M['ext'],M['tan'],M['pink'],M['fp']
lil=np.load('m_lilac.npy')
WALL=ext|tan|pink
H_,W_=ext.shape
w=fitz.open('warrant.pdf')[0];dr=w.get_drawings()
P=lambda q:np.array([(q.x-X0)*S*PX,(q.y-Y0)*S*PX])   # metres
def legend(d):
    r=d['rect'];return (r.x0>520 and r.y1<330) or r.y1<130
def wall_at(p,m=WALL):
    x,y=int(p[0]/PX),int(p[1]/PX)
    return 0<=x<W_ and 0<=y<H_ and m[y,x]
# ---------- door arcs
arcs=[]
for d in dr:
    if key(d.get('color'))!=(0,0,0) or legend(d):continue
    cs=[it for it in d['items'] if it[0]=='c']
    chains=[];cur=[]
    for it in cs:
        if cur and abs(cur[-1][4]-it[1])>0.5: chains.append(cur);cur=[]
        cur.append(it)
    if cur:chains.append(cur)
    segs=[[c] for c in cs]+[ch for ch in chains if len(ch)>1]
    for ch in segs:
        p0=P(ch[0][1]);p1=P(ch[0][2]);p3=P(ch[-1][4])
        ch=np.linalg.norm(p3-p0)
        if not(0.55<ch/math.sqrt(2)<1.15):continue
        r=ch/math.sqrt(2)
        for C in (np.array([p0[0],p3[1]]),np.array([p3[0],p0[1]])):
            if abs(np.linalg.norm(C-p0)-r)<0.03 and abs(np.linalg.norm(C-p3)-r)<0.03:
                t0=p1-p0
                if abs(np.dot(t0,p0-C))<0.02*np.linalg.norm(t0)*r+1e-6:
                    arcs.append((C,p0,p3,r))
print('arcs',len(arcs))
WD=nd.binary_dilation(WALL,iterations=3)
doors=[];leaves=[]
for C,a,b,r in arcs:
    ua=(a-C)/r;ub=(b-C)/r
    wa=wall_at(C-ua*0.12,WD);wb=wall_at(C-ub*0.12,WD)
    if wa and not wb: u,v=ua,ub
    elif wb and not wa: u,v=ub,ua
    else:
        # choose the radius whose mid lies nearer walls on both sides
        u,v=(ua,ub) if wa else (ub,ua)
    def ext_(p):
        a=b=0
        for s_ in np.arange(0,0.8,0.0125):
            if wall_at(p+v*s_):b=s_
            else:break
        for s_ in np.arange(0,0.8,0.0125):
            if wall_at(p-v*s_):a=s_
            else:break
        return a,b
    a_,b_=ext_(C-u*0.05)
    if a_+b_<0.05: a_,b_=ext_(C+u*(r+0.05))
    if a_+b_<0.05: a_,b_=0.06,0.06
    q=[C-v*(a_+0.01),C+v*(b_+0.01),C+u*r-v*(a_+0.01),C+u*r+v*(b_+0.01)]
    xs=[p[0] for p in q];zs=[p[1] for p in q]
    doors.append([round(min(xs),3),round(min(zs),3),round(max(xs),3),round(max(zs),3)])
    e=C+v*r
    cl=C+u*r
    leaves.append([round(C[0],3),round(C[1],3),round(e[0],3),round(e[1],3),round(cl[0],3),round(cl[1],3)])
# ---------- light-fill fixtures
lf=Image.new('L',(W_,H_),0);g=ImageDraw.Draw(lf)
pp=lambda q:((q.x-X0)*S,(q.y-Y0)*S)
for d in dr:
    if key(d.get('fill'))!=(0.969,0.976,0.937) or legend(d):continue
    for it in d['items']:
        if it[0]=='re':g.rectangle([*pp(it[1].tl),*pp(it[1].br)],fill=255)
        elif it[0]=='qu':g.polygon([pp(z) for z in (it[1].ul,it[1].ur,it[1].lr,it[1].ll)],fill=255)
    pts=[pp(it[1]) for it in d['items'] if it[0]=='l']
    if len(pts)>=3:g.polygon(pts,fill=255)
lfm=nd.binary_closing(np.array(lf)>0,iterations=2)
lab,n=nd.label(lfm)
fix=[]
for i,sl in enumerate(nd.find_objects(lab)):
    wdt=(sl[1].stop-sl[1].start)*PX;hgt=(sl[0].stop-sl[0].start)*PX
    a,b=sorted((wdt,hgt));cx=(sl[1].start+sl[1].stop)/2*PX;cz=(sl[0].start+sl[0].stop)/2*PX
    if b<0.25:continue
    if b>1.1 and a>0.65:t='shower'
    elif 0.5<=b<0.585 and a<=0.48:t='wc'
    elif 0.585<=b<=0.7 and a<=0.48:t='basin'
    elif 0.55<=a and b<=0.7:t='hob'
    elif a>=0.3 and b<=0.5:t='sink'
    else:continue
    fix.append({'t':t,'x':round(cx,3),'z':round(cz,3),'w':round(wdt,3),'d':round(hgt,3)})
from collections import Counter
print(Counter(f['t'] for f in fix))
json.dump({'doors':doors,'leaves':leaves,'fix':fix},open('doors_fix.json','w'))

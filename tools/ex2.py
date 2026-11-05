import pymupdf as fitz, numpy as np, json
from PIL import Image, ImageDraw
from scipy import ndimage as nd
def key(c):return None if c is None else tuple(round(v,3) for v in c)
MPP=0.01764            # metres per warrant pt
PX=0.0125              # metres per pixel
CLIP=fitz.Rect(95,120,1975,1525)
w=fitz.open('warrant.pdf')[0]; dr=w.get_drawings()
S=MPP/PX
pix=w.get_pixmap(matrix=fitz.Matrix(S,S),clip=CLIP)
A=np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,pix.n)[:,:,:3].astype(int)
H,W=A.shape[:2]
P=lambda q:((q.x-CLIP.x0)*S,(q.y-CLIP.y0)*S)
def near(c,t):return (np.abs(A-np.array(c)).sum(2)<t)
tan=near((223,204,142),45)
pinkraw=near((248,163,157),45)
# separating walls: two pink bands with white core -> close across 260mm
pink=nd.binary_closing(pinkraw,structure=np.ones((5,5)),iterations=2)
tan=nd.binary_closing(tan,structure=np.ones((3,3)),iterations=2)
th=Image.new('L',(W,H),0);g=ImageDraw.Draw(th)
def bez(p0,p1,p2,p3,n=12):
    return [((1-t)**3*p0[0]+3*(1-t)**2*t*p1[0]+3*(1-t)*t*t*p2[0]+t**3*p3[0],(1-t)**3*p0[1]+3*(1-t)**2*t*p1[1]+3*(1-t)*t*t*p2[1]+t**3*p3[1]) for t in np.linspace(0,1,n)]
for d in dr:
    if key(d.get('color'))==(0,0,0) and round(d.get('width') or 0,2) in (1.98,1.14):
        for it in d['items']:
            if it[0]=='l':g.line([P(it[1]),P(it[2])],fill=255,width=3)
            elif it[0]=='c':g.line(bez(*[P(q) for q in it[1:5]]),fill=255,width=3)
lines=np.array(th)>0
lab,n=nd.label(~lines)
objs=nd.find_objects(lab); sizes=nd.sum(np.ones_like(lab),lab,range(1,n+1))
fill=np.zeros_like(lines)
for i,(sz,sl) in enumerate(zip(sizes,objs)):
    h=(sl[0].stop-sl[0].start)*PX; wd=(sl[1].stop-sl[1].start)*PX; area=sz*PX*PX
    if area<15 and area/max(h,wd)<0.8: fill|=(lab==i+1)
ext=nd.binary_dilation(lines,iterations=2)|fill
lb,k=nd.label(ext)
for i,sl in enumerate(nd.find_objects(lb)):
    comp=lb[sl]==i+1;h=(sl[0].stop-sl[0].start)*PX;wd=(sl[1].stop-sl[1].start)*PX
    if max(h,wd)<0.5 and comp.sum()/comp.size<0.9: ext[sl][comp]=False
def clean(m,minA=0.06,minL=0.3):
    lb,k=nd.label(m);out=np.zeros_like(m)
    for i,sl in enumerate(nd.find_objects(lb)):
        h=(sl[0].stop-sl[0].start)*PX;wd=(sl[1].stop-sl[1].start)*PX
        comp=lb[sl]==i+1
        if comp.sum()*PX*PX>=minA and max(h,wd)>=minL: out[sl]|=comp
    return out
tan=clean(tan);pink=clean(pink,0.1,0.5)
walls=ext|tan|pink
# footprint
r=int(1.7/PX)
dil=nd.binary_dilation(ext|lines,structure=np.ones((3,3)),iterations=r)
dil=nd.binary_fill_holes(dil)
fp=nd.binary_erosion(dil,structure=np.ones((3,3)),iterations=r,border_value=0)
fp=nd.binary_fill_holes(nd.binary_closing(fp|ext,structure=np.ones((3,3)),iterations=int(0.7/PX)))
interior=fp&~walls
np.savez_compressed('masks.npz',ext=ext,tan=tan,pink=pink,walls=walls,fp=fp,interior=interior)
lil=near((255,238,255),6)
lil=nd.binary_closing(lil,iterations=3)
lab2,n2=nd.label(lil)
szs=nd.sum(lil,lab2,range(1,n2+1))
lil=np.isin(lab2,[i+1 for i,z in enumerate(szs) if z*PX*PX>2])
np.save('m_lilac.npy',lil)
vis=np.full((H,W,3),255,np.uint8);vis[fp]=(235,240,245);vis[lil]=(240,200,240);vis[ext]=(30,30,30);vis[tan]=(200,170,60);vis[pink]=(220,90,90)
Image.fromarray(vis).resize((W*2//5,H*2//5)).save('walls2.png')
print(W,H)

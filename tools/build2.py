import numpy as np, json, math
import pymupdf as fitz
from scipy import ndimage as nd
from skimage.segmentation import watershed
PX=0.0125; S=1.4112; X0,Y0=95,120
def key(c):return None if c is None else tuple(round(v,3) for v in c)
M=np.load('masks.npz'); ext,tan,pink,fp=M['ext'],M['tan'],M['pink'],M['fp']
lil=np.load('m_lilac.npy')
labels=json.load(open('labels.json'))
H_,W_=ext.shape
def lin(L,ax):return np.ones((1,L),bool) if ax==0 else np.ones((L,1),bool)
def gaps(Wm,L,minrun=24):
    out=np.zeros_like(Wm)
    for ax in (0,1):
        o=nd.binary_opening(Wm,structure=lin(minrun,ax))
        c=nd.binary_closing(o,structure=lin(int(L/PX),ax))
        out|=c&~Wm
    return out
outside=~fp
near_out=nd.binary_dilation(outside,iterations=int(0.7/PX))
g_ext=gaps(ext,2.6)
win=g_ext&near_out
coredoor=g_ext&~near_out
gall=gaps(ext|tan|pink,1.3)
gpink=gaps(pink|ext,1.75)
doors=(gall|coredoor|(gpink&~near_out))&~win&~lil
# --- rect decomposition on grid g px
def rects(mask,g=2,minA=0.004):
    h,w=mask.shape;hh,ww=h//g,w//g
    m=mask[:hh*g,:ww*g].reshape(hh,g,ww,g).mean((1,3))>=0.5
    out=[];active={}
    for y in range(hh+1):
        runs=set()
        if y<hh:
            row=m[y];x=0
            while x<ww:
                if row[x]:
                    s=x
                    while x<ww and row[x]:x+=1
                    runs.add((s,x))
                else:x+=1
        nxt={}
        for r,(y0) in active.items():
            if r in runs: nxt[r]=y0
            else: out.append((r[0],y0,r[1],y))
        for r in runs:
            if r not in nxt: nxt[r]=y
        active=nxt
    k=g*PX
    return [[round(a*k,3),round(b*k,3),round(c*k,3),round(d*k,3)] for a,b,c,d in out if (c-a)*(d-b)*k*k>=minA]
R={}
R['ext']=rects(ext);R['sep']=rects(pink);R['part']=rects(tan&~pink&~ext)
R['win']=rects(win,2,0.01);R['door']=rects(doors,2,0.01)
print({k:len(v) for k,v in R.items()})
# --- rooms via watershed from label seeds
free=fp&~(ext|tan|pink|lil)
dist=nd.distance_transform_edt(free)
seeds=np.zeros(ext.shape,int);names={}
skip=('DR_','0.5','1HR','W','w','MHVR','AREA','GROSS','DRYING','SINK','F/FRZ','up','dwn','E X I T','m','F I R S T','19735','STAIR','W/M')
roomlabels=[l for l in labels if not l[0].startswith(skip) and 'F L A T' not in l[0]]
# flats
fl=fp&~(ext|pink|lil)&~(gpink&~gaps(tan,1.3))
flab,_=nd.label(fl)
flats={}
for l in labels:
    if 'F L A T' in l[0]:
        n=int(l[0].split()[-1]);flats[n]={'lab':int(flab[l[2],l[1]])}
# corridor label = biggest comp not a flat
comp_ids=set(v['lab'] for v in flats.values())
# fix flat6 leak: if flat comp too big, cut with tan-gap rule handled later
print({n:(v['lab'],round((flab==v['lab']).sum()*PX*PX,1)) for n,v in sorted(flats.items())})
np.save('flab2.npy',flab)
json.dump(R,open('R_typ.json','w'))
np.savez_compressed('openings.npz',win=win,doors=doors)

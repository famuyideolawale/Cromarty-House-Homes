import json,math,numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage as nd
V=json.load(open('vec.json'))
RES=0.025;OW,OH=int(24/RES),int(20/RES)
def polymask(k,fill):
    im=Image.new('L',(OW,OH),0);g=ImageDraw.Draw(im)
    for p in V[k]['polys']:
        if p['fill']==fill:g.polygon([(x/RES,y/RES) for x,y in p['pts']],fill=255)
    return np.array(im)>0
def segmask(k,pred,lw=1):
    im=Image.new('L',(OW,OH),0);g=ImageDraw.Draw(im)
    for s in V[k]['segs']:
        if pred(s):g.line([(s['a'][0]/RES,s['a'][1]/RES),(s['b'][0]/RES,s['b'][1]/RES)],fill=255,width=lw)
    return np.array(im)>0
def line_se(L,ang):
    n=int(L/RES);se=np.zeros((n,n),bool);c=n//2
    for t in np.linspace(-c,c,n*2):
        x=int(round(c+t*math.cos(ang)));y=int(round(c+t*math.sin(ang)))
        if 0<=x<n and 0<=y<n:se[y,x]=True
    return se
def gaps(k):
    g=polymask(k,[0.762,0.762,0.762])
    out=np.zeros_like(g)
    for ang,LL in [(0,2.7),(math.radians(4),2.7),(math.radians(-4),2.7),(math.radians(48),1.4),(math.radians(-48),1.4),(math.radians(90),1.6),(math.radians(86),1.6)]:
        o=nd.binary_opening(g,structure=line_se(0.3,ang))
        c=nd.binary_closing(o,structure=line_se(LL,ang))
        out|=c&~g
    out=nd.binary_opening(out,iterations=1)
    return g,out
R={}
for k in ['GF','FF','SF']:
    g,gp=gaps(k)
    l24=segmask(k,lambda s:s['w']==0.24 and s['c']==[0,0,0])
    lab,n=nd.label(gp);items=[]
    for i,sl in enumerate(nd.find_objects(lab)):
        m=lab==i+1;a=m.sum()*RES*RES
        if a<0.03:continue
        ys,xs=np.nonzero(m);pts=np.c_[xs,ys]*RES;c=pts.mean(0)
        u,s_,vt=np.linalg.svd(pts-c,full_matrices=False);ax=vt[0];nr=np.array([-ax[1],ax[0]])
        pa=(pts-c)@ax;pn=(pts-c)@nr
        q=[(c+ax*pa.min()+nr*pn.min()).tolist(),(c+ax*pa.max()+nr*pn.min()).tolist(),(c+ax*pa.max()+nr*pn.max()).tolist(),(c+ax*pa.min()+nr*pn.max()).tolist()]
        if not( (pn.max()-pn.min())<0.75 and (pa.max()-pa.min())>0.35 and (l24&m).sum()>0):continue
        items.append({'c':c.round(3).tolist(),'len':round(pa.max()-pa.min(),3),'th':round(pn.max()-pn.min(),3),'q':[[round(v,3) for v in p] for p in q],'glass':int((l24&m).sum())})
    R[k]=items;print(k,len(items))
    im=np.full(g.shape+(3,),255,np.uint8);im[g]=(255,160,60);[None for _ in []];kept=np.zeros_like(gp)
    for it in items:
        pass
    im[gp]=(170,200,255);im[l24&gp]=(0,0,0)
    Image.fromarray(im[:680,:960]).save(f'gap_{k}.png')
json.dump(R,open('gaps.json','w'))

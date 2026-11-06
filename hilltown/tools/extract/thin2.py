import json,numpy as np,math
from PIL import Image,ImageDraw
from scipy import ndimage as nd
V=json.load(open('vec.json'))
RES=0.02;OW,OH=int(22/RES),int(18/RES)
def draw(k):
    im=Image.new('L',(OW,OH),0);g=ImageDraw.Draw(im)
    for s in V[k]['segs']:
        if s['c']==[0,0,0] and s['w'] in (0.24,2.04,0.84):
            g.line([(s['a'][0]/RES,s['a'][1]/RES),(s['b'][0]/RES,s['b'][1]/RES)],fill=255,width=1)
    for p in V[k]['polys']:
        if p['fill']==[0.762,0.762,0.762] and len(p['pts'])>2:g.polygon([(x/RES,y/RES) for x,y in p['pts']],fill=255)
    return np.array(im)>0
out={}
for k in ['GF','FF','SF']:
    solid=draw(k);lab,n=nd.label(~solid)
    objs=nd.find_objects(lab);quads=[]
    for i,sl in enumerate(objs):
        m=lab[sl]==i+1;a=m.sum()*RES*RES
        if a>1.5 or a<0.01:continue
        ys,xs=np.nonzero(m);pts=np.c_[xs+sl[1].start,ys+sl[0].start]*RES+RES/2
        c=pts.mean(0);u,s_,vt=np.linalg.svd(pts-c,full_matrices=False);ax=vt[0];nr=np.array([-ax[1],ax[0]])
        pa=(pts-c)@ax;pn=(pts-c)@nr;L=pa.max()-pa.min()+RES;T=pn.max()-pn.min()+RES
        if L<0.25 or T>0.34 or T<0.05:continue
        if a/(L*T)<0.8:continue
        q=[c+ax*(pa.min()-RES/2)+nr*(pn.min()-RES/2),c+ax*(pa.max()+RES/2)+nr*(pn.min()-RES/2),c+ax*(pa.max()+RES/2)+nr*(pn.max()+RES/2),c+ax*(pa.min()-RES/2)+nr*(pn.max()+RES/2)]
        quads.append([[round(float(v),3) for v in p] for p in q])
    out[k]=quads;print(k,len(quads))
json.dump(out,open('thin.json','w'))

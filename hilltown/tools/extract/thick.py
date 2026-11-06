import json,numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage as nd
from shapely.geometry import Polygon
from shapely.ops import unary_union
V=json.load(open('vec.json'))
RES=0.02;OW,OH=int(22/RES),int(18/RES)
out={}
for k in ['GF','FF','SF']:
    im=Image.new('L',(OW,OH),0);g=ImageDraw.Draw(im)
    for s in V[k]['segs']:
        if s['c']==[0,0,0] and s['w']==2.04:g.line([(s['a'][0]/RES,s['a'][1]/RES),(s['b'][0]/RES,s['b'][1]/RES)],fill=255,width=2)
    for p in V[k]['polys']:
        if p['fill']==[0.762,0.762,0.762] and len(p['pts'])>2:g.polygon([(x/RES,y/RES) for x,y in p['pts']],fill=255)
    solid=np.array(im)>0
    lab,n=nd.label(~solid);res=[]
    for i,sl in enumerate(nd.find_objects(lab)):
        m=lab[sl]==i+1;a=m.sum()*RES*RES
        if a>4 or a<0.02:continue
        ys,xs=np.nonzero(m);pts=np.c_[xs+sl[1].start,ys+sl[0].start]*RES+RES/2
        c=pts.mean(0);u,s_,vt=np.linalg.svd(pts-c,full_matrices=False);ax=vt[0];nr=np.array([-ax[1],ax[0]])
        pa=(pts-c)@ax;pn=(pts-c)@nr;L=pa.max()-pa.min()+RES;T=pn.max()-pn.min()+RES
        if T>0.6 or L<0.3 or a/(L*T)<0.7:continue
        q=[c+ax*(pa.min()-RES)+nr*(pn.min()-RES),c+ax*(pa.max()+RES)+nr*(pn.min()-RES),c+ax*(pa.max()+RES)+nr*(pn.max()+RES),c+ax*(pa.min()-RES)+nr*(pn.max()+RES)]
        res.append([[round(float(v),3) for v in p] for p in q])
    out[k]=res;print(k,len(res))
json.dump(out,open('thick.json','w'))

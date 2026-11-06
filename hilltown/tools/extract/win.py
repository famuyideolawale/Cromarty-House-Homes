import json,math,numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage as nd
V=json.load(open('vec.json'))
RES=0.025
def segmask(k,pred,lw=2):
    im=Image.new('L',(int(24/RES),int(20/RES)),0);g=ImageDraw.Draw(im)
    for s in V[k]['segs']:
        if pred(s):g.line([(s['a'][0]/RES,s['a'][1]/RES),(s['b'][0]/RES,s['b'][1]/RES)],fill=255,width=lw)
    return np.array(im)>0
def polymask(k,fill):
    im=Image.new('L',(int(24/RES),int(20/RES)),0);g=ImageDraw.Draw(im)
    for p in V[k]['polys']:
        if p['fill']==fill:g.polygon([(x/RES,y/RES) for x,y in p['pts']],fill=255)
    return np.array(im)>0
out={}
for k in ['GF','FF','SF']:
    w84=segmask(k,lambda s:s['w']==0.84 and s['c']==[0.0,0.0,0.0])
    grey=polymask(k,[0.762,0.762,0.762])
    lab,n=nd.label(nd.binary_dilation(w84,iterations=3))
    wins=[]
    for i,sl in enumerate(nd.find_objects(lab)):
        m=lab[sl]==i+1
        ys,xs=np.nonzero(m);ys=ys+sl[0].start;xs=xs+sl[1].start
        if len(xs)<20:continue
        pts=np.c_[xs,ys]*RES
        # oriented bbox via PCA
        c=pts.mean(0);u,s_,vt=np.linalg.svd(pts-c,full_matrices=False);ax=vt[0];nr=np.array([-ax[1],ax[0]])
        pa=(pts-c)@ax;pn=(pts-c)@nr
        L=pa.max()-pa.min();T=pn.max()-pn.min()
        wins.append({'c':c.round(3).tolist(),'ax':ax.round(4).tolist(),'len':round(L,3),'th':round(T,3)})
    out[k]=wins;print(k,len(wins),[ (w['c'],w['len'],w['th']) for w in wins][:30])
    im=np.full(w84.shape+(3,),255,np.uint8);im[grey]=(255,160,60);im[w84]=(0,140,0)
    Image.fromarray(im[:680,:960]).save(f'win_{k}.png')
json.dump(out,open('wins_raw.json','w'))

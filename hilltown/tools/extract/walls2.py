from ht import *
import json, numpy as np, sys
from scipy import ndimage as nd
C=json.load(open('clips.json'));SH={'GF':(0.6,-0.6),'FF':(0.7,-0.5),'SF':(0,0),'RF':(0.55,0)}
def detect(k,res=0.01):
    sh,cl,sc=C[k];P=Plan(sh,fitz.Rect(*cl),75,res);im=np.array(P.render()).astype(int)
    r,g,b=im[...,0],im[...,1],im[...,2]
    dark=(r+g+b<660)&(abs(r-g)<45)&(abs(g-b)<45)   # black/grey lines only
    lab,n=nd.label(~dark)
    dt=nd.distance_transform_edt(~dark)
    out=[]
    objs=nd.find_objects(lab)
    mx=nd.maximum(dt,lab,np.arange(1,n+1)); area=nd.sum(np.ones_like(dt),lab,np.arange(1,n+1))
    keep=np.zeros(n+1,bool)
    for i,sl in enumerate(objs):
        h=(sl[0].stop-sl[0].start)*res; w=(sl[1].stop-sl[1].start)*res
        L=max(h,w)
        if mx[i]<=9 and mx[i]>=2.5 and L>=0.35 and area[i]*res*res/L>=0.04: keep[i+1]=True
    m=keep[lab]
    dx,dy=SH[k]
    return m,im,(dx+1,dy+1),res
if __name__=='__main__':
    k=sys.argv[1];m,im,(ox,oy),res=detect(k)
    o=im.copy();o[m]=[220,30,30]
    Image.fromarray(o.astype(np.uint8)).resize((im.shape[1]//2,im.shape[0]//2)).save(sys.argv[2])
    np.save('wm_'+k+'.npy',m); json.dump([ox,oy,res],open('wm_'+k+'.json','w'))

from ht import *
import json
from scipy import ndimage as nd
C=json.load(open('clips.json'))
SH={'GF':(0.6,-0.6),'FF':(0.7,-0.5),'SF':(0,0),'RF':(0.55,0)}
RES=0.025
GX,GY=(-1.0,-1.0)   # global frame origin offset so everything positive
OW,OH=int(24/RES),int(20/RES)
def glob(k,m):
    dx,dy=SH[k];ox=int(round((dx-GX)/RES));oy=int(round((dy-GY)/RES))
    o=np.zeros((OH,OW),bool);h,w=m.shape
    ys,xs=max(0,oy),max(0,ox);ye,xe=min(OH,oy+h),min(OW,ox+w)
    o[ys:ye,xs:xe]=m[ys-oy:ye-oy,xs-ox:xe-ox];return o
def plan(k):
    sh,cl,sc=C[k];return Plan(sh,fitz.Rect(*cl),75,RES)
def layers(k):
    P=plan(k)
    L={}
    L['grey']=glob(k,P.fillmask([(0.762,)*3]))
    L['l204']=glob(k,P.linemask([2.04],lw=2))
    L['l084']=glob(k,P.linemask([0.84],lw=2))
    L['l024']=glob(k,P.linemask([0.24],lw=1))
    L['l012']=glob(k,P.linemask([0.12],lw=1))
    L['yel']=glob(k,P.fillmask([(1.0,1.0,0.898)]))
    L['blu']=glob(k,P.fillmask([(0.961,0.98,1.0)]))
    L['bath']=glob(k,P.fillmask([(0.922,0.98,1.0)]))
    L['red']=glob(k,P.linemask([0.12,0.24,0.36,0.6,0.84,1.0,2.04],color=(1,0,0),lw=2))
    return L
if __name__=='__main__':
    import pickle
    A={k:layers(k) for k in ['GF','FF','SF','RF']}
    pickle.dump(A,open('layers.pkl','wb'))
    for k,L in A.items():
        im=np.full((OH,OW,3),255,np.uint8)
        im[L['yel']]=(255,245,170);im[L['blu']]=(200,225,255)
        im[L['grey']]=(255,170,60);im[L['l024']]=(160,0,200);im[L['l204']]=(0,0,255);im[L['l084']]=(0,170,0);im[L['bath']]=(0,200,255)
        Image.fromarray(im).save(f'g_{k}.png')

import pickle,numpy as np,json
from scipy import ndimage as nd
from PIL import Image
RES=0.025
A=pickle.load(open('layers.pkl','rb'))
def thin_walls(L):
    lines=nd.binary_dilation(L['l204']|L['l024'],iterations=1)
    solid=L['grey']|lines
    white=~solid
    lab,n=nd.label(white)
    objs=nd.find_objects(lab)
    sizes=nd.sum(np.ones_like(lab),lab,range(1,n+1))
    keep=np.zeros(n+1,bool)
    for i,(sl,sz) in enumerate(zip(objs,sizes)):
        h=(sl[0].stop-sl[0].start)*RES;w=(sl[1].stop-sl[1].start)*RES
        a=sz*RES*RES;Lm=max(h,w)
        if a<2.5 and Lm>0.3 and a/Lm<0.2: keep[i+1]=True
    thin=keep[lab]
    # walls = thin interiors + the lines that bound them
    wall=thin|(nd.binary_dilation(thin,iterations=2)&lines)
    return wall
out={}
for k in ['GF','FF','SF']:
    L=A[k];w=thin_walls(L)
    out[k]=w
    im=np.full(w.shape+(3,),255,np.uint8)
    im[L['yel']]=(255,245,170);im[L['blu']]=(200,225,255)
    im[L['l024']|L['l012']]=(200,200,200)
    im[L['grey']]=(255,150,40);im[w]=(200,0,60)
    Image.fromarray(im[0:640,0:880]).save(f'w_{k}.png')
np.savez_compressed('thin.npz',**out)

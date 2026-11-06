import json,math,numpy as np
from PIL import Image,ImageDraw
V=json.load(open('vec.json'))
RES=0.02;OW,OH=int(24/RES),int(20/RES)
def polymask(k):
    im=Image.new('L',(OW,OH),0);g=ImageDraw.Draw(im)
    for p in V[k]['polys']:
        if p['fill']==[0.762,0.762,0.762]:g.polygon([(x/RES,y/RES) for x,y in p['pts']],fill=255)
    return np.array(im)>0
def scan(m,a,b,band=0.12):
    a=np.array(a);b=np.array(b);L=np.linalg.norm(b-a);u=(b-a)/L;n=np.array([-u[1],u[0]])
    ts=np.arange(0,L,0.02);cov=[]
    for t in ts:
        hit=False
        for o in np.linspace(-band,band,7):
            p=a+u*t+n*o;x,y=int(p[0]/RES),int(p[1]/RES)
            if 0<=x<OW and 0<=y<OH and m[y,x]:hit=True;break
        cov.append(hit)
    cov=np.array(cov);out=[];i=0
    while i<len(cov):
        if not cov[i]:
            j=i
            while j<len(cov) and not cov[j]:j+=1
            if (j-i)*0.02>0.25:out.append((round(*(a+u*ts[i]))[0] if False else round((a+u*ts[i])[0],2),round((a+u*ts[min(j,len(ts)-1)])[0],2),round((j-i)*0.02,2)))
            i=j
        else:i+=1
    return out
M={k:polymask(k) for k in ['GF','FF','SF']}
import sys
for k in ['GF','FF','SF']:
    print(k,'front z15.55',scan(M[k],(1.5,15.55),(19.5,15.55)))
for k in ['GF','FF','SF']:
    print(k,'rear',scan(M[k],(2.5,4.24),(19.5,5.39),band=0.15))

import numpy as np, json
from scipy import ndimage as nd
PX=0.0125
O=np.load('openings.npz')
def comps(m,minA,kind):
    lab,n=nd.label(m,structure=np.ones((3,3)));out=[]
    for i,sl in enumerate(nd.find_objects(lab)):
        c=lab[sl]==i+1
        if c.sum()*PX*PX<minA:continue
        x0,z0,x1,z1=sl[1].start*PX,sl[0].start*PX,sl[1].stop*PX,sl[0].stop*PX
        out.append([round(x0,3),round(z0,3),round(x1,3),round(z1,3)])
    return out
R=json.load(open('R_typ.json'))
R['win']=comps(O['win'],0.03,'w');R['door']=comps(O['doors'],0.02,'d')
print(len(R['win']),len(R['door']))
json.dump(R,open('R_typ.json','w'))
from PIL import Image,ImageDraw
im=Image.new('RGB',(1330,1000),'white');g=ImageDraw.Draw(im);k=40
for t,c in [('ext',(20,20,20)),('sep',(200,40,40)),('part',(190,150,40)),('win',(40,140,255)),('door',(255,0,180))]:
    for a,b,cc,d in R[t]:g.rectangle([a*k,b*k,cc*k,d*k],fill=c)
im.save('model_typ.png')

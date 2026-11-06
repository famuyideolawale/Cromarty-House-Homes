from ht import *
import json,sys
from PIL import ImageDraw
C=json.load(open('clips.json'))
SH={'GF':(0.6,-0.6),'FF':(0.7,-0.5),'SF':(0,0),'RF':(0.55,0)}
GX,GY=-1.0,-1.0
def lab(k,x0,z0,x1,z1,S=70,name=None):
    sh,cl,sc=C[k];res=1/S
    P=Plan(sh,fitz.Rect(*cl),75,res);im=P.render();dx,dy=SH[k]
    # global (x,z) -> pixel: px=(x - dx + GX)/res
    ox=(x0-dx+GX)/res;oz=(z0-dy+GY)/res
    im=im.crop((int(ox),int(oz),int(ox+(x1-x0)*S),int(oz+(z1-z0)*S)));g=ImageDraw.Draw(im,'RGBA')
    for gx in range(int(x0),int(x1)+2):
        for h in (0,.5):
            X=(gx+h-x0)*S;g.line([(X,0),(X,im.height)],fill=(255,0,0,110 if h==0 else 50),width=1)
        g.text(((gx-x0)*S+2,2),str(gx),fill=(255,0,0,255))
    for gz in range(int(z0),int(z1)+2):
        for h in (0,.5):
            Y=(gz+h-z0)*S;g.line([(0,Y),(im.width,Y)],fill=(0,0,255,110 if h==0 else 50),width=1)
        g.text((2,(gz-z0)*S+2),str(gz),fill=(0,0,255,255))
    im.save(name);return im.size
if __name__=='__main__':
    a=sys.argv;print(lab(a[1],*map(float,a[2:6]),S=int(a[6]),name=a[7]))

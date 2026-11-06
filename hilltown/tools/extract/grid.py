import json,sys
from PIL import Image,ImageDraw,ImageFont
V=json.load(open('vec.json'))
def draw(k,x0,y0,x1,y1,S=80,name=None,show=('grey','lines','tint')):
    W,H=int((x1-x0)*S),int((y1-y0)*S)
    im=Image.new('RGB',(W,H),'white');g=ImageDraw.Draw(im)
    T=lambda p:((p[0]-x0)*S,(p[1]-y0)*S)
    for p in V[k]['polys']:
        f=p['fill']
        col={(0.762,0.762,0.762):(255,180,90),(1.0,1.0,0.898):(255,248,200),(0.961,0.98,1.0):(215,232,255),(0.922,0.98,1.0):(120,210,255),(0.0,0.0,0.0):(0,0,0)}.get(tuple(f))
        if col and len(p['pts'])>2:g.polygon([T(q) for q in p['pts']],fill=col)
    for s in V[k]['segs']:
        if s['c']==[0,0,0] or s['c']==[0.0,0.0,0.0]:
            col={2.04:(0,0,0),0.84:(0,150,0),0.24:(90,90,90),0.12:(170,170,170)}.get(s['w'],(200,200,200))
            g.line([T(s['a']),T(s['b'])],fill=col,width=2 if s['w']>=0.84 else 1)
    for gx in range(int(x0),int(x1)+1):
        for sub in range(0,10,5):
            xx=gx+sub/10
            if x0<=xx<=x1:g.line([((xx-x0)*S,0),((xx-x0)*S,H)],fill=(255,0,0) if sub==0 else (255,200,200),width=1)
        g.text(((gx-x0)*S+2,2),str(gx),fill=(255,0,0))
    for gy in range(int(y0),int(y1)+1):
        for sub in range(0,10,5):
            yy=gy+sub/10
            if y0<=yy<=y1:g.line([(0,(yy-y0)*S),(W,(yy-y0)*S)],fill=(0,0,255) if sub==0 else (205,205,255),width=1)
        g.text((2,(gy-y0)*S+2),str(gy),fill=(0,0,255))
    im.save(name or f'grid_{k}.png');return im.size
if __name__=='__main__':
    k=sys.argv[1];a=list(map(float,sys.argv[2:6]));S=int(sys.argv[6]) if len(sys.argv)>6 else 80
    print(draw(k,*a,S=S,name=sys.argv[7] if len(sys.argv)>7 else None))

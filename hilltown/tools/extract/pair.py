import json,math,numpy as np
from PIL import Image,ImageDraw
V=json.load(open('vec.json'))
def L(s):return math.dist(s['a'],s['b'])
def pairs(k,widths=(0.24,2.04),dmin=.06,dmax=.33,minlen=.3):
    S=[s for s in V[k]['segs'] if s['c']==[0.0,0.0,0.0] and s['w'] in widths and L(s)>=minlen]
    out=[]
    for i,s in enumerate(S):
        a=np.array(s['a']);b=np.array(s['b']);u=(b-a)/np.linalg.norm(b-a);n=np.array([-u[1],u[0]])
        for t in S[i+1:]:
            c=np.array(t['a']);d=np.array(t['b']);v=(d-c)/np.linalg.norm(d-c)
            if abs(abs(u@v)-1)>0.0015:continue   # ~3 deg
            off=(c-a)@n
            if not(dmin<=abs(off)<=dmax):continue
            if abs((d-a)@n-off)>0.02:continue
            t0,t1=sorted([(c-a)@u,(d-a)@u]);s0,s1=0,np.linalg.norm(b-a)
            o0,o1=max(t0,s0),min(t1,s1)
            if o1-o0<0.25:continue
            p0=a+u*o0;p1=a+u*o1
            out.append([p0.tolist(),p1.tolist(),(p1+n*off).tolist(),(p0+n*off).tolist()])
    return out
R={}
for k in ['GF','FF','SF']:
    R[k]=pairs(k);print(k,len(R[k]))
json.dump(R,open('pairs.json','w'))
# draw
for k in ['GF','FF','SF']:
    S=40;im=Image.new('RGB',(24*S,20*S),'white');g=ImageDraw.Draw(im)
    for p in V[k]['polys']:
        if p['fill']==[0.762,0.762,0.762]:g.polygon([(x*S,y*S) for x,y in p['pts']],fill=(255,160,60))
        elif p['fill']==[1.0,1.0,0.898]:g.polygon([(x*S,y*S) for x,y in p['pts']],fill=(255,245,180))
        elif p['fill']==[0.961,0.98,1.0]:g.polygon([(x*S,y*S) for x,y in p['pts']],fill=(205,225,255))
    for s in V[k]['segs']:
        if s['c']==[0.0,0.0,0.0] and s['w'] in (0.24,0.12):g.line([(s['a'][0]*S,s['a'][1]*S),(s['b'][0]*S,s['b'][1]*S)],fill=(170,170,170))
    for q in R[k]:g.polygon([(x*S,y*S) for x,y in q],fill=(200,0,60))
    im.crop((0,0,24*S,17*S)).save(f'p_{k}.png')

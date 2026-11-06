import numpy as np, json
from scipy import ndimage as nd
from PIL import Image, ImageDraw
PX=0.0125
exec(open('build2.py').read().split('# --- rect decomposition')[0].split('M=np.load')[0])
src=open('build2.py').read()
rects_src=src[src.index('def rects'):src.index("R={}")]
exec(rects_src)
def lin(L,ax):return np.ones((1,L),bool) if ax==0 else np.ones((L,1),bool)
def gaps(Wm,L,minrun=24):
    out=np.zeros_like(Wm)
    for ax in (0,1):
        o=nd.binary_opening(Wm,structure=lin(minrun,ax))
        c=nd.binary_closing(o,structure=lin(int(L/PX),ax))
        out|=c&~Wm
    return out
G=np.load('gfb.npz')
out={}
for nm,(Wm,Lm) in {'ground':(G['G'],G['Gl']),'basement':(G['B'],G['Bl'])}.items():
    Wm=nd.binary_opening(Wm,iterations=1)
    if nm=='basement':
        # basement only exists under the stair B wing: drop the solid 'unexcavated' block
        lab,n=nd.label(Wm);sz=nd.sum(Wm,lab,range(1,n+1))
        big=np.argmax(sz)+1;Wm=Wm&(lab!=big)
        Wm[:, :int(22.0/PX)]=False; Wm[:int(19.4/PX),:]=False
    r=int(1.7/PX)
    dil=nd.binary_fill_holes(nd.binary_dilation(Wm,iterations=r))
    fpg=nd.binary_erosion(dil,iterations=r,border_value=0)
    fpg=nd.binary_fill_holes(nd.binary_closing(fpg|Wm,iterations=int(0.7/PX)))
    outside=~fpg;near_out=nd.binary_dilation(outside,iterations=int(0.7/PX))
    g=gaps(Wm,2.6);win=g&near_out
    door=gaps(Wm,1.9)&~near_out
    # entrances: gaps on perimeter that are doors (marked in drawing by swing crosses) handled by hand
    def comps(m,minA):
        lab,n=nd.label(m,structure=np.ones((3,3)));o=[]
        for i,sl in enumerate(nd.find_objects(lab)):
            if (lab[sl]==i+1).sum()*PX*PX<minA:continue
            o.append([round(sl[1].start*PX,3),round(sl[0].start*PX,3),round(sl[1].stop*PX,3),round(sl[0].stop*PX,3)])
        return o
    ext=Wm&nd.binary_dilation(outside,iterations=int(0.55/PX))
    out[nm]={'ext':rects(ext),'part':rects(Wm&~ext),'win':comps(win,0.03),'door':comps(door,0.03)}
    np.save(nm+'_fp.npy',fpg)
    print(nm,{k:len(v) for k,v in out[nm].items()},'fp m2',round(fpg.sum()*PX*PX,1))
    im=Image.new('RGB',(1330,1000),'white');d=ImageDraw.Draw(im);k=40
    fpi=Image.fromarray((fpg*60).astype(np.uint8)).resize((1327,992))
    im.paste(Image.merge('RGB',[fpi.point(lambda v:255-v//3)]*3),(0,0))
    for t,c in [('ext',(20,20,20)),('part',(120,120,120)),('win',(40,140,255)),('door',(255,0,180))]:
        for a,b,cc,dd in out[nm][t]:d.rectangle([a*k,b*k,cc*k,dd*k],fill=c)
    im.save(nm+'_model.png')
json.dump(out,open('R_gb.json','w'))

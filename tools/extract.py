import pymupdf as fitz, numpy as np, json
from PIL import Image, ImageDraw
from scipy import ndimage as nd
def key(c):return None if c is None else tuple(round(v,3) for v in c)
MM_PER_PT=17.64; PX_MM=12.5
DPI=72*MM_PER_PT/PX_MM            # 1 px = 12.5 mm
CLIP=fitz.Rect(95,120,1975,1525)
w=fitz.open('warrant.pdf')[0]
pix=w.get_pixmap(matrix=fitz.Matrix(DPI/72,DPI/72),clip=CLIP)
A=np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,pix.n)[:,:,:3].astype(int)
H,W=A.shape[:2]; s=DPI/72
def near(c,t=26):return (np.abs(A-np.array(c)).sum(2)<t)
tan=near((223,204,142),40); pink=near((248,163,157),40)
# hatch marks inside coloured walls: close small holes
tan=nd.binary_closing(tan,iterations=2); pink=nd.binary_closing(pink,iterations=2)
# external walls from thick vector lines
th=Image.new('L',(W,H),0);g=ImageDraw.Draw(th)
for d in w.get_drawings():
    if key(d.get('color'))==(0,0,0) and round(d.get('width') or 0,2) in (1.98,1.14):
        for it in d['items']:
            if it[0]=='l':
                a,b=it[1],it[2];g.line([((a.x-CLIP.x0)*s,(a.y-CLIP.y0)*s),((b.x-CLIP.x0)*s,(b.y-CLIP.y0)*s)],fill=255,width=2)
lines=np.array(th)>0
lab,n=nd.label(~lines)
sizes=nd.sum(np.ones_like(lab),lab,range(1,n+1))
objs=nd.find_objects(lab)
ext=lines.copy()
pxm2=(PX_MM/1000)**2
for i,(sz,sl) in enumerate(zip(sizes,objs)):
    hgt=(sl[0].stop-sl[0].start)*PX_MM/1000; wid=(sl[1].stop-sl[1].start)*PX_MM/1000
    area=sz*pxm2
    if area<3.0 and area/max(hgt,wid)<0.62:
        ext|=(lab==i+1)
np.save('m_tan.npy',tan);np.save('m_pink.npy',pink);np.save('m_ext.npy',ext)
vis=np.full((H,W,3),255,np.uint8)
vis[ext]=(40,40,40);vis[tan]=(200,170,60);vis[pink]=(220,90,90)
Image.fromarray(vis).save('walls_mask.png');print(W,H,'px; metres',W*PX_MM/1000,H*PX_MM/1000)

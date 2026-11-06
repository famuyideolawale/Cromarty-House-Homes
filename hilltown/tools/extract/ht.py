import fitz, numpy as np
from PIL import Image, ImageDraw
PDF='/home/claude/hilltown/pdf/'
SHEET={'05':PDF+'LAS26044_05_PLANNING_Pr_GF__FF_Layout_Plans_Rev0.pdf','06':PDF+'LAS26044_06_PLANNING_Pr_SF__Roof_Layout_Plans_-_Sections_Rev0.pdf',
       '07':PDF+'LAS26044_07_PLANNING_Pr_Elevations_Rev0.pdf','03':PDF+'LAS26044_03_PLANNING_SF__Roof_Layout_Plans_-_Sections_Rev0.pdf','04':PDF+'LAS26044_04_PLANNING_Ex_Elevations_Rev0.pdf'}
PT_M=0.352778/1000
def page(sh): return fitz.open(SHEET[sh])[0]
def disp2page(u,v,sh='05'):
    p=page(sh);W=p.rect.width;s=70/72
    ui,vi=u*1.16,v*1.16
    return (W-vi/s, ui/s)
def clip_from_disp(u0,v0,u1,v1,sh):
    a=disp2page(u0,v0,sh);b=disp2page(u1,v1,sh)
    return fitz.Rect(min(a[0],b[0]),min(a[1],b[1]),max(a[0],b[0]),max(a[1],b[1]))
class Plan:
    """raster frame: x (px) = (pt.y - clip.y0)*k, y = (clip.x1 - pt.x)*k ; px = RES metres"""
    def __init__(s,sh,clip,scale,res=0.025):
        s.p=page(sh);s.clip=clip;s.scale=scale;s.res=res
        s.mpt=PT_M*scale; s.k=s.mpt/res
        s.W=int(clip.height*s.k)+1;s.H=int(clip.width*s.k)+1
        s.dr=[d for d in s.p.get_drawings() if d['rect'].intersects(clip)]
    def T(s,pt): return ((pt.y-s.clip.y0)*s.k,(s.clip.x1-pt.x)*s.k)
    def M(s,pt): x,y=s.T(pt); return (x*s.res,y*s.res)     # metres in plan frame
    def canvas(s): im=Image.new('L',(s.W,s.H),0); return im,ImageDraw.Draw(im)
    def polys(s,d):
        out=[];cur=[]
        for it in d['items']:
            if it[0]=='re': r=it[1]; out.append([s.T(r.tl),s.T(r.tr),s.T(r.br),s.T(r.bl)])
            elif it[0]=='qu': q=it[1]; out.append([s.T(q.ul),s.T(q.ur),s.T(q.lr),s.T(q.ll)])
            elif it[0]=='l':
                if not cur: cur=[s.T(it[1])]
                cur.append(s.T(it[2]))
            elif it[0]=='c':
                if not cur: cur=[s.T(it[1])]
                for t in np.linspace(.25,1,4):
                    a,b,c,e=it[1],it[2],it[3],it[4]
                    x=(1-t)**3*a.x+3*(1-t)**2*t*b.x+3*(1-t)*t*t*c.x+t**3*e.x
                    y=(1-t)**3*a.y+3*(1-t)**2*t*b.y+3*(1-t)*t*t*c.y+t**3*e.y
                    cur.append(s.T(fitz.Point(x,y)))
        if len(cur)>2: out.append(cur)
        return out
    def fillmask(s,cols,tol=.004):
        im,g=s.canvas()
        for d in s.dr:
            f=d.get('fill')
            if f and any(all(abs(a-b)<tol for a,b in zip(f,c)) for c in cols):
                for P in s.polys(d): g.polygon(P,fill=255)
        return np.array(im)>0
    def linemask(s,widths,color=(0,0,0),lw=1):
        im,g=s.canvas()
        for d in s.dr:
            c=d.get('color');w=round(d.get('width') or 0,2)
            if c and all(abs(a-b)<.01 for a,b in zip(c,color)) and w in widths:
                for it in d['items']:
                    if it[0]=='l': g.line([s.T(it[1]),s.T(it[2])],fill=255,width=lw)
                    elif it[0]=='re': r=it[1]; g.polygon([s.T(r.tl),s.T(r.tr),s.T(r.br),s.T(r.bl)],outline=255)
                    elif it[0]=='c': g.line([s.T(it[1]),s.T(it[4])],fill=255,width=lw)
        return np.array(im)>0
    def render(s,dpi_scale=None):
        k=s.k*72/72
        m=fitz.Matrix(s.k,s.k).prerotate(-90)
        pix=s.p.get_pixmap(matrix=m,clip=s.clip)
        return Image.frombytes('RGB',(pix.width,pix.height),pix.samples)

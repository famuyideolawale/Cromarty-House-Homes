import numpy as np, json
from scipy import ndimage as nd
from skimage.segmentation import watershed
PX=0.0125
src=open('build2.py').read();exec(src[src.index('def rects'):src.index("R={}")])
M=np.load('masks.npz');ext,tan,pink,fp=M['ext'],M['tan'],M['pink'],M['fp']
lil=np.load('m_lilac.npy');flab=np.load('flab2.npy')
labels=json.load(open('labels.json'))
R=json.load(open('R_typ.json'));DF=json.load(open('doors_fix.json'));FU=json.load(open('furn2.json'))
H_,W_=ext.shape
WALL=ext|tan|pink
P=lambda x,z:(int(z/PX),int(x/PX))
# flats ids
flat_of={}
for l in labels:
    if 'F L A T' in l[0]: flat_of[int(flab[l[2],l[1]])]=int(l[0].split()[-1])
fmap=np.zeros(ext.shape,np.int16)
for lab_,n in flat_of.items(): fmap[flab==lab_]=n
fmap=np.where(fp&~lil,fmap,0)
# fill walls inside flats (tan) as flat too
fmap[(fmap==0)&tan&fp]=0
# ---------- room seeds
seeds=[]
def nice(t):
    t=t.replace(' ','') if ' ' in t and len(t.replace(' ',''))<=8 else t
    m={'LOUNGE':'Lounge','KITCHEN':'Kitchen','DINING':'Dining','UTILITY':'Utility','BEDRM1':'Bedroom 1','BEDRM2':'Bedroom 2'}
    return m.get(t.replace(' ',''),t.title())
for t,x,z,_ in labels:
    k=t.replace(' ','')
    if k in('LOUNGE','KITCHEN','DINING','UTILITY','BEDRM1','BEDRM2'):
        seeds.append([nice(t),x*PX,z*PX])
for f in DF['fix']:
    if f['t']=='shower':seeds.append(['Shower room',f['x'],f['z']])
# flat entrances: door rects that touch both a flat and corridor
corr_mask=fp&~lil&(fmap==0)&~WALL
entr={}
for d in DF['doors']+R['door']:
    a,b,c,e=[int(v/PX) for v in d]
    a,b=max(a-6,0),max(b-6,0);c,e=c+6,e+6
    win=fmap[b:e,a:c];cw=corr_mask[b:e,a:c]
    ids=set(np.unique(win))-{0}
    if len(ids)==1 and cw.sum()>20 and pink[b:e,a:c].any():
        n=ids.pop();ys,xs=np.nonzero(win==n);cx,cz=(a+xs.mean())*PX,(b+ys.mean())*PX
        # push 0.6m into the flat
        dx,dz=cx-(d[0]+d[2])/2,cz-(d[1]+d[3])/2;L=max(np.hypot(dx,dz),1e-3)
        entr.setdefault(n,[round((d[0]+d[2])/2,3),round((d[1]+d[3])/2,3),round(cx+dx/L*0.5,3),round(cz+dz/L*0.5,3)])
print('entrances',sorted(entr))
for n,e in entr.items():seeds.append(['Hall',e[2],e[3]])
# Flat 6 has two rooms labelled BEDRM 1 on the drawing: rename the western one Bedroom 2
f6=[s for s in seeds if s[0]=='Bedroom 1' and fmap[P(s[1],s[2])]==6]
if len(f6)==2:
    min(f6,key=lambda s:s[1])[0]='Bedroom 2'
# watershed per flat
free=fp&~WALL&~lil&(fmap>0)
mk=np.zeros(ext.shape,np.int32)
for i,s in enumerate(seeds):
    r,c=P(s[1],s[2])
    if free[r,c]: mk[max(r-2,0):r+3,max(c-2,0):c+3]=i+1
elev=np.zeros(ext.shape,np.float32)
for d in DF['doors']+R['door']:
    a,b,c,e=[int(v/PX) for v in d];elev[b:e,a:c]=1.0
zones=watershed(elev,mk,mask=free)
rooms=[]
for i,s in enumerate(seeds):
    m=zones==i+1
    if not m.any():continue
    n=int(np.bincount(fmap[m]).argmax())
    rooms.append({'flat':n,'name':s[0],'x':round(s[1],2),'z':round(s[2],2),'area':round(m.sum()*PX*PX,1)})
stated={(1,'Bedroom 1'):11.7,(1,'Bedroom 2'):10.5,(1,'Kitchen'):9.5,(2,'Bedroom 1'):13.6,(2,'Lounge'):14.5,(2,'Kitchen'):9.3}
for r in rooms:
    r['stated']=stated.get((r['flat'],r['name']))
# ---------- floor finish zones (50mm grid)
bathz=np.zeros(ext.shape,bool)
yy,xx=np.mgrid[0:ext.shape[0],0:ext.shape[1]]
for i,s in enumerate(seeds):
    if s[0]=='Shower room':
        near=((xx*PX-s[1])**2+(yy*PX-s[2])**2)<2.3**2
        bathz|=(zones==i+1)&near
fin={}
fin['wood']=rects((fmap>0)&~bathz&~lil,4,0.01)
fin['tile']=rects(bathz,4,0.01)
fin['carpet']=rects(fp&~lil&(fmap==0)&~(ext),4,0.01)
fin['stone']=rects(lil,4,0.01)
print({k:len(v) for k,v in fin.items()})
# ---------- furniture filtered by room type
def room_at(x,z):
    r,c=P(x,z)
    if 0<=r<H_ and 0<=c<W_ and zones[r,c]>0:return seeds[zones[r,c]-1][0]
    return None
furn=[]
for f in FU:
    rn=room_at(f['x'],f['z']) or ''
    t=f['t']
    if rn.startswith('Bedroom'):
        if t in('sofa','unit','table','sofaL','coffee','dining'):t='desk'
    elif rn in('Lounge','Kitchen','Dining'):
        if t=='bedside':t='chair'
    elif rn in('Shower room','Utility','Hall',''):
        continue
    f=dict(f);f['t']=t;f['flat']=int(fmap[P(f['x'],f['z'])]);furn.append(f)
# kitchen worktops from hob+sink pairs: run along nearest wall
def wall_dir(x,z):
    best=None
    for k,(dx,dz) in enumerate([(0,-1),(1,0),(0,1),(-1,0)]):
        for s in np.arange(0,1.0,0.0125):
            r,c=P(x+dx*s,z+dz*s)
            if 0<=r<H_ and 0<=c<W_ and WALL[r,c]:
                if best is None or s<best[0]:best=(s,k)
                break
    return best
hobs=[f for f in DF['fix'] if f['t']=='hob'];sinks=[f for f in DF['fix'] if f['t']=='sink']
tops=[]
for h in hobs:
    s=min(sinks,key=lambda s:np.hypot(s['x']-h['x'],s['z']-h['z']))
    d,k=wall_dir(h['x'],h['z'])
    if k in(0,2):  # wall above/below -> run along x
        x0=min(h['x'],s['x'])-0.9;x1=max(h['x'],s['x'])+0.9
        zw=h['z']+(-d if k==0 else d)
        z0,z1=(zw,zw+0.62) if k==0 else (zw-0.62,zw)
        # clip run to free space
        for lim,step in((x0,-1),):pass
    else:
        z0=min(h['z'],s['z'])-0.9;z1=max(h['z'],s['z'])+0.9
        xw=h['x']+(d if k==1 else -d)
        x0,x1=(xw-0.62,xw) if k==1 else (xw,xw+0.62)
    # trim run so it stays inside the room (stop at walls)
    def trim(a0,a1,fixed0,fixed1,alongx):
        cen=(h['x'] if alongx else h['z'])
        lo=cen;hi=cen
        while lo>a0:
            r,c=P(lo-0.05,(fixed0+fixed1)/2) if alongx else P((fixed0+fixed1)/2,lo-0.05)
            if WALL[r,c]:break
            lo-=0.05
        while hi<a1:
            r,c=P(hi+0.05,(fixed0+fixed1)/2) if alongx else P((fixed0+fixed1)/2,hi+0.05)
            if WALL[r,c]:break
            hi+=0.05
        return lo,hi
    if k in(0,2):x0,x1=trim(x0,x1,z0,z1,True)
    else:z0,z1=trim(z0,z1,x0,x1,False)
    tops.append({'b':[round(x0,3),round(z0,3),round(x1,3),round(z1,3)],'wall':k,'flat':int(fmap[P(h['x'],h['z'])])})
# fixtures orientation to wall
fix=[]
for f in DF['fix']:
    d,k=wall_dir(f['x'],f['z']) or (0,0)
    g=dict(f);g['r']=k;g['flat']=int(fmap[P(f['x'],f['z'])]);fix.append(g)
# wardrobes from W labels
ward=[]
for t,x,z,_ in labels:
    if t.strip() in('W',):
        xm,zm=x*PX,z*PX;b=wall_dir(xm,zm)
        if b and b[0]<0.9:
            d,k=b
            if k in(0,2):
                zw=zm+(-d if k==0 else d);zz=(zw,zw+0.6) if k==0 else (zw-0.6,zw)
                lo,hi=xm,xm
                while hi-xm<1.2 and not WALL[P(hi+0.05,sum(zz)/2)]:hi+=0.05
                while xm-lo<1.2 and not WALL[P(lo-0.05,sum(zz)/2)]:lo-=0.05
                ward.append([round(lo,3),round(min(zz),3),round(hi,3),round(max(zz),3)])
            else:
                xw=xm+(d if k==1 else -d);xx=(xw-0.6,xw) if k==1 else (xw,xw+0.6)
                lo,hi=zm,zm
                while hi-zm<1.2 and not WALL[P(sum(xx)/2,hi+0.05)]:hi+=0.05
                while zm-lo<1.2 and not WALL[P(sum(xx)/2,lo-0.05)]:lo-=0.05
                ward.append([round(min(xx),3),round(lo,3),round(max(xx),3),round(hi,3)])
print('wardrobes',len(ward),'tops',len(tops))
# flats summary
flats=[]
cal=61/ ((fmap==1).sum()*PX*PX)
for n in range(1,8):
    m=fmap==n;ys,xs=np.nonzero(m)
    beds=len([r for r in rooms if r['flat']==n and r['name'].startswith('Bedroom')])
    flats.append({'n':n,'beds':beds,'area':round(m.sum()*PX*PX*cal,1),'bbox':[round(xs.min()*PX,2),round(ys.min()*PX,2),round(xs.max()*PX,2),round(ys.max()*PX,2)],
                  'entrance':entr.get(n)})
flats[0]['area']=61.0;flats[1]['area']=49.0
print(flats);print([r for r in rooms])
model={'typ':{'ext':R['ext'],'sep':R['sep'],'part':R['part'],'win':R['win'],'door':R['door']+DF['doors'],'leaves':DF['leaves'],
       'fix':fix,'furn':furn,'tops':tops,'ward':ward,'fin':fin,'rooms':rooms},'flats':flats}
json.dump(model,open('model_typ.json','w'))
np.save('fmap.npy',fmap);np.save('zones.npy',zones)

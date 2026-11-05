import numpy as np, json
from scipy import ndimage as nd
PX=0.0125
src=open('build2.py').read();exec(src[src.index('def rects'):src.index("R={}")])
T=json.load(open('model_typ.json'));GB=json.load(open('R_gb.json'))
M=np.load('masks.npz');fp=M['fp']
LIFT=[7.64,8.38,9.16,10.26]
def inter(r,b,pad=0.0):return not(r[2]<=b[0]+pad or r[0]>=b[2]-pad or r[3]<=b[1]+pad or r[1]>=b[3]-pad)
def clean(rs,boxes):return [r for r in rs if not any(inter(r,b,0.02) for b in boxes)]
g=GB['ground'];b=GB['basement']
liftbox=[LIFT[0]+0.02,LIFT[1]+0.02,LIFT[2]-0.02,LIFT[3]-0.02]
for k in('ext','part','door','win'):g[k]=clean(g[k],[liftbox])
# GF: the windows on the west side of the stair B wing are the final fire-exit doors
exits_gf=[r for r in g['win'] if r[0]>21.8 and r[2]<22.8 and r[1]>20.8 and r[3]<24.0]
g['win']=[r for r in g['win'] if r not in exits_gf]
g['exitdoors']=exits_gf
# GF entrance vestibules (Regent Quay frontage) and their street doors
g['entrances']=[
 {'id':'office','name':'Entrance to offices','door':[8.15,2.2,9.9,2.75],'vest':[8.25,2.75,9.9,5.25],'sign':[9.02,2.2]},
 {'id':'flats','name':'Entrance to flats','door':[10.0,2.2,11.7,2.75],'vest':[10.0,2.75,11.65,5.25],'sign':[10.85,2.2]}]
gl=json.load(open('gf_labels.json'))
names={'R E C E P T I O N':'Reception','O P E N   P L A N   O F F I C E   0 1':'Open-plan office','O F F I C E   0 1':'Office 01','O F F I C E - 0 2':'Office 02',
 'O F F I C E - 0 3':'Office 03','O F F I C E - 0 4':'Office 04','O F F I C E - 0 5':'Office 05','C A N T E E N':'Canteen','EXIT ONLY FROM OFFICE':'Exit only from office'}
g['rooms']=[{'name':names[t],'x':round(x*PX,2),'z':round(z*PX,2)} for lv,t,x,z in gl if lv=='G' and t in names]
b['rooms']=[{'name':'Cycle store (20 bikes)','x':29.6,'z':21.9},{'name':'Cleaners','x':23.2,'z':20.4}]
# slabs: footprint rects (100mm grid)
slab=rects(fp,8,0.02)
gfp=np.load('ground_fp.npy')|fp
gfp[int(2.2/PX):int(5.3/PX),int(8.1/PX):int(11.75/PX)]=True
bfp=np.load('basement_fp.npy')
out_=~fp;near=nd.binary_dilation(out_,iterations=int(0.75/PX))
def isper(r):
    cx,cz=(r[0]+r[2])/2,(r[1]+r[3])/2;return bool(near[int(cz/PX),int(cx/PX)])
T['typ']['core']=[r for r in T['typ']['ext'] if not isper(r)]
T['typ']['ext']=[r for r in T['typ']['ext'] if isper(r)]
model={
 'H':3.4,'wallH':3.15,'slabT':0.25,
 'typ':T['typ'],'flats':T['flats'],'ground':g,'basement':b,
 'slab':{'typ':slab,'ground':rects(gfp,8,0.02),'basement':rects(bfp,8,0.02)},
 'stairs':{
   'A':{'left':[9.704,10.954],'right':[11.239,12.46],'spine':[10.954,11.239],'zLobbyL':8.05,'zLobbyR':7.29,'zEnd':9.80,'arc':[11.082,9.80,1.378],'risersR':10,'risersL':7,'from':0,'to':4},
   'B':{'landing':[22.694,23.933],'flight':[23.933,26.18],'upper':[21.367,22.637],'spine':[22.637,22.877],'lower':[22.877,24.147],'risers':9,'from':-1,'to':4}},
 'lift':{'shaft':LIFT,'door':[7.95,8.38,8.95,8.38],'from':0,'to':4,'spec':'8-person, 630 kg'},
 'refuges':[{'b':[10.35,4.98,11.55,5.66]},{'b':[25.75,19.92,26.43,21.09]}],
 'exits':{'typ':[{'x':6.54,'z':6.15,'label':'Fire exit: Stair A'},{'x':27.09,'z':17.45,'label':'Fire exit: Stair B'},{'x':26.2,'z':24.0,'label':'Stair B: down to final exit'}],
          'ground':[{'x':22.2,'z':22.4,'label':'Final fire exit (Stair B)'},{'x':26.8,'z':15.2,'label':'Exit only from office'}]}
}
s=json.dumps(model,separators=(',',':'))
open('model.js','w').write('window.CH_MODEL='+s+';\n')
print(len(s)//1024,'KB')
# ---- per-flat floor rects + bathroom tiles (for highlighting, ceilings and plans)
fmap=np.load('fmap.npy');zones=np.load('zones.npy')
Mt=np.load('masks.npz');WALL=Mt['ext']|Mt['tan']|Mt['pink']
rooms=T['typ']['rooms']
flatF={};
for n in range(1,8):
    m=(fmap==n)
    m=nd.binary_closing(m,iterations=4)&fp
    flatF[n]=rects(m,8,0.01)
model['typ']['flatFloor']=flatF
# room zones -> rect lists (for plan tints) at 100mm
seedsorder=None
json.dump(model,open('model_full.json','w'))
open('model.js','w').write('window.CH_MODEL='+json.dumps(model,separators=(',',':'))+';\n')
print('flatFloor rects',{k:len(v) for k,v in flatF.items()})
import os;print(os.path.getsize('model.js')//1024,'KB')

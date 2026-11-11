import {canopyLayer} from './canopy.js';
import {createSoundscape} from './soundscape.js';
import {SOUND_PLACES} from './sound-places.js';
import * as T from './three.module.min.js';
const $=s=>document.querySelector(s), canvas=$('#island');
let renderer;try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){$('#fallback').style.display='block';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene(), camera=new T.PerspectiveCamera(62,innerWidth/innerHeight,.12,1600);scene.background=new T.Color('#9fdcd2');scene.fog=new T.FogExp2('#aee4d8',.0016);
const hemi=new T.HemisphereLight(0xeaf6ef,0x4a7a6e,1.4);scene.add(hemi);
const sunlight=new T.DirectionalLight(0xffd9a8,2.2);sunlight.castShadow=true;sunlight.shadow.mapSize.set(1024,1024);
Object.assign(sunlight.shadow.camera,{left:-60,right:60,top:60,bottom:-60,near:1,far:500});sunlight.shadow.bias=-0.0006;sunlight.shadow.normalBias=.4;
scene.add(sunlight);scene.add(sunlight.target);
let seed=197;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646},range=(a,b)=>a+(b-a)*rand();
const mat=(color,roughness=.92,flat=true)=>new T.MeshStandardMaterial({color,roughness,flatShading:flat});
// Sky dome: vertical gradient plus a sun-side glow, lerped per chapter.
const skyU={top:{value:new T.Color('#7fb8d8')},hor:{value:new T.Color('#ffd9b0')},sunDir:{value:new T.Vector3(.9,.16,.25)},glow:{value:new T.Color('#ffc27d')},glowAmt:{value:1.0}};
const skyDome=new T.Mesh(new T.SphereGeometry(980,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:skyU,vertexShader:`varying vec3 vd;void main(){vd=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 vd;uniform vec3 top,hor,glow,sunDir;uniform float glowAmt;void main(){vec3 d=normalize(vd);vec3 col=mix(hor,top,pow(max(d.y,0.),.55));float s=max(dot(d,normalize(sunDir)),0.);col+=glow*(pow(s,18.)*.9+pow(s,3.)*.22)*glowAmt;gl_FragColor=vec4(col,1.);}`}));
skyDome.frustumCulled=false;const skyRig=new T.Group();skyRig.add(skyDome);scene.add(skyRig);
// The island: one low coral island with a southern sandbar, a grove rise and a town terrace.
function land(x,z){
const d=Math.hypot(x/150,z/115);
const dome=Math.max(0,1-d*d);
let h=7*Math.pow(dome,1.5);
if(d>1)h=-3*Math.pow(Math.min(1,(d-1)/.6),.8);
h+=1.9*Math.exp(-((x-15)*(x-15)/(2*50*50)+(z-165)*(z-165)/(2*35*35)));
h+=1.6*Math.exp(-((x-35)*(x-35)+(z+25)*(z+25))/(2*34*34));
const w=Math.exp(-((x+85)*(x+85)+(z-5)*(z-5))/(2*40*40));
h=h*(1-w)+3.5*w;
h+=.25*Math.sin(x*.21+Math.sin(z*.17))*Math.sin(z*.19)*(1-w)*(dome>0?1:0);
return h;}
const geo=new T.PlaneGeometry(700,700,288,288);geo.rotateX(-Math.PI/2);
{const p=geo.attributes.position;const colors=new Float32Array(p.count*3);
const dry=new T.Color('#f0e7d2'),wet=new T.Color('#d8c9ab'),shallow=new T.Color('#c9e2cc'),deep=new T.Color('#8fbfae'),c=new T.Color(),humus=new T.Color('#544c32'),earth=new T.Color('#d3c09c');
for(let i=0;i<p.count;i++){const h=land(p.getX(i),p.getZ(i));p.setY(i,h);
if(h>.18)c.copy(dry);else if(h>-.25)c.copy(wet).lerp(dry,Math.max(0,(h+.25)/.43));else c.copy(shallow).lerp(deep,Math.min(1,(-h-.25)/2.2));
const gx=p.getX(i),gz=p.getZ(i),gd=Math.hypot(gx-40,gz+32),td=Math.hypot(gx+85,gz-2);
if(h>.3&&gd<44)c.lerp(humus,.90*(1-Math.pow(gd/44,2)));if(h>.3&&td<24)c.lerp(earth,.5*(1-td/24));
const v2=1+.04*Math.sin(p.getX(i)*.09)*Math.sin(p.getZ(i)*.075);
colors[i*3]=c.r*v2;colors[i*3+1]=c.g*v2;colors[i*3+2]=c.b*v2;}
geo.computeVertexNormals();geo.setAttribute('color',new T.BufferAttribute(colors,3));}
const sandMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.96});
// The wash belongs to the shoreline surface, not a row of floating point sprites.
const tideU={time:{value:0},night:{value:0},boost:{value:0}};
sandMat.onBeforeCompile=shader=>{
Object.assign(shader.uniforms,{tideTime:tideU.time,tideNight:tideU.night,tideBoost:tideU.boost});
shader.vertexShader='varying vec3 tideP;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntideP=position;');
shader.fragmentShader='varying vec3 tideP; uniform float tideTime,tideNight,tideBoost;\n'+shader.fragmentShader;
shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
float lace=.5+.5*sin(tideP.x*2.7+sin(tideP.z*3.1)+tideTime*.7);
float swell=.12*sin(tideTime*.48+tideP.x*.065+tideP.z*.03);
float wash=exp(-pow((tideP.y-.015-swell*.25)/.075,2.));
float filaments=pow(.5+.5*sin(tideP.y*36.+tideP.x*.7+sin(tideP.z*1.7)-tideTime*.6),5.);
totalEmissiveRadiance+=vec3(.015,.52,.65)*wash*(.45+.35*lace+filaments*.8)*tideNight*(1.+tideBoost*.4);
`);
};
const floor=new T.Mesh(geo,sandMat);floor.receiveShadow=true;scene.add(floor);
// The sea: a clear lagoon shader - shallow glow near the island, glints that follow the sun.
const seaU={time:{value:0},night:{value:0},sunDir:{value:new T.Vector3(.9,.16,.25)}};
const sea=new T.Mesh(new T.CircleGeometry(940,72),new T.ShaderMaterial({transparent:true,fog:false,uniforms:seaU,vertexShader:`varying vec3 w;void main(){vec4 wp=modelMatrix*vec4(position,1.);wp.y+=sin(wp.x*.07+wp.z*.05+position.x*.01)*.06;w=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,fragmentShader:`varying vec3 w;uniform float time,night;uniform vec3 sunDir;void main(){
float dc=length(w.xz)/340.;
vec3 day=mix(vec3(.45,.87,.80),vec3(.07,.44,.55),min(1.,dc*1.25));
float rip=sin(w.x*1.15+time*.8)*sin(w.z*.95-time*.6)*.5+.5;
day+=vec3(.10,.14,.12)*pow(rip,3.);
vec3 vd=normalize(w-cameraPosition);
vec3 n=normalize(vec3(sin(w.x*.9+time*.7)*.06,1.,sin(w.z*.8-time*.5)*.06));
vec3 sd=normalize(sunDir);
float spec=pow(max(dot(reflect(-sd,n),-vd),0.),60.);
day+=vec3(1.,.95,.8)*spec*.9;
vec3 nit=mix(vec3(.02,.10,.16),vec3(.05,.16,.26),pow(rip,2.)*.6);
nit+=vec3(.5,.6,.7)*spec*.4;
// Match the terrain height so the blue wash follows the actual island contour.
float d=length(w.xz/vec2(150.,115.));float dome=max(0.,1.-d*d);
float h=7.*pow(dome,1.5);if(d>1.)h=-3.*pow(min(1.,(d-1.)/.6),.8);
h+=1.9*exp(-((w.x-15.)*(w.x-15.)/(2.*50.*50.)+(w.z-165.)*(w.z-165.)/(2.*35.*35.)));
h+=1.6*exp(-((w.x-35.)*(w.x-35.)+(w.z+25.)*(w.z+25.))/(2.*34.*34.));
float tw=exp(-((w.x+85.)*(w.x+85.)+(w.z-5.)*(w.z-5.))/(2.*40.*40.));h=mix(h,3.5,tw);
h+=.25*sin(w.x*.21+sin(w.z*.17))*sin(w.z*.19)*(1.-tw)*step(0.0001,dome);
float swell=.12*sin(time*.48+w.x*.065+w.z*.03);
float wash=exp(-pow((h+.08-swell)/.18,2.));
float threads=pow(.5+.5*sin(h*34.+w.x*.7+sin(w.z*1.7)-time*.6),5.);
nit+=vec3(.01,.48,.64)*wash*(.6+threads*.7);
gl_FragColor=vec4(mix(day,nit,night),.94);}`}));
sea.rotation.x=-Math.PI/2;sea.position.y=0;scene.add(sea);
const dummy=new T.Object3D(),v=(x,y,z)=>new T.Vector3(x,y,z),up=v(0,1,0);
const batches={};function inst(key,geoI,color,max=3000){if(!batches[key]){const mesh=new T.InstancedMesh(geoI,mat(color),max);mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=true;scene.add(mesh);batches[key]=mesh;}return batches[key];}
function stamp(key,geoI,color,p,s,rot){if((key==='scrub'||key==='rock')&&p.x>-90&&p.x<-80&&p.z>-26&&p.z<45)return;const b=inst(key,geoI,color);dummy.position.copy(p);dummy.scale.copy(s);dummy.quaternion.copy(rot||new T.Quaternion());dummy.updateMatrix();b.setMatrixAt(b.count++,dummy.matrix);}
// Coral stone and beach scrub scattered on dry ground.
const rockGeo=new T.IcosahedronGeometry(1,0),scrubGeo=new T.ConeGeometry(.5,1.0,6);
let placed=0,guard=0;while(placed<140&&guard++<6000){const a=range(0,6.28),r=range(20,135),x=Math.sin(a)*r,z=Math.cos(a)*r,h=land(x,z);if(h<.6)continue;const s=range(.25,1.1);stamp('rock',rockGeo,placed%3?'#cfc4ac':'#b8ab90',v(x,h-s*.3,z),v(s*1.3,s*.65,s),new T.Quaternion().setFromEuler(new T.Euler(range(0,3),range(0,3),range(0,3))));placed++;}
placed=0;guard=0;while(placed<110&&guard++<6000){const a=range(0,6.28),r=range(16,125),x=Math.sin(a)*r,z=Math.cos(a)*r,h=land(x,z);if(h<.4||h>4.5)continue;const s=range(.3,.7);for(let k=0;k<3;k++){stamp('scrub',scrubGeo,k?'#5d7a44':'#4c6a38',v(x+range(-.4,.4),h+.28*s,z+range(-.4,.4)),v(s,s*range(.8,1.3),s),new T.Quaternion().setFromEuler(new T.Euler(range(-.25,.25),range(0,6),range(-.25,.25))));}placed++;}
{const shellGeo=new T.IcosahedronGeometry(1,0),driftGeo=new T.CylinderGeometry(.09,.13,1,6);
for(let i=0;i<16;i++){const a=range(0,6.28),r=range(28,125),x=Math.sin(a)*r,z=Math.cos(a)*r,h=land(x,z);if(h<.25||h>2.2)continue;stamp('shell',shellGeo,'#efe6d2',v(x,h+.04,z),v(range(.14,.3),range(.07,.13),range(.14,.3)),new T.Quaternion().setFromEuler(new T.Euler(range(0,3),range(0,3),range(0,3))));}
for(let i=0;i<9;i++){const a=range(0,6.28),r=range(32,120),x=Math.sin(a)*r,z=Math.cos(a)*r,h=land(x,z);if(h<.25||h>2.4)continue;stamp('drift',driftGeo,'#7a6248',v(x,h+.09,z),v(1,range(1.2,2.6),1),new T.Quaternion().setFromEuler(new T.Euler(Math.PI/2+range(-.15,.15),range(0,6.28),0)));}}
let palmMat;
// Coconut palms along the beach ring: ringed leaning trunks, arcing fronds, coconut clusters.
{const P=[],Cc=[],I=[];let vi=0;const tc=new T.Color();
const pushV=(p,c)=>{P.push(p.x,p.y,p.z);Cc.push(c.r,c.g,c.b);return vi++;};
function addGeo(g,m4,color){const pa=g.attributes.position,nv=pa.count,base=vi,ve=new T.Vector3();tc.set(color);for(let i=0;i<nv;i++){ve.fromBufferAttribute(pa,i).applyMatrix4(m4);pushV(ve,tc);}const ia=g.index;if(ia)for(let i=0;i<ia.count;i++)I.push(base+ia.getX(i));else for(let i=0;i<nv;i++)I.push(base+i);}
function frond(top,yaw0,e0,droopK,L,w0,c0,c1){
const S=10,dx=Math.cos(yaw0),dz=Math.sin(yaw0),px=-dz,pz=dx,rows=[];const c2=new T.Color();
for(let s=0;s<=S;s++){const t=s/S,along=L*t*Math.cos(e0*.5);
const cy=top.y+L*(Math.sin(e0)*t-droopK*t*t),cx=top.x+dx*along,cz=top.z+dz*along,w=w0*.28*(1-t*.94);
c2.copy(c0).lerp(c1,t);tc.copy(c2).multiplyScalar(.88);
const row={L:pushV(v(cx+px*w,cy-w*.5,cz+pz*w),tc),C:pushV(v(cx,cy,cz),c2),R:pushV(v(cx-px*w,cy-w*.5,cz-pz*w),tc)};rows.push(row);}
for(let s=0;s<S;s++){const a=rows[s],b=rows[s+1];I.push(a.L,b.L,a.C,b.L,b.C,a.C,a.C,b.C,a.R,b.C,b.R,a.R);}
// Paired tapered leaflets turn each curved rib into a coconut-palm feather.
for(let k=1;k<30;k++){const t=k/31,along=L*t*Math.cos(e0*.5),cy=top.y+L*(Math.sin(e0)*t-droopK*t*t),cx=top.x+dx*along,cz=top.z+dz*along;
const span=w0*5.2*Math.pow(Math.sin(Math.PI*t),.65)*(1-.45*t),sweep=L*.075;
for(const side of [-1,1]){c2.copy(c0).lerp(c1,t);tc.copy(c2).multiplyScalar(side<0?.82:.98);
const base=pushV(v(cx-dx*.065,cy,cz-dz*.065),tc),b=pushV(v(cx+dx*.065,cy+.025,cz+dz*.065),c2);
const mid=pushV(v(cx+px*span*.55*side-dx*sweep*.5+dx*.065,cy-span*.12,cz+pz*span*.55*side-dz*sweep*.5+dz*.065),c2);
const tip=pushV(v(cx+px*span*side-dx*sweep,cy-span*.35,cz+pz*span*side-dz*sweep),c2);I.push(base,b,mid,base,mid,tip);}}
}
function palm(x,z,h,leanA,leanAmt,sd){
const rings=7,sides=6;let prev=null;const y0=land(x,z);
for(let r=0;r<=rings;r++){const t=r/rings,cx=x+Math.cos(leanA)*leanAmt*t*t*h,cz=z+Math.sin(leanA)*leanAmt*t*t*h,y=y0+t*h,rad=(.26-.13*t)*(1+.13*Math.sin(t*23+sd*7)),ring=[];
for(let s=0;s<sides;s++){const a=s/sides*Math.PI*2;tc.setHSL(.07,.5,.24+.10*Math.sin(t*23+sd*7+s*1.7));ring.push(pushV(v(cx+Math.cos(a)*rad,y,cz+Math.sin(a)*rad),tc));}
if(prev)for(let s=0;s<sides;s++){const s2=(s+1)%sides;I.push(prev[s],prev[s2],ring[s],prev[s2],ring[s2],ring[s]);}prev=ring;}
const top=v(x+Math.cos(leanA)*leanAmt*h,y0+h,z+Math.sin(leanA)*leanAmt*h),g0=new T.Color('#2f6b33'),g1=new T.Color('#79a94b'),b0=new T.Color('#6a7a3a'),b1=new T.Color('#4a5424');
for(let j=0;j<13;j++){const yaw=j*2.4+sd,tier=j%3;
frond(top,yaw,tier===0?1.05:tier===1?.5:.05,tier===0?.22:tier===1?.62:1.15,(2.3+.9*rand())*(h/4.6),.16,g0,g1);}
for(let j=0;j<5;j++)frond(top,j/5*6.28+sd+.4,-.45,1.1,1.3,.12,b0,b1);
if(rand()<.8){const m=new T.Matrix4();for(let d=0;d<5;d++){const a=range(0,6.28),rr=range(.1,.28);m.makeTranslation(top.x+Math.cos(a)*rr,top.y-range(.15,.45),top.z+Math.sin(a)*rr);addGeo(new T.OctahedronGeometry(.11,0),m,'#7a5a26');}}}
let placedP=0,guardP=0;while(placedP<16&&guardP++<6000){const a=range(0,6.28),r=range(38,105),x=Math.sin(a)*r,z=Math.cos(a)*r,h=land(x,z);if(h<.5||h>3.4)continue;if(Math.abs(x+85)<34&&Math.abs(z-5)<30)continue;if(Math.hypot(x-40,z+32)<26)continue;palm(x,z,range(4.2,6.4),range(0,6.28),range(.1,.24),range(0,6.28));placedP++;}
palm(9,106,6.8,.5,.3,2.2);palm(-3,109,5.6,2.4,.18,4.1);palm(30,99,5.2,1.1,.2,5.0);
const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(new Float32Array(P),3));pg.setAttribute('color',new T.BufferAttribute(new Float32Array(Cc),3));pg.setIndex(I);pg.computeVertexNormals();
palmMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.9,side:T.DoubleSide});const palms=new T.Mesh(pg,palmMat);palms.castShadow=true;scene.add(palms);}
// Stone Town: two coral-rag rows flanking a shaded alley, lime-washed walls, small shuttered windows.
const townC=v(-85,0,5);townC.y=land(townC.x,townC.z);
function plaster(color) {
  const cv=document.createElement('canvas');cv.width=cv.height=256;const ctx=cv.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,256,256);
  let st=32;const r=()=>((st=Math.imul(st,1664525)+1013904223>>>0)/4294967296);
  for(let i=0;i<13000;i++){const x=r()*256,y=r()*256;ctx.fillStyle=i%3?'rgba(87,68,45,.045)':'rgba(255,252,230,.14)';ctx.fillRect(x,y,r()*3+.3,r()*2+.3);}
  const damp=ctx.createLinearGradient(0,0,0,256);damp.addColorStop(0,'rgba(103,79,46,0)');damp.addColorStop(.68,'rgba(103,79,46,.03)');damp.addColorStop(1,'rgba(103,79,46,.26)');ctx.fillStyle=damp;ctx.fillRect(0,0,256,256);
  const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;return new T.MeshStandardMaterial({map:tex,roughness:.97});
}
{const wallMat=plaster('#e8dcc2'),wallMat2=plaster('#ddceae'),roofMat=mat('#b89a6a',.9),winMat=mat('#2e3a38',.6),beamMat=mat('#6a4a2a',.9);
const buildings=[];const baseMat=mat('#b3a184',.98);
function house(x,z,w,h,d,side){const g=new T.Group();const base=land(x,z);
const body=mesh(new T.BoxGeometry(d,h,w),rand()<.5?wallMat:wallMat2,v(0,h/2,0),v(1,1,1),g);body.receiveShadow=true;
const parapet=mesh(new T.BoxGeometry(d+.5,.5,w+.5),roofMat,v(0,h+.22,0),v(1,1,1),g);
const course=mesh(new T.BoxGeometry(d+.24,.9,w+.24),baseMat,v(0,.42,0),v(1,1,1),g);course.receiveShadow=true;
const beamRow=mesh(new T.BoxGeometry(.18,.16,w*.92),beamMat,v(side*(d/2+.12),h-.4,0),v(1,1,1),g);
for(let k=0;k<Math.floor(w/.9);k++)stamp('town-corbels',new T.BoxGeometry(1,1,1),'#8a6e4c',v(x+side*(d/2+.18),base+h-.65,z-w/2+.5+k*.9),v(.48,.35,.18));
const nw=Math.max(1,Math.floor(w/3.4));
for(let i=0;i<nw;i++){const wz=-w/2+ (i+.5)*(w/nw);
const frame=mesh(new T.BoxGeometry(.12,1.24,.94),beamMat,v(side*(d/2+.02),h*.62,wz),v(1,1,1),g);frame.castShadow=false;
const win=mesh(new T.BoxGeometry(.12,1.0,.7),winMat,v(side*(d/2+.05),h*.62,wz),v(1,1,1),g);win.castShadow=false;
const sill=mesh(new T.BoxGeometry(.18,.1,.98),beamMat,v(side*(d/2+.05),h*.62-.6,wz),v(1,1,1),g);sill.castShadow=false;
const shut=mesh(new T.BoxGeometry(.08,1.0,.24),beamMat,v(side*(d/2+.08),h*.62,wz+.48),v(1,1,1),g);shut.castShadow=false;
for(let k=0;k<4;k++)stamp('shutter-battens',new T.BoxGeometry(1,1,1),'#73614b',v(x+side*(d/2+.14),base+h*.62-.38+k*.25,z+wz+.48),v(.06,.055,.26));}

g.position.set(x,base,z);scene.add(g);buildings.push(g);return g;}
let z0=-24;
for(let i=0;i<8;i++){if(z0>42)break;const w=range(7,11);house(-93,z0+w/2,w,range(5,7.5),range(5.5,7),1);z0+=w+range(.8,1.6);}
z0=-22;
for(let i=0;i<8;i++){if(z0>40)break;const w=range(7,11);house(-77,z0+w/2,w,range(4.5,7),range(5,6.5),-1);z0+=w+range(.8,1.6);}
for(let zz=-25;zz<45;zz+=2.3)for(let xx=-89;xx<-81;xx+=1.8){const h=land(xx,zz);stamp('town-paving',new T.BoxGeometry(1,1,1),'#c7b69a',v(xx,h+.035,zz),v(1.65,.065,2.1));}
for(const cz of[-9,3]){const cloth=new T.Mesh(new T.PlaneGeometry(14,3.4,6,2),new T.MeshBasicMaterial({color:0xead9b4,side:T.DoubleSide,transparent:true,opacity:.92}));cloth.rotation.x=-Math.PI/2;cloth.rotation.z=.06;cloth.position.set(-85,land(-85,cz)+5.8,cz);cloth.castShadow=true;scene.add(cloth);}
mesh(new T.BoxGeometry(4.5,11,4.5),wallMat,v(-99,0,-27),v(1,1,1),scene).position.y=land(-99,-27)+5.5;
mesh(new T.ConeGeometry(3.4,2.6,4),roofMat,v(-99,0,-27),v(1,1,1),scene).position.y=land(-99,-27)+12.3;
// The hero carved door at the alley's end: double teak leaves, carved frame, brass studs.
{const fb=land(-85,-30);const fac=mesh(new T.BoxGeometry(9,7,5),mat('#e8dcc2',.95),v(-85,fb+3.5,-31.5),v(1,1,1),scene);fac.receiveShadow=true;
mesh(new T.BoxGeometry(9.5,.5,5.5),mat('#b89a6a',.9),v(-85,fb+7.2,-31.5),v(1,1,1),scene);
for(const wx of[-2.6,2.6]){mesh(new T.BoxGeometry(.8,1.1,.12),mat('#2e3a38',.6),v(-85+wx,fb+4.6,-28.9),v(1,1,1),scene).castShadow=false;}}
const doorG=new T.Group();const heroBase=land(-85,-28.6);doorG.position.set(-85,heroBase,-28.6);doorG.rotation.y=-Math.PI/2;scene.add(doorG);
const teak=mat('#4a2e18',.75),teakD=mat('#3a2210',.75),brass=mat('#c8a03a',.4,false);
mesh(new T.BoxGeometry(.5,4.6,.5),teak,v(0,2.3,-1.75),v(1,1,1),doorG);
mesh(new T.BoxGeometry(.5,4.6,.5),teak,v(0,2.3,1.75),v(1,1,1),doorG);
mesh(new T.BoxGeometry(.5,.5,4),teak,v(0,4.65,0),v(1,1,1),doorG);
mesh(new T.BoxGeometry(.56,.34,4.3),teakD,v(0,5.0,0),v(1,1,1),doorG);
mesh(new T.BoxGeometry(.3,4.2,.34),teakD,v(.05,2.25,0),v(1,1,1),doorG);
const leafL=new T.Group(),leafR=new T.Group();leafL.position.set(0,.35,-1.5);leafR.position.set(0,.35,1.5);doorG.add(leafL,leafR);
for(const [leaf,side] of [[leafL,1],[leafR,-1]]){
const panel=mesh(new T.BoxGeometry(.16,3.9,1.42),teak,v(0,1.95,side*.71),v(1,1,1),leaf);
for(let r2=0;r2<3;r2++)for(let c2=0;c2<2;c2++){mesh(new T.BoxGeometry(.2,.8,.44),teakD,v(.02,.75+r2*1.25,side*(.38+c2*.68)),v(1,1,1),leaf).castShadow=false;}
for(let s2=0;s2<8;s2++){const st=mesh(new T.SphereGeometry(.05,6,5),brass,v(.12,3.6,side*(.3+s2*.16)),v(1,1,1),leaf);st.castShadow=false;}}
for(const [ins,xx] of[[1.52,.1],[1.3,.2]]){mesh(new T.BoxGeometry(.16,4.3,.16),teakD,v(xx,2.2,-ins),v(1,1,1),doorG);mesh(new T.BoxGeometry(.16,4.3,.16),teakD,v(xx,2.2,ins),v(1,1,1),doorG);mesh(new T.BoxGeometry(.16,.16,ins*2+.16),teakD,v(xx,4.42,0),v(1,1,1),doorG);}
for(let r2=0;r2<7;r2++){const ros=mesh(new T.CylinderGeometry(.11,.11,.07,8),r2%2?brass:teakD,v(.3,4.66,-1.35+r2*.45),v(1,1,1),doorG);ros.rotation.z=Math.PI/2;ros.castShadow=false;}
for(const [leaf,side] of [[leafL,1],[leafR,-1]])for(let r2=0;r2<3;r2++)for(let c2=0;c2<2;c2++){const boss=mesh(new T.SphereGeometry(.085,7,6),brass,v(.14,.75+r2*1.25,side*(.38+c2*.68)),v(1,1,1),leaf);boss.castShadow=false;}
mesh(new T.BoxGeometry(.5,.18,4.1),teakD,v(.12,.12,0),v(1,1,1),doorG);
mesh(new T.BoxGeometry(.4,.3,.5),teakD,v(.05,4.5,0),v(1,1,1),doorG);
doorG.userData.kind='door';doorG.userData.leafL=leafL;doorG.userData.leafR=leafR;
const doorLight=new T.PointLight(0xffc06a,.7,11);doorLight.position.set(-1.2,2.4,0);doorG.add(doorLight);doorG.userData.light=doorLight;
window.__door=doorG;}
// The spice grove: broadleaf shade trees, clove buds, dappled light on the floor.
const groveC=v(40,0,-32);groveC.y=land(groveC.x,groveC.z);
const groveCanopy=canopyLayer(T,scene);
{const trunkMat=mat('#5a4028',.95),leafMat=mat('#2e5c2f',.85),leafMat2=mat('#3d7038',.85),budMat=mat('#c84a3a',.6,false);
const segD=(x,z,ax,az,bx,bz)=>{const dx=bx-ax,dz=bz-az,L2=dx*dx+dz*dz;let t=L2?((x-ax)*dx+(z-az)*dz)/L2:0;t=Math.max(0,Math.min(1,t));return Math.hypot(x-(ax+dx*t),z-(az+dz*t));};
for(let i=0;i<20;i++){const a=i/20*6.28+range(-.3,.3),r=range(9,28),x=groveC.x+Math.sin(a)*r,z=groveC.z+Math.cos(a)*r;if(Math.abs(x-40)<9&&z>-22)continue;if(segD(x,z,35.8,-33.0,41.2,-38)<8)continue;const h=land(x,z);
const th=range(2.6,4.6),tr=new T.Mesh(new T.CylinderGeometry(.16,.26,th,7),trunkMat);tr.position.set(x,h+th/2,z);tr.castShadow=true;scene.add(tr);
groveCanopy.crown(x,h+th,z,range(1.8,2.6),300);
if(i%3===0){for(let c3=0;c3<6;c3++){const bud=new T.Mesh(new T.SphereGeometry(.09,6,5),budMat);bud.position.set(x+range(-1.6,1.6),h+th+range(-.8,.6),z+range(-1.6,1.6));scene.add(bud);}}}
for(let i=0;i<26;i++){const a=range(0,6.28),r=range(3,27),x=groveC.x+Math.sin(a)*r,z=groveC.z+Math.cos(a)*r,h=land(x,z);if(segD(x,z,35.8,-33.0,41.2,-38)<3)continue;groveCanopy.crown(x,h+.45,z,range(.6,1.1),70);
if(i%3===0)for(let c3=0;c3<4;c3++){const bud=new T.Mesh(new T.SphereGeometry(.06,6,5),budMat);bud.position.set(x+range(-.6,.6),h+range(.4,.8),z+range(-.6,.6));scene.add(bud);}}
for(let i=0;i<3;i++){const a=range(0,6.28),r=range(5,22),x=groveC.x+Math.sin(a)*r,z=groveC.z+Math.cos(a)*r,h=land(x,z);const log=new T.Mesh(new T.CylinderGeometry(.14,.2,range(2,3.4),7),trunkMat);log.position.set(x,h+.16,z);log.rotation.set(Math.PI/2,0,range(0,6.28));log.castShadow=true;scene.add(log);}
for(let i=0;i<18;i++){const spot=new T.Mesh(new T.CircleGeometry(range(.8,1.8),14),new T.MeshBasicMaterial({color:0xfff2c0,transparent:true,opacity:.16,depthWrite:false}));spot.rotation.x=-Math.PI/2;const a=range(0,6.28),r=range(4,24),x=groveC.x+Math.sin(a)*r,z=groveC.z+Math.cos(a)*r;spot.position.set(x,land(x,z)+.06,z);scene.add(spot);}}
// Grove soil lies on the same height field as the island and has a soft leaf-litter edge.
{const g=new T.PlaneGeometry(100,110,56,56);g.rotateX(-Math.PI/2);const p=g.attributes.position,c=[],alpha=[];
for(let i=0;i<p.count;i++){const x=p.getX(i)+40,z=p.getZ(i)-10;p.setXYZ(i,x,land(x,z)+.09,z);const n=.5+.25*Math.sin(x*.9+z*.7)+.25*Math.sin(x*1.7-z*.6);const col=new T.Color('#423c28').lerp(new T.Color('#716849'),n*.6);c.push(col.r,col.g,col.b);alpha.push(1-T.MathUtils.smoothstep(Math.hypot((x-40)/50,(z+10)/55),.58,1));}
g.computeVertexNormals();g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setAttribute('edgeAlpha',new T.Float32BufferAttribute(alpha,1));
const m=new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});m.onBeforeCompile=sh=>{sh.vertexShader='attribute float edgeAlpha; varying float vEdge;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvEdge=edgeAlpha;');sh.fragmentShader='varying float vEdge;\n'+sh.fragmentShader.replace('#include <alphatest_fragment>','diffuseColor.a *= vEdge;\n#include <alphatest_fragment>');};const ground=new T.Mesh(g,m);ground.receiveShadow=true;scene.add(ground);}
// More woodland behind the visitor, so the grove surrounds rather than facing a bare beach.
for(let i=0;i<13;i++){const a=i*2.399,r=12+(i%4)*4,x=40+Math.cos(a)*r,z=-15+Math.sin(a)*r,h=land(x,z);if(Math.hypot(x-41.2,z+38)<9)continue;const th=3.2+(i%3)*.45;const tr=new T.Mesh(new T.CylinderGeometry(.14,.23,th,7),mat('#5a4028',.96));tr.position.set(x,h+th/2,z);tr.castShadow=true;scene.add(tr);groveCanopy.crown(x,h+th,z,2.3+(i%3)*.2,320);}
// The colobus perch uses the same leaf language as the rest of the grove.
groveCanopy.crown(44,land(44,-38)+6.8,-38,2.6,420);
for(const [x,z]of[[34,12],[44,19],[56,16],[20,8],[63,-4]]){const h=land(x,z);const tr=new T.Mesh(new T.CylinderGeometry(.16,.25,4.1,7),mat('#5a4028',.96));tr.position.set(x,h+2.05,z);tr.castShadow=true;scene.add(tr);groveCanopy.crown(x,h+4.1,z,2.8,400);}
// A continuous outer woodland belt closes the clearing in every direction.
// Keep the southward colobus sightline open; trunks share one draw call.
{const poses=[],d=new T.Object3D();
for(let i=0;i<42;i++){
 const a=i*2.399963,r=24+(i%5)*3.2,x=40+Math.sin(a)*r,z=-4+Math.cos(a)*r,h=land(x,z);
 if(Math.abs(x-42)<5&&z< -20)continue;
 const th=5.6+(i%4)*.6;
 d.position.set(x,h+th/2,z);d.rotation.set(0,a,0);d.scale.set(.20,th,.20);d.updateMatrix();poses.push(d.matrix.clone());
 groveCanopy.crown(x,h+th,z,3.4+(i%3)*.35,145);
}
const trunks=new T.InstancedMesh(new T.CylinderGeometry(.7,1,1,7),mat('#614730',.96),poses.length);poses.forEach((p,i)=>trunks.setMatrixAt(i,p));trunks.castShadow=true;trunks.computeBoundingSphere();scene.add(trunks);
}
// Layered understory closes the eye-level sea gaps without a solid crown shell.
// Local art positions, not measured farm geometry. Keep the colobus approach clear.
for(let i=0;i<29;i++){
 const a=i*2.399963,r=11+(i%4)*1.9,x=40+Math.sin(a)*r,z=-12+Math.cos(a)*r;
 if(Math.abs(x-41)<5&&z< -20)continue;
 const h=land(x,z);groveCanopy.crown(x,h+1.3+(i%3)*.45,z,1.8+(i%3)*.25,140);
}
for(const[x,z,h,r]of[[33,-14,6,3.9],[48,-11,6.4,4.2],[31,-3,5.8,3.6],[51,-22,6.5,4]]){
 const y=land(x,z),tr=new T.Mesh(new T.CylinderGeometry(.16,.3,h,7),mat('#67513b',.96));tr.position.set(x,y+h/2,z);tr.castShadow=true;scene.add(tr);groveCanopy.crown(x,y+h,z,r,360);
}
// Staggered saplings behind the perch break the distant ocean stripe.
for(let i=0;i<19;i++){
 const x=12+i*3.3,z=-57+(i%3)*3.4,h=land(x,z),th=4.1+(i%4)*.5;
 const tr=new T.Mesh(new T.CylinderGeometry(.1,.2,th,6),mat('#67513b',.96));tr.position.set(x,h+th/2,z);scene.add(tr);
 groveCanopy.crown(x,h+th,z,3.1,200);groveCanopy.crown(x,h+1.5,z,2.4,150);
}
groveCanopy.finish();
function mesh(g,material,pos,scale,parent){const o=new T.Mesh(g,material);o.position.copy(pos);o.scale.copy(scale);o.castShadow=true;parent.add(o);return o;}
const eyeMat=mat('#1a1410');
// Dhows: curved wooden hulls, lateen yards and triangular cloth sails.
const dhows=[];
function makeDhow(sailColor){const g=new T.Group();
const hullMat=mat('#5a3a20',.85,false);
mesh(new T.SphereGeometry(1,16,10),hullMat,v(0,.5,0),v(2.6,.55,.75),g);
mesh(new T.CylinderGeometry(.09,.14,1.5,6),hullMat,v(2.35,1.0,0),v(1,1,1),g).rotation.z=-.6;
mesh(new T.CylinderGeometry(.08,.12,1.1,6),hullMat,v(-2.4,.85,0),v(1,1,1),g).rotation.z=.5;
mesh(new T.BoxGeometry(3.6,.12,.9),mat('#7a5230',.9),v(0,.98,0),v(1,1,1),g);
const mast=mesh(new T.CylinderGeometry(.07,.1,5.6,7),mat('#6a4a28',.9),v(.2,3.4,0),v(1,1,1),g);mast.rotation.z=.12;
const yard=mesh(new T.CylinderGeometry(.05,.05,6.8,6),mat('#6a4a28',.9),v(.2,4.4,0),v(1,1,1),g);yard.rotation.z=1.05;yard.position.set(.2,4.6,0);
const sg=new T.BufferGeometry();const sp=new Float32Array([-2.6,2.1,0, 2.95,7.1,0, -2.35,6.6,0]);sg.setAttribute('position',new T.BufferAttribute(sp,3));sg.setIndex([0,1,2]);sg.computeVertexNormals();
const sail=new T.Mesh(sg,new T.MeshStandardMaterial({color:sailColor,roughness:.9,side:T.DoubleSide}));sail.castShadow=true;g.add(sail);
g.userData.kind='dhow';g.userData.sail=sail;return g;}
const sailColors=['#f4ead2','#efe2c4','#e8d8b8'];
for(let i=0;i<2;i++){const d=makeDhow(sailColors[i]);d.position.set(-24+i*30,.1,132+i*16);d.rotation.y=range(-.6,.6);scene.add(d);dhows.push(d);}
const sailor=makeDhow('#f6ecd6');scene.add(sailor);dhows.push(sailor);
const sailC=v(10,0,156),sailR=36;
// The Zanzibar red colobus: russet back, white mantle, long dark tail, on a grove branch.
const colobus=new T.Group();{const fur=mat('#a03822',.95,false),furW=mat('#f0ead8',.95,false),face=mat('#241a16',.8,false);
const torso=mesh(new T.SphereGeometry(1,12,10),fur,v(-.02,.42,0),v(.3,.42,.26),colobus);torso.rotation.z=-.35;
const belly=mesh(new T.SphereGeometry(1,10,8),furW,v(.09,.32,0),v(.19,.28,.19),colobus);belly.rotation.z=-.35;
mesh(new T.SphereGeometry(1,10,8),furW,v(.14,.82,0),v(.17,.16,.15),colobus);
mesh(new T.SphereGeometry(1,8,6),face,v(.26,.8,0),v(.1,.11,.1),colobus);
mesh(new T.SphereGeometry(1,6,5),fur,v(.12,.94,0),v(.12,.07,.12),colobus);
for(const z of[-.13,.13])mesh(new T.SphereGeometry(1,6,5),furW,v(.2,.76,z),v(.09,.09,.06),colobus);
for(const z of[-.045,.045])mesh(new T.SphereGeometry(.032,5,4),mat('#e8e2d2'),v(.33,.82,z),v(1,1,1),colobus);
for(const z of[-.15,.15])mesh(new T.SphereGeometry(.05,6,5),face,v(.1,.83,z),v(1,1,1),colobus);
for(const z of[-.13,.13]){const arm=mesh(new T.CylinderGeometry(.038,.048,.52,6),fur,v(.17,.33,z),v(1,1,1),colobus);arm.rotation.z=.22;}
for(const z of[-.15,.15])mesh(new T.SphereGeometry(1,8,6),fur,v(-.15,.12,z),v(.17,.14,.12),colobus);
for(const z of[-.13,.13])mesh(new T.SphereGeometry(.05,6,5),face,v(.22,.07,z),v(1,1,1),colobus);
const tail=new T.Group();tail.position.set(-.27,.32,0);
let tp=null;for(let s2=0;s2<7;s2++){const seg=mesh(new T.CylinderGeometry(.026-.0028*s2,.032-.0028*s2,.3,5),s2>3?furW:fur,v(0,-.13,0),v(1,1,1),tail);if(tp){seg.position.set(0,-.27,0);seg.rotation.z=.13;tp.add(seg);}tp=seg;}
tail.rotation.z=.5;colobus.add(tail);colobus.userData.tail=tail;}
{const branchT=land(44,-38);const treeT=new T.Mesh(new T.CylinderGeometry(.12,.19,5.4,7),mat('#5a4028',.95));treeT.position.set(44,branchT+2.7,-38);treeT.castShadow=true;scene.add(treeT);
const branch=new T.Mesh(new T.CylinderGeometry(.08,.1,3.6,6),mat('#5a4028',.95));branch.rotation.z=Math.PI/2.15;branch.position.set(42.6,branchT+2.9,-38);scene.add(branch);
colobus.position.set(41.2,branchT+3.18,-38);colobus.scale.setScalar(1.35);colobus.rotation.y=-2.53;colobus.userData.kind='colobus';scene.add(colobus);}
// Terns over the lagoon.
const terns=[];for(let i=0;i<6;i++){const d=new T.Group();const tm=mat('#f4f2ea');mesh(new T.SphereGeometry(1,8,5),tm,v(0,0,0),v(.32,.11,.1),d);for(const s of[-1,1]){const w=mesh(new T.ConeGeometry(.08,.55,4),tm,v(0,0,s*.3),v(1,1,1),d);w.rotation.x=s*1.4;d.userData['wing'+(s>0?'R':'L')]=w;}d.userData.kind='tern';scene.add(d);terns.push(d);}
// Butterflies in the grove.
const butterflies=[];for(let i=0;i<5;i++){const b=new T.Group();const bm=mat(i%2?'#e8a03a':'#d8e8f0');for(const s of[-1,1]){const w=mesh(new T.PlaneGeometry(.13,.18),new T.MeshStandardMaterial({color:bm.color,side:T.DoubleSide}),v(s*.12,0,0),v(1,1,1),b);b.userData['wing'+(s>0?'R':'L')]=w;}scene.add(b);butterflies.push(b);}
// A few soft trade-wind clouds.
const clouds=[];{const cm=new T.MeshStandardMaterial({color:0xffffff,roughness:1,transparent:true,opacity:.5,flatShading:false,depthWrite:false});
for(let i=0;i<7;i++){const c9=new T.Group();const np=6+Math.floor(range(0,3));for(let b=0;b<np;b++){const bp=mesh(new T.SphereGeometry(range(2.4,4.6),9,7),cm,v(b*3.4+range(-1.4,1.4),range(-.6,.6),range(-2,2)),v(1,.32,1),c9);bp.castShadow=false;bp.receiveShadow=false;}
const a=range(0,6.28),r=range(150,320);c9.position.set(Math.sin(a)*r,range(55,90),Math.cos(a)*r);scene.add(c9);clouds.push(c9);}}
// Moon, stars, and the glowing night tide along the waterline.
const moon=new T.Mesh(new T.CircleGeometry(24,32),new T.MeshBasicMaterial({color:0xe8f0ff,fog:false,transparent:true,opacity:0}));skyRig.add(moon);
const starGeo=new T.BufferGeometry(),starPos=new Float32Array(900*3);for(let i=0;i<900;i++){const a=range(0,6.28),e=range(.08,1.5);starPos[i*3]=Math.cos(a)*Math.cos(e)*900;starPos[i*3+1]=Math.sin(e)*900;starPos[i*3+2]=Math.sin(a)*Math.cos(e)*900;}starGeo.setAttribute('position',new T.BufferAttribute(starPos,3));
const stars=new T.Points(starGeo,new T.PointsMaterial({color:0xdfe8ff,size:1.5,transparent:true,opacity:0,fog:false,depthWrite:false,sizeAttenuation:false}));skyRig.add(stars);
const glowTex=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=64;const g2=cv.getContext('2d');const gr=g2.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(190,255,242,.55)');gr.addColorStop(1,'rgba(120,240,220,0)');g2.fillStyle=gr;g2.fillRect(0,0,64,64);return new T.CanvasTexture(cv);})();
const plankton=(()=>{const xs=[];for(let a=0;a<6.28;a+=.02){for(let r=80;r<200;r+=1.5){const x=Math.sin(a)*r,z=Math.cos(a)*r;if(Math.abs(land(x,z))<.09)xs.push(x,.12,z);}if(xs.length>27000)break;}
const g9=new T.BufferGeometry();g9.setAttribute('position',new T.BufferAttribute(new Float32Array(xs),3));
const p9=new T.Points(g9,new T.PointsMaterial({color:0x4fe8d8,map:glowTex,size:.22,transparent:true,opacity:0,fog:false,depthWrite:false,blending:T.AdditiveBlending}));scene.add(p9);return p9;})();
// Sun disc, halo.
const sunMat=new T.MeshBasicMaterial({color:0xfff4dc,fog:false,transparent:true});const sun=new T.Mesh(new T.CircleGeometry(38,32),sunMat);skyRig.add(sun);
const halo=new T.Mesh(new T.CircleGeometry(150,32),new T.MeshBasicMaterial({color:0xffdca8,fog:false,transparent:true,opacity:.5,depthWrite:false,map:glowTex,blending:T.AdditiveBlending}));skyRig.add(halo);
const chapters=[
{title:'The lagoon.<br><i>Dhows at first light.</i>',line:'The tide is out. The shallows hold the sky.',action:'Sail with the dhow',pos:v(2,0,96),yaw:.22,pitch:.03,skyTop:'#7fb8d8',skyHor:'#ffd9b0',fog:.0016,ink:'#123b3f',veil:['#06333a26','#eef7f0c8','#f4faf2f2'],sun:v(.9,.16,.25),sunColor:'#ffd9a8',sunI:2.2,hemiI:1.4,glowAmt:1.0,kind:'dhow'},
{title:'Stone Town.<br><i>The carved door.</i>',line:'Coral walls keep the shade. Every door is a signature.',action:'Open the carved door',pos:v(-85.5,0,32),yaw:3.13,pitch:.03,skyTop:'#8fc8e0',skyHor:'#e8f0e0',fog:.0020,ink:'#123b3f',veil:['#06333a26','#eef7f0c8','#f4faf2f2'],sun:v(.3,.85,-.2),sunColor:'#fff2dd',sunI:2.6,hemiI:2.3,glowAmt:.4,kind:'door'},
{title:'The spice grove.<br><i>Cloves in the shade.</i>',line:"Cinnamon, clove, cardamom - the island's second harvest.",action:'Find the red colobus',pos:v(40,0,-12),yaw:Math.PI,pitch:-.03,skyTop:'#9cc8d8',skyHor:'#e8e8c0',fog:.0024,ink:'#123b3f',veil:['#0a332636','#eef5e8c8','#f2f8ecf2'],sun:v(-.4,.6,.4),sunColor:'#ffe8c0',sunI:2.0,hemiI:1.6,glowAmt:.5,kind:'colobus'},
{title:'The night tide.<br><i>The shore keeps glowing.</i>',line:'The moon pulls the sea away. Some nights, the foam answers back with light.',action:'Walk the glowing tide',pos:v(-8,0,94),yaw:.25,pitch:.1,skyTop:'#060d1e',skyHor:'#12263a',fog:.0010,ink:'#eef4ee',veil:['#040a1426','#060e1cd8','#040810f7'],sun:v(-.4,.7,-.5),sunColor:'#a8c0f0',sunI:1.0,hemiI:.9,glowAmt:.3,kind:'tide'}];
let chapter=0,yaw=.15,pitch=.03,encPos=null,encKind=null,encAim=null,targetYaw=.15,targetPitch=.03,night=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,elapsed=0,last=performance.now(),dragged=false,down=null,encountered=false,frames=0,doorOpen=0,doorTarget=0,tideBoost=0;
chapters.forEach(c=>{c.pos.y=land(c.pos.x,c.pos.z)+2.6;});camera.position.copy(chapters[0].pos);
function pauseUI(){const b=$('#pause');b.setAttribute('aria-pressed',String(paused));b.setAttribute('aria-label',paused?'Resume ambient motion':'Pause ambient motion');b.textContent=paused?'▷':'Ⅱ';}pauseUI();
function changeChapter(n){chapter=(n+4)%4;const c=chapters[chapter];targetYaw=c.yaw;targetPitch=c.pitch;encountered=false;encKind=null;encAim=null;doorTarget=0;$('#title').innerHTML=c.title;$('#line').textContent=c.line;$('#encounter').innerHTML=c.action+' <span aria-hidden="true">↗</span>';document.querySelectorAll('[data-chapter]').forEach(b=>b.setAttribute('aria-current',String(+b.dataset.chapter===chapter)));document.documentElement.style.setProperty('--ink',c.ink);$('.veil').style.background=chapter===2?`linear-gradient(${c.veil[0]},transparent 28%,transparent)`:`linear-gradient(${c.veil[0]},transparent 28%,transparent 43%,${c.veil[1]} 77%,${c.veil[2]})`;$('#orientation').classList.remove('show');retuneMusic();}
const facts={dhow:['The wind that made an island.','For at least two thousand years, lateen-sailed dhows have ridden the monsoon to Zanzibar - one wind to come, its turn to carry you home.'],door:['A signature in teak.',"Stone Town's carved doors announced who lived within - their trade, their fortune, their homeland. The coral-rag town itself is a UNESCO World Heritage site."],colobus:['Found nowhere else.',"The Zanzibar red colobus lives only on Unguja, the archipelago's main island. Most of the last population shelters in and around Jozani's old forest."],tide:['The sea answers with light.','Twice a day the tide steps back across the flats. On some dark nights, plankton in the wash glow blue wherever the water is stirred.']};
function aimAt(p){const d=p.clone().sub(camera.position);targetYaw=Math.atan2(d.x,d.z);targetPitch=Math.atan2(d.y,Math.hypot(d.x,d.z));}
function easeAim(dt,p){const d=p.clone().sub(camera.position);const ty=Math.atan2(d.x,d.z),tp=Math.atan2(d.y,Math.hypot(d.x,d.z));let dy=ty-targetYaw;while(dy>Math.PI)dy-=2*Math.PI;while(dy<-Math.PI)dy+=2*Math.PI;const k=Math.min(1,dt*3);targetYaw+=dy*k;targetPitch+=(tp-targetPitch)*k;}
function encounter(kind){const f=facts[kind];if(!f)return;encountered=true;encKind=kind;$('#title').textContent=f[0];$('#line').textContent=f[1];$('#encounter').innerHTML='Return to the island <span aria-hidden="true">↙</span>';
if(!encPos)encPos=v(0,0,0);
if(kind==='dhow'){targetPitch=.3;}
if(kind==='colobus'){encPos.set(colobus.position.x-5.0,colobus.position.y+.6,colobus.position.z+3.5);camera.position.lerp(encPos,.35);aimAt(colobus.position);encAim=colobus.position.clone();}
if(kind==='door'){doorTarget=1;encPos.set(-85,land(-85,-15.8)+1.75,-15.8);camera.position.lerp(encPos,.35);encAim=window.__door.position.clone();encAim.y+=2.4;aimAt(encAim);}
if(kind==='tide'){tideBoost=1;encAim=null;let tz=102;while(land(-8,tz)>.25&&tz<150)tz+=1;targetYaw=.18;if(camera.aspect<1){encPos.set(-8,land(-8,tz-9)+2.1,tz-9);targetPitch=-.26;}else{encPos.set(-8,land(-8,tz-2)+1.35,tz-2);targetPitch=.14;}}}
$('#encounter').onclick=()=>encountered?changeChapter(chapter):encounter(chapters[chapter].kind);document.querySelectorAll('[data-chapter]').forEach(b=>b.onclick=()=>changeChapter(+b.dataset.chapter));$('#pause').onclick=()=>{paused=!paused;pauseUI();};$('#about').onclick=()=>$('#notes').showModal();$('#close').onclick=()=>$('#notes').close();$('#notes').onclick=e=>{if(e.target===$('#notes'))$('#notes').close();};
const pickables=[...dhows,window.__door,colobus];
canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY};dragged=false;canvas.setPointerCapture(e.pointerId);$('#orientation').classList.remove('show');});canvas.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.lx,dy=e.clientY-down.ly;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true;targetYaw-=dx*.006;targetPitch=Math.max(-.65,Math.min(.85,targetPitch+dy*.004));down.lx=e.clientX;down.ly=e.clientY;});const caster=new T.Raycaster();canvas.addEventListener('pointerup',e=>{if(down&&!dragged){caster.setFromCamera(new T.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);const hit=caster.intersectObjects(pickables,true)[0];if(hit){let o=hit.object;while(o.parent&&!o.userData.kind)o=o.parent;encounter(o.userData.kind);}}down=null;});canvas.addEventListener('pointercancel',()=>down=null);
canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')targetYaw+=.16;if(e.key==='ArrowRight')targetYaw-=.16;if(e.key==='ArrowUp')targetPitch=Math.min(.85,targetPitch+.12);if(e.key==='ArrowDown')targetPitch=Math.max(-.65,targetPitch-.12);$('#orientation').classList.remove('show');}});
let sx=0,navDown=false,navSwiped=false;const nav=$('nav');nav.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();changeChapter(chapter+(e.key==='ArrowRight'?1:-1));nav.querySelector('[aria-current=true]').focus();}});nav.addEventListener('pointerdown',e=>{sx=e.clientX;navDown=true;navSwiped=false;});nav.addEventListener('pointerup',e=>{if(!navDown)return;navDown=false;const dx=e.clientX-sx;if(Math.abs(dx)>45){navSwiped=true;changeChapter(chapter+(dx<0?1:-1));}});nav.addEventListener('click',e=>{if(navSwiped){e.preventDefault();e.stopImmediatePropagation();navSwiped=false;}},true);
// Environmental audio is opt-in and follows the active chapter.
const ambience=createSoundscape(SOUND_PLACES);window.zanzibarSound=ambience;
function retuneMusic(){ambience.setPlace(chapter);}
$('#sound').onclick=()=>{const on=ambience.toggle(chapter);const button=$('#sound');button.setAttribute('aria-pressed',String(on));button.setAttribute('aria-label',on?'Turn environmental sound off':'Turn environmental sound on');button.textContent=on?'◼':'◌';};
window.__ambientStats=()=>{const a=ambience.state.analyser;if(!a)return{rms:0,peak:0,on:false};const d=new Float32Array(a.fftSize);a.getFloatTimeDomainData(d);let sum=0,peak=0;for(const x of d){sum+=x*x;peak=Math.max(peak,Math.abs(x))}return{rms:Math.sqrt(sum/d.length),peak,on:ambience.state.on}};
document.addEventListener('visibilitychange',()=>{last=performance.now();const ctx=ambience.state.ctx;if(ctx){if(document.hidden)ctx.suspend();else if(ambience.state.on)ctx.resume();}});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
const look=v(0,0,0),sunPos=v(0,0,0),skyTopC=new T.Color(),skyHorC=new T.Color(),sunColC=new T.Color(),nightSand=new T.Color('#15243a'),nightPalm=new T.Color('#22404a'),white=new T.Color('#ffffff');
function animate(now){requestAnimationFrame(animate);if(document.hidden)return;const wallDt=Math.min((now-last)/1000,.5),dt=Math.min(wallDt,.15);last=now;if(!paused)elapsed+=dt;const c=chapters[chapter];
if(encountered&&encKind==='dhow'){const r2=sailor.rotation.y,qx=Math.sin(r2),qz=Math.cos(r2),hy=Math.atan2(-qx,-qz);const sd=camera.aspect<1?30:19,pt=camera.aspect<1?0:.16,ey=camera.aspect<1?1.6:2.6;encPos.set(sailor.position.x+qx*sd,sailor.position.y+ey,sailor.position.z+qz*sd);if(!down){let dy=hy-targetYaw;while(dy>Math.PI)dy-=2*Math.PI;while(dy<-Math.PI)dy+=2*Math.PI;targetYaw+=dy*Math.min(1,dt*1.6);}targetPitch+=(pt-targetPitch)*Math.min(1,dt*2);}
camera.position.lerp(encountered&&encPos?encPos:c.pos,1-Math.exp(-wallDt*4));
if(encountered&&encAim&&!down)easeAim(dt,encAim);
if(matchMedia('(prefers-reduced-motion: reduce)').matches){yaw=targetYaw;pitch=targetPitch;}else{yaw+=(targetYaw-yaw)*(1-Math.exp(-dt*9));pitch+=(targetPitch-pitch)*(1-Math.exp(-dt*9));}
look.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).add(camera.position);camera.lookAt(look);
const k=1-Math.exp(-wallDt*3);night+=((chapter===3?1:0)-night)*k;if(Math.abs((chapter===3?1:0)-night)<.001)night=chapter===3?1:0;
skyTopC.set(c.skyTop);skyHorC.set(c.skyHor);sunColC.set(c.sunColor);
skyU.top.value.lerp(skyTopC,k);skyU.hor.value.lerp(skyHorC,k);skyU.sunDir.value.lerp(c.sun,k).normalize();skyU.glowAmt.value+=(c.glowAmt-skyU.glowAmt.value)*k;
scene.background.copy(skyU.hor.value);scene.fog.color.copy(skyU.hor.value);scene.fog.density+=(c.fog-scene.fog.density)*k;
sunlight.color.lerp(sunColC,k);sunlight.intensity+=(c.sunI-sunlight.intensity)*k;hemi.intensity+=(c.hemiI-hemi.intensity)*k;
sunlight.position.copy(camera.position).addScaledVector(c.sun,180);sunlight.target.position.copy(camera.position);sunlight.target.updateMatrixWorld();
skyRig.position.copy(camera.position);
sunPos.copy(c.sun).normalize().multiplyScalar(900);sun.position.copy(sunPos);sun.lookAt(camera.position);sun.material.opacity=1-night;halo.position.copy(sunPos);halo.lookAt(camera.position);halo.material.opacity=.5*(1-night);
moon.position.copy(v(.25,.5,.78).normalize().multiplyScalar(900));moon.lookAt(camera.position);moon.material.opacity=night*.95;stars.material.opacity=night*.95;
sandMat.color.copy(white).lerp(nightSand,night*.9);palmMat.color.copy(white).lerp(nightPalm,night*.8);
seaU.time.value=elapsed;seaU.night.value=night;seaU.sunDir.value.copy(c.sun).normalize();
tideBoost+=(0-tideBoost)*(1-Math.exp(-dt*.25));
tideU.time.value=elapsed;tideU.night.value=night;tideU.boost.value=tideBoost;
plankton.material.opacity=night*(.18+.06*Math.sin(elapsed*1.3)+.1*tideBoost);
doorOpen+=(doorTarget-doorOpen)*(1-Math.exp(-dt*2.5));
window.__door.userData.leafL.rotation.y=doorOpen*1.85;window.__door.userData.leafR.rotation.y=-doorOpen*1.85;window.__door.userData.light.intensity=.7+doorOpen*2.2;
for(let i=0;i<2;i++){const d=dhows[i];d.position.y=.1+Math.sin(elapsed*.7+i*2.1)*.08;d.rotation.z=Math.sin(elapsed*.5+i)*.03;d.rotation.x=Math.sin(elapsed*.62+i*1.3)*.025;}
{const a=elapsed*.045;sailor.position.set(sailC.x+Math.sin(a)*sailR,.12+Math.sin(elapsed*.8)*.09,sailC.z+Math.cos(a)*sailR*.8);sailor.rotation.y=a+Math.PI/2;sailor.rotation.z=Math.sin(elapsed*.6)*.05;}
for(let i=0;i<terns.length;i++){const a=elapsed*.22+i*1.05,d=terns[i];d.position.set(4+Math.sin(a)*38,10+Math.sin(elapsed*.8+i)*2.2,140+Math.cos(a)*30);d.rotation.y=a+Math.PI/2;d.userData.wingL.rotation.z=Math.sin(elapsed*7+i)*.7;d.userData.wingR.rotation.z=-Math.sin(elapsed*7+i)*.7;}
for(let i=0;i<butterflies.length;i++){const b=butterflies[i],a=elapsed*.5+i*2.4;b.position.set(groveC.x+Math.sin(a)*8+Math.sin(elapsed*1.3+i)*1.2,groveC.y+1.3+Math.sin(elapsed*1.7+i)*.6,groveC.z+Math.cos(a)*8);b.userData.wingL.rotation.y=Math.sin(elapsed*14+i)*.9;b.userData.wingR.rotation.y=-Math.sin(elapsed*14+i)*.9;}
colobus.userData.tail.rotation.z=.9+Math.sin(elapsed*1.4)*.25;colobus.position.y=land(44,-38)+3.35+(encountered&&chapter===2?Math.abs(Math.sin(elapsed*2.2))*.18:0);
for(let i=0;i<clouds.length;i++){const c9=clouds[i];c9.children.forEach(b=>b.material.opacity=.5*(1-night*.95));if(c9.userData.bx===undefined)c9.userData.bx=c9.position.x;let cx=(c9.userData.bx+elapsed*1.1)%720;if(cx>360)cx-=720;c9.position.x=cx;}
$('#compass').textContent=['N','E','S','W'][Math.floor((((yaw*180/Math.PI)%360+360+45)%360)/90)]+' · '+String(Math.round((yaw*180/Math.PI%360+360)%360)).padStart(3,'0')+'°';
canvas.setAttribute('aria-busy',String(camera.position.distanceTo(encountered&&encPos?encPos:c.pos)>.02||Math.abs(yaw-targetYaw)>.01||Math.abs(pitch-targetPitch)>.01));
renderer.render(scene,camera);if(++frames===2){$('#status').remove();$('#orientation').classList.add('show');}if(frames===900)$('#orientation').classList.remove('show');}
changeChapter(0);requestAnimationFrame(animate);

// Place-true chrome: controls greet, retire, and visit when called.
{
  const body=document.body,ui=[$('header'),$('#dock'),$('#compass')],pin=$('#pin-chrome'),hint=$('#chrome-hint'),KEY='zanzibar-chrome-pin',GREET=2600;
  let pinned=false,timer=0,zone=false;
  try{pinned=localStorage.getItem(KEY)==='1';}catch(e){}
  const held=()=>zone||ui.some(el=>el.matches(':focus-within')||el.matches(':hover'));
  const blurIn=()=>{const a=document.activeElement;if(a&&ui.some(el=>el.contains(a)))a.blur();};
  const show=()=>{clearTimeout(timer);body.classList.add('chrome-on');if(!pinned)timer=setTimeout(retire,GREET);};
  const retire=()=>{if(pinned)return;if(held()){timer=setTimeout(retire,GREET);return;}body.classList.remove('chrome-on');blurIn();};
  const setPin=v=>{pinned=v;pin.setAttribute('aria-pressed',String(v));try{localStorage.setItem(KEY,v?'1':'0');}catch(e){}if(v){clearTimeout(timer);body.classList.add('chrome-on');}else show();};
  pin.addEventListener('click',()=>setPin(!pinned));
  hint.addEventListener('click',()=>{show();pin.focus({preventScroll:true});});
  addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;zone=e.clientY<96||e.clientY>innerHeight-150;if(zone)show();});
  document.addEventListener('pointerleave',()=>{zone=false;});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!pinned&&!$('#notes').open){zone=false;clearTimeout(timer);body.classList.remove('chrome-on');blurIn();}else if(e.key==='Tab')show();});
  ui.forEach(el=>el.addEventListener('pointerdown',()=>{if(!pinned)show();}));
  pin.setAttribute('aria-pressed',String(pinned));
  body.classList.add('chrome-on');
  if(!pinned)timer=setTimeout(retire,GREET+800);
}

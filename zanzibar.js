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
const dry=new T.Color('#f0e7d2'),wet=new T.Color('#d8c9ab'),shallow=new T.Color('#c9e2cc'),deep=new T.Color('#8fbfae'),c=new T.Color();
for(let i=0;i<p.count;i++){const h=land(p.getX(i),p.getZ(i));p.setY(i,h);
if(h>.18)c.copy(dry);else if(h>-.25)c.copy(wet).lerp(dry,Math.max(0,(h+.25)/.43));else c.copy(shallow).lerp(deep,Math.min(1,(-h-.25)/2.2));
const v2=1+.04*Math.sin(p.getX(i)*.09)*Math.sin(p.getZ(i)*.075);
colors[i*3]=c.r*v2;colors[i*3+1]=c.g*v2;colors[i*3+2]=c.b*v2;}
geo.computeVertexNormals();geo.setAttribute('color',new T.BufferAttribute(colors,3));}
const sandMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.96});
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
gl_FragColor=vec4(mix(day,nit,night),.94);}`}));
sea.rotation.x=-Math.PI/2;sea.position.y=0;scene.add(sea);
const dummy=new T.Object3D(),v=(x,y,z)=>new T.Vector3(x,y,z),up=v(0,1,0);
const batches={};function inst(key,geoI,color,max=3000){if(!batches[key]){const mesh=new T.InstancedMesh(geoI,mat(color),max);mesh.count=0;mesh.frustumCulled=false;mesh.castShadow=true;scene.add(mesh);batches[key]=mesh;}return batches[key];}
function stamp(key,geoI,color,p,s,rot){const b=inst(key,geoI,color);dummy.position.copy(p);dummy.scale.copy(s);dummy.quaternion.copy(rot||new T.Quaternion());dummy.updateMatrix();b.setMatrixAt(b.count++,dummy.matrix);}
// Coral stone and beach scrub scattered on dry ground.
const rockGeo=new T.IcosahedronGeometry(1,0),scrubGeo=new T.ConeGeometry(.5,1.0,6);
let placed=0,guard=0;while(placed<90&&guard++<4000){const a=range(0,6.28),r=range(20,135),x=Math.sin(a)*r,z=Math.cos(a)*r,h=land(x,z);if(h<.6)continue;const s=range(.25,1.1);stamp('rock',rockGeo,placed%3?'#cfc4ac':'#b8ab90',v(x,h-s*.3,z),v(s*1.3,s*.65,s),new T.Quaternion().setFromEuler(new T.Euler(range(0,3),range(0,3),range(0,3))));placed++;}
placed=0;guard=0;while(placed<70&&guard++<4000){const a=range(0,6.28),r=range(16,125),x=Math.sin(a)*r,z=Math.cos(a)*r,h=land(x,z);if(h<.4||h>4.5)continue;const s=range(.3,.7);for(let k=0;k<3;k++){stamp('scrub',scrubGeo,k?'#5d7a44':'#4c6a38',v(x+range(-.4,.4),h+.28*s,z+range(-.4,.4)),v(s,s*range(.8,1.3),s),new T.Quaternion().setFromEuler(new T.Euler(range(-.25,.25),range(0,6),range(-.25,.25))));}placed++;}
// Coconut palms along the beach ring: ringed leaning trunks, arcing fronds, coconut clusters.
{const P=[],Cc=[],I=[];let vi=0;const tc=new T.Color();
const pushV=(p,c)=>{P.push(p.x,p.y,p.z);Cc.push(c.r,c.g,c.b);return vi++;};
function addGeo(g,m4,color){const pa=g.attributes.position,nv=pa.count,base=vi,ve=new T.Vector3();tc.set(color);for(let i=0;i<nv;i++){ve.fromBufferAttribute(pa,i).applyMatrix4(m4);pushV(ve,tc);}const ia=g.index;if(ia)for(let i=0;i<ia.count;i++)I.push(base+ia.getX(i));else for(let i=0;i<nv;i++)I.push(base+i);}
function frond(top,yaw0,e0,droopK,L,w0,c0,c1){
const S=8,dx=Math.cos(yaw0),dz=Math.sin(yaw0),px=-dz,pz=dx,rows=[];const c2=new T.Color();
for(let s=0;s<=S;s++){const t=s/S,along=L*t*Math.cos(e0*.5);
const cy=top.y+L*(Math.sin(e0)*t-droopK*t*t),cx=top.x+dx*along,cz=top.z+dz*along,w=w0*(1-t*.82);
c2.copy(c0).lerp(c1,t);tc.copy(c2).multiplyScalar(.88);
const row={L:pushV(v(cx+px*w,cy-w*.5,cz+pz*w),tc),C:pushV(v(cx,cy,cz),c2),R:pushV(v(cx-px*w,cy-w*.5,cz-pz*w),tc)};rows.push(row);}
for(let s=0;s<S;s++){const a=rows[s],b=rows[s+1];I.push(a.L,b.L,a.C,b.L,b.C,a.C,a.C,b.C,a.R,b.C,b.R,a.R);}}
function palm(x,z,h,leanA,leanAmt,sd){
const rings=7,sides=6;let prev=null;const y0=land(x,z);
for(let r=0;r<=rings;r++){const t=r/rings,cx=x+Math.cos(leanA)*leanAmt*t*t*h,cz=z+Math.sin(leanA)*leanAmt*t*t*h,y=y0+t*h,rad=(.26-.13*t)*(1+.13*Math.sin(t*23+sd*7)),ring=[];
for(let s=0;s<sides;s++){const a=s/sides*Math.PI*2;tc.setHSL(.08,.3,.3+.07*Math.sin(t*23+sd*7+s*1.7));ring.push(pushV(v(cx+Math.cos(a)*rad,y,cz+Math.sin(a)*rad),tc));}
if(prev)for(let s=0;s<sides;s++){const s2=(s+1)%sides;I.push(prev[s],prev[s2],ring[s],prev[s2],ring[s2],ring[s]);}prev=ring;}
const top=v(x+Math.cos(leanA)*leanAmt*h,y0+h,z+Math.sin(leanA)*leanAmt*h),g0=new T.Color('#2f6b33'),g1=new T.Color('#79a94b'),b0=new T.Color('#6a7a3a'),b1=new T.Color('#4a5424');
for(let j=0;j<13;j++){const yaw=j*2.4+sd,tier=j%3;
frond(top,yaw,tier===0?1.05:tier===1?.5:.05,tier===0?.18:tier===1?.5:.95,(2.3+.9*rand())*(h/4.6),.28,g0,g1);}
for(let j=0;j<5;j++)frond(top,j/5*6.28+sd+.4,-.45,.9,1.3,.2,b0,b1);
if(rand()<.8){const m=new T.Matrix4();for(let d=0;d<5;d++){const a=range(0,6.28),rr=range(.1,.28);m.makeTranslation(top.x+Math.cos(a)*rr,top.y-range(.15,.45),top.z+Math.sin(a)*rr);addGeo(new T.OctahedronGeometry(.11,0),m,'#7a5a26');}}}
let placedP=0,guardP=0;while(placedP<16&&guardP++<6000){const a=range(0,6.28),r=range(38,105),x=Math.sin(a)*r,z=Math.cos(a)*r,h=land(x,z);if(h<.5||h>3.4)continue;if(Math.abs(x+85)<34&&Math.abs(z-5)<30)continue;palm(x,z,range(4.2,6.4),range(0,6.28),range(.1,.24),range(0,6.28));placedP++;}
palm(9,106,6.8,.5,.3,2.2);palm(-3,109,5.6,2.4,.18,4.1);palm(30,99,5.2,1.1,.2,5.0);
const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(new Float32Array(P),3));pg.setAttribute('color',new T.BufferAttribute(new Float32Array(Cc),3));pg.setIndex(I);pg.computeVertexNormals();
const palmMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.9,side:T.DoubleSide});const palms=new T.Mesh(pg,palmMat);palms.castShadow=true;scene.add(palms);}
// Stone Town: two coral-rag rows flanking a shaded alley, lime-washed walls, small shuttered windows.
const townC=v(-85,0,5);townC.y=land(townC.x,townC.z);
{const wallMat=mat('#e8dcc2',.95),wallMat2=mat('#ddceae',.95),roofMat=mat('#b89a6a',.9),winMat=mat('#2e3a38',.6),beamMat=mat('#6a4a2a',.9);
const buildings=[];
function house(x,z,w,h,d,side){const g=new T.Group();const base=land(x,z);
const body=mesh(new T.BoxGeometry(d,h,w),rand()<.5?wallMat:wallMat2,v(0,h/2,0),v(1,1,1),g);body.receiveShadow=true;
const parapet=mesh(new T.BoxGeometry(d+.5,.5,w+.5),roofMat,v(0,h+.22,0),v(1,1,1),g);
const beamRow=mesh(new T.BoxGeometry(.18,.16,w*.92),beamMat,v(side*(d/2+.12),h-.4,0),v(1,1,1),g);
const nw=Math.max(1,Math.floor(w/3.4));
for(let i=0;i<nw;i++){const wz=-w/2+ (i+.5)*(w/nw);
const win=mesh(new T.BoxGeometry(.1,1.0,.7),winMat,v(side*(d/2+.03),h*.62,wz),v(1,1,1),g);win.castShadow=false;
const shut=mesh(new T.BoxGeometry(.08,1.0,.24),beamMat,v(side*(d/2+.06),h*.62,wz+.48),v(1,1,1),g);shut.castShadow=false;}
g.position.set(x,base,z);scene.add(g);buildings.push(g);return g;}
let z0=-24;
for(let i=0;i<5;i++){const w=range(7,11);house(-93,z0+w/2,w,range(5,7.5),range(5.5,7),1);z0+=w+range(.8,1.6);}
z0=-22;
for(let i=0;i<5;i++){const w=range(7,11);house(-77,z0+w/2,w,range(4.5,7),range(5,6.5),-1);z0+=w+range(.8,1.6);}
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
doorG.userData.kind='door';doorG.userData.leafL=leafL;doorG.userData.leafR=leafR;
const doorLight=new T.PointLight(0xffc06a,.7,11);doorLight.position.set(-1.2,2.4,0);doorG.add(doorLight);doorG.userData.light=doorLight;
window.__door=doorG;}
// The spice grove: broadleaf shade trees, clove buds, dappled light on the floor.
const groveC=v(40,0,-32);groveC.y=land(groveC.x,groveC.z);
{const trunkMat=mat('#5a4028',.95),leafMat=mat('#2e5c2f',.85),leafMat2=mat('#3d7038',.85),budMat=mat('#c84a3a',.6,false);
for(let i=0;i<14;i++){const a=i/14*6.28+range(-.3,.3),r=range(11,27),x=groveC.x+Math.sin(a)*r,z=groveC.z+Math.cos(a)*r;if(Math.abs(x-40)<9&&z>-22)continue;const h=land(x,z);
const th=range(2.6,4.2),tr=new T.Mesh(new T.CylinderGeometry(.16,.24,th,7),trunkMat);tr.position.set(x,h+th/2,z);tr.castShadow=true;scene.add(tr);
for(let b=0;b<4;b++){const blob=new T.Mesh(new T.IcosahedronGeometry(range(1.4,2.4),1),b%2?leafMat:leafMat2);blob.position.set(x+range(-1.2,1.2),h+th+range(-.4,1.2),z+range(-1.2,1.2));blob.scale.y=.72;blob.castShadow=true;scene.add(blob);}
if(i%3===0){for(let c3=0;c3<6;c3++){const bud=new T.Mesh(new T.SphereGeometry(.09,6,5),budMat);bud.position.set(x+range(-1.6,1.6),h+th+range(-.8,.6),z+range(-1.6,1.6));scene.add(bud);}}}
for(let i=0;i<9;i++){const spot=new T.Mesh(new T.CircleGeometry(range(.8,1.8),14),new T.MeshBasicMaterial({color:0xfff2c0,transparent:true,opacity:.16,depthWrite:false}));spot.rotation.x=-Math.PI/2;const a=range(0,6.28),r=range(4,24),x=groveC.x+Math.sin(a)*r,z=groveC.z+Math.cos(a)*r;spot.position.set(x,land(x,z)+.06,z);scene.add(spot);}}
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
mesh(new T.SphereGeometry(1,12,9),fur,v(0,.5,0),v(.55,.38,.3),colobus);
mesh(new T.SphereGeometry(1,10,7),furW,v(-.1,.62,0),v(.5,.3,.28),colobus);
mesh(new T.SphereGeometry(1,10,8),face,v(.48,.72,0),v(.2,.2,.18),colobus);
mesh(new T.SphereGeometry(1,8,6),furW,v(.5,.86,0),v(.16,.12,.15),colobus);
for(const z of[-.09,.09])mesh(new T.SphereGeometry(.028,5,4),mat('#e8e2d2'),v(.6,.74,z),v(1,1,1),colobus);
const tail=new T.Group();tail.position.set(-.5,.5,0);
let tp=null;for(let s2=0;s2<5;s2++){const seg=mesh(new T.CylinderGeometry(.035-.004*s2,.04-.004*s2,.4,5),s2>2?furW:fur,v(0,-.18,0),v(1,1,1),tail);if(tp){seg.position.set(0,-.36,0);tp.add(seg);}tp=seg;}
tail.rotation.z=.9;colobus.add(tail);colobus.userData.tail=tail;}
{const branchT=land(44,-38);const treeT=new T.Mesh(new T.CylinderGeometry(.2,.3,4.6,7),mat('#5a4028',.95));treeT.position.set(44,branchT+2.3,-38);treeT.castShadow=true;scene.add(treeT);
const branch=new T.Mesh(new T.CylinderGeometry(.08,.1,2.6,6),mat('#5a4028',.95));branch.rotation.z=Math.PI/2.4;branch.position.set(43,branchT+3.0,-38);scene.add(branch);
for(let b=0;b<4;b++){const blob=new T.Mesh(new T.IcosahedronGeometry(2.2,1),mat('#2e5c2f',.85));blob.position.set(44+range(-1.5,1.5),branchT+6.4+range(-.5,.8),-38+range(-1.5,1.5));blob.scale.y=.7;blob.castShadow=true;scene.add(blob);}
colobus.position.set(42.2,branchT+3.45,-38);colobus.userData.kind='colobus';scene.add(colobus);}
// Terns over the lagoon.
const terns=[];for(let i=0;i<6;i++){const d=new T.Group();const tm=mat('#f4f2ea');mesh(new T.SphereGeometry(1,8,5),tm,v(0,0,0),v(.32,.11,.1),d);for(const s of[-1,1]){const w=mesh(new T.ConeGeometry(.08,.55,4),tm,v(0,0,s*.3),v(1,1,1),d);w.rotation.x=s*1.4;d.userData['wing'+(s>0?'R':'L')]=w;}d.userData.kind='tern';scene.add(d);terns.push(d);}
// Butterflies in the grove.
const butterflies=[];for(let i=0;i<5;i++){const b=new T.Group();const bm=mat(i%2?'#e8a03a':'#d8e8f0');for(const s of[-1,1]){const w=mesh(new T.PlaneGeometry(.22,.3),new T.MeshStandardMaterial({color:bm.color,side:T.DoubleSide}),v(s*.12,0,0),v(1,1,1),b);b.userData['wing'+(s>0?'R':'L')]=w;}scene.add(b);butterflies.push(b);}
// A few soft trade-wind clouds.
const clouds=[];{const cm=new T.MeshStandardMaterial({color:0xffffff,roughness:1,transparent:true,opacity:.85,flatShading:true});
for(let i=0;i<6;i++){const c9=new T.Group();for(let b=0;b<4;b++){mesh(new T.IcosahedronGeometry(range(2,4.5),1),cm,v(b*3.2+range(-1,1),range(-.5,.5),range(-1.5,1.5)),v(1,.45,1),c9).castShadow=false;}
const a=range(0,6.28),r=range(150,320);c9.position.set(Math.sin(a)*r,range(55,90),Math.cos(a)*r);scene.add(c9);clouds.push(c9);}}
// Moon, stars, and the glowing night tide along the waterline.
const moon=new T.Mesh(new T.CircleGeometry(24,32),new T.MeshBasicMaterial({color:0xe8f0ff,fog:false,transparent:true,opacity:0}));skyRig.add(moon);
const starGeo=new T.BufferGeometry(),starPos=new Float32Array(900*3);for(let i=0;i<900;i++){const a=range(0,6.28),e=range(.08,1.5);starPos[i*3]=Math.cos(a)*Math.cos(e)*900;starPos[i*3+1]=Math.sin(e)*900;starPos[i*3+2]=Math.sin(a)*Math.cos(e)*900;}starGeo.setAttribute('position',new T.BufferAttribute(starPos,3));
const stars=new T.Points(starGeo,new T.PointsMaterial({color:0xdfe8ff,size:1.5,transparent:true,opacity:0,fog:false,depthWrite:false,sizeAttenuation:false}));skyRig.add(stars);
const plankton=(()=>{const xs=[];for(let a=0;a<6.28;a+=.035){for(let r=80;r<200;r+=2){const x=Math.sin(a)*r,z=Math.cos(a)*r;if(Math.abs(land(x,z))<.22)xs.push(x,.12,z);}if(xs.length>18000)break;}
const g9=new T.BufferGeometry();g9.setAttribute('position',new T.BufferAttribute(new Float32Array(xs),3));
const p9=new T.Points(g9,new T.PointsMaterial({color:0x5ff0e0,size:1.4,transparent:true,opacity:0,fog:false,depthWrite:false}));scene.add(p9);return p9;})();
// Sun disc, halo.
const sunMat=new T.MeshBasicMaterial({color:0xfff4dc,fog:false,transparent:true});const sun=new T.Mesh(new T.CircleGeometry(38,32),sunMat);skyRig.add(sun);
const halo=new T.Mesh(new T.CircleGeometry(105,32),new T.MeshBasicMaterial({color:0xffe8c0,fog:false,transparent:true,opacity:.2,depthWrite:false}));skyRig.add(halo);
const chapters=[
{title:'The lagoon.<br><i>Dhows at first light.</i>',line:'The tide is out. The shallows hold the sky.',action:'Sail with the dhow',pos:v(2,0,96),yaw:.22,pitch:.03,skyTop:'#7fb8d8',skyHor:'#ffd9b0',fog:.0016,ink:'#123b3f',veil:['#06333a26','#eef7f0c8','#f4faf2f2'],sun:v(.9,.16,.25),sunColor:'#ffd9a8',sunI:2.2,hemiI:1.4,glowAmt:1.0,kind:'dhow'},
{title:'Stone Town.<br><i>The carved door.</i>',line:'Coral walls keep the shade. Every door is a signature.',action:'Open the carved door',pos:v(-85.5,0,26),yaw:3.13,pitch:.03,skyTop:'#8fc8e0',skyHor:'#e8f0e0',fog:.0020,ink:'#123b3f',veil:['#06333a26','#eef7f0c8','#f4faf2f2'],sun:v(.3,.85,-.2),sunColor:'#fff2dd',sunI:2.6,hemiI:2.3,glowAmt:.4,kind:'door'},
{title:'The spice grove.<br><i>Cloves in the shade.</i>',line:"Cinnamon, clove, cardamom - the island's second harvest.",action:'Find the red colobus',pos:v(40,0,-4),yaw:Math.PI,pitch:-.03,skyTop:'#9cc8d8',skyHor:'#e8e8c0',fog:.0024,ink:'#123b3f',veil:['#0a332636','#eef5e8c8','#f2f8ecf2'],sun:v(-.4,.6,.4),sunColor:'#ffe8c0',sunI:2.0,hemiI:1.6,glowAmt:.5,kind:'colobus'},
{title:'The night tide.<br><i>The shore keeps glowing.</i>',line:'The moon pulls the sea away. Some nights, the foam answers back with light.',action:'Walk the glowing tide',pos:v(-8,0,94),yaw:.25,pitch:.1,skyTop:'#060d1e',skyHor:'#12263a',fog:.0010,ink:'#eef4ee',veil:['#040a1426','#060e1cd8','#040810f7'],sun:v(-.4,.7,-.5),sunColor:'#a8c0f0',sunI:1.0,hemiI:.9,glowAmt:.3,kind:'tide'}];
let chapter=0,yaw=.15,pitch=.03,targetYaw=.15,targetPitch=.03,night=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,elapsed=0,last=performance.now(),dragged=false,down=null,encountered=false,frames=0,doorOpen=0,doorTarget=0,tideBoost=0;
chapters.forEach(c=>{c.pos.y=land(c.pos.x,c.pos.z)+2.6;});camera.position.copy(chapters[0].pos);
function pauseUI(){const b=$('#pause');b.setAttribute('aria-pressed',String(paused));b.setAttribute('aria-label',paused?'Resume ambient motion':'Pause ambient motion');b.textContent=paused?'▷':'Ⅱ';}pauseUI();
function changeChapter(n){chapter=(n+4)%4;const c=chapters[chapter];targetYaw=c.yaw;targetPitch=c.pitch;encountered=false;doorTarget=0;$('#title').innerHTML=c.title;$('#line').textContent=c.line;$('#encounter').innerHTML=c.action+' <span aria-hidden="true">↗</span>';document.querySelectorAll('[data-chapter]').forEach(b=>b.setAttribute('aria-current',String(+b.dataset.chapter===chapter)));document.documentElement.style.setProperty('--ink',c.ink);$('.veil').style.background=`linear-gradient(${c.veil[0]},transparent 28%,transparent 43%,${c.veil[1]} 77%,${c.veil[2]})`;$('#orientation').classList.remove('show');retuneMusic();}
const facts={dhow:['The wind that made an island.','For at least two thousand years, lateen-sailed dhows have ridden the monsoon to Zanzibar - one wind to come, its turn to carry you home.'],door:['A signature in teak.',"Stone Town's carved doors announced who lived within - their trade, their fortune, their homeland. The coral-rag town itself is a UNESCO World Heritage site."],colobus:['Found nowhere else.',"The Zanzibar red colobus lives only on Unguja, the archipelago's main island. Most of the last population shelters in and around Jozani's old forest."],tide:['The sea answers with light.','Twice a day the tide steps back across the flats. On some dark nights, plankton in the wash glow blue wherever the water is stirred.']};
function encounter(kind){const f=facts[kind];if(!f)return;encountered=true;$('#title').textContent=f[0];$('#line').textContent=f[1];$('#encounter').innerHTML='Return to the island <span aria-hidden="true">↙</span>';
if(kind==='dhow'){const d=sailor.position.clone().sub(camera.position);targetYaw=Math.atan2(d.x,d.z);targetPitch=Math.atan2(d.y+2,Math.hypot(d.x,d.z));}
if(kind==='colobus'){const d=colobus.position.clone().sub(camera.position);targetYaw=Math.atan2(d.x,d.z);targetPitch=Math.atan2(d.y,Math.hypot(d.x,d.z));}
if(kind==='door'){doorTarget=1;const d=window.__door.position.clone().sub(camera.position);targetYaw=Math.atan2(d.x,d.z);targetPitch=Math.atan2(2,Math.hypot(d.x,d.z));}
if(kind==='tide'){tideBoost=1;}}
$('#encounter').onclick=()=>encountered?changeChapter(chapter):encounter(chapters[chapter].kind);document.querySelectorAll('[data-chapter]').forEach(b=>b.onclick=()=>changeChapter(+b.dataset.chapter));$('#pause').onclick=()=>{paused=!paused;pauseUI();};$('#about').onclick=()=>$('#notes').showModal();$('#close').onclick=()=>$('#notes').close();$('#notes').onclick=e=>{if(e.target===$('#notes'))$('#notes').close();};
const pickables=[...dhows,window.__door,colobus];
canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY};dragged=false;canvas.setPointerCapture(e.pointerId);$('#orientation').classList.remove('show');});canvas.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.lx,dy=e.clientY-down.ly;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)dragged=true;targetYaw-=dx*.006;targetPitch=Math.max(-.65,Math.min(.85,targetPitch+dy*.004));down.lx=e.clientX;down.ly=e.clientY;});const caster=new T.Raycaster();canvas.addEventListener('pointerup',e=>{if(down&&!dragged){caster.setFromCamera(new T.Vector2(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2),camera);const hit=caster.intersectObjects(pickables,true)[0];if(hit){let o=hit.object;while(o.parent&&!o.userData.kind)o=o.parent;encounter(o.userData.kind);}}down=null;});canvas.addEventListener('pointercancel',()=>down=null);
canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')targetYaw+=.16;if(e.key==='ArrowRight')targetYaw-=.16;if(e.key==='ArrowUp')targetPitch=Math.min(.85,targetPitch+.12);if(e.key==='ArrowDown')targetPitch=Math.max(-.65,targetPitch-.12);$('#orientation').classList.remove('show');}});
let sx=0,navDown=false,navSwiped=false;const nav=$('nav');nav.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();changeChapter(chapter+(e.key==='ArrowRight'?1:-1));nav.querySelector('[aria-current=true]').focus();}});nav.addEventListener('pointerdown',e=>{sx=e.clientX;navDown=true;navSwiped=false;});nav.addEventListener('pointerup',e=>{if(!navDown)return;navDown=false;const dx=e.clientX-sx;if(Math.abs(dx)>45){navSwiped=true;changeChapter(chapter+(dx<0?1:-1));}});nav.addEventListener('click',e=>{if(navSwiped){e.preventDefault();e.stopImmediatePropagation();navSwiped=false;}},true);
// The island's music: layered procedural WebAudio - an airy swirl, a breathing drone,
// sparse plucked phrases and slow pads, each chapter with its own palette.
// Verification scaffolding: window.__musicStats exposes signal level for the harness; it is not UI.
let audioCtx=null,musicOn=false,phraseTimer=null,MU=null;
const palettes=[
{root:146.83,scale:[0,2,4,7,9,12,14,16],bright:1.0},
{root:146.83,scale:[0,1,4,5,7,8,11,12],bright:.7},
{root:146.83,scale:[0,3,5,7,10,12,15,17],bright:.85},
{root:110.00,scale:[0,5,7,12,17,19,24],bright:.5}];
let musicRand=811;const mrand=()=>{musicRand=(musicRand*16807)%2147483647;return(musicRand-1)/2147483646};
function buildMusic(){const ctx=audioCtx=new AudioContext();
const master=ctx.createGain();master.gain.value=0;
const comp=ctx.createDynamicsCompressor();comp.threshold.value=-20;comp.ratio.value=6;
master.connect(comp);comp.connect(ctx.destination);
const analyser=ctx.createAnalyser();analyser.fftSize=2048;comp.connect(analyser);
const ir=ctx.createBuffer(2,Math.floor(ctx.sampleRate*2.6),ctx.sampleRate);
for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2.4);}
const verb=ctx.createConvolver();verb.buffer=ir;const wet=ctx.createGain();wet.gain.value=.55;verb.connect(wet).connect(master);
const bus=ctx.createGain();bus.connect(master);bus.connect(verb);
const nb=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);const nd=nb.getChannelData(0);let b0=0;for(let i=0;i<nd.length;i++){b0=(b0+Math.random()*.02-.01)/1.012;nd[i]=b0*3;}
const nsrc=ctx.createBufferSource();nsrc.buffer=nb;nsrc.loop=true;
const bp=ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=620;bp.Q.value=1.1;
const bpLFO=ctx.createOscillator();bpLFO.frequency.value=.06;const bpLFOg=ctx.createGain();bpLFOg.gain.value=340;bpLFO.connect(bpLFOg).connect(bp.frequency);bpLFO.start();
const swirl=ctx.createGain();swirl.gain.value=.04;
const pan=ctx.createStereoPanner();const panLFO=ctx.createOscillator();panLFO.frequency.value=.045;const panLFOg=ctx.createGain();panLFOg.gain.value=.8;panLFO.connect(panLFOg).connect(pan.pan);panLFO.start();
nsrc.connect(bp).connect(swirl).connect(pan).connect(bus);nsrc.start();
const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;
const droneG=ctx.createGain();droneG.gain.value=.05;lp.connect(droneG).connect(bus);
const o1=ctx.createOscillator();o1.type='sine';o1.connect(lp);
const o2=ctx.createOscillator();o2.type='triangle';o2.detune.value=5;const g2=ctx.createGain();g2.gain.value=.5;o2.connect(g2).connect(lp);
const o3=ctx.createOscillator();o3.type='sine';const g3=ctx.createGain();g3.gain.value=.3;o3.connect(g3).connect(lp);
const drLFO=ctx.createOscillator();drLFO.frequency.value=.05;const drLFOg=ctx.createGain();drLFOg.gain.value=.016;drLFO.connect(drLFOg).connect(droneG.gain);drLFO.start();
const shim=ctx.createOscillator();shim.type='sine';const shimG=ctx.createGain();shimG.gain.value=.012;
const trem=ctx.createOscillator();trem.frequency.value=.13;const tremG=ctx.createGain();tremG.gain.value=.008;trem.connect(tremG).connect(shimG.gain);trem.start();
shim.connect(shimG).connect(bus);
o1.start();o2.start();o3.start();shim.start();
MU={ctx,master,bus,analyser,o1,o2,o3,shim};
window.__musicStats=()=>{const buf=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(buf);let peak=0,sum=0;for(let i=0;i<buf.length;i++){const a=Math.abs(buf[i]);if(a>peak)peak=a;sum+=buf[i]*buf[i];}return{rms:Math.sqrt(sum/buf.length),peak,on:musicOn};};
retuneMusic();}
function retuneMusic(){if(!MU)return;const p=palettes[chapter],t=MU.ctx.currentTime;
MU.o1.frequency.setTargetAtTime(p.root,t,.6);MU.o2.frequency.setTargetAtTime(p.root*1.5,t,.6);MU.o3.frequency.setTargetAtTime(p.root*2,t,.6);MU.shim.frequency.setTargetAtTime(p.root*4,t,.6);}
function pluck(f,t,bright){const{ctx,bus}=MU;
const o=ctx.createOscillator();o.type='triangle';o.frequency.value=f;
const o2=ctx.createOscillator();o2.type='sine';o2.frequency.value=f*2.005;
const g=ctx.createGain();g.gain.value=0;const g2b=ctx.createGain();g2b.gain.value=.35;
const p=ctx.createStereoPanner();p.pan.value=mrand()*1.2-.6;
o.connect(g);o2.connect(g2b).connect(g);g.connect(p).connect(bus);
const peakV=.05*bright+.018;
g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peakV,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+2.4);
o.start(t);o2.start(t);o.stop(t+2.6);o2.stop(t+2.6);}
function pad(p,t){const{ctx,bus}=MU;const g=ctx.createGain();g.gain.value=0;g.connect(bus);
const iv=[0,p.scale[2]||4,7];
for(const s of iv){const o=ctx.createOscillator();o.type='sine';o.frequency.value=p.root*Math.pow(2,s/12);o.detune.value=mrand()*8-4;o.connect(g);o.start(t);o.stop(t+9.2);}
g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.026,t+2.8);g.gain.setValueAtTime(.026,t+6);g.gain.linearRampToValueAtTime(0,t+9.2);}
function schedulePhrase(){phraseTimer=null;if(!musicOn||!MU)return;const p=palettes[chapter];const t0=MU.ctx.currentTime+.15;
const n=3+Math.floor(mrand()*4);let deg=Math.floor(mrand()*p.scale.length);let t=t0;
for(let i=0;i<n;i++){deg+=Math.floor(mrand()*3)-1;deg=Math.max(0,Math.min(p.scale.length-1,deg));
pluck(p.root*2*Math.pow(2,p.scale[deg]/12),t,p.bright);t+=.34+mrand()*.5;}
pad(p,t0);phraseTimer=setTimeout(schedulePhrase,(7+mrand()*7)*1000);}
$('#sound').onclick=()=>{if(!audioCtx)buildMusic();const on=$('#sound').getAttribute('aria-pressed')!=='true';musicOn=on;audioCtx.resume();MU.master.gain.setTargetAtTime(on?.9:0,audioCtx.currentTime,.8);
if(on){if(!phraseTimer)schedulePhrase();}else if(phraseTimer){clearTimeout(phraseTimer);phraseTimer=null;}
$('#sound').setAttribute('aria-pressed',String(on));$('#sound').setAttribute('aria-label',on?'Turn island music off':'Turn island music on');$('#sound').textContent=on?'♫':'♪';};
document.addEventListener('visibilitychange',()=>{last=performance.now();if(audioCtx){if(document.hidden)audioCtx.suspend();else if($('#sound').getAttribute('aria-pressed')==='true')audioCtx.resume();}});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
const look=v(0,0,0),sunPos=v(0,0,0),skyTopC=new T.Color(),skyHorC=new T.Color(),sunColC=new T.Color(),nightSand=new T.Color('#7a8aa8'),nightPalm=new T.Color('#22404a'),white=new T.Color('#ffffff');
function animate(now){requestAnimationFrame(animate);if(document.hidden)return;const dt=Math.min((now-last)/1000,.15);last=now;if(!paused)elapsed+=dt;const c=chapters[chapter];
camera.position.lerp(c.pos,1-Math.exp(-dt*4));
if(matchMedia('(prefers-reduced-motion: reduce)').matches){yaw=targetYaw;pitch=targetPitch;}else{yaw+=(targetYaw-yaw)*(1-Math.exp(-dt*9));pitch+=(targetPitch-pitch)*(1-Math.exp(-dt*9));}
look.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).add(camera.position);camera.lookAt(look);
const k=1-Math.exp(-dt*3);night+=((chapter===3?1:0)-night)*k;if(Math.abs((chapter===3?1:0)-night)<.001)night=chapter===3?1:0;
skyTopC.set(c.skyTop);skyHorC.set(c.skyHor);sunColC.set(c.sunColor);
skyU.top.value.lerp(skyTopC,k);skyU.hor.value.lerp(skyHorC,k);skyU.sunDir.value.lerp(c.sun,k).normalize();skyU.glowAmt.value+=(c.glowAmt-skyU.glowAmt.value)*k;
scene.background.copy(skyU.hor.value);scene.fog.color.copy(skyU.hor.value);scene.fog.density+=(c.fog-scene.fog.density)*k;
sunlight.color.lerp(sunColC,k);sunlight.intensity+=(c.sunI-sunlight.intensity)*k;hemi.intensity+=(c.hemiI-hemi.intensity)*k;
sunlight.position.copy(camera.position).addScaledVector(c.sun,180);sunlight.target.position.copy(camera.position);sunlight.target.updateMatrixWorld();
skyRig.position.copy(camera.position);
sunPos.copy(c.sun).normalize().multiplyScalar(900);sun.position.copy(sunPos);sun.lookAt(camera.position);sun.material.opacity=1-night;halo.position.copy(sunPos);halo.lookAt(camera.position);halo.material.opacity=.2*(1-night);
moon.position.copy(v(.25,.5,.78).normalize().multiplyScalar(900));moon.lookAt(camera.position);moon.material.opacity=night*.95;stars.material.opacity=night*.95;
sandMat.color.copy(white).lerp(nightSand,night*.55);palmMat.color.copy(white).lerp(nightPalm,night*.8);
seaU.time.value=elapsed;seaU.night.value=night;seaU.sunDir.value.copy(c.sun).normalize();
tideBoost+=(0-tideBoost)*(1-Math.exp(-dt*.25));
plankton.material.opacity=night*(.6+.25*Math.sin(elapsed*1.3)+.4*tideBoost);
doorOpen+=(doorTarget-doorOpen)*(1-Math.exp(-dt*2.5));
window.__door.userData.leafL.rotation.y=doorOpen*1.85;window.__door.userData.leafR.rotation.y=-doorOpen*1.85;window.__door.userData.light.intensity=.7+doorOpen*2.2;
for(let i=0;i<2;i++){const d=dhows[i];d.position.y=.1+Math.sin(elapsed*.7+i*2.1)*.08;d.rotation.z=Math.sin(elapsed*.5+i)*.03;d.rotation.x=Math.sin(elapsed*.62+i*1.3)*.025;}
{const a=elapsed*.045;sailor.position.set(sailC.x+Math.sin(a)*sailR,.12+Math.sin(elapsed*.8)*.09,sailC.z+Math.cos(a)*sailR*.8);sailor.rotation.y=a+Math.PI/2;sailor.rotation.z=Math.sin(elapsed*.6)*.05;}
for(let i=0;i<terns.length;i++){const a=elapsed*.22+i*1.05,d=terns[i];d.position.set(4+Math.sin(a)*38,10+Math.sin(elapsed*.8+i)*2.2,140+Math.cos(a)*30);d.rotation.y=a+Math.PI/2;d.userData.wingL.rotation.z=Math.sin(elapsed*7+i)*.7;d.userData.wingR.rotation.z=-Math.sin(elapsed*7+i)*.7;}
for(let i=0;i<butterflies.length;i++){const b=butterflies[i],a=elapsed*.5+i*2.4;b.position.set(groveC.x+Math.sin(a)*14+Math.sin(elapsed*1.3+i)*2,groveC.y+3+Math.sin(elapsed*1.7+i)*1.2,groveC.z+Math.cos(a)*12);b.userData.wingL.rotation.y=Math.sin(elapsed*14+i)*.9;b.userData.wingR.rotation.y=-Math.sin(elapsed*14+i)*.9;}
colobus.userData.tail.rotation.z=.9+Math.sin(elapsed*1.4)*.25;colobus.position.y=land(44,-38)+3.45+(encountered&&chapter===2?Math.abs(Math.sin(elapsed*2.2))*.18:0);
for(let i=0;i<clouds.length;i++){const c9=clouds[i];c9.children.forEach(b=>b.material.opacity=.85*(1-night*.85));if(c9.userData.bx===undefined)c9.userData.bx=c9.position.x;let cx=(c9.userData.bx+elapsed*1.1)%720;if(cx>360)cx-=720;c9.position.x=cx;}
$('#compass').textContent=['N','E','S','W'][Math.floor((((yaw*180/Math.PI)%360+360+45)%360)/90)]+' · '+String(Math.round((yaw*180/Math.PI%360+360)%360)).padStart(3,'0')+'°';
renderer.render(scene,camera);if(++frames===2){$('#status').remove();$('#orientation').classList.add('show');}if(frames===900)$('#orientation').classList.remove('show');}
changeChapter(0);requestAnimationFrame(animate);

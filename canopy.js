// Opposite folded leaves on branching sprays, with genuine sky gaps.
// A stylized mixed spice grove, not a surveyed plantation or botanical scale model.
export function canopyLayer(T,scene){
 const g=new T.BufferGeometry(),p=[],idx=[],c=[];
 for(let row=0;row<5;row++){
  const t=row/4,w=Math.pow(Math.sin(t*Math.PI),.72)*.19;
  for(const side of[-1,0,1]){
   p.push(side*w,t*.78,Math.sin(t*Math.PI)*(side===0?.045:-.018));
   const color=new T.Color('#365f2d').lerp(new T.Color('#81a052'),t*.28+(side===0?.11:0));c.push(color.r,color.g,color.b);
  }
  if(row){const a=(row-1)*3,b=row*3;idx.push(a,b,a+1,b,b+1,a+1,a+1,b+1,a+2,b+1,b+2,a+2);}
 }
 g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setIndex(idx);g.computeVertexNormals();
 const leaves=[],branches=[],tones=[],d=new T.Object3D();let seed=7421;
 const rand=()=>((seed=Math.imul(1664525,seed)+1013904223>>>0)/4294967296);
 const v=(x,y,z)=>new T.Vector3(x,y,z);
 function branch(a,b,w){const delta=b.clone().sub(a);d.position.copy(a).add(b).multiplyScalar(.5);d.quaternion.setFromUnitVectors(v(0,1,0),delta.clone().normalize());d.scale.set(w,delta.length(),w);d.updateMatrix();branches.push(d.matrix.clone());}
 function crown(x,y,z,r,count=260){
  const base=v(x,y-r*.8,z),arms=7;
  for(let k=0;k<arms;k++){
   const a=k*2.399+rand()*.45,rad=r*(.45+rand()*.5),end=v(x+Math.cos(a)*rad,y+(rand()-.3)*r*.8,z+Math.sin(a)*rad);
   const fork=base.clone().lerp(end,.55);fork.y+=r*.15;branch(base,fork,.025+r*.006);branch(fork,end,.014+r*.004);
   const sprays=Math.max(2,Math.round(count/arms/14));
   for(let j=0;j<sprays;j++){
    const t=.25+j/sprays*.75,start=fork.clone().lerp(end,t),turn=a+(j%2?1:-1)*(1+rand()*.6);
    const tip=start.clone().add(v(Math.cos(turn)*r*(.25+rand()*.25),(rand()-.2)*r*.4,Math.sin(turn)*r*(.25+rand()*.25)));
    branch(start,tip,.009+r*.002);
    for(let n=1;n<=5;n++)for(const side of[-1,1]){
     const at=start.clone().lerp(tip,n/5),angle=turn+side*(.8+rand()*.4);
     d.position.copy(at);d.quaternion.setFromUnitVectors(v(0,1,0),v(Math.cos(angle),rand()*.55-.20,Math.sin(angle)).normalize());d.rotateY((rand()-.5)*.7);
     const s=Math.min(1.4,.72+r*.17)*( .75+rand()*.5);d.scale.set(s,s,s);d.updateMatrix();leaves.push(d.matrix.clone());
     tones.push(new T.Color().setHSL(.24+rand()*.06,.29+rand()*.16,.64+rand()*.17));
    }
   }
  }
 }
 function finish(){
  const l=new T.InstancedMesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.56,side:T.DoubleSide,emissive:'#233b1e',emissiveIntensity:.25}),leaves.length);
  leaves.forEach((m,i)=>{l.setMatrixAt(i,m);l.setColorAt(i,tones[i]);});l.castShadow=false;l.computeBoundingSphere();scene.add(l);
  const b=new T.InstancedMesh(new T.CylinderGeometry(.7,1,1,5),new T.MeshStandardMaterial({color:'#69503a',roughness:.98}),branches.length);
  branches.forEach((m,i)=>b.setMatrixAt(i,m));b.castShadow=true;b.computeBoundingSphere();scene.add(b);
  return{leaves:leaves.length,branches:branches.length};
 }
 return{crown,finish};
}

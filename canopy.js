// Folded broadleaf crowns. One leaf draw, one crown draw and one branch draw for the whole grove.
export function canopyLayer(T, scene) {
  const leaf = new T.BufferGeometry();
  const positions=[],indices=[],colors=[];
  for(let row=0;row<5;row++) {
    const t=row/4,w=Math.pow(Math.sin(t*Math.PI),.72)*.21;
    for(const side of [-1,0,1]) {
      positions.push(side*w,t*.78,side===0?Math.sin(t*Math.PI)*.025:0);
      const c=new T.Color('#2d542e').lerp(new T.Color('#5b7743'),t*.45+(side===0?.08:0));colors.push(c.r,c.g,c.b);
    }
    if(row) {const a=(row-1)*3,b=row*3;indices.push(a,b,a+1,b,b+1,a+1,a+1,b+1,a+2,b+1,b+2,a+2);}
  }
  leaf.setAttribute('position',new T.Float32BufferAttribute(positions,3));leaf.setIndex(indices);leaf.computeVertexNormals();
  leaf.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  const leaves=[], branches=[], cores=[], d=new T.Object3D();let state=7421;
  const rand=()=>((state=Math.imul(1664525,state)+1013904223>>>0)/4294967296);
  function branch(a,b,width) {const delta=b.clone().sub(a);d.position.copy(a).add(b).multiplyScalar(.5);d.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());d.scale.set(width,delta.length(),width);d.updateMatrix();branches.push(d.matrix.clone());}
  function crown(x,y,z,radius,count=260) {
    const center=new T.Vector3(x,y,z);
    for(let k=0;k<6;k++) {
      const a=k*2.399,spread=radius*.48;
      d.position.set(x+Math.cos(a)*spread,y+(rand()-.5)*radius*.3,z+Math.sin(a)*spread);
      d.rotation.set(rand()*.2,rand()*6.28,rand()*.2);
      d.scale.set(radius*(.45+rand()*.15),radius*(.28+rand()*.12),radius*(.45+rand()*.15));d.updateMatrix();cores.push(d.matrix.clone());
    }
    for(let i=0;i<7;i++){const a=i*2.399,r=radius*(.35+rand()*.45),end=new T.Vector3(x+Math.cos(a)*r,y+(rand()-.3)*radius*.55,z+Math.sin(a)*r);branch(new T.Vector3(x,y-radius*.7,z),end,.025+radius*.01);}
    for(let i=0;i<count;i++) {
      const a=rand()*Math.PI*2,h=rand()*2-1,r=Math.sqrt(1-h*h)*(.92+rand()*.16)*radius;
      d.position.set(center.x+Math.cos(a)*r,center.y+h*radius*.57,center.z+Math.sin(a)*r);
      d.rotation.set(Math.PI/2+(rand()-.5)*1.3,a+rand(),rand()*1.2-.6);
      const s=.85+rand()*.55;d.scale.set(s,s,.9*s);d.updateMatrix();leaves.push(d.matrix.clone());
    }
  }
  function finish() {
    const coreGeo=new T.SphereGeometry(1,12,8),pa=coreGeo.attributes.position;
    for(let i=0;i<pa.count;i++){const x=pa.getX(i),y=pa.getY(i),z=pa.getZ(i),k=1+.10*Math.sin(x*8+z*5)*Math.cos(y*9+z*4);pa.setXYZ(i,x*k,y*k,z*k);}coreGeo.computeVertexNormals();
    const core=new T.InstancedMesh(coreGeo,new T.MeshStandardMaterial({color:'#3b6130',roughness:.95}),cores.length);
    cores.forEach((m,i)=>core.setMatrixAt(i,m));core.castShadow=true;core.computeBoundingSphere();scene.add(core);
    const l=new T.InstancedMesh(leaf,new T.MeshStandardMaterial({vertexColors:true,roughness:.85,side:T.DoubleSide,emissive:'#182e18',emissiveIntensity:.18}),leaves.length);
    leaves.forEach((m,i)=>l.setMatrixAt(i,m));l.castShadow=true;l.computeBoundingSphere();scene.add(l);
    const b=new T.InstancedMesh(new T.CylinderGeometry(.8,1,1,5),new T.MeshStandardMaterial({color:'#5a4028',roughness:.98}),branches.length);
    branches.forEach((m,i)=>b.setMatrixAt(i,m));b.castShadow=true;b.computeBoundingSphere();scene.add(b);
    return {leaves:leaves.length,branches:branches.length};
  }
  return {crown,finish};
}

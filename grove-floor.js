// Dry leaf litter lies on the existing height field. No image textures or animation.
export function groveFloor(T,scene,land){
 let seed=9257;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute([0,0,-.5,-.21,.035,0,0,.06,.5,.21,.035,0],3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
 const mesh=new T.InstancedMesh(geometry,new T.MeshStandardMaterial({color:'#887144',roughness:1,side:T.DoubleSide}),1800),d=new T.Object3D();
 for(let i=0;i<1800;i++){
  const a=random()*Math.PI*2,r=Math.sqrt(random())*36,x=40+Math.sin(a)*r,z=-18+Math.cos(a)*r,size=.14+random()*.22;
  d.position.set(x,land(x,z)+.12,z);d.rotation.set((land(x,z+.1)-land(x,z-.1))*5,random()*6.28,-(land(x+.1,z)-land(x-.1,z))*5);d.scale.set(size,size,size*1.6);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);
  mesh.setColorAt(i,new T.Color().setHSL(.075+random()*.045,.18+random()*.18,.32+random()*.2));
 }
 mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);return mesh;
}

import{test}from'node:test';import assert from'node:assert/strict';import*as T from'../three.module.min.js';import{canopyLayer}from'../canopy.js';
test('paired leaf sprays are finite, deterministic and do not add opaque sphere cores',()=>{
 const make=(count=300)=>{const scene=new T.Scene(),layer=canopyLayer(T,scene);layer.crown(10,8,-4,3,count);return{stats:layer.finish(),scene}};
 const a=make(),b=make();assert.equal(a.scene.children.length,2);assert.deepEqual(a.stats,b.stats);assert.equal(a.stats.leaves,210);assert.equal(a.stats.branches,35);assert(make(70).stats.leaves<a.stats.leaves);assert(make(420).stats.leaves>a.stats.leaves);assert.equal(a.scene.children[0].geometry.index.count/3,16);assert.equal(a.scene.children[0].castShadow,false);
 for(let i=0;i<2;i++){const x=a.scene.children[i],y=b.scene.children[i];assert.deepEqual(x.instanceMatrix.array,y.instanceMatrix.array);assert([...x.instanceMatrix.array].every(Number.isFinite));assert(!x.geometry.type.includes('Sphere'));assert(Number.isFinite(x.boundingSphere.radius));}
});

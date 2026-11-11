import{test}from'node:test';import assert from'node:assert/strict';import*as T from'../three.module.min.js';import{canopyLayer}from'../canopy.js';
test('paired leaf sprays are finite, deterministic and do not add opaque sphere cores',()=>{
 const make=()=>{const scene=new T.Scene(),layer=canopyLayer(T,scene);layer.crown(10,8,-4,3,300);return{stats:layer.finish(),scene}};
 const a=make(),b=make();assert.equal(a.scene.children.length,2);assert.deepEqual(a.stats,b.stats);assert(a.stats.leaves>200&&a.stats.leaves<800);assert(a.stats.branches<100);
 for(let i=0;i<2;i++){const x=a.scene.children[i],y=b.scene.children[i];assert.deepEqual(x.instanceMatrix.array,y.instanceMatrix.array);assert([...x.instanceMatrix.array].every(Number.isFinite));assert(!x.geometry.type.includes('Sphere'));assert(Number.isFinite(x.boundingSphere.radius));}
});

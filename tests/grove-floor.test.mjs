import{test}from'node:test';import assert from'node:assert/strict';import*as T from'../three.module.min.js';import{groveFloor}from'../grove-floor.js';
test('leaf litter is deterministic, bounded and attached to the height field',()=>{
 const land=(x,z)=>x*.03+z*.02,scene=new T.Scene(),a=groveFloor(T,scene,land),b=groveFloor(T,new T.Scene(),land),d=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();
 assert.equal(scene.children.length,1);assert.equal(a.count,1800);assert.equal(a.geometry.index.count,6);assert.equal(a.castShadow,false);assert.deepEqual(a.instanceMatrix.array,b.instanceMatrix.array);
 for(let i=0;i<a.count;i++){a.getMatrixAt(i,d);d.decompose(p,q,s);assert(Math.hypot(p.x-40,p.z+18)<=36.001);assert(Math.abs(p.y-land(p.x,p.z)-.12)<.0001);assert(s.x>.1&&s.x<.4);assert([...d.elements].every(Number.isFinite));}
});

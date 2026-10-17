import assert from 'node:assert/strict';
import {missions,createMission,score,docs} from './public/architect/missions.mjs';
import {run,verify} from './public/architect/engine.mjs';
import {clone,validateGraph} from './public/architect/catalog.mjs';
import {questions} from './public/architect/questions.mjs';
let count=0;const check=(label,fn)=>{fn();count++;console.log('PASS',label);};
for(const m of missions){
 check(m.id+' solution satisfies all business outcomes',()=>{const g=m.solution();if(m.id==='b3')g.nodes.find(n=>n.id==='s3').config.documents=docs(30);validateGraph(g);let runtime={};if(m.world==='bedrock'&&m.id!=='b1')runtime=run(m.world,g,{action:'ingest'},{}).runtime;const r=verify(m,g,runtime);assert.equal(r.status,'success',JSON.stringify(r.output));const other=clone(g);other.nodes.reverse();other.edges.reverse();other.nodes.forEach((n,i)=>{n.x=i*37;n.y=i*73;});assert.equal(verify(m,other,runtime).status,'success','Different layout/order must also work');});
 check(m.id+' broken initial architecture is not awarded completion',()=>{const s=createMission(m);assert.notEqual(verify(m,s.graph,s.runtime).status,'success');});
}
check('Reproducible seed faults in both incident missions',()=>{for(const id of ['b7','n9']){const m=missions.find(m=>m.id===id);for(let seed=0;seed<4;seed++){const s=createMission(m,seed);assert.deepEqual(s,createMission(m,seed));assert.notEqual(verify(m,s.graph,s.runtime).status,'success');}}});
check('Score bonuses are based on attempts and hints only after completion',()=>{assert.equal(score(1,0,true),150);assert.equal(score(2,0,true),130);assert.equal(score(2,1,true),100);assert.equal(score(1,0,false),0);});
check('Model dimensions and connections are validated independently of visual arrangement',()=>{const m=missions.find(m=>m.id==='b2'),g=m.solution();g.nodes.find(n=>n.type==='vector').config.dimensions=512;assert.equal(run('bedrock',g,{action:'ingest'},{}).status,'failure');});
check('Multiple valid architectures: independent execution roles instead of a shared role',()=>{const m=missions.find(m=>m.id==='b2'),g=m.solution(),role=g.nodes.find(n=>n.id==='role');g.edges=g.edges.filter(e=>e.source!=='role');g.nodes=g.nodes.filter(n=>n.id!=='role');for(const id of ['kb','model','embed']){g.nodes.push({...clone(role),id:'role-'+id});g.edges.push({id:'role-'+id,source:'role-'+id,target:id});}const r=run('bedrock',g,{action:'ingest'},{});assert.equal(verify(m,g,r.runtime).status,'success');});
check('48 distinct scenario questions have valid keys and four Vietnamese explanations',()=>{const texts=new Set();for(const m of missions){assert.equal(questions[m.id].length,3);for(const q of questions[m.id]){assert.equal(q.a.length,4);assert.equal(q.explain.length,4);assert.ok(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<4);assert.ok(q.explain.every(x=>typeof x==='string'&&x.length>20));assert.ok(!texts.has(q.q));texts.add(q.q);}}assert.equal(texts.size,48);});
console.log(count+' mission integration checks passed');

import {runBedrock} from './bedrock.mjs';
import {runNetwork} from './network.mjs';
import {validateGraph,clone} from './catalog.mjs';
export function run(world,g,request,runtime){
 try{validateGraph(g);return (world==='bedrock'?runBedrock:runNetwork)(g,request,clone(runtime||{}));}
 catch(e){return {status:'failure',output:{message:'Cấu hình không hợp lệ: '+e.message},error:{code:'SIMULATION_CONFIG_INVALID',message:e.message},trace:[{node:null,stage:'Validation',status:'error',message:e.message}],runtime:clone(runtime||{})};}
}
export function verify(m,g,runtime){
 let state=clone(runtime),trace=[],results=[];
 for(const [i,c] of m.checks.entries()){
  const r=run(m.world,g,c.request,state);state=r.runtime;
  const text=typeof r.output==='string'?r.output:JSON.stringify(r.output);
  let passed=c.kind==='denied'?r.status==='failure'&&(!c.code||r.error?.code===c.code):r.status==='success';
  if(c.kind==='unknown')passed=passed&&r.output.citations?.length===0&&/chưa|don't|không/i.test(r.output.answer);
  if(c.kind==='answer')passed=passed&&text.includes(c.contains)&&(!c.citation||r.output.citations?.length>0);
  if(c.kind==='cache')passed=passed&&r.output.cache==='HIT';
  trace.push({node:null,stage:'Business test '+(i+1),status:passed?'success':'error',message:passed?'Yêu cầu nghiệp vụ đạt.':'Chưa đạt yêu cầu nghiệp vụ.',data:{request:c.request,expected:c,actual:r.output}});
  trace.push(...r.trace.map(e=>c.kind==='denied'&&passed&&e.status==='error'?{...e,status:'success',message:'Chặn đúng yêu cầu: '+e.message}:e));results.push({passed,output:r.output,error:r.error});
 }
 const passed=results.filter(r=>r.passed).length;
 return {status:passed===results.length?'success':passed?'partial':'failure',runtime:state,trace,output:{passed,total:results.length,tests:results},verified:true};
}

const test = require('node:test');
const assert = require('node:assert/strict');
const {generateMealPlan, hydratePlan} = require('../src/services/geminiMealPlanService');
const dates = ['2026-11-12'];
const recipes = [{recipe_id:1,name:'Canh rau',prep_time:5,cook_time:10,calories:80}];
const output = {days:[{date:dates[0],breakfast:['1'],lunch:[],dinner:[]}]};
test('hydrates only trusted catalog fields', () => {
 assert.equal(hydratePlan(output,dates,recipes)[dates[0]].breakfast[0].minutes,15);
});
test('rejects invented IDs, duplicate dishes and invalid dates', () => {
 for (const day of [{...output.days[0],dinner:['1']},{...output.days[0],breakfast:['99']},{...output.days[0],date:'2026-11-13'}]) {
  assert.throws(()=>hydratePlan({days:[day]},dates,recipes));
 }
 assert.throws(()=>hydratePlan({days:[]},dates,recipes));
});
test('calls Gemini with JSON schema and handles incomplete output and quota errors', async () => {
 const options={dates,recipes,apiKey:'test',model:'test',people:4,preferences:{},pantry:[]};
 const fetchImpl=async(url,request)=>{
  assert.match(url,/test:generateContent/);
  assert.equal(request.headers['x-goog-api-key'],'test');
  assert.equal(JSON.parse(request.body).generationConfig.responseMimeType,'application/json');
  assert.equal(JSON.parse(JSON.parse(request.body).contents[0].parts[0].text).people,4);
  return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]})};
 };
 assert.equal((await generateMealPlan({...options,fetchImpl}))[dates[0]].breakfast[0].servings,4);
 for (const people of [0,21,1.5,'4']) {
  await assert.rejects(generateMealPlan({...options,people,fetchImpl:()=>assert.fail('must not call Gemini')}),e=>e.status===400);
 }
 await assert.rejects(generateMealPlan({...options,fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{finishReason:'MAX_TOKENS'}]})})}));
 await assert.rejects(generateMealPlan({...options,apiKey:''}),/GEMINI_API_KEY/);
 await assert.rejects(generateMealPlan({...options,fetchImpl:async()=>({ok:false,status:429,json:async()=>({})})}),e=>e.status===429);
});

test('retries a transient Gemini failure and returns the generated plan', async () => {
 let calls = 0;
 const plan = await generateMealPlan({dates,recipes,apiKey:'secret',model:'test',fallbackModel:'backup',fetchImpl:async(url)=>{
  calls++;
  assert.ok(url.includes(calls === 1 ? '/test:' : '/backup:'));
  if(calls === 1) return {ok:false,status:503,json:async()=>({error:{status:'UNAVAILABLE'}})};
  return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]})};
 }});
 assert.equal(calls,2);
 assert.ok(plan[dates[0]]);
});
test('reports HTTP status and model errors without leaking the key or retrying client errors', async () => {
 let calls = 0;
 await assert.rejects(generateMealPlan({dates,recipes,apiKey:'secret',model:'missing-model',fetchImpl:async()=>{
  calls++;
  return {ok:false,status:404,json:async()=>({error:{status:'NOT_FOUND',message:'secret'}})};
 }}),error=>error.message.includes('HTTP 404') && error.message.includes('missing-model') && !error.message.includes('secret'));
 assert.equal(calls,1);
});

test('bounds retries when both models remain overloaded', async () => {
 const models=[];
 await assert.rejects(generateMealPlan({dates,recipes,apiKey:'test',model:'primary',fallbackModel:'backup',fetchImpl:async(url)=>{
  models.push(url.split('/models/')[1].split(':')[0]);
  return {ok:false,status:503,json:async()=>({error:{status:'UNAVAILABLE'}})};
 }}),error=>error.status===503);
 assert.deepEqual(models,['primary','backup','backup']);
});

test('falls back after a network failure', async () => {
 const models=[];
 await generateMealPlan({dates,recipes,apiKey:'test',model:'primary',fallbackModel:'backup',fetchImpl:async(url)=>{
  models.push(url.split('/models/')[1].split(':')[0]);
  if(models.length===1) throw new Error('network');
  return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(output)}]}}]})};
 }});
 assert.deepEqual(models,['primary','backup']);
});

test('preserves service overload error when the final request times out', async () => {
 let calls=0;
 await assert.rejects(generateMealPlan({dates,recipes,apiKey:'test',model:'primary',fallbackModel:'backup',fetchImpl:async()=>{
  calls++;
  if(calls===1) return {ok:false,status:503,json:async()=>({error:{status:'UNAVAILABLE'}})};
  throw Object.assign(new Error('timeout'),{name:'TimeoutError'});
 }}),error=>error.status===503 && error.message.includes('UNAVAILABLE'));
 assert.equal(calls,3);
});

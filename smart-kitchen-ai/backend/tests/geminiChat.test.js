const test=require('node:test'),assert=require('node:assert/strict');
const {requestGeminiReply}=require('../src/services/geminiChatService');
const buildPrompt=require('../src/services/chatPrompt');
const options={apiKey:'test-key',primaryModel:'primary',history:[],systemInstruction:'Tiếng Việt',message:'Nấu gì?'};
test('chat prompt loads and includes kitchen context',()=>{assert.match(buildPrompt('{"pantry":[]}'),/"pantry":\[\]/);});
test('chat sends server-side key, system instruction and conversation to Gemini',async()=>{
 const reply=await requestGeminiReply({...options,fetchImpl:async(url,request)=>{assert.match(url,/primary:generateContent/);assert.equal(request.headers['x-goog-api-key'],'test-key');const body=JSON.parse(request.body);assert.equal(body.contents[0].parts[0].text,'Nấu gì?');assert.equal(body.systemInstruction.parts[0].text,'Tiếng Việt');return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Không hiển thị',thought:true},{text:'Chào bạn'}]}}]})};}});assert.equal(reply,'Chào bạn');
});
test('temporary provider failure uses configured fallback',async()=>{let calls=0;const reply=await requestGeminiReply({...options,fallbackModel:'fallback',fetchImpl:async()=>++calls===1?{ok:false,status:503,json:async()=>({})}:{ok:true,json:async()=>({candidates:[{content:{parts:[{text:'Món gợi ý'}]}}]})}});assert.equal(calls,2);assert.equal(reply,'Món gợi ý');});
test('quota and configuration failures return actionable errors without provider secrets',async()=>{for(const [status,expected] of [[429,429],[403,503],[400,503]])await assert.rejects(()=>requestGeminiReply({...options,fetchImpl:async()=>({ok:false,status,json:async()=>({error:{message:'secret provider details'}})})}),e=>e.status===expected&&!e.message.includes('secret'));});

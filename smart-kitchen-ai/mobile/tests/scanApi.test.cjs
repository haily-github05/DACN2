const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/scanApi.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function setup(platform='ios',payload={success:true,detections:[{name:'carrot',count:2,confidence:.9}]}){
 const calls=[];class NativeFile{constructor(uri){this.uri=uri;this.name='image.png';}}class Form{append(key,value,name){this.part={key,value,name};}}
 const deps={'react-native':{Platform:{OS:platform}},'expo-file-system':{File:NativeFile},'expo/fetch':{fetch:async(url,options)=>{calls.push({url,options});return options?.method?{ok:true,json:async()=>payload}:{blob:async()=>new Blob(['image'])};}},'./api':{getApiBaseUrl:()=> 'http://192.168.1.2:3000'}};
 const exports={};new Function('require','exports','FormData','process',code)(name=>deps[name],exports,Form,{env:{}});return {...exports,calls,NativeFile};
}
test('normalizes valid detections without fabricating confidence',()=>{
 const {normalizeDetections}=setup();assert.deepEqual(normalizeDetections([{name:' carrot ',count:2,confidence:.95},{name:'rau',count:-1,confidence:null},{name:''}]),[{name:'carrot',count:2,confidence:.95},{name:'rau',count:1,confidence:null}]);assert.deepEqual(normalizeDetections(null),[]);
});
test('native scan posts File to the model with field file',async()=>{
 const {analyzePhoto,calls,NativeFile}=setup();const result=await analyzePhoto('file:///image.png',new AbortController().signal);assert.equal(calls[0].url,'http://192.168.1.2:8000/predict');assert.equal(calls[0].options.body.part.key,'file');assert(calls[0].options.body.part.value instanceof NativeFile);assert.equal(result[0].count,2);
});
test('web scan posts Blob and preserves empty results',async()=>{
 const {analyzePhoto,calls}=setup('web',{success:true,detections:[]});assert.deepEqual(await analyzePhoto('blob:image',new AbortController().signal),[]);assert(calls[1].options.body.part.value instanceof Blob);
});
test('malformed response fails instead of displaying samples',async()=>{
 const {analyzePhoto}=setup('ios',{success:true});await assert.rejects(()=>analyzePhoto('file:///image.png',new AbortController().signal),/hợp lệ/);
});

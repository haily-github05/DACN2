// Gửi ảnh đến dịch vụ model FastAPI: POST /predict, multipart field "file".
import {Platform} from 'react-native';
import {File} from 'expo-file-system';
import {fetch} from 'expo/fetch';
import {getApiBaseUrl} from './api';
import {getAuthUser} from './auth';
export type Detection={name:string;count:number;confidence:number|null};
export function normalizeDetections(value:unknown):Detection[]{
 if(!Array.isArray(value))return [];
 return value.filter((item):item is Record<string,unknown>=>!!item&&typeof item==='object'&&typeof item.name==='string'&&!!item.name.trim()).map(item=>({name:(item.name as string).trim(),count:typeof item.count==='number'&&Number.isInteger(item.count)&&item.count>0?item.count:1,confidence:typeof item.confidence==='number'&&Number.isFinite(item.confidence)&&item.confidence>=0&&item.confidence<=1?item.confidence:null}));
}
export function getAiBaseUrl(){
 const configured=process.env.EXPO_PUBLIC_AI_URL?.trim();
 if(configured)return configured.replace(/\/+$/,'');
 const url=new URL(getApiBaseUrl());url.port='8000';url.pathname='';url.search='';url.hash='';return url.toString().replace(/\/+$/,'');
}
export async function analyzePhoto(uri:string,signal:AbortSignal){
 const data=new FormData();
 if(Platform.OS==='web'){const response=await fetch(uri,{signal});const blob=await response.blob();data.append('file',blob,'scan-image');}
 else{const file=new File(uri);data.append('file',file,file.name);}
 const user=await getAuthUser();
 const response=await fetch(`${getAiBaseUrl()}/predict`,{method:'POST',body:data,signal,headers:user?.token?{Authorization:`Bearer ${user.token}`}:{}});
 const result=await response.json().catch(()=>null);
 if(!response.ok||!result?.success||!Array.isArray(result.detections))throw new Error(typeof result?.detail==='string'?result.detail:result?.message||'Model chưa trả về kết quả hợp lệ.');
 return normalizeDetections(result.detections);
}

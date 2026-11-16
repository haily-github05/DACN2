// Gọi Gemini REST từ backend; API key không được gửi xuống mobile.
async function requestGeminiReply({apiKey,primaryModel,fallbackModel,history,systemInstruction,message,fetchImpl=fetch}){
 const models=[...new Set([primaryModel,fallbackModel].filter(Boolean))];
 for(let index=0;index<models.length;index++){
  const response=await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(models[index])}:generateContent`,{
   method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},signal:AbortSignal.timeout(25000),
   body:JSON.stringify({systemInstruction:{parts:[{text:systemInstruction}]},contents:[...history,{role:'user',parts:[{text:message}]}],generationConfig:{maxOutputTokens:2048}}),
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok){
   if(index+1<models.length&&[404,429,500,502,503,504].includes(response.status))continue;
   const status=response.status===429?429:response.status===403||response.status===400?503:502;
   throw Object.assign(new Error(response.status===429?'AI đã đạt giới hạn lượt dùng. Vui lòng thử lại sau.':response.status===403||response.status===400?'Cấu hình API key hoặc quyền truy cập Gemini chưa hợp lệ.':response.status===503?'AI đang quá tải. Vui lòng thử lại sau.':'Không kết nối được model Gemini. Hãy kiểm tra cấu hình model.'),{status});
  }
  return (result?.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join('\n').trim();
 }
 return '';
}
module.exports={requestGeminiReply};

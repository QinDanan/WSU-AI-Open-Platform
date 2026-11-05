/**
 * WSU AI API gateway — Cloudflare Workers example.
 * The public website does not embed the upstream model key.
 * Required Worker secrets: AI_API_KEY, GATEWAY_ACCESS_TOKEN.
 * Required vars: ALLOWED_ORIGIN, UPSTREAM_URL, MODEL_ALLOWLIST.
 * Optional Worker rate limiting binding: AI_LIMITER.
 */
const headers = origin => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
});
function reply(data, status, origin) {
  return new Response(JSON.stringify(data), {status,headers:{...headers(origin),'Content-Type':'application/json; charset=utf-8'}});
}
async function constantTimeMatch(a,b) {
  const enc=new TextEncoder();
  const [x,y]=await Promise.all([crypto.subtle.digest('SHA-256',enc.encode(a)),crypto.subtle.digest('SHA-256',enc.encode(b))]);
  const xa=new Uint8Array(x),ya=new Uint8Array(y);let diff=0;
  for(let i=0;i<xa.length;i++)diff|=xa[i]^ya[i];
  return diff===0;
}
export default {
  async fetch(request,env) {
    const origin=request.headers.get('Origin')||'';
    const allowedOrigin=(env.ALLOWED_ORIGIN||'').replace(/\/$/,'');
    if(!allowedOrigin || origin!==allowedOrigin) return new Response('Forbidden origin',{status:403});
    const url=new URL(request.url);
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:headers(origin)});
    if(url.pathname==='/health' && request.method==='GET') return reply({status:'ok',service:'syai-gateway'},200,origin);
    if(url.pathname!=='/chat'||request.method!=='POST') return reply({error:'Not found'},404,origin);
    if(!env.AI_API_KEY || !env.GATEWAY_ACCESS_TOKEN || !env.UPSTREAM_URL) return reply({error:'Gateway not configured'},503,origin);
    const bearer=(request.headers.get('Authorization')||'').match(/^Bearer (.+)$/);
    if(!bearer || !(await constantTimeMatch(bearer[1],env.GATEWAY_ACCESS_TOKEN))) return reply({error:'Unauthorized'},401,origin);
    if(Number(request.headers.get('content-length')||'0')>110000) return reply({error:'Payload too large'},413,origin);
    if(env.AI_LIMITER) {const ip=request.headers.get('CF-Connecting-IP')||'anonymous';const {success}=await env.AI_LIMITER.limit({key:ip});if(!success)return reply({error:'Rate limit exceeded'},429,origin)}
    let body;
    try{body=await request.json()}catch{return reply({error:'Invalid JSON'},400,origin)}
    const allowedModels=(env.MODEL_ALLOWLIST||'deepseek-chat').split(',').map(x=>x.trim()).filter(Boolean);
    if(!body || !allowedModels.includes(body.model)) return reply({error:'Model not allowed'},400,origin);
    if(!Array.isArray(body.messages)||body.messages.length<1||body.messages.length>24)return reply({error:'Invalid message count'},400,origin);
    const messages=[];
    for(const m of body.messages) {
      if(!m || !['user','assistant','system'].includes(m.role) || typeof m.content!=='string' || m.content.length>10000) return reply({error:'Invalid message'},400,origin);
      messages.push({role:m.role,content:m.content});
    }
    const upstream=new URL(env.UPSTREAM_URL);
    if(upstream.protocol!=='https:')return reply({error:'Invalid upstream configuration'},503,origin);
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),55000);
    try{
      const result=await fetch(upstream.toString(),{
        method:'POST',headers:{'Authorization':'Bearer '+env.AI_API_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({model:body.model,messages,stream:false,max_tokens:env.MAX_TOKENS?Math.min(4096,Math.max(1,Number(env.MAX_TOKENS))):2048}),signal:controller.signal
      });
      const data=await result.json().catch(()=>({}));
      if(!result.ok)return reply({error:result.status===429?'Model rate limit':'Upstream request failed'},result.status===429?429:502,origin);
      const answer=data?.choices?.[0]?.message?.content;
      if(typeof answer!=='string')return reply({error:'Invalid model response'},502,origin);
      return reply({choices:[{message:{role:'assistant',content:answer}}]},200,origin);
    }catch{return reply({error:'Upstream unavailable'},502,origin)}finally{clearTimeout(timer)}
  }
};

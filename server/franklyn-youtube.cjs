'use strict';
// Server-side YouTube Data API adapter. Never place YOUTUBE_API_KEY in app HTML/APK.
// Uses official search.list(order=viewCount) plus videos.list(statistics,status).
const http=require('node:http');
const {URL}=require('node:url');
const Franklyn=require('../franklyn.js');
const topicNames=new Map(Franklyn.topics.map(t=>[t.title.toLowerCase(),t.title]));
const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/;
const SIX_HOURS=6*60*60*1000;
function chooseTopic(name){
  if(typeof name!=='string'||name.length>120)return null;
  return topicNames.get(name.trim().toLowerCase())||null;
}
async function fetchJson(url,fetchImpl){
  const response=await fetchImpl(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(10000)});
  if(!response||!response.ok)throw Error('The YouTube API is unavailable.');
  return response.json();
}
function rankResults(search,detail,now=new Date()){
  const expected=new Set((search.items||[]).map(x=>x.id&&x.id.videoId).filter(x=>typeof x==='string'&&VIDEO_ID.test(x)));
  const videos=(detail.items||[]).filter(x=>
    x&&expected.has(x.id)&&x.status&&x.status.privacyStatus==='public'&&x.status.embeddable===true
  ).map(x=>{
    const count=Number(x.statistics&&x.statistics.viewCount);
    if(!Number.isSafeInteger(count)||count<0||!x.snippet||typeof x.snippet.title!=='string'||typeof x.snippet.channelTitle!=='string')return null;
    return {id:x.id,title:x.snippet.title.slice(0,200),channel:x.snippet.channelTitle.slice(0,120),views:count,publishedAt:x.snippet.publishedAt||''};
  }).filter(Boolean).sort((a,b)=>b.views-a.views).slice(0,10);
  return {provider:'youtube-data-api',retrievedAt:now.toISOString(),videos};
}
async function requestTopVideos(topic,options={}){
  const allowed=chooseTopic(topic);
  if(!allowed)throw Error('Unrecognized peptide research topic.');
  const key=options.apiKey||'';
  if(!key)throw Error('YouTube API is not configured.');
  const fetchImpl=options.fetchImpl||globalThis.fetch;
  const now=options.now||(()=>new Date());
  const search=new URL('https://www.googleapis.com/youtube/v3/search');
  const params={key,part:'snippet',type:'video',order:'viewCount',maxResults:'12',safeSearch:'moderate',relevanceLanguage:'en',videoEmbeddable:'true',q:allowed+' peptide research'};
  for(const [k,v]of Object.entries(params))search.searchParams.set(k,v);
  const first=await fetchJson(search.href,fetchImpl);
  const ids=(first.items||[]).map(x=>x.id&&x.id.videoId).filter(x=>typeof x==='string'&&VIDEO_ID.test(x));
  if(!ids.length)return {provider:'youtube-data-api',retrievedAt:now().toISOString(),videos:[]};
  const second=new URL('https://www.googleapis.com/youtube/v3/videos');
  for(const [k,v]of Object.entries({key,part:'snippet,statistics,status',id:ids.join(',')}))second.searchParams.set(k,v);
  const details=await fetchJson(second.href,fetchImpl);
  return rankResults(first,details,now());
}
function makeHandler(options={}){
  const fetchImpl=options.fetchImpl||globalThis.fetch;
  const apiKey=options.apiKey===undefined?process.env.YOUTUBE_API_KEY:options.apiKey;
  const now=options.now||(()=>new Date());
  const cache=new Map();
  const inflight=new Map();
  function respond(res,status,body){
    res.writeHead(status,{
      'Content-Type':'application/json; charset=utf-8',
      'X-Content-Type-Options':'nosniff',
      'Access-Control-Allow-Origin':'*',
      'Cache-Control':status===200?'public, max-age=1800':'no-store'
    });
    res.end(JSON.stringify(body));
  }
  return async function(req,res){
    let url;
    try{url=new URL(req.url,'https://localhost');}catch(e){return respond(res,400,{error:'Invalid request.'});}
    if(url.pathname!=='/api/franklyn/videos')return respond(res,404,{error:'Not found.'});
    if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Accept'});return res.end();}
    if(req.method!=='GET')return respond(res,405,{error:'Only GET is supported.'});
    const topic=chooseTopic(url.searchParams.get('peptide'));
    if(!topic)return respond(res,400,{error:'Select a supported peptide.'});
    if(!apiKey)return respond(res,503,{error:'YouTube ranking service is not configured.'});
    const saved=cache.get(topic);
    if(saved&&saved.until>Date.now())return respond(res,200,saved.body);
    try{
      if(!inflight.has(topic)){
        const work=requestTopVideos(topic,{apiKey,fetchImpl,now}).then(body=>{
          cache.set(topic,{until:Date.now()+SIX_HOURS,body});
          return body;
        }).finally(()=>inflight.delete(topic));
        inflight.set(topic,work);
      }
      respond(res,200,await inflight.get(topic));
    }catch(e){respond(res,502,{error:'Video rankings are temporarily unavailable.'});}
  };
}
module.exports={chooseTopic,rankResults,requestTopVideos,makeHandler};
if(require.main===module){
  const port=Number(process.env.PORT)||8080;
  http.createServer(makeHandler()).listen(port,'0.0.0.0');
}

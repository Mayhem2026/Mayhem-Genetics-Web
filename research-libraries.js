(function(root){
  'use strict';
  // Curated links only. We never infer scientific validity from YouTube views.
  const MAX_QUERY=160;
  function term(value){
    if(typeof value!=='string')throw Error('Choose a peptide or enter a research topic.');
    const clean=value.replace(/\s+/g,' ').trim();
    if(!clean||clean.length>MAX_QUERY)throw Error('Enter a research topic of 1 to 160 characters.');
    return clean;
  }
  function queryLinks(value){
    const q=term(value),encoded=encodeURIComponent(q),yt=encodeURIComponent(q+' peptide research');
    return Object.freeze([
      {id:'pubmed',label:'PubMed',kind:'Scientific papers',url:'https://pubmed.ncbi.nlm.nih.gov/?term='+encoded},
      {id:'trials',label:'ClinicalTrials.gov',kind:'Registered human studies',url:'https://clinicaltrials.gov/search?term='+encoded},
      {id:'europe',label:'Europe PMC',kind:'Biomedical literature',url:'https://europepmc.org/search?query='+encoded},
      {id:'scholar',label:'Google Scholar',kind:'Broad scholarly search',url:'https://scholar.google.com/scholar?q='+encoded},
      {id:'fda',label:'FDA',kind:'US regulatory information',url:'https://www.fda.gov/search?s='+encoded},
      {id:'youtube',label:'YouTube videos',kind:'Public educational videos, not vetted research',url:'https://www.youtube.com/results?search_query='+yt}
    ]);
  }
  function validateVideoList(payload){
    if(!payload||typeof payload!=='object'||payload.provider!=='youtube-data-api'||!Array.isArray(payload.videos)||payload.videos.length>25){
      throw Error('The video service returned an invalid response.');
    }
    const retrievedAt=typeof payload.retrievedAt==='string'&&Number.isFinite(Date.parse(payload.retrievedAt))?payload.retrievedAt:null;
    if(!retrievedAt)throw Error('The video service did not provide a retrieval date.');
    const safe=payload.videos.map(item=>{
      if(!item||typeof item.id!=='string'||!/^[A-Za-z0-9_-]{11}$/.test(item.id))return null;
      const title=typeof item.title==='string'?item.title.trim().slice(0,200):'';
      const channel=typeof item.channel==='string'?item.channel.trim().slice(0,120):'';
      const rawViews=item.views;
      if(!(typeof rawViews==='number'||(typeof rawViews==='string'&&/^\d+$/.test(rawViews))))return null;
      const views=Number(rawViews);
      if(!title||!channel||!Number.isSafeInteger(views)||views<0)return null;
      return {id:item.id,title,channel,views,publishedAt:typeof item.publishedAt==='string'?item.publishedAt:'',url:'https://www.youtube.com/watch?v='+item.id};
    }).filter(Boolean);
    safe.sort((a,b)=>b.views-a.views);
    return {retrievedAt,videos:safe.slice(0,10),provider:'youtube-data-api'};
  }
  function apiRequestUrl(endpoint,value){
    const q=term(value);
    if(typeof endpoint!=='string'||!endpoint)throw Error('YouTube ranking service is not configured.');
    const u=new URL(endpoint);
    if(u.protocol!=='https:'||u.username||u.password||u.hash)throw Error('The video service must use secure HTTPS without credentials in the URL.');
    u.searchParams.set('peptide',q);
    return u.href;
  }
  const api=Object.freeze({term,queryLinks,validateVideoList,apiRequestUrl});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MayhemResearchLibraries=api;
})(typeof globalThis!=='undefined'?globalThis:this);

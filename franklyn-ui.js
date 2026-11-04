'use strict';

// Source-grounded Franklyn preview. YouTube popularity is NOT scientific validation.
function franklynEl(parent,tag,value){
  const node=document.createElement(tag);
  if(value!==undefined)node.textContent=value;
  parent.appendChild(node);
  return node;
}
function franklynExternal(parent,label,url){
  const a=franklynEl(parent,'a',label);
  a.href=url;a.target='_blank';a.rel='noopener noreferrer';
  a.style.cssText='color:#ff9eaa;text-decoration:underline;overflow-wrap:anywhere';
  return a;
}
function openFranklyn(){
  if(typeof stopCamera==='function')stopCamera();
  document.querySelectorAll('main section').forEach(s=>s.classList.toggle('active',s.id==='franklyn'));
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  const input=document.getElementById('franklynQuestion');
  if(input&&!document.getElementById('franklynTopicPicker')){
    const details=document.createElement('details');details.id='franklynTopicPicker';
    details.style.cssText='margin:12px 0;padding:12px;border:1px solid #64303a;border-radius:12px;background:#15151d';
    const summary=franklynEl(details,'summary','Browse '+Franklyn.topics.length+' recognized research topics');
    summary.style.cssText='cursor:pointer;font-weight:700;color:#ff9eaa';
    const choices=franklynEl(details,'div');
    choices.style.cssText='display:flex;flex-wrap:wrap;gap:7px;margin-top:12px';
    Franklyn.topics.forEach(topic=>{
      const chip=franklynEl(choices,'button',topic.title);
      chip.type='button';chip.className='secondary';
      chip.style.cssText='font-size:12px;padding:9px 10px;text-transform:none';
      chip.addEventListener('click',()=>{
        input.value='What does the research say about '+topic.title+'?';
        details.open=false;askFranklyn();
      });
    });
    input.insertAdjacentElement('afterend',details);
  }
  ensureFranklynLibraries();
  window.scrollTo(0,0);
}
function openFranklynResearchLibraries(){
  openFranklyn();
  showFranklynLibraryTab('videos');
}

function showFranklynLibraryTab(tab){
  const host=ensureFranklynLibraries();
  const source=host.querySelector('#franklynSourcePanel');
  const video=host.querySelector('#franklynVideoPanel');
  if(!source||!video)return;
  source.hidden=tab!=='sources';
  video.hidden=tab!=='videos';
  host.querySelectorAll('[data-library-tab]').forEach(btn=>{
    const active=btn.getAttribute('data-library-tab')===tab;
    btn.style.background=active?'#b61d2c':'#36333a';
    btn.setAttribute('aria-pressed',active?'true':'false');
  });
}

function ensureFranklynLibraries(){
  let host=document.getElementById('franklynLibraries');
  if(host)return host;
  const container=document.getElementById('franklyn');
  host=franklynEl(container,'div');
  host.id='franklynLibraries';
  host.className='card';
  host.style.cssText='margin-top:18px;border-color:#9c3441';
  franklynEl(host,'h3','Peptide Research Libraries');
  franklynEl(host,'p','Choose a peptide to explore published studies, regulatory information, and educational videos. Sources open in their original websites.').className='small muted';
  const label=franklynEl(host,'label','Peptide');
  label.htmlFor='franklynLibraryPeptide';
  const selector=franklynEl(host,'select');
  selector.id='franklynLibraryPeptide';
  selector.setAttribute('aria-label','Research library peptide');
  for(const topic of Franklyn.topics){
    const option=franklynEl(selector,'option',topic.title);
    option.value=topic.title;
  }
  const tabs=franklynEl(host,'div');
  tabs.style.cssText='display:flex;gap:9px;margin:12px 0';
  for(const [key,title] of [['sources','Research Sources'],['videos','YouTube Videos']]){
    const btn=franklynEl(tabs,'button',title);
    btn.type='button';btn.className='secondary';btn.setAttribute('data-library-tab',key);
    btn.style.cssText='flex:1;font-size:12px;min-height:42px;padding:8px';
    btn.addEventListener('click',()=>showFranklynLibraryTab(key));
  }
  const source=franklynEl(host,'div');source.id='franklynSourcePanel';
  const video=franklynEl(host,'div');video.id='franklynVideoPanel';
  const explanation=franklynEl(video,'p','Popular videos are not necessarily accurate. Franklyn does not endorse or verify YouTube medical claims.');
  explanation.className='small muted';
  const popular=franklynEl(video,'button','Show Most Viewed Videos');
  popular.type='button';popular.id='franklynMostViewedButton';
  popular.style.cssText='width:100%;margin-bottom:12px';
  popular.addEventListener('click',()=>loadFranklynMostViewedVideos());
  const status=franklynEl(video,'p','Most-viewed rankings require a connected YouTube Data API service. You can browse YouTube immediately using the link below.');
  status.id='franklynVideoStatus';status.className='small muted';status.setAttribute('role','status');
  const results=franklynEl(video,'div');results.id='franklynVideoResults';
  const browse=franklynEl(video,'div');browse.id='franklynYouTubeSearch';
  selector.addEventListener('change',()=>renderFranklynLibraryLinks());
  renderFranklynLibraryLinks();
  showFranklynLibraryTab('sources');
  // Place references below existing Franklyn answers, not among main navigation sections.
  return host;
}
function setFranklynLibraryTopic(name){
  const host=ensureFranklynLibraries();
  const selector=host.querySelector('#franklynLibraryPeptide');
  if(Array.from(selector.options).some(o=>o.value===name)){
    selector.value=name;renderFranklynLibraryLinks();
  }
}
function renderFranklynLibraryLinks(){
  const host=document.getElementById('franklynLibraries');
  if(!host)return;
  const name=host.querySelector('#franklynLibraryPeptide').value;
  const links=MayhemResearchLibraries.queryLinks(name);
  const source=host.querySelector('#franklynSourcePanel');source.replaceChildren();
  const browse=host.querySelector('#franklynYouTubeSearch');browse.replaceChildren();
  for(const library of links){
    const target=library.id==='youtube'?browse:source;
    const row=franklynEl(target,'div');row.style.cssText='padding:9px 0;border-bottom:1px solid #40333b';
    franklynExternal(row,library.label,library.url);
    franklynEl(row,'div',library.kind).className='small muted';
  }
  host.querySelector('#franklynVideoResults').replaceChildren();
  host.querySelector('#franklynVideoStatus').textContent='Choose “Show Most Viewed Videos” to check verified counts when the secure video service is available.';
}
async function loadFranklynMostViewedVideos(){
  const host=ensureFranklynLibraries();
  const status=host.querySelector('#franklynVideoStatus');
  const list=host.querySelector('#franklynVideoResults');
  const peptide=host.querySelector('#franklynLibraryPeptide').value;
  list.replaceChildren();
  const endpoint=typeof window.MAYHEM_YOUTUBE_API_ENDPOINT==='string'?window.MAYHEM_YOUTUBE_API_ENDPOINT:'';
  if(!endpoint){
    status.textContent='Most-viewed ranking is not connected yet. Open the YouTube search link below to browse videos. Search results are not verified view-count rankings.';
    return;
  }
  try{
    const url=MayhemResearchLibraries.apiRequestUrl(endpoint,peptide);
    status.textContent='Checking public YouTube video statistics…';
    const response=await fetch(url,{credentials:'omit',mode:'cors',cache:'no-store'});
    if(!response.ok)throw Error('The video-ranking service is temporarily unavailable.');
    const data=MayhemResearchLibraries.validateVideoList(await response.json());
    if(host.querySelector('#franklynLibraryPeptide').value!==peptide)return;
    if(!data.videos.length){status.textContent='No public videos with verified view counts found. Use the search link below.';return;}
    const date=new Date(data.retrievedAt).toLocaleDateString();
    status.textContent='Most viewed among matching YouTube API results · View counts checked '+date+'. Popularity is not a measure of scientific quality.';
    for(const video of data.videos){
      const card=franklynEl(list,'div');card.className='card';card.style.cssText='padding:12px;margin:9px 0';
      franklynExternal(card,video.title,video.url);
      const meta=franklynEl(card,'p',video.channel+' · '+new Intl.NumberFormat().format(video.views)+' views');
      meta.className='small muted';
    }
  }catch(e){
    status.textContent='Live rankings are unavailable. '+e.message+' Use the YouTube search link instead.';
  }
}

function askFranklyn(){
  const output=document.getElementById('franklynAnswer');
  output.replaceChildren();
  try{
    const result=Franklyn.ask(document.getElementById('franklynQuestion').value);
    franklynEl(output,'p',result.message);
    franklynEl(output,'p',result.coverage);
    if(result.personalUseNotice)franklynEl(output,'p',result.personalUseNotice);
    for(const topic of result.topics){
      franklynEl(output,'h3',topic.title);
      for(const claim of topic.claims){
        const card=franklynEl(output,'div');card.className='card';
        franklynEl(card,'strong',claim.evidence);
        if(claim.stale)franklynEl(card,'p','Regulatory status may have changed since the last review. Check the official source.');
        franklynEl(card,'p',claim.text);
        for(const source of claim.sources){
          const p=franklynEl(card,'p');
          franklynExternal(p,source.title,source.url);
          franklynEl(p,'small',' · Reviewed '+source.reviewedAt+(source.published?' · Published '+source.published:''));
        }
      }
    }
    if(result.topics.length)setFranklynLibraryTopic(result.topics[0].title);
    else ensureFranklynLibraries();
    franklynEl(output,'p','Use the Research Libraries section below for current publications and videos; Franklyn does not invent a source when a peptide is outside the reviewed library.').className='small muted';
  }catch(e){franklynEl(output,'p',e.message);}
}

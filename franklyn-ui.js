'use strict';
function openFranklyn(){
  stopCamera();document.querySelectorAll('main section').forEach(s=>s.classList.toggle('active',s.id==='franklyn'));
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));window.scrollTo(0,0);
}
function askFranklyn(){
  const output=document.getElementById('franklynAnswer');output.replaceChildren();
  const add=(parent,tag,text)=>{const el=document.createElement(tag);el.textContent=text;parent.appendChild(el);return el;};
  try{
    const result=Franklyn.ask(document.getElementById('franklynQuestion').value);
    add(output,'p',result.message);add(output,'p',result.coverage);
    if(result.personalUseNotice)add(output,'p',result.personalUseNotice);
    for(const topic of result.topics){
      add(output,'h3',topic.title);
      for(const claim of topic.claims){
        const card=add(output,'div','');card.className='card';
        add(card,'strong',claim.evidence);
        if(claim.stale)add(card,'p','Regulatory source needs rechecking. The following is a dated summary, not a verified current status.');
        add(card,'p',claim.text);
        for(const source of claim.sources){const p=add(card,'p','');const a=add(p,'a',source.title);a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';a.style.color='#ff9aab';add(p,'small',' Reviewed '+source.reviewedAt+(source.published?' · Published '+source.published:''));}
      }
    }
  }catch(e){add(output,'p',e.message);}
}

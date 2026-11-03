(function(root){
  'use strict';
  const reviewedAt='2026-11-03';
  const sources=Object.freeze({
    retaTrial:{id:'retaTrial',title:'Jastreboff et al., NEJM (2023), phase 2 randomized trial',url:'https://pubmed.ncbi.nlm.nih.gov/37366315/',type:'Human randomized trial',published:'2023-06-26',reviewedAt},
    fdaGLP:{id:'fdaGLP',title:'FDA: concerns with unapproved GLP-1 drugs',url:'https://www.fda.gov/drugs/drug-alerts-and-statements/fdas-concerns-unapproved-glp-1-drugs-used-weight-loss',type:'US regulatory authority',reviewedAt},
    fdaBulk:{id:'fdaBulk',title:'FDA: bulk substances that may present significant safety risks',url:'https://www.fda.gov/drugs/human-drug-compounding/certain-bulk-drug-substances-use-compounding-may-present-significant-safety-risks',type:'US regulatory safety communication',reviewedAt},
    fdaForzinity:{id:'fdaForzinity',title:'FDA: Forzinity accelerated approval announcement',url:'https://www.fda.gov/news-events/press-announcements/fda-grants-accelerated-approval-first-treatment-barth-syndrome',type:'US regulatory authority',published:'2025-09-19',reviewedAt},
    forzinityTrial:{id:'forzinityTrial',title:'FDA: Forzinity trial snapshot',url:'https://www.fda.gov/drugs/drug-trials-snapshots/drug-trials-snapshots-forzinity',type:'Regulator summary of clinical evidence',reviewedAt}
  });
  const topics=Object.freeze([
    {id:'retatrutide',title:'Retatrutide',aliases:['retatrutide','reta'],claims:[
      {text:'A 338-participant, placebo-controlled phase 2 trial reported weight reduction over 48 weeks. This selected study does not establish long-term safety or cover all later research.',evidence:'Human randomized trial',citationIds:['retaTrial']},
      {text:'Gastrointestinal adverse events and dose-related heart-rate increases were reported. Results from a supervised trial do not validate products sold online.',evidence:'Human randomized trial',citationIds:['retaTrial']},
      {text:'FDA states retatrutide is not a component of an FDA-approved drug and cannot be used in compounding under federal law.',evidence:'Regulatory statement (US)',citationIds:['fdaGLP'],regulatory:true}
    ]},
    {id:'bpc157',title:'BPC-157',aliases:['bpc-157','bpc157','bpc 157'],claims:[
      {text:'FDA identifies limited safety information and concerns about immune responses, peptide impurities and characterization for compounded BPC-157. This safety communication is not clinical proof of efficacy.',evidence:'Regulatory safety communication',citationIds:['fdaBulk'],regulatory:true},
      {text:'This starter library has no reviewed human efficacy trial for BPC-157. That is a gap in this library, not a claim that no human studies exist.',evidence:'Library coverage limitation',citationIds:[]}
    ]},
    {id:'elamipretide',title:'Elamipretide / SS-31',aliases:['elamipretide','ss-31','ss31','forzinity'],claims:[
      {text:'FDA granted accelerated approval to Forzinity (elamipretide) in September 2025 for Barth syndrome in patients weighing at least 30 kg. This does not approve research-vendor SS-31 or general wellness uses.',evidence:'Regulatory decision (US)',citationIds:['fdaForzinity'],regulatory:true},
      {text:'FDA describes a 12-patient crossover trial and an open-label extension. The randomized phase did not show superiority on its primary endpoints; improved knee strength was observed during the extension. Confirmation of clinical benefit is required.',evidence:'Small randomized trial and uncontrolled extension',citationIds:['forzinityTrial','fdaForzinity']}
    ]}
  ]);
  function sourceIsFresh(source,now=new Date()){
    const age=now.getTime()-Date.parse(source.reviewedAt+'T00:00:00Z');return Number.isFinite(age)&&age>=0&&age<=7*86400000;
  }
  function ask(question,now=new Date()){
    if(typeof question!=='string'||!question.trim()||question.length>2000)throw Error('Enter a research question of up to 2,000 characters.');
    const q=question.toLowerCase();
    const selected=topics.filter(t=>t.aliases.some(a=>new RegExp('(^|[^a-z0-9])'+a+'([^a-z0-9]|$)','i').test(q)));
    const personal=/\b(dose|dosage|inject|cycle|stack|prescribe)\b|how (much|often) should i/.test(q);
    return {mode:'reviewed-library',reviewedAt,personalUseNotice:personal?'Franklyn summarizes research; it does not choose a personal regimen. Discuss treatment questions with a licensed clinician.':null,
      coverage:'Selected reviewed sources, not an exhaustive or live literature search. Regulatory notes concern the United States.',
      topics:selected.map(t=>({...t,claims:t.claims.map(c=>({...c,stale:!!c.regulatory&&c.citationIds.some(id=>!sourceIsFresh(sources[id],now)),sources:c.citationIds.map(id=>sources[id])}))})),
      message:selected.length?'Research summaries and limitations are shown below.':'No reviewed entry matches this question. Try Retatrutide, BPC-157 or Elamipretide. Franklyn will not invent an answer.'};
  }
  function validateGenerated(answer,allowedIds){
    if(!answer||!Array.isArray(answer.claims)||answer.claims.length<1||answer.claims.length>12)throw Error('Invalid research response');
    return answer.claims.map(c=>{
      if(typeof c.text!=='string'||!c.text.trim()||c.text.length>2000||!['Human randomized trial','Human observational study','Animal study','Laboratory study','Regulatory statement (US)','Uncertain'].includes(c.evidence)||!Array.isArray(c.citationIds)||!c.citationIds.length||c.citationIds.some(id=>!allowedIds.includes(id)||!sources[id]))throw Error('Unverified citation or evidence type');
      return {text:c.text,evidence:c.evidence,sources:c.citationIds.map(id=>sources[id])};
    });
  }
  const api=Object.freeze({ask,sources,topics,sourceIsFresh,validateGenerated});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Franklyn=api;
})(typeof globalThis!=='undefined'?globalThis:this);

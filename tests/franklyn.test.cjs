const {test}=require('node:test');
const assert=require('node:assert/strict');
const f=require('../franklyn.js');
const reviewed=new Date('2026-11-03T12:00:00Z');
test('Franklyn distinguishes trial evidence, regulatory statements and library gaps',()=>{
  const answer=f.ask('Compare retatrutide and BPC-157 evidence',reviewed);
  assert.equal(answer.mode,'reviewed-library');assert.equal(answer.topics.length,2);
  const claims=answer.topics.flatMap(t=>t.claims);
  assert.ok(claims.some(c=>c.evidence==='Human randomized trial'));
  assert.ok(claims.some(c=>c.evidence==='Library coverage limitation'&&c.sources.length===0));
  for(const c of claims)if(c.evidence!=='Library coverage limitation')assert.ok(c.sources.length);
});
test('stale regulatory material is flagged, never silently called current',()=>{
  assert.equal(f.ask('Is reta approved?',reviewed).topics[0].claims.at(-1).stale,false);
  assert.equal(f.ask('Is reta approved?',new Date('2026-12-01')).topics[0].claims.at(-1).stale,true);
  assert.equal(f.sourceIsFresh(f.sources.fdaGLP,new Date('2026-01-01')),false);
});
test('unknown questions do not produce invented answers or false topic matches',()=>{
  assert.equal(f.ask('What is CJC12950?',reviewed).topics.length,0);
  assert.equal(f.ask('Are secretagogues preferable?',reviewed).topics.length,0);
  assert.throws(()=>f.ask('x'.repeat(2001)));
  assert.ok(f.ask('What dose should I inject of retatrutide?',reviewed).personalUseNotice);
});
test('elamipretide approval is tied to the indicated product, not vendor SS-31',()=>{
  const claims=f.ask('ss-31',reviewed).topics[0].claims;
  assert.match(claims[0].text,/Barth syndrome/);assert.match(claims[0].text,/does not approve research-vendor/);
  assert.match(claims[1].text,/did not show superiority/);
});
test('future generated answers must cite only supplied verified source IDs',()=>{
  const claim={text:'Study summary',evidence:'Human randomized trial',citationIds:['retaTrial']};
  assert.equal(f.validateGenerated({claims:[claim]},['retaTrial'])[0].sources[0].id,'retaTrial');
  for(const patch of [{citationIds:['invented']},{citationIds:[]},{citationIds:['fdaGLP']},{evidence:'Proven cure'}])assert.throws(()=>f.validateGenerated({claims:[{...claim,...patch}]},['retaTrial']));
});

test('popular peptide names and punctuation variations are recognized',()=>{
  const samples=[
    ['CJC-1295','CJC-1295'],['CJC1295','CJC-1295'],['Ipamorelin','Ipamorelin'],
    ['tesamorelin','Tesamorelin'],['GHK Cu','GHK-Cu'],['MOTS-C','MOTS-c'],
    ['TB500','TB-500'],['AOD 9604','AOD-9604'],['Semaglutide','Semaglutide'],
    ['Tirzepatide','Tirzepatide'],['PT 141','PT-141 / Bremelanotide'],
    ['Thymosin alpha-1','Thymosin alpha-1'],['Kisspeptin-10','Kisspeptin-10'],
    ['Selank','Selank'],['Semax','Semax'],['Epithalon','Epitalon / Epithalon'],
    ['LL37','LL-37'],['DSIP','DSIP'],['Sermorelin','Sermorelin']
  ];
  for(const [phrase,title] of samples){
    const result=f.ask('What research exists for '+phrase+'?',reviewed);
    assert.ok(result.topics.some(x=>x.title===title),phrase+' not found');
    assert.ok(result.searchQuery);
  }
  assert.ok(f.topics.length>=20);
});

test('multiple peptide questions retrieve separate scientific topics',()=>{
  const names=f.ask('Compare CJC-1295 and ipamorelin with TB-500',reviewed).topics.map(x=>x.title);
  assert.deepEqual(names,['CJC-1295','Ipamorelin','TB-500']);
});

test('all substantive reviewed claims show traceable source links and evidence labels',()=>{
  for(const t of f.topics){
    assert.ok(t.claims.length>0);
    for(const c of f.ask('Research '+t.aliases[0],reviewed).topics.find(x=>x.id===t.id).claims){
      if(c.evidence==='Library coverage limitation')continue;
      assert.ok(c.sources.length>0,t.title+' claim has no source');
      for(const s of c.sources){
        assert.ok(/^https:\/\/(pubmed\.ncbi\.nlm\.nih\.gov|www\.fda\.gov|www\.accessdata\.fda\.gov)\//.test(s.url),s.url);
        assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(s.reviewedAt));
      }
    }
  }
});

test('unsupported peptide questions return a research-search term, not a fabricated claim',()=>{
  const r=f.ask('Is fictional-peptide 492 effective?',reviewed);
  assert.equal(r.topics.length,0);
  assert.ok(r.searchQuery.includes('fictional-peptide'));
  assert.match(r.message,/will not invent/);
});

test('regulatory summaries are flagged when dated and no regimen is offered',()=>{
  const a=f.ask('What should I inject of CJC-1295?',new Date('2027-01-02'));
  assert.ok(a.personalUseNotice);
  assert.ok(a.topics[0].claims.some(c=>c.regulatory&&c.stale));
});

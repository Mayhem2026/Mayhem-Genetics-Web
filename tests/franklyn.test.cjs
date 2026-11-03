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
  assert.equal(f.ask('What is CJC1295?',reviewed).topics.length,0);
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

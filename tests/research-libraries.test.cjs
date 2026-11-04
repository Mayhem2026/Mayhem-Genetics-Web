const {test}=require('node:test');
const assert=require('node:assert/strict');
const lib=require('../research-libraries.js');
const video=require('../server/franklyn-youtube.cjs');

test('Research links use official sources with topic-specific URL encoding',()=>{
  const links=lib.queryLinks('GHK-Cu / MOTS-c');
  const byId=Object.fromEntries(links.map(x=>[x.id,new URL(x.url)]));
  assert.equal(links.length,6);
  assert.equal(byId.pubmed.hostname,'pubmed.ncbi.nlm.nih.gov');
  assert.equal(byId.pubmed.searchParams.get('term'),'GHK-Cu / MOTS-c');
  assert.equal(byId.trials.hostname,'clinicaltrials.gov');
  assert.equal(byId.europe.hostname,'europepmc.org');
  assert.equal(byId.fda.hostname,'www.fda.gov');
  assert.equal(byId.youtube.hostname,'www.youtube.com');
  assert.match(byId.youtube.searchParams.get('search_query'),/GHK-Cu \/ MOTS-c peptide research/);
  assert.throws(()=>lib.queryLinks(' '));
  assert.throws(()=>lib.queryLinks('x'.repeat(161)));
});

test('YouTube video API URL is HTTPS-only and does not accept embedded credentials',()=>{
  const url=lib.apiRequestUrl('https://research.example.org/api/franklyn/videos','BPC-157');
  assert.equal(new URL(url).searchParams.get('peptide'),'BPC-157');
  assert.throws(()=>lib.apiRequestUrl('http://research.example.org/api','BPC-157'));
  assert.throws(()=>lib.apiRequestUrl('https://user:password@research.example.org/api','BPC-157'));
});

test('Video cards accept only validated YouTube IDs and actual view counts',()=>{
  const payload={provider:'youtube-data-api',retrievedAt:'2026-11-03T17:00:00Z',videos:[
    {id:'abcdefghijk',title:'Science explained',channel:'Research channel',views:100,publishedAt:'2025-01-01T00:00:00Z'},
    {id:'ABCDEFGHIJK',title:'High interest',channel:'Another channel',views:250000},
    {id:'not_valid',title:'Fake',channel:'Unknown',views:90000},
    {id:'12345678901',title:'Bad count',channel:'Unknown',views:'unavailable'},
    {id:'zyxwvutsrqp',title:'Missing count',channel:'Unknown',views:null}
  ]};
  const result=lib.validateVideoList(payload);
  assert.equal(result.videos.length,2);
  assert.equal(result.videos[0].id,'ABCDEFGHIJK');
  assert.equal(result.videos[0].views,250000);
  assert.equal(result.videos[0].url,'https://www.youtube.com/watch?v=ABCDEFGHIJK');
  assert.throws(()=>lib.validateVideoList({...payload,provider:'user-generated'}));
});

test('YouTube API requests most viewed videos and verifies public statistics',async()=>{
  const requests=[];
  const fakeFetch=async url=>{
    const u=new URL(url);requests.push(u);
    assert.equal(u.searchParams.get('key'),'secret-in-server-only');
    if(u.pathname.endsWith('/search')){
      assert.equal(u.searchParams.get('order'),'viewCount');
      assert.equal(u.searchParams.get('videoEmbeddable'),'true');
      return {ok:true,json:async()=>({items:[{id:{videoId:'abcdefghijk'}},{id:{videoId:'ABCDEFGHIJK'}},{id:{videoId:'12345678901'}}]})};
    }
    if(u.pathname.endsWith('/videos'))return {ok:true,json:async()=>({items:[
      {id:'abcdefghijk',snippet:{title:'Credible but fewer views',channelTitle:'Lab',publishedAt:'2025-01-01'},statistics:{viewCount:'100'},status:{privacyStatus:'public',embeddable:true}},
      {id:'ABCDEFGHIJK',snippet:{title:'Popular video',channelTitle:'Popular',publishedAt:'2025-03-01'},statistics:{viewCount:'999'},status:{privacyStatus:'public',embeddable:true}},
      {id:'12345678901',snippet:{title:'Not public',channelTitle:'Private',publishedAt:'2025-02-01'},statistics:{viewCount:'999999'},status:{privacyStatus:'private',embeddable:false}}
    ]})};
    throw Error('Unexpected URL');
  };
  const out=await video.requestTopVideos('CJC-1295',{apiKey:'secret-in-server-only',fetchImpl:fakeFetch,now:()=>new Date('2026-11-03T17:00:00Z')});
  assert.equal(requests.length,2);
  assert.equal(out.videos.length,2);
  assert.equal(out.videos[0].id,'ABCDEFGHIJK');
  assert.equal(out.videos[0].views,999);
  assert.equal(out.retrievedAt,'2026-11-03T17:00:00.000Z');
});

test('YouTube provider rejects arbitrary topics and requests missing credentials',async()=>{
  assert.equal(video.chooseTopic('bpc-157'),'BPC-157');
  assert.equal(video.chooseTopic('not even a peptide'),null);
  await assert.rejects(video.requestTopVideos('unknown peptide',{apiKey:'some-key'}));
  await assert.rejects(video.requestTopVideos('BPC-157',{apiKey:''}));
});

test('Without an API key, the public endpoint is explicitly unavailable',async()=>{
  const handler=video.makeHandler({apiKey:''});
  const req={url:'/api/franklyn/videos?peptide=BPC-157',method:'GET'};
  let status=null,headers={},text='';
  const res={writeHead(s,h){status=s;headers=h;},end(body){text=body;}};
  await handler(req,res);
  assert.equal(status,503);
  assert.equal(headers['Cache-Control'],'no-store');
  assert.match(JSON.parse(text).error,/not configured/);
});

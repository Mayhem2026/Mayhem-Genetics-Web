import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNutritionProvider} from '../server/nutrition-provider.mjs';
const meal={recognizable_food:true,name:'Chicken and rice, pictured portion',calories:450,protein:35,carbs:45,fat:14};
const output=value=>({ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]})});
test('startup fails closed without complete configuration',()=>{
 assert.equal(createNutritionProvider(),null);
 assert.throws(()=>createNutritionProvider({apiKey:'test'}));
});
test('sends image server-side with cancellation and storage disabled; strips extra fields',async()=>{
 const signal=new AbortController().signal;
 const analyze=createNutritionProvider({apiKey:'test-only',model:'configured-model',fetchImpl:async(url,request)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(request.signal,signal);
  const body=JSON.parse(request.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);
  assert.equal(body.input[0].content[1].image_url,'data:image/png;base64,YQ==');
  return output(meal);
 }});
 assert.deepEqual(await analyze('data:image/png;base64,YQ==',{signal}),{name:meal.name,calories:450,protein:35,carbs:45,fat:14});
});
test('rejects unclear images, incomplete nutrition, refusals and upstream failures',async()=>{
 for(const response of [output({...meal,recognizable_food:false}),output({...meal,protein:null}),{ok:false},{ok:true,json:async()=>({status:'incomplete'})},{ok:true,json:async()=>({status:'completed',output:[]})}]){
  const analyze=createNutritionProvider({apiKey:'test',model:'configured-model',fetchImpl:async()=>response});
  await assert.rejects(()=>analyze('image'));
 }
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {plans,verifySandboxPurchase} from '../server/premium.mjs';
const now=1793718000000;
const request={platform:'apple',receipt:'opaque-test-receipt',planId:'monthly',userId:'account1'};
const verified={verified:true,environment:'sandbox',platform:'apple',productId:'mayhem_premium_monthly',userId:'account1',originalTransactionId:'test-transaction',expiresAt:now+60000,signedAt:now,revoked:false};
test('approved prices are exact minor-unit USD values',()=>{
  assert.equal(plans.monthly.priceMinor,999);assert.equal(plans.annual.priceMinor,7999);
  assert.equal(plans.monthly.period,'month');assert.equal(plans.annual.period,'year');
});
test('store verification rejects missing adapters, production, wrong accounts and products',async()=>{
  await assert.rejects(verifySandboxPurchase(request,null,now));
  for(const patch of [{verified:false},{environment:'production'},{userId:'another'},{productId:'unknown'},{platform:'google'},{expiresAt:'forever'},{signedAt:now+600000}])await assert.rejects(verifySandboxPurchase(request,async()=>({...verified,...patch}),now));
});
test('verified revocation and expiry disable sandbox access',async()=>{
  assert.equal((await verifySandboxPurchase(request,async()=>verified,now)).active,true);
  for(const patch of [{revoked:true},{expiresAt:now-1}])assert.equal((await verifySandboxPurchase(request,async()=>({...verified,...patch}),now)).active,false);
});

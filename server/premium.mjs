export const plans=Object.freeze({
  monthly:Object.freeze({id:'monthly',currency:'USD',priceMinor:999,period:'month',productId:'mayhem_premium_monthly'}),
  annual:Object.freeze({id:'annual',currency:'USD',priceMinor:7999,period:'year',productId:'mayhem_premium_annual'})
});

// Adapters must call Apple/Google on the server and validate signatures, app identity,
// account binding, product, revocation and expiry. No accepting client receipt claims.
// No adapters are installed or enabled in the beta. Production is deliberately rejected.
export async function verifySandboxPurchase({platform,receipt,planId,userId},adapter,now=Date.now()){
  if(!['apple','google'].includes(platform)||!plans[planId]||typeof receipt!=='string'||receipt.length<1||receipt.length>16000)throw Error('Invalid verification request');
  if(!adapter)throw Error('Sandbox store verifier is not configured');
  const verified=await adapter({platform,receipt,productId:plans[planId].productId,userId,environment:'sandbox'});
  if(!verified||verified.verified!==true||verified.environment!=='sandbox'||verified.platform!==platform||verified.productId!==plans[planId].productId||verified.userId!==userId||typeof verified.originalTransactionId!=='string'||!verified.originalTransactionId||verified.originalTransactionId.length>256||!Number.isSafeInteger(verified.expiresAt)||!Number.isSafeInteger(verified.signedAt)||verified.signedAt>now+300000||typeof verified.revoked!=='boolean')throw Error('Store verification failed');
  return {platform,planId,originalTransactionId:verified.originalTransactionId,expiresAt:verified.expiresAt,signedAt:verified.signedAt,revoked:verified.revoked,active:!verified.revoked&&verified.expiresAt>now,environment:'sandbox'};
}

const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const html=readFileSync(path.join(__dirname,'../index.html'),'utf8');
test('Take Food Photo is a direct file-input touch target, not a hidden scripted click',()=>{
  assert.match(html,/<label class="file-control"[^>]*>Take Food Photo<input[^>]*capture="environment"/);
  assert.match(html,/<label class="file-control"[^>]*>Choose From Gallery<input/);
  assert.doesNotMatch(html,/onclick="\$\('mealCamera'\)\.click\(\)"/);
  assert.doesNotMatch(html,/id="mealCamera"[^>]*style="display:none"/);
});
test('Photo workflow resizes images locally and protects against oversize input',()=>{
  assert.match(html,/function previewMeal\(event\)/);
  assert.match(html,/file\.size>32\*1024\*1024/);
  assert.match(html,/canvas\.toDataURL\('image\/jpeg',0\.82\)/);
  assert.match(html,/mealImageData=data/);
  assert.match(html,/image\.onerror=/);
});
test('Android native scanner is preferred when available, with numeric-only result',()=>{
  assert.match(html,/typeof window\.MayhemAndroid\.scanFoodBarcode==='function'/);
  assert.match(html,/window\.MayhemAndroid\.scanFoodBarcode\(\)/);
  assert.match(html,/function onNativeBarcode\(value\)/);
  assert.match(html,/\^\\d\{8,14\}\$/);
  assert.match(html,/lookupBarcode\(\)/);
});
test('Browser scan has honest fallback and manual UPC lookup',()=>{
  assert.match(html,/if\(!\('BarcodeDetector' in window\)\)/);
  assert.match(html,/Enter a valid 8/);
  assert.match(html,/id="barcodeInput"/);
});

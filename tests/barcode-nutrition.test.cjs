const {test}=require('node:test');
const assert=require('node:assert/strict');
const {barcodeNutrition}=require('../beta-core.js');
const base={'energy-kcal_100g':200,proteins_100g:10,carbohydrates_100g:20,fat_100g:5};
test('uses complete 100g values when serving metadata exists but serving nutrients are missing',()=>{
 const r=barcodeNutrition({product_name:'Food',serving_quantity:30,nutriments:base});assert.equal(r.basis,'100 g');assert.equal(r.calories,200);
});
test('prefers complete serving nutrients even without serving quantity metadata',()=>{
 const r=barcodeNutrition({nutriments:{...base,'energy-kcal_serving':60,proteins_serving:3,carbohydrates_serving:6,fat_serving:1.5}});assert.equal(r.basis,'1 serving');assert.equal(r.calories,60);
});
test('never mixes bases or substitutes zero for missing or invalid values',()=>{
 assert.equal(barcodeNutrition({nutriments:{'energy-kcal_serving':60,proteins_100g:10,carbohydrates_100g:20,fat_100g:5}}),null);
 assert.equal(barcodeNutrition({nutriments:{...base,proteins_100g:null}}),null);
 assert.equal(barcodeNutrition({nutriments:{...base,fat_100g:Infinity}}),null);
 assert.equal(barcodeNutrition({nutriments:{...base,fat_100g:0}}).fat,0);
});

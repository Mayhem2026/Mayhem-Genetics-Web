const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const core = require('../beta-core.js');

test('backup validation rejects unsafe IDs, corrupt records and incomplete nutrition',()=>{
  const base = {goal:2000,foods:[],weights:[],calculations:[]};
  assert.equal(core.backup(base).stepGoal,8000);
  const food = {id:1,date:'2026-11-03',name:'Meal',cal:100,protein:1,carbs:2,fat:3};
  assert.equal(core.backup({...base,foods:[food]}).foods[0].cal,100);
  for(const value of [{...food,id:'1);alert(1)'},{...food,cal:'100'},{...food,protein:null}]) assert.throws(()=>core.backup({...base,foods:[value]}));
  assert.throws(()=>core.backup({...base,foods:[food,food]}));
  assert.throws(()=>core.backup({...base,weights:[{id:1,date:'bad',value:200}]}));
  assert.throws(()=>core.backup({...base,calculations:[{id:2,date:'now',mass:10,solvent:2,concentration:'5'}]}));
});
test('AI response requires real numeric values, including explicit zero',()=>{
  const value={name:'Lunch',calories:300,protein:20,carbs:0,fat:10};
  assert.equal(core.nutrition(value).carbs,0);
  for(const v of [null,'',false,'20',-1,Infinity]) assert.throws(()=>core.nutrition({...value,protein:v}));
});
test('HTTPS endpoints cannot embed keys or credentials',()=>{
  assert.equal(core.endpoint('https://example.com/analyze'),'https://example.com/analyze');
  for(const url of ['http://example.com','https://user:secret@example.com','https://example.com?key=secret','https://example.com#secret']) assert.throws(()=>core.endpoint(url));
});

function loadApp(){
 const html=readFileSync(new URL('../index.html',`file://${__filename}`),'utf8');
 const elements=new Map();
 const ctx = {clearRect(){},fillText(){},beginPath(){},lineTo(){},moveTo(){},stroke(){}};
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',style:{},dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},getContext:()=>ctx,scrollIntoView(){},pause(){},addEventListener(){}});return elements.get(id)};
 element('solvent').value='3';element('syringePreset').value='100,1';element('tickInterval').value='100';element('solverUnits').value='200';
 const storage=new Map();const sandbox={MayhemBeta:core,console,Date,Number,Math,JSON,Array,String,URL,AbortSignal,setTimeout,clearTimeout,setInterval,clearInterval,navigator:{},location:{protocol:'https:',hostname:'example.com'},alert(){},confirm:()=>true,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))},document:{getElementById:element,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},addEventListener(){},scrollTo(){}};
 sandbox.window=sandbox;vm.createContext(sandbox);
 for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if(match[1].trim())vm.runInContext(match[1],sandbox);
 return {run:code=>vm.runInContext(code,sandbox),element,html};
}
test('complete app boots, calculator retains v14 mass/volume and unit conversions',()=>{
 const app=loadApp();
 assert.match(app.html,/v15-beta\.2/);
 assert.equal(app.run('calc()'),10/3);
 app.run("changeDesired(0,'1');calc()");
 assert.ok(Math.abs(app.run('lastCalc.drawMl')-.3)<1e-10);
 app.run("setDesiredUnit('mcg')");assert.equal(app.run('Number(peptides[0].target)'),1000);
 assert.ok(Math.abs(app.run('lastCalc.drawMl')-.3)<1e-10);
 app.run("addPeptide();changeDesired(1,'2000');calc()");
 assert.match(app.element('calcWarning').textContent,/cannot be reached/);
 assert.equal(app.run('lastCalc'),null);
 app.run("changeDesired(1,'1000');calc();saveCalculation()");assert.equal(app.run('data.calculations.length'),1);
 app.run('data=MayhemBeta.backup(data);render()');
});
test('manual diary requires explicit nutrition, persists and restores',()=>{
 const app=loadApp();app.element('food').value='Lunch';app.element('cal').value='300';
 app.run('addFood()');assert.equal(app.run('data.foods.length'),0);
 for(const k of ['protein','carbs','fat'])app.element(k).value='0';
 app.run('addFood()');assert.equal(app.run('data.foods.length'),1);assert.equal(app.element('homeCal').textContent,'300');
 app.run('data=MayhemBeta.backup(JSON.parse(localStorage.getItem("mayhemData")));render()');assert.equal(app.run('data.foods[0].cal'),300);
});

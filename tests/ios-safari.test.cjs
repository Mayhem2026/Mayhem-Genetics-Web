const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=name=>readFileSync(join(root,name),'utf8');
test('iOS Safari web app manifest is same-origin, secure scope and includes an icon',()=>{
 const m=JSON.parse(read('manifest.webmanifest'));
 assert.equal(m.display,'standalone');
 assert.equal(m.scope,'./');
 assert.ok(m.start_url.startsWith('./'));
 assert.ok(!/https?:/.test(m.start_url));
 assert.ok(m.icons.some(i=>i.src==='./ios-beta-icon.svg'));
 assert.ok(read('ios-beta-icon.svg').includes('viewBox="0 0 512 512"'));
});
test('Mayhem beta main page supports home-screen metadata without modifying navigation',()=>{
 const page=read('index.html');
 assert.ok(page.includes('name="apple-mobile-web-app-capable"'));
 assert.ok(page.includes('rel="manifest" href="./manifest.webmanifest"'));
 assert.ok(page.includes('rel="apple-touch-icon"'));
 assert.ok(page.includes('name="theme-color"'));
 assert.ok(page.includes('id="franklyn"'));
 assert.ok(page.includes('Scan Food Barcode'));
 assert.ok(page.includes('Photograph Meal'));
});
test('iPhone onboarding clearly distinguishes Safari from TestFlight and provides support',()=>{
 const page=read('iphone-beta.html');
 assert.ok(page.includes('href="./"'));
 assert.ok(page.includes('Add to Home Screen'));
 assert.ok(page.includes('Safari'));
 assert.ok(page.includes('not a native TestFlight install'));
 assert.ok(page.includes('mailto:admin@mayhemgenetics.com'));
 assert.ok(page.includes('Premium payments are disabled'));
});
test('Pages artifact includes iPhone install guide and manifest',()=>{
 const workflow=read('.github/workflows/beta.yml');
 assert.match(workflow,/cp manifest\.webmanifest iphone-beta\.html ios-beta-icon\.svg dist\//);
 assert.match(workflow,/github\.event_name == 'workflow_dispatch'/);
 assert.ok(workflow.includes('reviewed_beta == true'));
});

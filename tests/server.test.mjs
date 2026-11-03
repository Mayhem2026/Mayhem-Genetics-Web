import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.mjs';

async function fixture(t, options={}) {
 const app=createApp({origin:'https://beta.example',...options});app.server.listen(0,'127.0.0.1');await new Promise(r=>app.server.once('listening',r));
 t.after(()=>app.close());
 const url='http://127.0.0.1:'+app.server.address().port;
 const post=(path,body,cookie='',origin='https://beta.example')=>fetch(url+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
 return {...app,url,post};
}
const credentials={email:'tester@example.com',password:'long-unique-beta-password'};
test('accounts use hashed passwords, HttpOnly sessions, logout revokes access',async t=>{
 const f=await fixture(t);const r=await f.post('/api/auth/register',credentials);assert.equal(r.status,200);
 const cookie=r.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);
 const user=f.db.prepare('SELECT * FROM users').get();assert.notEqual(user.password_hash,credentials.password);assert.equal(user.password_hash.length,128);
 assert.equal((await fetch(f.url+'/api/me',{headers:{Cookie:cookie}})).status,200);
 assert.equal((await f.post('/api/auth/login',{...credentials,password:'incorrect-but-long'})).status,401);
 const login=await f.post('/api/auth/login',credentials);assert.equal(login.status,200);
 assert.equal((await f.post('/api/auth/logout',{},cookie)).status,200);
 assert.equal((await fetch(f.url+'/api/me',{headers:{Cookie:cookie}})).status,401);
 assert.equal((await f.post('/api/auth/register',credentials)).status,409);
});
test('cross-origin requests and client-supplied premium claims cannot authorize AI',async t=>{
 const f=await fixture(t);assert.equal((await f.post('/api/auth/register',credentials,'','https://evil.example')).status,403);
 const r=await f.post('/api/auth/register',credentials),cookie=r.headers.get('set-cookie');
 assert.equal((await f.post('/api/nutrition/analyze',{premium:true,image:'data:image/png;base64,YQ=='},cookie)).status,403);
 assert.equal((await f.post('/api/billing/checkout',{},cookie)).status,404);
 assert.equal((await fetch(f.url+'/api/me')).status,401);
});
test('AI requires an unexpired server invitation, validates provider output and exposes no extra fields',async t=>{
 let output={name:'Meal',calories:200,protein:20,carbs:10,fat:5,privateKey:'never-return'};
 const f=await fixture(t,{analyze:async()=>output});const r=await f.post('/api/auth/register',credentials),cookie=r.headers.get('set-cookie');
 const user=f.db.prepare('SELECT id FROM users').get();f.db.prepare('INSERT INTO entitlements VALUES(?,?,?)').run(user.id,Date.now()+60000,'beta-invite');
 const request=()=>f.post('/api/nutrition/analyze',{image:'data:image/png;base64,YQ=='},cookie);
 const success=await request();assert.equal(success.status,200);assert.equal((await success.json()).nutrition.privateKey,undefined);
 output={...output,protein:null};assert.equal((await request()).status,502);
 f.db.prepare('UPDATE entitlements SET expires=0').run();assert.equal((await request()).status,403);
});
test('account validation, throttling and missing provider fail closed',async t=>{
 const f=await fixture(t);assert.equal((await f.post('/api/auth/register',{email:'invalid',password:'short'})).status,400);
 const r=await f.post('/api/auth/register',credentials),cookie=r.headers.get('set-cookie');
 const user=f.db.prepare('SELECT id FROM users').get();f.db.prepare('INSERT INTO entitlements VALUES(?,?,?)').run(user.id,Date.now()+60000,'beta-invite');
 assert.equal((await f.post('/api/nutrition/analyze',{image:'data:image/png;base64,YQ=='},cookie)).status,503);
 for(let i=0;i<9;i++)await f.post('/api/auth/login',{...credentials,password:'wrong-long-password'});
 assert.equal((await f.post('/api/auth/login',credentials)).status,429);
});
test('changing password revokes all sessions; deletion requires reauthentication and cascades',async t=>{
 const f=await fixture(t);
 let r=await f.post('/api/auth/register',credentials),cookie=r.headers.get('set-cookie');
 assert.equal((await f.post('/api/auth/delete',{password:'not-the-password'},cookie)).status,401);
 const nextPassword='a-different-long-password';
 assert.equal((await f.post('/api/auth/password',{password:credentials.password,newPassword:nextPassword},cookie)).status,200);
 assert.equal((await fetch(f.url+'/api/me',{headers:{Cookie:cookie}})).status,401);
 assert.equal((await f.post('/api/auth/login',credentials)).status,401);
 r=await f.post('/api/auth/login',{...credentials,password:nextPassword});cookie=r.headers.get('set-cookie');
 assert.equal(r.status,200);
 assert.equal((await f.post('/api/auth/delete',{password:nextPassword},cookie)).status,200);
 assert.equal(f.db.prepare('SELECT count(*) AS n FROM users').get().n,0);
 assert.equal(f.db.prepare('SELECT count(*) AS n FROM sessions').get().n,0);
});
test('sandbox verification prevents cross-account replay and cannot unlock production AI',async t=>{
 let signedAt=Date.now();
 const f=await fixture(t,{verifyStore:async request=>({verified:true,platform:request.platform,environment:'sandbox',productId:request.productId,userId:request.userId,originalTransactionId:'same-purchase',expiresAt:Date.now()+60000,signedAt,revoked:false})});
 const cookie=(await f.post('/api/auth/register',credentials)).headers.get('set-cookie');
 const request={platform:'google',receipt:'opaque-token',planId:'annual',premium:true};
 let r=await f.post('/api/premium/verify',request,cookie);assert.equal(r.status,200);assert.equal((await r.json()).productionPremium,false);
 assert.equal((await f.post('/api/premium/verify',request,cookie)).status,409);
 const other=(await f.post('/api/auth/register',{...credentials,email:'other@example.com'})).headers.get('set-cookie');signedAt++;
 assert.equal((await f.post('/api/premium/verify',request,other)).status,409);
 assert.equal((await f.post('/api/nutrition/analyze',{image:'data:image/png;base64,YQ=='},cookie)).status,403);
});

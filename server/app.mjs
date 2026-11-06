import {createNutritionProvider} from './nutrition-provider.mjs';
import {plans,verifySandboxPurchase} from './premium.mjs';
import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes, scrypt as deriveKey, timingSafeEqual, createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const scrypt = promisify(deriveKey);
const hash = value => createHash('sha256').update(value).digest('hex');
const root = fileURLToPath(new URL('../', import.meta.url));
const staticFiles = new Map([['/','index.html'],['/index.html','index.html'],['/beta-core.js','beta-core.js'],['/franklyn.js','franklyn.js'],['/franklyn-ui.js','franklyn-ui.js'],['/mayhem_logo.jpg','mayhem_logo.jpg']]);
// Sandbox verification adapters are disabled by default. No real checkout or production entitlement activation exists.
export function createApp({database = ':memory:', origin = 'http://localhost:3000', secureCookies = true, clock = Date.now, analyze = null, verifyStore = null} = {}) {
  const db = new DatabaseSync(database);
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS entitlements(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL,source TEXT NOT NULL CHECK(source='beta-invite'));
    CREATE TABLE IF NOT EXISTS sandbox_subscriptions(platform TEXT NOT NULL,transaction_id TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,plan_id TEXT NOT NULL,expires INTEGER NOT NULL,signed_at INTEGER NOT NULL,revoked INTEGER NOT NULL,PRIMARY KEY(platform,transaction_id));`);
  const buckets = new Map();
  function limit(key, max) {
    const now = clock(); let item = buckets.get(key);
    if (!item || now >= item.reset) {item = {count:0, reset:now + 15 * 60_000}; buckets.set(key,item);}
    if (buckets.size > 10000) for (const [k,v] of buckets) if(v.reset <= now) buckets.delete(k);
    return ++item.count <= max;
  }
  function session(req) {
    const token = /(?:^|;\s*)mayhem_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    return token && db.prepare('SELECT users.id,users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=? AND expires>?').get(hash(token),clock());
  }
  function entitlement(user) {
    return !!db.prepare('SELECT 1 FROM entitlements WHERE user_id=? AND expires>?').get(user.id,clock());
  }
  const server = createServer(async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Cache-Control','no-store');
    const send = (code, value) => {res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
    try {
      const path = new URL(req.url,origin).pathname;
      if (!path.startsWith('/api/')) {
        if (req.method !== 'GET' || !staticFiles.has(path)) return send(404,{error:'Not found'});
        const file = staticFiles.get(path), body = await readFile(resolve(root,file));
        res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'image/jpeg'});res.end(body);return;
      }
      if (req.method === 'GET' && path === '/api/premium/plans') return send(200,{plans:Object.values(plans),payments:false,verification:'sandbox-only'});
      if (req.method === 'GET' && path === '/api/health') return send(200,{status:'ok',payments:false});
      if (req.method === 'GET' && path === '/api/me') {
        const user = session(req);return user ? send(200,{email:user.email,premium:entitlement(user),payments:false}) : send(401,{error:'Sign in required'});
      }
      if (req.method !== 'POST') return send(405,{error:'Method not allowed'});
      // Same-origin browser clients only. Never accept the Android file:// null origin.
      if (req.headers.origin !== origin) return send(403,{error:'Origin not allowed'});
      if (!req.headers['content-type']?.startsWith('application/json')) return send(415,{error:'JSON required'});
      if (!limit('ip:'+req.socket.remoteAddress,100)) return send(429,{error:'Too many requests. Try later.'});
      const max = path === '/api/nutrition/analyze' ? 12*1024*1024 : path === '/api/premium/verify' ? 20000 : 4096;
      let size = 0, chunks = [];
      for await (const chunk of req) {size += chunk.length;if(size>max){send(413,{error:'Request too large'});return;} chunks.push(chunk);}
      let body;try {body = JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch {return send(400,{error:'Invalid JSON'});}
      if (!body || Array.isArray(body) || typeof body !== 'object') return send(400,{error:'Invalid request'});
      if (path === '/api/auth/register' || path === '/api/auth/login') {
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = body.password;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254 || typeof password!=='string' || password.length<12 || password.length>128) return send(400,{error:'Enter a valid email and a password of 12–128 characters'});
        if (!limit('auth:'+email,10)) return send(429,{error:'Too many attempts. Try later.'});
        let user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
        const salt = user?.salt || randomBytes(16).toString('hex');
        const digest = await scrypt(password,salt,64);
        if(path.endsWith('/login'))user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
        if (path.endsWith('/register')) {
          if (user) return send(409,{error:'Unable to create this account. Try signing in.'});
          user = {id:randomBytes(16).toString('hex'),email};
          try {db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(user.id,email,salt,digest.toString('hex'));}catch {return send(409,{error:'Unable to create this account. Try signing in.'});}
        } else if (!user || !timingSafeEqual(Buffer.from(user.password_hash,'hex'),digest)) return send(401,{error:'Email or password is incorrect'});
        db.prepare('DELETE FROM sessions WHERE expires<=?').run(clock());
        const token = randomBytes(32).toString('hex');
        db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),user.id,clock()+7*24*60*60_000);
        res.setHeader('Set-Cookie',`mayhem_session=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=604800${secureCookies?'; Secure':''}`);
        return send(200,{email:user.email,premium:entitlement(user),payments:false});
      }
      const user = session(req);
      if (!user) return send(401,{error:'Sign in required'});
      if (path === '/api/auth/logout') {
        const token = /(?:^|;\s*)mayhem_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
        if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));
        res.setHeader('Set-Cookie',`mayhem_session=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0${secureCookies?'; Secure':''}`);
        return send(200,{signedOut:true});
      }
      if (path === '/api/auth/password' || path === '/api/auth/delete') {
        if(!limit('sensitive:'+user.id,5))return send(429,{error:'Too many attempts. Try later.'});
        const row=db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
        if(typeof body.password!=='string'||body.password.length>128)return send(400,{error:'Current password required'});
        const digest=await scrypt(body.password,row.salt,64);
        if(db.prepare('SELECT password_hash FROM users WHERE id=?').get(user.id)?.password_hash!==row.password_hash)return send(409,{error:'Account changed. Sign in again.'});
        if(!timingSafeEqual(Buffer.from(row.password_hash,'hex'),digest))return send(401,{error:'Current password is incorrect'});
        if(path.endsWith('/password')){
          if(typeof body.newPassword!=='string'||body.newPassword.length<12||body.newPassword.length>128)return send(400,{error:'New password must have 12–128 characters'});
          const salt=randomBytes(16).toString('hex'),next=await scrypt(body.newPassword,salt,64);
          if(db.prepare('SELECT password_hash FROM users WHERE id=?').get(user.id)?.password_hash!==row.password_hash)return send(409,{error:'Account changed. Sign in again.'});
          db.exec('BEGIN');try{db.prepare('UPDATE users SET salt=?,password_hash=? WHERE id=?').run(salt,next.toString('hex'),user.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
        }else db.prepare('DELETE FROM users WHERE id=?').run(user.id);
        res.setHeader('Set-Cookie',`mayhem_session=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0${secureCookies?'; Secure':''}`);
        return send(200,{signedOut:true,deleted:path.endsWith('/delete')});
      }
      if(path === '/api/premium/verify'){
        if(!verifyStore)return send(503,{error:'Sandbox store verifier is not configured. Payments remain disabled.'});
        if(!limit('verify:'+user.id,20))return send(429,{error:'Too many verification attempts'});
        let result;try{result=await verifySandboxPurchase({platform:body.platform,receipt:body.receipt,planId:body.planId,userId:user.id},verifyStore,clock());}catch{return send(400,{error:'Store verification failed'});}
        const existing=db.prepare('SELECT * FROM sandbox_subscriptions WHERE platform=? AND transaction_id=?').get(result.platform,result.originalTransactionId);
        if(existing&&existing.user_id!==user.id)return send(409,{error:'This purchase is already associated with another account'});
        if(existing&&existing.signed_at>=result.signedAt)return send(409,{error:'This verification is not newer than the saved store state'});
        db.prepare('INSERT INTO sandbox_subscriptions VALUES(?,?,?,?,?,?,?) ON CONFLICT(platform,transaction_id) DO UPDATE SET plan_id=excluded.plan_id,expires=excluded.expires,signed_at=excluded.signed_at,revoked=excluded.revoked').run(result.platform,result.originalTransactionId,user.id,result.planId,result.expiresAt,result.signedAt,result.revoked?1:0);
        return send(200,{sandbox:result,productionPremium:false,payments:false});
      }
      if (path === '/api/nutrition/analyze') {
        if (!entitlement(user)) return send(403,{error:'A server-issued beta AI invitation is required'});
        if (!analyze) return send(503,{error:'Nutrition AI provider is not configured'});
        if (!limit('ai:'+user.id,20)) return send(429,{error:'AI request limit reached. Try later.'});
        if (typeof body.image!=='string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(body.image) || body.image.length>11.2*1024*1024) return send(400,{error:'Provide a JPEG, PNG, or WebP photo smaller than 8 MB'});
        const timeout = AbortSignal.timeout(30000);
        // Provider adapters receive the image only in memory, plus a cancellation signal.
        const result = await Promise.race([analyze(body.image,{signal:timeout}),new Promise((_,reject)=>timeout.addEventListener('abort',()=>reject(Error('Provider timeout')),{once:true}))]);
        if (!result || typeof result.name!=='string' || !result.name.trim() || result.name.length>200 || !['calories','protein','carbs','fat'].every(k=>typeof result[k]==='number'&&Number.isFinite(result[k])&&result[k]>=0)) return send(502,{error:'Provider returned incomplete nutrition data'});
        return send(200,{nutrition:{name:result.name,calories:result.calories,protein:result.protein,carbs:result.carbs,fat:result.fat}});
      }
      return send(404,{error:'Not found'});
    } catch {if(!res.headersSent)send(500,{error:'Service unavailable. Try again later.'});else res.end();}
  });
  server.requestTimeout = 35000;
  server.headersTimeout = 10000;
  server.maxConnections = 100;
  return {server,db,close:()=>new Promise(resolve=>server.close(()=>{db.close();resolve();}))};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const origin = process.env.APP_ORIGIN;
  if (!origin?.startsWith('https://')) throw Error('Set APP_ORIGIN to the HTTPS origin served by your reverse proxy');
  if (!process.env.MAYHEM_DATABASE) throw Error('Set MAYHEM_DATABASE to a durable private SQLite path');
  const analyze = createNutritionProvider({apiKey:process.env.OPENAI_API_KEY,model:process.env.MAYHEM_NUTRITION_MODEL});
  const app = createApp({database:process.env.MAYHEM_DATABASE,origin,analyze});
  app.server.listen(Number(process.env.PORT || 3000),'127.0.0.1');
}

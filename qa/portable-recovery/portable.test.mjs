import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {localStatus,seal,open,verifyJournal,verifyParts,partsFrom} from './portable.mjs';
test('reject hosted, suffix spoofing, redirects, alternate ports before access',()=>{
 for(const API_URL of ['https://host.supabase.co','http://127.0.0.1:54321.evil.invalid','http://localhost:54321','http://127.0.0.1:54320'])assert.throws(()=>localStatus({API_URL,DB_URL:'postgres://postgres:postgres@127.0.0.1:54322/postgres'}));
});
test('exact local destination accepted',()=>assert.ok(localStatus({API_URL:'http://127.0.0.1:54321',DB_URL:'postgres://postgres:postgres@127.0.0.1:54322/postgres'})));
test('authenticated backup restores binary bytes and rejects tamper/wrong key/truncation',()=>{
 const key=randomBytes(32),raw=randomBytes(300),enc=seal(raw,key);assert.deepEqual(open(enc,key),raw);
 const corrupt=Buffer.from(enc);corrupt[25]^=1;
 for(const [e,k] of [[corrupt,key],[enc,randomBytes(32)],[enc.subarray(0,20),key]])assert.throws(()=>open(e,k));
});
test('missing, duplicate or altered backup component blocks restoration',()=>{
 const buffers=Object.fromEntries(['application','auth','vault','storage','storage-files','roles','configuration','managed-ddl'].map(n=>[n,Buffer.from(n)]));
 const parts=partsFrom(buffers);verifyParts(parts);
 assert.throws(()=>verifyParts(parts.slice(1)));assert.throws(()=>verifyParts([...parts,parts[0]]));
 assert.throws(()=>verifyParts(parts.map((p,i)=>i? p:{...p,base64:'YQ=='})));
});
test('independent current journal is mandatory and stale journal blocks',()=>{
 verifyJournal('a'.repeat(64),'a'.repeat(64));assert.throws(()=>verifyJournal('a'.repeat(64),'b'.repeat(64)));assert.throws(()=>verifyJournal('',''));
});

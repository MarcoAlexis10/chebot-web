const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const dist = (...p) => fs.readFileSync(path.join(root,'dist',...p),'utf8');

test('QA284: public pages and city titles present Che Vení as two words',()=>{
 const pages=['index.html','buenos-aires/index.html','madrid/index.html','barcelona/index.html',
 'roma/index.html','lisboa/index.html','medellin/index.html','rio-de-janeiro/index.html','como-funciona/index.html'];
 for(const p of pages){
  const html=dist(p);
  assert.match(html,/Che Vení/,p);
  assert.doesNotMatch(html,/>\s*Chebot\s*</,p);
  assert.match(html,/https:\/\/www\.chebot\.chat/,p+' keeps current domain until DNS GO');
 }
 const home=dist('index.html');
 assert.match(home,/Hablar con Che Vení en WhatsApp/);
 assert.match(home,/Che<span> Vení<\/span>/);
 assert.match(home,/Hola%20Che%20Ven%C3%AD/);
 assert.doesNotMatch(home,/Hola%20Che Vení/);
});

test('QA284: manager labels are renamed; legacy auth/CSP contracts are preserved',()=>{
 const page=dist('manager/index.html');
 assert.match(page,/Che Vení Concierge/);
 assert.match(page,/Che<span> Vení<\/span>/);
 assert.doesNotMatch(page,/Che<span>bot<\/span>/);
 const signup=dist('manager/activar/index.html');
 assert.match(signup,/Bienvenido a Che Vení Concierge/);
 assert.match(signup,/CONCIERGE_SIGNUP_LEGAL_PUBLICATION_APPROVED\s*=\s*false/);
 assert.match(signup,/https:\/\/chebot-backend-git-concierge-v3-design-chebot\.vercel\.app/);
 assert.match(signup,/\/manager\/condiciones-concierge\//);
 assert.match(signup,/\/manager\/privacidad-concierge\//);
 assert.match(dist('manager/manager-auth.js'),/chebot_manager_preview_access_token/);
});

test('QA284: pending legal documents cannot be represented as approved',()=>{
 assert.equal(fs.existsSync(path.join(root,'manager-concierge-legal-publication-approval.json')),false);
 assert.equal(fs.existsSync(path.join(root,'dist/manager/privacidad-concierge/index.html')),false);
 assert.equal(fs.existsSync(path.join(root,'dist/manager/condiciones-concierge/index.html')),false);
 const {legalPublicationGate}=require('../manager-legal-publication-gate-v1.cjs');
 assert.equal(legalPublicationGate(root).approved,false);
});

test('QA284: old operational email, WhatsApp number, image URLs and tech identifiers remain stable',()=>{
 const originalEmail='Chebot2026@gmail.com';
 const code=fs.readFileSync(path.join(root,'build.js'),'utf8');
 assert.ok(code.includes(originalEmail));
 const home=dist('index.html');
 assert.match(home,/https:\/\/wa\.me\/541176689413/);
 assert.match(home,/\/og-chebot\.png/);
 assert.match(home,/\/favicon\.png/);
 assert.ok(fs.existsSync(path.join(root,'dist/og-chebot.png')));
});

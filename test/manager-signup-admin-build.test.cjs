// Static-only operator console checks, no Supabase, signup, Meta or personal data.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','dist','manager','altas','index.html'),'utf8');

test('console is hidden from search/navigation and relies on backend allowlisting',()=>{
  assert.match(html,/noindex,nofollow,noarchive/);
  assert.match(html,/chebot-backend-git-concierge-v3-design-chebot\.vercel\.app\/api\/concierge\/manager\/signup-admin/);
  assert.match(html,/sessionStorage\.getItem\(TOKEN_KEY\)/);
  assert.match(html,/Authorization:'Bearer '\+token/);
  assert.match(html,/credentials:'omit'/);
  assert.match(html,/id="editor" hidden/);
  assert.match(html,/id="review" hidden/);
});
test('invitation issue is explicit and does not send invitations',()=>{
  assert.match(html,/id="issue-confirm" required/);
  assert.match(html,/action:'issue'/);
  assert.match(html,/confirmIssue:document\.getElementById\('issue-confirm'\)\.checked/);
  assert.match(html,/INVITATION_PREPARED_NOT_SENT/);
  assert.match(html,/INVITATION_LEGAL_APPROVAL_REQUIRED/);
  assert.match(html,/row\.privacy_notice_version/);
  assert.match(html,/Enlace preparado, NO enviado/);
  assert.doesNotMatch(html,/auth\/v1\/signup|SUPABASE_SERVICE_ROLE_KEY|sendWhatsApp\(/);
});
test('screening is a one-time internal decision, not manager provisioning',()=>{
  assert.match(html,/action:'screen'/);
  assert.match(html,/confirmScreening:true/);
  assert.match(html,/shortlisted_pending_go_b/);
  assert.match(html,/Preseleccionar · requiere GO B/);
  assert.match(html,/row\.screening/);
  assert.match(html,/no podrá modificarse desde esta pantalla/);
  assert.doesNotMatch(html,/auth\/v1\/admin\/users|createManagerAccount\(/);
});
test('owner can close pending follow-up only with confirmation, no automatic provisioning',()=>{
  assert.match(html,/row\.screening\.decision==='needs_owner_followup'/);
  assert.match(html,/action:'resolve_followup'/);
  assert.match(html,/confirmResolution:true/);
  assert.match(html,/Cerrar: no seleccionado/);
  assert.match(html,/Cerrar: preseleccionar \(requiere GO B\)/);
  assert.match(html,/no crea una cuenta ni habilita Concierge/);
  assert.doesNotMatch(html,/auth\/v1\/admin\/users|createManagerAccount\(/);
});
test('requests are rendered using textContent, not injected HTML',()=>{
  assert.match(html,/item\.textContent=String\(value\|\|''\)/);
  assert.match(html,/card\.appendChild\(makeText\(/);
  assert.doesNotMatch(html,/innerHTML|document\.write\(/);
});
test('operator console inline JS compiles cleanly',()=>{
  const inline=html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(inline);
  new vm.Script(inline[1]);
});

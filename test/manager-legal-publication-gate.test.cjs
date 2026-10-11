// Offline verification of legally CLOSED signup and human release manifest.
// Synthetic HTML is discarded after each test; it is never deployed or approved.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {legalPublicationGate, APPROVAL_FILE, EXPECTED} =
  require('../manager-legal-publication-gate-v1.cjs');

const root = path.join(__dirname, '..');
const generated = fs.readFileSync(path.join(root,'dist','manager','activar','index.html'),'utf8');
const digest = str => crypto.createHash('sha256').update(str).digest('hex');
const fakePage = version =>
  '<!doctype html><html lang="es"><head><title>Documento sintético de prueba</title>'+
  '</head><body><p data-chebot-legal-version="'+version+'">'+
  'INVENTADO SOLO PARA TESTS. '.repeat(70)+
  '</p></body></html>';
function withFixture(fn) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chebot-legal-gate-'));
  try {
    const docs={};
    for(const [key,d] of Object.entries(EXPECTED)) {
      const p=path.join(dir,'dist',d.output);
      fs.mkdirSync(path.dirname(p),{recursive:true});
      const source=fakePage(d.version);
      fs.writeFileSync(p,source);
      docs[key]={version:d.version,sha256:digest(source)};
    }
    const approval={
      schema:'chebot-concierge-legal-release-v1',
      ownerApproved:true,legalContentApproved:true,commercialHostingApproved:true,
      approvedBy:'TEST FIXTURE NOT A REAL OPERATOR',approvedAt:'2026-10-11T12:00:00Z',
      documents:docs
    };
    const write=()=>fs.writeFileSync(path.join(dir,APPROVAL_FILE),JSON.stringify(approval));
    return fn({dir,docs,approval,write});
  } finally {
    fs.rmSync(dir,{recursive:true,force:true});
  }
}

test('no real owner-approved manifest => form stays CLOSED at build time',()=>{
  assert.equal(fs.existsSync(path.join(root,APPROVAL_FILE)),false);
  assert.deepEqual(legalPublicationGate(root),{
    approved:false,reason:'NO_OWNER_LEGAL_PUBLICATION_APPROVAL'
  });
  assert.match(generated,/var CONCIERGE_SIGNUP_LEGAL_PUBLICATION_APPROVED = false/);
  assert.match(generated,/id="legal-pending"[^>]*hidden/);
});
test('partial approval or malformed manifest cannot open signup',()=>{
  withFixture(({dir,approval,write})=>{
    approval.ownerApproved=false;write();
    assert.equal(legalPublicationGate(dir).approved,false);
    approval.ownerApproved=true;approval.commercialHostingApproved=false;write();
    assert.equal(legalPublicationGate(dir).approved,false);
    approval.commercialHostingApproved=true;approval.legalContentApproved=false;write();
    assert.equal(legalPublicationGate(dir).approved,false);
    approval.legalContentApproved=true;
    approval.documents.privacy.version='tourism-generic';write();
    assert.equal(legalPublicationGate(dir).approved,false);
    approval.documents.privacy.version=EXPECTED.privacy.version;
    fs.writeFileSync(path.join(dir,APPROVAL_FILE),'not-json');
    assert.equal(legalPublicationGate(dir).approved,false);
  });
});
test('missing, tampered or draft legal pages all fail CLOSED',()=>{
  withFixture(({dir,approval,write})=>{
    write();
    assert.equal(legalPublicationGate(dir).approved,true,'synthetic FULL approval must be structurally verifiable');
    const privatePage=path.join(dir,'dist',EXPECTED.privacy.output);
    fs.appendFileSync(privatePage,'TAMPERED');
    assert.equal(legalPublicationGate(dir).approved,false);
    fs.writeFileSync(privatePage,fakePage(EXPECTED.privacy.version));
    const termsPage=path.join(dir,'dist',EXPECTED.terms.output);
    fs.unlinkSync(termsPage);
    assert.equal(legalPublicationGate(dir).approved,false);
    const draft=fakePage(EXPECTED.terms.version)+'<p>BORRADOR</p>';
    fs.writeFileSync(termsPage,draft);
    approval.documents.terms.sha256=digest(draft);write();
    assert.equal(legalPublicationGate(dir).approved,false);
  });
});

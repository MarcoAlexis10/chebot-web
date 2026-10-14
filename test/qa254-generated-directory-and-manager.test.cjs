// QA254: Free directory generated HTML must match audited 7-city inventory.
// OFFLINE only. No backend calls, no Supabase keys, no deployments.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const venues=require('../directory-data.json');
const counts={
  'buenos-aires':126,
  'barcelona':49,
  'madrid':44,
  'roma':62,
  'lisboa':32,
  'medellin':37,
  'rio-de-janeiro':43
};
test('QA254: all 393 curated venues produce individual safe Google Maps cards in generated city pages',()=>{
  assert.equal(venues.length,393,'Require explicit review if inventory changes');
  let cards=0;
  for(const [city,expected] of Object.entries(counts)){
    const rows=venues.filter(v=>v.citySlug===city);
    assert.equal(rows.length,expected,'Unexpected '+city+' source count');
    const html=fs.readFileSync(path.join(root,'dist',city,'index.html'),'utf8');
    const marker='<section class="section" id="directorio">';
    const start=html.indexOf(marker);
    assert.ok(start>=0,city+' missing directory');
    const end=html.indexOf('Verificá horarios y disponibilidad directamente con cada establecimiento antes de ir.',start);
    assert.ok(end>start,city+' missing honest hours caveat');
    const directory=html.slice(start,end);
    const links=directory.match(/<a href="https:\/\/[^"]+" rel="noopener noreferrer">Abrir en Google Maps<\/a>/g)||[];
    assert.equal(links.length,expected,'Mismatch between HTML cards and records in '+city);
    assert.ok(!/<script\b|onerror\s*=|onclick\s*=/i.test(directory),city+' contains active HTML');
    cards+=links.length;
  }
  assert.equal(cards,393);
  console.log('QA254_WEB_393_CITY_CARDS_7_PAGES_SYNTHETIC_BUILD_PASS');
});
test('QA254: manager login eye and recovery page remain in isolated DEV build',()=>{
  const manager=fs.readFileSync(path.join(root,'dist','manager','index.html'),'utf8');
  const authJs=fs.readFileSync(path.join(root,'dist','manager','manager-auth.js'),'utf8');
  const reset=fs.readFileSync(path.join(root,'dist','manager','reset-password','index.html'),'utf8');
  assert.match(manager,/id="manager-password-visibility"/);
  assert.match(manager,/id="manager-forgot"/);
  assert.match(authJs,/passwordVisibility\.addEventListener\('click'/);
  assert.match(reset,/data-password-target="password"/);
  assert.match(reset,/data-password-target="confirm"/);
});

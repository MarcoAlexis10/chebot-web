// Offline Free web directory safe HTML serialization and Maps link validation.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {escapeDirectoryHtml,verifiedGoogleMapsUrl}=require('../directory-html-safety.cjs');

test('venue text cannot inject HTML or break attributes',()=>{
 const malicious='<img src=x onerror="alert(1)">&\'';
 assert.equal(escapeDirectoryHtml(malicious),
   '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;');
 assert.equal(escapeDirectoryHtml('Café & Bar'),'Café &amp; Bar');
 assert.equal(escapeDirectoryHtml(null),'');
});

test('directory links allow only HTTPS Google Maps destinations',()=>{
 assert.equal(verifiedGoogleMapsUrl('https://www.google.com/maps/search/?api=1&query=Test'),
   'https://www.google.com/maps/search/?api=1&query=Test');
 assert.equal(verifiedGoogleMapsUrl('https://maps.app.goo.gl/test'),
   'https://maps.app.goo.gl/test');
 for(const invalid of [
   'javascript:alert(1)','http://www.google.com/maps/search/',
   'https://www.google.com.evil.invalid/maps/',
   'https://evil.invalid/redirect?to=google',
   'https://www.google.com/other-path',
   'https://fake@www.google.com/maps/search/',
   '" onmouseover="alert(1)'
 ]) assert.equal(verifiedGoogleMapsUrl(invalid),null,invalid);
});

test('all current public static data rows have complete and safe directory fields',()=>{
 const data=require('../directory-data.json');
 assert.ok(Array.isArray(data)&&data.length>=393,'public directory must retain 393+ validated venues');
 const minimumByCity={
   'buenos-aires':126,'madrid':44,'barcelona':49,'roma':62,
   'lisboa':32,'medellin':37,'rio-de-janeiro':43
 };
 for (const [city,minimum] of Object.entries(minimumByCity)) {
   const count=data.filter(row=>row.citySlug===city).length;
   assert.ok(count>=minimum,city+' coverage unexpectedly decreased: '+count);
 }
 const seen=new Set();
 for(const venue of data) {
   assert.ok(['restaurant','bar'].includes(venue.category));
   assert.ok(String(venue.name||'').trim());
   assert.ok(String(venue.neighborhood||'').trim());
   assert.ok(String(venue.address||'').trim());
   assert.ok(verifiedGoogleMapsUrl(venue.mapsUrl),venue.name);
   const id=String(venue.citySlug)+'|'+String(venue.name).normalize('NFD')
     .replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
   assert.ok(!seen.has(id),'duplicate public venue: '+id);
   seen.add(id);
 }
});

test('generated city cards use encoded venue fields and safe links',()=>{
 const data=require('../directory-data.json');
 const byCity=new Map(data.map(v=>[v.citySlug,true]));
 for(const city of byCity.keys()) {
   const html=fs.readFileSync(path.join(__dirname,'..','dist',city,'index.html'),'utf8');
   assert.match(html,/id="directorio"/);
   assert.doesNotMatch(html,/<a href="(?:javascript:|http:)/i);
   assert.match(html,/rel="noopener noreferrer">Abrir en Google Maps<\/a>/);
 }
});

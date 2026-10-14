// Free public directory: escape untrusted catalog fields before HTML templating.
// No network calls, no credentials, no generated files.
function escapeDirectoryHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[character]);
}
function verifiedGoogleMapsUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (url.hostname === 'www.google.com' && url.pathname.startsWith('/maps')) return url.href;
    if (url.hostname === 'maps.app.goo.gl') return url.href;
    return null;
  } catch { return null; }
}
module.exports = { escapeDirectoryHtml, verifiedGoogleMapsUrl };

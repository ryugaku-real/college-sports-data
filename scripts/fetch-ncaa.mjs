// Writes data/athletics.csv rows for NCAA D1/D2/D3 from the public NCAA directory API.
// Columns: domain,association,division,conference,sports,athleticUrl  (sports left empty: not in this API)
import { writeFileSync, mkdirSync } from 'node:fs';
const dom = (u) => (u ?? '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
const rows = ['domain,association,division,conference,sports,athleticUrl'];
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function getJson(url) {
  for (let i = 1; i <= 4; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      const text = await res.text();
      if (res.ok && text.trimStart().startsWith('[')) return JSON.parse(text);
      console.warn(`attempt ${i}: HTTP ${res.status}, not JSON`);
    } catch (e) { console.warn(`attempt ${i}: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 3000 * i));
  }
  return null;
}

let ok = true;
for (const [d, label] of [['I', 'D1'], ['II', 'D2'], ['III', 'D3']]) {
  const list = await getJson(`https://web3.ncaa.org/directory/api/directory/memberList?type=12&division=${d}`);
  if (!list) { ok = false; break; }
  for (const m of list) {
    if (m.deactive === 'Y' || !m.webSiteUrl) continue;
    rows.push([dom(m.webSiteUrl), 'NCAA', label, (m.conferenceName ?? '').trim().replace(/,/g, ''), '', (m.athleticWebUrl ?? '').trim()].join(','));
  }
}
if (!ok) {
  // conference names are optional: keep the previous data/athletics.csv (committed) instead of failing the whole update
  console.warn('NCAA directory unavailable; keeping previous data/athletics.csv');
  process.exit(0);
}
mkdirSync('data', { recursive: true });
writeFileSync('data/athletics.csv', rows.join('\n') + '\n');
console.log(`wrote ${rows.length - 1} NCAA rows`);

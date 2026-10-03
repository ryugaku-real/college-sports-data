// Builds the full school list from the U.S. College Scorecard data
// (location, public/private, 2yr/4yr, tuition). Athletic data (association,
// division, sports) comes from data/athletics.json (see scripts/build-athletics.py, EADA data).
//
//   node scripts/build-data.mjs   (no API key needed: uses data/scorecard.json)
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';

// College Scorecard institution data. CI runners get HTTP 403 from the Scorecard download hosts, so the needed
// columns are kept in data/scorecard.json (refresh ~yearly with `npm run refresh:scorecard`, run from a normal machine).
async function loadScorecard() {
  return JSON.parse(readFileSync('data/scorecard.json', 'utf8')).rows;
}

const dom = (u) => (u ?? '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
// unitid -> { association, division, sports } from scripts/build-athletics.py (EADA data)
const ath = new Map(Object.entries(JSON.parse(readFileSync('data/athletics.json', 'utf8'))));
// optional: NCAA conference names by website domain from scripts/fetch-ncaa.mjs
const conf = new Map();
if (existsSync('data/athletics.csv')) {
  for (const line of readFileSync('data/athletics.csv', 'utf8').trim().split('\n').slice(1)) {
    const [domain, , , conference, , athleticUrl] = line.split(',');
    conf.set(domain, { conference, athleticUrl });
  }
}

// manual fixes for fast-changing facts: { "<unitid>": { conference, athleticsUrl, scholarshipUrl, ... } }
const overrides = existsSync('data/overrides.json') ? JSON.parse(readFileSync('data/overrides.json', 'utf8')) : {};
// NAIA conference names (data/naia-conferences.csv from scripts/fetch-naia.py): match PDF names to Scorecard names.
const normName = (n) => n.toLowerCase().replace(/&/g, 'and').replace(/[–]/g, '-').replace(/\bthe\b|[.,'’]/g, '')
  .replace(/\bst\b/g, 'saint').replace(/\buniversity\b|\bcollege\b/g, '').replace(/[^a-z0-9]+/g, '');
const naiaConf = new Map(); // "norm|ST" -> conference
const naiaRows = [];
if (existsSync('data/naia-conferences.csv')) {
  for (const line of readFileSync('data/naia-conferences.csv', 'utf8').trim().split(/\r?\n/).slice(1)) {
    const m = line.match(/^(?:"([^"]*)"|([^,]*)),([A-Z]{2}),(.*)$/);
    if (m) { const row = { name: m[1] ?? m[2], state: m[3], conf: m[4].replace(/^"|"$/g, '') }; naiaRows.push(row); naiaConf.set(`${normName(row.name)}|${row.state}`, row.conf); }
  }
}
// fallback: unique school in the same state whose normalized name starts with (or is contained by) the PDF name
function naiaConference(name, state) {
  const exact = naiaConf.get(`${normName(name)}|${state}`);
  if (exact) return exact;
  const n = normName(name);
  const hits = naiaRows.filter((r) => r.state === state && (n.startsWith(normName(r.name)) || normName(r.name).startsWith(n)) && normName(r.name).length >= 8);
  return hits.length === 1 ? hits[0].conf : undefined;
}

const out = [];
for (const r of await loadScorecard()) {
  const a = ath.get(r.UNITID);
  if (!a || r.CURROPER !== '1' || !['1', '2', '3'].includes(r.PREDDEG)) continue; // only operating schools with a known athletic program
  const c = conf.get(dom(r.INSTURL));
  const num = (v) => (v && !isNaN(Number(v)) ? Number(v) : null);
  out.push({
    id: r.UNITID, name: r.INSTNM, level: r.PREDDEG === '3' ? '4year' : '2year',
    control: r.CONTROL === '1' ? 'public' : 'private', city: r.CITY, state: r.STABBR,
    lat: num(r.LATITUDE) ?? undefined, lng: num(r.LONGITUDE) ?? undefined, ...a,
    conference: (a.association === 'NCAA' ? c?.conference : undefined) || (a.association === 'NAIA' ? naiaConference(r.INSTNM, r.STABBR) : undefined),
    athleticsUrl: a.association === 'NCAA' && c?.athleticUrl ? `https://${c.athleticUrl}` : undefined,
    athleticScholarship: ['D1', 'D2', 'NJCAA-D1', 'NJCAA-D2', 'NAIA'].includes(a.division),
    scholarshipNote: a.division === 'D3' || a.division === 'NJCAA-D3' ? 'D3はアスリート奨学金なし(学業・ニーズ型のみ)'
      : a.association === 'CCCAA' || a.association === 'NWAC' ? `${a.association}は原則アスリート奨学金なし`
      : a.association === 'NCAA' ? 'アスリート奨学金は競技・学校により異なります(Ivy Leagueなど例外あり)' : 'アスリート奨学金は競技・学校により異なります',
    avgNetPrice: num(r.NPT4_PUB) ?? num(r.NPT4_PRIV), tuitionInState: num(r.TUITIONFEE_IN), tuitionOutOfState: num(r.TUITIONFEE_OUT),
    website: /^https?:/.test(r.INSTURL) ? r.INSTURL : `https://${r.INSTURL}`, verified: false,
  });
}
for (const sc of out) Object.assign(sc, overrides[sc.id] ?? {});
mkdirSync('public-data', { recursive: true });
const updatedAt = new Date().toISOString();
writeFileSync('public-data/schools.json', JSON.stringify({ updatedAt, schools: out }));
console.log(`wrote ${out.length} schools`);

"""NAIA conference membership from the official NAIA "Schools by Conference" PDF -> data/naia-conferences.csv
(columns: name,state,conference). Needs `pdftotext` (poppler-utils). The PDF URL changes each year:
   NAIA_PDF_URL=... python3 scripts/fetch-naia.py
If the download or parse fails, the previous CSV is kept.
"""
import csv, os, re, subprocess, sys, urllib.request

URL = os.environ.get('NAIA_PDF_URL', 'https://www.naia.org/wp-content/uploads/2026/07/2026_2027-NAIA-Schools-by-Conference.pdf')
try:
    req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'})
    open('naia.pdf', 'wb').write(urllib.request.urlopen(req, timeout=60).read())
    text = subprocess.run(['pdftotext', 'naia.pdf', '-'], capture_output=True, text=True, check=True).stdout
except Exception as e:
    print('NAIA PDF unavailable, keeping previous data:', e); sys.exit(0)

conf, rows, heads = None, [], {}
for l in (x.strip() for x in text.splitlines()):
    if not l:
        continue
    school = re.match(r'^(.*?)\s[-–]\s([A-Z]{2})$', l)
    head = None if school else re.match(r'^(.+?)\s\((\d+)\)$', l)
    if head:
        conf = head.group(1).strip()
        if conf != 'Total Schools':
            heads[conf] = int(head.group(2))
        else:
            conf = None
    elif school and conf:
        rows.append((school.group(1).strip(), school.group(2), conf))

counts = {}
for _, _, c in rows:
    counts[c] = counts.get(c, 0) + 1
bad = {c: (n, counts.get(c, 0)) for c, n in heads.items() if counts.get(c, 0) != n}
if bad or len(rows) < 150:
    print('NAIA PDF parse looks wrong, keeping previous data:', bad); sys.exit(0)

with open('data/naia-conferences.csv', 'w', newline='') as f:
    w = csv.writer(f, lineterminator='\n'); w.writerow(['name', 'state', 'conference']); w.writerows(rows)
print(f'wrote {len(rows)} NAIA schools in {len(heads)} conferences')

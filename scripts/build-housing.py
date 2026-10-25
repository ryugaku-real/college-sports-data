"""Build data/housing.json from the IPEDS Institutional Characteristics file (IC<year>.csv,
https://nces.ed.gov/ipeds/datacenter/data/IC<year>.zip).  Usage: python3 scripts/build-housing.py IC2023.csv 2023-24
room: 1 = school offers on-campus housing, 0 = no.  Amounts are typical yearly charges in USD."""
import csv, json, sys
src, year = sys.argv[1], sys.argv[2]
num = lambda v: int(float(v)) if v not in (None, '', '.', '-1', '-2') and float(v) > 0 else None
out = {}
for r in csv.DictReader(open(src, encoding='utf-8-sig')):
    room = {'1': 1, '2': 0}.get(r.get('ROOM'))
    e = {'dorm': room, 'year': year}
    for k, f in (('cap', 'ROOMCAP'), ('roomAmt', 'ROOMAMT'), ('boardAmt', 'BOARDAMT'), ('roomBoardAmt', 'RMBRDAMT')):
        v = num(r.get(f))
        if v is not None: e[k] = v
    out[r['UNITID']] = e
json.dump(out, open('data/housing.json', 'w'), separators=(',', ':'))
print(len(out), 'schools')

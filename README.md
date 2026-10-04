# college-sports-data
College Sports Finder アプリ用の公開データ(米国の4年制大学・短大: NCAA / NAIA / NJCAA / CCCAA / NWAC)。

- 配信ファイル: `public-data/schools.json`(毎週月曜に GitHub Actions が自動更新)
- 出典: 米国教育省 EADA(競技・所属・運動奨学金総額)、College Scorecard(場所・学費)、NCAA Directory(カンファレンス)
- 手動修正: `data/overrides.json`(キーは unitid)。更新後も上書きされません
- `data/scorecard.json` は年1回、普通のPCで `node scripts/refresh-scorecard.mjs` を実行して更新(GitHubのサーバーからは配布元が403のため)

アプリ側の取得先: `https://raw.githubusercontent.com/ryugaku-real/college-sports-data/main/public-data/schools.json`

## 短大(NJCAA / CCCAA / NWAC)のカンファレンス・地区を追加する
公式サイトの一覧から、次の形式のCSVを `data/` に置くだけで、次回の更新から反映されます(列: `name,state,conference`)。
- `data/njcaa-conferences.csv`(例: `Hutchinson Community College,KS,NJCAA Region 6 / Kansas Jayhawk CCC`)
- `data/cccaa-conferences.csv`
- `data/nwac-conferences.csv`
学校名はScorecardの名前に近ければ自動で照合されます(同じ州内で一意に決まるときのみ)。

## 出典メモ(カンファレンス・地区)
- NCAA: NCAA公式ディレクトリ(自動取得)
- NAIA: NAIA公式「Schools by Conference」PDF(自動取得、年度で更新)
- NWAC(北西部): Wikipedia「Northwest Athletic Conference」の加盟校表(Northern/Eastern/Western/Southern の地区)。手動取り込みなので、年に一度見直してください
- CCCAA(カリフォルニア): Wikipediaの各カンファレンスのページ(Bay Valley / Big 8 / Central Valley / Coast / Orange Empire / Pacific Coast / South Coast / Western State)。Golden Valley など一部の学校(Butte、Shasta、Lassen、Redwoods、Siskiyous、Feather River、Lake Tahoe、Cerro Coso、Palo Verde、Copper Mountain、Woodland、LA City)は所属が確認できず未入力
- NJCAA: Wikipediaの「NJCAAの地区ごとのカンファレンス」の表と、各カンファレンスのページの所属校から作成(`data/njcaa-conferences.csv`、地区名つき)。451校中402校。名前が違う学校は名前の近さで照合しており、コロラド・ネブラスカ・ワイオミングは州名つきのカンファレンスから、CUNY・シカゴ市立カレッジは名称から割り当て。未入力の学校(ニューヨーク州の多く、イリノイ州の一部、フロリダの一部など)は所属を確認できていません。年に一度見直してください

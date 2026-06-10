# TinyWeb 品質向上 — 偽インターネットにリアルさと遊び心を

2026年6月10日。TinyWeb（js/browser.js）を 7サイト構成から 11サイト構成に拡張し、ブラウザ chrome と各サイトの作り込みを強化した。方針は「ピクセル/タイニーの世界観はそのまま、本物のブラウザ体験の記憶に訴えるリアルさと、隅々に仕込む遊び心」。

## ブラウザ chrome の強化（リアルさ）

- **ステータスバー新設** — 下部に常設。リンク hover で遷移先 URL をプレビュー、ロード中は「Connecting to ...」→「Transferring data... (n KB)」と推移し、完了で「Done」。404 は「Done (404 Not Found)」、接続失敗は「Server not found: the big internet does not fit in here」
- **ファビコン** — URL バー左に 5x5 ピクセルのサイト別ファビコン。box-shadow 1px 描画の既存 pxArt ヘルパを流用
- **Cookie バナー** — 初回のみ「This site uses tiny cookies (1px each, fat free)」。Accept ボタンが2つあるのは古典ジョーク。localStorage で永続的に承諾を記憶

## 新サイト4つ（遊び心）

| URL | 内容 |
|---|---|
| `tiny://mail` | TinyMail。Inbox/Spam フォルダ、既読管理（localStorage）、メール本文からのリンク遷移。スパムは「3ピクセル幅王国の王子」「8px tall の HOT singles」など |
| `tiny://mart` | TinyMart。Invisible Pixel（0.00px）や Mystery Box（中に小さい Mystery Box）等6商品、カート、チェックアウトは必ず「TinyPay declined: insufficient pixels (balance: 0.00px)」 |
| `tiny://kevin` | GeoCities 風個人サイト。UNDER CONSTRUCTION 縞バナー、回る★、虹色タイトル、実際に増える訪問者カウンター、WebAudio 製の鳴る MIDI 風 BGM トグル |
| `tiny://prize` | スパム広告の着地ページ。「100万人目の訪問者!」、賞品請求すると 1px の白い点が本当にもらえる |

ホームのバナー広告（4種ローテーション）はだいたい tiny://prize に着地する。スパムメール → prize、広告 → prize、と偽インターネットの生態系を再現。

## 既存サイトの強化

- **ニュース** — ヘッドラインプール10本から日付シードで4本選出（日替わり）+ BREAKING ティッカー（marquee 風 CSS アニメ）。GEKKO v2 リビルドのニュースなど、デスクトップ世界と連動した記事
- **天気** — 実際の曜日・月から季節相応の気温を日付シード生成。12% の確率で「PIXEL RAIN」
- **ゲストブック** — 投稿が localStorage に永続化（最新20件）。XSS 対策に escapeHtml を既存投稿表示にも適用
- **検索** — google/youtube/amazon 等を検索すると「Did you mean: TinyTube?」と tiny 版に誘導、検索時間表示（0.000x seconds - the web is tiny）、0件時のジョーク3種
- **404** — 4種のメッセージローテーション（「This page is exactly 404 pixels away」等）
- **Webring** — news/fish/weather/guestbook/mart/kevin の6サイトを巡回する共通フッタ（prev/random/next + member n of 6）。90年代の個人サイト文化の再現

## 目玉: 接続エラーページの猫ランナー

`http://` 系 URL を開くと Connection Failed と共に **Chrome の恐竜ゲームのオマージュ**が遊べる。走るのはデスクトップペットと同じ世界観のピクセル猫で、木箱と魚の骨を飛び越える。

- SPACE / クリック / タップでジャンプ、スコアは時間経過で加算、速度は徐々に上昇
- ハイスコアは localStorage 保存（`tinyweb_runner_hi`）
- rAF ループは canvas が DOM から消えたら自動停止。ナビゲーション時は `stopErrGame()` で keydown リスナごと掃除
- キー入力はブラウザウィンドウが closed/minimized のときは無視

**学習ポイント**: 「エラー画面にゲームを仕込む」は Chrome が確立した UX パターンで、偽ブラウザの没入感を一気に引き上げる。エラーページこそ一番記憶に残る場所。

## 実装メモ

- 日替わりコンテンツは `daySeed()`（年月日 → 整数）+ 線形合同法の `seededRng()`。同じ日は何度開いても同じ紙面・同じ天気になり「今日の新聞」感が出る
- localStorage は `tinyweb_` プレフィックスで統一、`lsGet/lsSet` は try/catch でプライベートブラウジングでも壊れない
- ページ内で再描画が必要な操作（メール開封、カート追加）は `content.innerHTML = pages[url]()` → `bindPageInteractions(url)` の再実行で完結。Kevin の音楽トグルだけは再描画すると訪問者カウンターが二重加算されるため、ボタンの textContent を直接書き換える
- 検証はヘッドレス Chrome ハーネスで全11ページ巡回 + 操作（メール開封・カート・賞品請求・ゲストブック投稿・did-you-mean・ランナー6秒走行）の22チェック全 PASS

## ファイル

- `js/browser.js` — 本体（2175 → 約2700行）
- `index.html` — ファビコン span + ステータスバー div 追加
- `css/style.css` — #browser-favicon / #browser-status スタイル追加

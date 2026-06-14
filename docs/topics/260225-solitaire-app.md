# Klondike Solitaire アプリ追加

**日付**: 2026-02-25

## 変更概要

TinyDesktop に 12番目のアプリとして、クラシックなクロンダイク・ソリティアを追加。
Canvas ベース（101x132px）の IIFE として実装。

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `js/solitaire.js` | 新規作成 — ゲーム本体 |
| `index.html` | デスクトップアイコン、ウィンドウ、スタートメニュー、script タグ、About 12 installed |
| `css/style.css` | `.di-solitaire`, `.tb-solitaire`, `#solitaire-body`, `#solitaire-canvas` |
| `js/folder.js` | フォルダ位置を `(42,156)` → `(42,194)` に変更（ソリティアアイコンと重ならないように） |

## 実装詳細

### Canvas レイアウト（101x132）
```
Stock(2,2)  Waste(16,2)  [gap]  Found0(44,2)  Found1(58,2)  Found2(72,2)  Found3(86,2)
                          Tableau 7列 (y=24, x = 2 + col*14)
```

### カード描画パターン
- カードサイズ: 13x18px
- 列間隔: 14px（13px + 1px gap）
- 裏面 overlap: 3px, 表面 overlap: 5px
- 裏面: 濃緑 + ドットクロスハッチ
- 表面: クリーム色背景 + ランク（3x5 ピクセルフォント）+ スート（3x3 ビットマップ）
- 選択状態: シアンボーダー

### 操作
- クリック: カード選択 → 移動先クリック
- ダブルクリック: ファンデーションへ自動送り
- ストッククリック: 1枚ドロー or リサイクル

### 学習ポイント

1. **ピクセルフォントの再利用**: Tetris の FONT オブジェクト（3x5 ビットマップ）を流用。各行は4bitで、`1 << (3 - bit)` でビット判定。文字間は4pxにして小さいカードに収めた。

2. **ヒットテスト**: カードが重なるため、最後のカードから逆順に判定。重なり部分の高さ（3px or 5px）と最後のカードのフルサイズ（18px）を区別してテスト。

3. **IIFE パターン**: 他のアプリ（Tetris, Minesweeper等）と同じ `(function(){ ... })()` パターンで、グローバルスコープを汚染しない。

4. **MutationObserver**: ウィンドウの `class` 属性を監視し、closed/minimized の状態変化でゲームの start/stop を制御。

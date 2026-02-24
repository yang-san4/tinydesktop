# Terminal 大幅強化 (2026-02-24)

## 概要
`js/terminal.js` を 563行 → 約870行に拡張。シェル基盤のリファクタ、Unixコマンド追加、デスクトップ連携、お楽しみコマンドの4本柱で強化。

---

## 1. シェル基盤リファクタ

### トークナイザ（`tokenize()`）
`split(/\s+/)` から文字単位パーサに置き換え。

```javascript
// Before: クォートもパイプも扱えない
var parts = trimmed.split(/\s+/);

// After: クォート対応、演算子検出
function tokenize(line) {
  // '"', "'" をパース、|, >, >> を演算子トークンとして検出
  // エスケープ (\) にも対応
}
```

**学習ポイント**: シェルのトークナイザは正規表現 split では限界がある。状態マシン的に1文字ずつ読み進める方式が柔軟。

### パイプ `|`
```javascript
// print() に outputMode を追加
var outputMode = 'dom';   // 'dom' | 'buffer'
var outputBuffer = '';

function print(text) {
  if (outputMode === 'buffer') {
    outputBuffer += text + '\n';     // パイプ時はバッファに蓄積
  } else {
    output.textContent += text + '\n'; // 通常時はDOMに出力
  }
}

function captureOutput(cmd, args, stdin) {
  outputMode = 'buffer'; outputBuffer = '';
  commands[cmd](args, stdin);
  var result = outputBuffer;
  outputMode = 'dom'; outputBuffer = '';
  return result;
}
```

**学習ポイント**: グローバルな出力先を切り替えるだけで、既存コマンドを一切変更せずにパイプ対応できる。Unix哲学の「出力先を抽象化する」考え方。

### リダイレクト `>` / `>>`
```javascript
// captureOutput() で出力をキャプチャ → ファイルに書き込み
if (seg.redir.type === 'REDIR_APPEND') {
  existing = parent[name] || '';
  parent[name] = existing + (existing ? '\n' : '') + content;
} else {
  parent[name] = content;
}
```

### 変数展開 `$VAR`
```javascript
var envVars = { HOME: '/home/user', USER: 'user', ... };

function expandVars(tokens) {
  // WORD トークン内の $NAME を envVars[NAME] に置換
  val.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, function(m, name) {
    return envVars[name] || '';
  });
}
```

### パイプライン実行フロー
```
"ls -a | grep .txt > out.txt"
  ↓ tokenize()
[WORD:"ls", WORD:"-a", PIPE, WORD:"grep", WORD:".txt", REDIR_WRITE, WORD:"out.txt"]
  ↓ expandVars()
  ↓ splitOnPipes()
[{words:["ls","-a"], redir:null}, {words:["grep",".txt"], redir:{type:">", file:"out.txt"}}]
  ↓ 順次実行
1. captureOutput("ls", ["-a"]) → stdin
2. captureOutput("grep", [".txt"], stdin) → ファイルへ
```

### `&&` チェーン
```javascript
function splitOnAnd(line) {
  // クォート内の && は無視して分割
  // "echo hello && echo world" → ["echo hello", "echo world"]
}
```

---

## 2. コマンドシグネチャの統一

全コマンドが `function(args, stdin)` を受け取る形式に統一。
`stdin` はパイプ経由の文字列 or undefined。

```javascript
// stdin対応のヘルパー
function getFileOrStdin(args, stdin) {
  if (args.length > 0) { /* ファイルから読む */ }
  if (stdin) { return { data: stdin }; }   // パイプ入力を使う
  return { error: 'missing file operand' };
}
```

**学習ポイント**: `getFileOrStdin()` パターンで、grep/head/tail/wc/sort が「ファイル引数」と「パイプ入力」の両方に透過的に対応できる。

---

## 3. 追加コマンド一覧

### ファイル操作
| コマンド | 機能 |
|---|---|
| `mv <src> <dst>` | 移動/リネーム。dst がディレクトリならその中に移動 |
| `cp [-r] <src> <dst>` | コピー。`-r` でディレクトリ再帰コピー（`deepCopyNode()`） |
| `rm -r` | 既存 rm に再帰削除を追加。`PROTECTED_PATHS` でルート等を保護 |
| `tree [dir]` | Unicode罫線（└── ├── │）でツリー表示 |
| `find [dir] [-name pat]` | グロブ対応のファイル再帰検索 |

### テキスト処理（stdin対応）
`grep`, `head`, `tail`, `wc`, `sort`, `rev`

### デスクトップ連携
| コマンド | 機能 |
|---|---|
| `ps` | `.window, .widget` を列挙してPID/状態/名前を表示 |
| `kill <pid>` | PID指定でアプリを closed に |
| `close <app>` | 名前指定（appMap or タイトル部分一致）でアプリを閉じる |
| `export K=V` | 環境変数の設定 |
| `env` | 環境変数一覧 |
| `nano <file>` | インラインエディタ（^S保存, ^X終了, ↑↓行移動） |

### お楽しみ
`fortune`, `cal`（今日を`*`マーク）, `sl`（蒸気機関車アニメ）, `figlet`（3x5ピクセルフォント）, `uptime`, `hostname`, `yes`（20行制限）, `factor`（素因数分解）

---

## 4. nanoエディタのモーダル設計

```javascript
var editorMode = false;
var editorState = { filename, path, lines[], cursorLine, isNew };

// keydownハンドラの先頭でモード分岐
if (editorMode && editorState) {
  // ^S → 保存、^X → 終了、↑↓ → 行移動、Enter → 改行挿入
  // 通常文字 → 現在行に追加、Backspace → 1文字削除 or 行マージ
  return;
}
// 以下、通常のターミナルモード
```

**学習ポイント**: モーダルUIは `editorMode` フラグ1つで制御。既存のDOM要素（#terminal-output, #terminal-input）をそのまま再利用することで、新しいHTML要素を追加せずにエディタを実現。

---

## 5. 安全対策

- `PROTECTED_PATHS`: `rm -r /` 等を拒否
- `UNSAFE_NAMES`: `__proto__`, `constructor`, `prototype` をファイル名として拒否
- `noPipeCommands`: `clear`, `matrix`, `sl`, `nano` はパイプ内で実行不可
- `yes`: 20行で強制打ち切り
- `deepCopyNode()`: UNSAFE_NAMES をスキップしてプロトタイプ汚染を防止

---

## appMap 更新
`gekko`/`fps` → `window-fps`, `tetris` → `window-tetris` を追加。

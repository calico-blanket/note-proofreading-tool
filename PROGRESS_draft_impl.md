# 開発進捗・引き継ぎドキュメント

**プロジェクト:** note 校正支援ツール  
**リポジトリ:** https://github.com/calico-blanket/note-proofreading-tool  
**作成日:** 2026-05-02  
**対象読者:** 後継のコーディングエージェント・開発者

---

## プロジェクトの背景・目的

team_mirai_log の note.com 記事を書く際、過去記事での表記ゆれ（「係る」vs「かかる」など）を調べるのが手間という課題から生まれたツール。  
過去記事の全文を Firestore に格納し、Next.js の検索 UI から素早く参照できるようにした。さらに、気づいた表記ルールを「校正メモ」として蓄積・共有できる機能も追加している。

---

## 実装フェーズの記録

### フェーズ1：Pythonスクレイパー (`scraper/fetch_articles.py`)

**実装内容:**
- note.com 非公式API (`/api/v2/creators/{creator_id}/contents`) で記事一覧を取得
- 各記事の本文を取得して Firestore の `articles` コレクションに保存
- 差分取得対応（既存ID と照合し未取得のみ保存）
- `published_at`、`title`、`note_url`、`body`、`paragraphs`（段落分割）、`fetched_at` を保存

**発生した問題と解決策:**

**問題1: 記事本文APIが404を返す**  
`GET /api/v2/notes/{id}` で本文を取得しようとしたが、すべて404。  
→ note.com の本文取得APIは認証が必要なため外部からアクセス不可と判明。  
→ **解決:** 記事のHTMLページ (`noteUrl`) を `requests.get()` で直接スクレイピングし、BeautifulSoup で `<article>` タグのテキストを抽出する方法に切り替え。

```python
# 切り替え後のコード
res = requests.get(note_url, headers=BROWSER_HEADERS)
soup = BeautifulSoup(res.text, "html.parser")
article_tag = soup.find("article")
body = article_tag.get_text(separator="\n") if article_tag else ""
```

**問題2: サービスアカウントキーのパスが間違っていた**  
`scraper/.env` に `./serviceAccountKey.json` と書いていたが、実際のファイル名は `note-proofreading-tool-firebase-adminsdk-fbsvc-a6b00fcbc7.json` だった。  
→ **解決:** `.env` の `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` を正しいファイル名に修正。

**問題3: スクレイパーを間違ったディレクトリから実行した**  
プロジェクトルートから実行すると `.env` が見つからずFirebase初期化失敗。  
→ **解決:** `cd scraper` してから `python fetch_articles.py` を実行。

**結果:** 62件の記事を Firestore に保存成功。

---

### フェーズ2：Next.js プロジェクト初期化と Firestore 連携

**実装内容:**
- `create-next-app` で Next.js 15 / React 19 / TypeScript / Tailwind CSS プロジェクト作成
- `firebase-admin` でサーバーサイドから Firestore にアクセスする `src/lib/firestore-admin.ts` を実装
- `FIREBASE_SERVICE_ACCOUNT_KEY`（Base64）を `.env.local` で管理
- `GET /api/search?q=` エンドポイントで全記事の全文検索を実装

**発生した問題と解決策:**

**問題1: `create-next-app` が既存ファイルで失敗**  
`CLAUDE.md` などが既にあったため、プロジェクトルートでの初期化がブロックされた。  
→ **解決:** 一時ディレクトリ `nextjs-tmp/` に作成し、ファイルを手動でコピー後削除。

**問題2: `package.json` がコピーされなかった**  
マージ作業中に `package.json` が欠落し、`npm install` で最小限の `package.json` が生成された。  
→ **解決:** 必要な依存関係（next, react, react-dom, firebase, firebase-admin, typescript, tailwindcss など）を手動で `package.json` に記述し直し。

**問題3: `published_at` の型問題**  
Firestore に `published_at` が文字列として保存されていた（Pythonスクレイパーが文字列で保存）が、TypeScript 側では `FirebaseFirestore.Timestamp` 型を想定していた。`.toDate()` を呼ぶと TypeError になる。  
→ **解決:** 型チェックで両方に対応:

```typescript
const pa = data.published_at;
if (typeof pa === "string") {
  publishedAt = new Date(pa).toISOString();
} else if (typeof (pa as FirebaseFirestore.Timestamp).toDate === "function") {
  publishedAt = (pa as FirebaseFirestore.Timestamp).toDate().toISOString();
}
```

**問題4: `note_url` vs `url` フィールド名の不一致**  
TypeScript 側のインターフェースが `url` を想定していたが、スクレイパーは `note_url` として保存していた。  
→ **解決:** `src/lib/firestore-admin.ts` の `Article` インターフェースを `note_url` に修正。

**問題5: `firebase-admin` がクライアント側にバンドルされる**  
`page.tsx` が `SearchResult` 型を `src/lib/search.ts` からインポートしていたが、`search.ts` は `firebase-admin` をインポートしていた。クライアントコンポーネントから `firebase-admin` を参照するとビルドエラー。  
→ **解決:** クライアント用の型定義を `src/types/search.ts` に分離し、`page.tsx` はこちらからインポートするように変更。

**問題6: ESLint 設定エラー**  
`eslint.config.mjs` で `nextVitals is not iterable` エラー。  
→ **解決:** `FlatCompat` を使った形式に変更:

```javascript
import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
export default [...compat.extends("next/core-web-vitals", "next/typescript")];
```

---

### フェーズ3：検索 UI の実装

**実装内容:**
- `SearchBox.tsx`: テキスト入力 + 検索ボタン
- `ResultCard.tsx`: 記事タイトル・日付・ヒット箇所（前後文脈付き）のカード表示
- `HighlightText.tsx`: 検索語を `<mark>` タグで黄色ハイライト
- `page.tsx`: 検索状態管理（query/results/isLoading/hasSearched/error）

**発生した問題と解決策:**

**問題: curl で日本語クエリが空配列を返す**  
Git Bash の curl は日本語を URL エンコードせずに送信するため、サーバー側で空文字として受け取っていた。  
→ **解決:** フロントエンドの fetch 呼び出しで `encodeURIComponent()` を使用（これは元から実装済みだったためブラウザからは問題なし）。

---

### フェーズ3追加：校正メモ機能

**実装内容:**
- `src/types/notes.ts`: `ProofreadingNote`・`SaveNoteRequest` 型定義
- `src/app/api/notes/route.ts`: `GET /api/notes`（一覧取得）、`POST /api/notes`（新規保存）
- `src/app/api/notes/import/route.ts`: `POST /api/notes/import`（CSV一括インポート）
- `src/components/AddNoteForm.tsx`: モーダル形式の入力フォーム（検索語・参考記事を自動入力）
- `src/app/notes/page.tsx`: 校正メモ一覧テーブル + CSV エクスポート/インポート

**CSV エクスポートの実装ポイント:**  
Excel で文字化けしないよう UTF-8 BOM (`\uFEFF`) を先頭に付加。

```typescript
const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\n");
```

---

### フェーズ3追加：SearchBox のバグ修正

**発生した問題:**
検索ボタンが常にグレーアウトして押せない、または押せても何も起きない。

**調査過程:**
1. `disabled={isLoading || !inputValue.trim()}` が原因でボタンが無効 → `disabled={isLoading}` に変更しボタンは有効化
2. しかし押しても反応なし → `handleSearch()` が `inputValue` を参照するが、React の `onChange` によるステート更新が何らかの理由で機能していなかった

**根本原因:**  
React の制御コンポーネント（`value={inputValue}` + `onChange`）の状態同期が、開発環境（特に日本語 IME 使用時）で機能しないケースがあった。

**解決策:** `useState` を廃止し、`useRef` で DOM 値を直接参照する非制御コンポーネントに変更。

```typescript
// 変更前（制御コンポーネント）
const [inputValue, setInputValue] = useState("");
// ...
onChange={(e) => setInputValue(e.target.value)}
// handleSearch 内
const trimmed = inputValue.trim();

// 変更後（ref で DOM 直接参照）
const inputRef = useRef<HTMLInputElement>(null);
// onChange 不要
// handleSearch 内
const trimmed = (inputRef.current?.value ?? "").trim();
```

また、日本語 IME の変換確定 Enter と検索 Enter を区別するため `event.nativeEvent.isComposing` チェックを追加:

```typescript
function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === "Enter" && !event.nativeEvent.isComposing) {
    handleSearch();
  }
}
```

※ React の合成イベント型 `KeyboardEvent<T>` には `isComposing` が存在しないため、`event.nativeEvent.isComposing` でネイティブイベントから取得する必要がある（`event.isComposing` だと TypeScript ビルドエラー）。

---

### フェーズ4：GitHub Actions + デプロイ設定

**実装内容:**
- `.github/workflows/update_articles.yml`: 毎日 JST 6:00（UTC 21:00）の自動記事取得 + `workflow_dispatch` による手動実行
- `scraper/fetch_articles.py` 修正: `FIREBASE_SERVICE_ACCOUNT_KEY`（Base64）環境変数からの初期化に対応（ローカルはファイル読み込みとのフォールバック）
- `README.md`、`.env.local.example` の整備

**発生した問題と解決策:**

**問題1: GitHub Actions タブにワークフローが表示されない**  
当初 `workflow_dispatch:  # 日本語コメント` という形式だった。  
→ **解決:** `workflow_dispatch: {}` に変更し日本語コメントも英語に変更。（「There are no workflow runs yet」は認識済みの正常状態）

**問題2: `main` ブランチへのマージで競合**  
ローカルの `main` ブランチのワーキングツリーが `C:\Users\sesam`（ホームディレクトリ）に設定されており、ホームに存在する `package.json` 等と競合。  
→ **解決:** ローカルマージをスキップし、開発ブランチを直接リモートの `main` に push:

```bash
git push origin claude/condescending-nightingale-f05d35:refs/heads/main
```

**問題3: リモートが別プロジェクトを指していた**  
`git remote` が `https://github.com/calico-blanket/LatLng-copy.git`（別プロジェクト）を指していた。  
→ **解決:** `git remote set-url origin https://github.com/calico-blanket/note-proofreading-tool.git` で修正。

---

## 実際のファイル構成と各ファイルの役割

```
note-proofreading-tool/
│
├── .github/workflows/
│   └── update_articles.yml     毎日JST6:00にスクレイパーを実行するGitHub Actions
│
├── scraper/
│   ├── fetch_articles.py       メインスクレイパー。記事一覧取得→HTML本文スクレイピング→Firestore保存
│   ├── requirements.txt        requests, beautifulsoup4, firebase-admin, python-dotenv
│   ├── .env.example            ローカル用環境変数テンプレート（.envをgit管理外に）
│   └── README.md               スクレイパーの説明
│
├── src/
│   ├── app/
│   │   ├── page.tsx            メイン検索ページ（"use client"）
│   │   │                       状態: query, results, isLoading, hasSearched, error, showNoteForm, noteSaved
│   │   ├── notes/page.tsx      校正メモ一覧（"use client"）
│   │   │                       テーブル表示 + CSV export/import
│   │   ├── layout.tsx          共通レイアウト（Geist フォント）
│   │   ├── globals.css         Tailwind ベーススタイル
│   │   └── api/
│   │       ├── search/route.ts         GET /api/search?q= → 全文検索
│   │       ├── notes/route.ts          GET /api/notes, POST /api/notes
│   │       └── notes/import/route.ts   POST /api/notes/import（CSV一括）
│   │
│   ├── components/
│   │   ├── SearchBox.tsx       非制御inputコンポーネント（useRef使用）
│   │   │                       IME対応Enter処理（nativeEvent.isComposing）
│   │   ├── ResultCard.tsx      検索結果1件分のカード
│   │   ├── HighlightText.tsx   テキスト内の検索語をハイライト（<mark>タグ）
│   │   └── AddNoteForm.tsx     校正メモ追加モーダル（オーバーレイ）
│   │
│   ├── lib/
│   │   ├── firestore-admin.ts  Firebase Admin SDK 初期化（getApps()で重複初期化防止）
│   │   │                       Base64デコードによるサービスアカウント初期化
│   │   └── search.ts           searchArticles()関数 - 全記事取得→サーバーサイド文字列マッチ
│   │
│   └── types/
│       ├── search.ts           SearchResult, MatchedParagraph（クライアント安全な型）
│       └── notes.ts            ProofreadingNote, SaveNoteRequest
│
├── .env.local.example          Next.js 用環境変数テンプレート
├── .gitignore                  .env.local, serviceAccountKey.json, .next/, .claude/ など除外
├── eslint.config.mjs           FlatCompat を使った ESLint 設定
├── next.config.ts              標準 Next.js 設定
├── package.json                依存関係（next@15, react@19, firebase-admin@13, firebase@12）
├── README.md                   公開用 README
├── README_draft_impl.md        本番公開用 README 草稿（このファイルの兄弟）
└── PROGRESS_draft_impl.md      本ファイル
```

---

## 環境変数一覧と用途

### `.env.local`（Next.js サーバーサイド用）

| 変数名 | 用途 |
|--------|------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Admin SDK 初期化用。`serviceAccountKey.json` の内容を Base64 エンコードした値 |

### `scraper/.env`（Python スクレイパー用）

| 変数名 | デフォルト | 用途 |
|--------|-----------|------|
| `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` | `./serviceAccountKey.json` | ローカル用サービスアカウントキーのパス |
| `NOTE_CREATOR_ID` | `team_mirai_log` | スクレイピング対象の note.com クリエイターID |
| `REQUEST_INTERVAL_SECONDS` | `1.5` | リクエスト間隔（レート制限対策） |

### GitHub Actions Secrets

| シークレット名 | 用途 |
|--------------|------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | GitHub Actions でスクレイパーを実行するための Firebase 認証情報（Base64） |

---

## note.com API について

### 使用している API

**記事一覧取得（公式に近い非公式 API）:**
```
GET https://note.com/api/v2/creators/{creator_id}/contents?kind=note&page={page}
```
- ページネーション対応（`page` パラメータ）
- レスポンスに `id`、`key`（`n2e4af2e7d18c` 形式）、`title`、`published_at`、`noteUrl` が含まれる
- Firestore の document ID には `key` フィールドを使用（`id` は数値で衝突リスクあり）

**記事本文取得（HTML スクレイピング）:**
```
GET {noteUrl}  # 例: https://note.com/team_mirai_log/n/n2e4af2e7d18c
```
- `/api/v2/notes/{id}` エンドポイントは認証なしだと 404 を返すため使用不可
- HTML の `<article>` タグ内のテキストを BeautifulSoup で抽出
- ブラウザ偽装ヘッダーを使用（`User-Agent: Mozilla/5.0...`）

### 注意点
- note.com のHTML構造変更があると `<article>` タグの取得が失敗する可能性がある
- レート制限への配慮として `REQUEST_INTERVAL_SECONDS`（デフォルト1.5秒）のウェイトを設けている
- robots.txt の確認は実施していない

---

## 今後の拡張アイデア・既知の課題

### 機能拡張アイデア
- **検索精度向上**: 現在はサーバーサイドでの単純な文字列マッチ。Firestore の全文検索や Algolia 連携で高速化
- **校正メモの編集・削除**: 現在は追加のみ。行クリックで編集モーダルを開く機能
- **複数クリエイター対応**: `NOTE_CREATOR_ID` を複数指定できるよう拡張
- **検索履歴**: ブラウザ localStorage に検索履歴を保存
- **正規表現検索**: 高度なパターンマッチングに対応

### 既知の課題
- **検索パフォーマンス**: 全記事を Firestore から一括取得してサーバーサイドでフィルタリングしているため、記事数が増えると遅くなる（現在62件は問題なし）
- **`/notes` ページの500エラー**: 開発中に `.next/` の production build と dev server が混在して `/notes` ページが500を返すケースがあった。`npm run dev` を再起動すると解消する
- **note.com の構造変更リスク**: HTML スクレイピングのため、note.com 側のHTML変更で本文取得が失敗する可能性がある

---

## 引き継ぎ時の注意事項

### ローカル開発環境の特殊な状態
- git リポジトリのルートが `C:\Users\sesam`（ホームディレクトリ）になっており、`main` ブランチのワーキングツリーがホームに設定されている異常な状態
- **実際の開発は必ず worktree 内（`note-proofreading-tool/.claude/worktrees/...`）で行うこと**
- push は `git push origin <branch>:refs/heads/main` の形式で直接リモートへ

### Firebase
- Firestore コレクション名は `articles`（記事）と `proofreading_notes`（校正メモ）
- `articles` ドキュメントの `published_at` は **文字列型**（Timestamp ではない）— スクレイパーが ISO 文字列で保存しているため
- `proofreading_notes` の `created_at` は **Firestore Timestamp 型**（`FieldValue.serverTimestamp()` で設定）

### SearchBox コンポーネントのアーキテクチャ
- **非制御コンポーネント**（`value` prop なし、`useRef` で DOM 直接参照）
- `onChange` ハンドラは存在しない — React ステートは使わず DOM の実値を参照
- 変更時は `handleSearch` 内の `inputRef.current?.value` を参照すること

### サービスアカウントキー
- ファイル名: `note-proofreading-tool-firebase-adminsdk-fbsvc-a6b00fcbc7.json`
- 場所: `scraper/` 以下（`.gitignore` の `scraper/*.json` でgit管理外）
- **絶対にコミットしないこと**

# CLAUDE.md

このファイルは Claude Code がこのリポジトリで作業する際のガイダンスを提供します。

---

## プロジェクト概要

**note 校正支援ツール** — team_mirai_log の note.com 過去記事から表記パターンを全文検索し、校正メモを管理する Next.js 製 Web アプリ。

- フロントエンド: Next.js 15 / React 19 / TypeScript / Tailwind CSS
- バックエンド: Next.js API Routes + Firebase Admin SDK (Firestore)
- スクレイパー: Python 3.11+ (requests + BeautifulSoup4)
- CI/CD: GitHub Actions（毎日 JST 6:00 に自動記事取得）

---

## 言語設定

- コメントは**日本語**で記述する
- 変数名・関数名は英語、説明コメントは日本語
- エラーメッセージも日本語

---

## ディレクトリ構成

```
├── .github/workflows/update_articles.yml  # GitHub Actions
├── scraper/
│   ├── fetch_articles.py                  # note.com スクレイパー
│   └── requirements.txt
├── src/
│   ├── app/
│   │   ├── page.tsx                       # 検索ページ（"use client"）
│   │   ├── notes/page.tsx                 # 校正メモ一覧（"use client"）
│   │   └── api/
│   │       ├── search/route.ts            # GET /api/search?q=
│   │       ├── notes/route.ts             # GET/POST /api/notes
│   │       └── notes/import/route.ts      # POST /api/notes/import
│   ├── components/
│   │   ├── SearchBox.tsx                  # 非制御input（useRef）
│   │   ├── ResultCard.tsx
│   │   ├── HighlightText.tsx
│   │   └── AddNoteForm.tsx
│   ├── lib/
│   │   ├── firestore-admin.ts             # Firebase Admin 初期化
│   │   └── search.ts                      # 全文検索ロジック
│   └── types/
│       ├── search.ts                      # クライアント安全な型
│       └── notes.ts
└── .env.local.example
```

---

## Firestore 構成

### `articles` コレクション
スクレイパーが保存する記事データ。

| フィールド | 型 | 内容 |
|---|---|---|
| `title` | string | 記事タイトル |
| `note_url` | string | 記事の URL |
| `published_at` | **string** | ISO 8601 形式（Timestamp ではない） |
| `body` | string | 本文全文 |
| `paragraphs` | string[] | 段落分割済みテキスト |
| `fetched_at` | string | 取得日時 |

**注意:** `published_at` は Timestamp 型ではなく文字列型。検索ロジックで型チェックが必要。

### `proofreading_notes` コレクション
校正メモ。

| フィールド | 型 | 内容 |
|---|---|---|
| `original` | string | 原文（例: 係る） |
| `converted` | string | 変換後（例: かかる） |
| `note` | string | 備考 |
| `reference_title` | string | 参考記事タイトル |
| `reference_url` | string | 参考記事 URL |
| `created_at` | Timestamp | `FieldValue.serverTimestamp()` で設定 |

---

## 環境変数

### `.env.local`（Next.js サーバーサイド）
```env
FIREBASE_SERVICE_ACCOUNT_KEY=<serviceAccountKey.json を Base64 エンコードした値>
```

### `scraper/.env`
```env
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./serviceAccountKey.json
NOTE_CREATOR_ID=team_mirai_log
REQUEST_INTERVAL_SECONDS=1.5
```

### GitHub Actions Secrets
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Base64 エンコード済みサービスアカウントJSON

---

## 開発コマンド

```bash
# ローカル開発サーバー起動
npm run dev

# 型チェック + ビルド
npm run build

# スクレイパー実行（scraper/ ディレクトリ内で）
cd scraper && python fetch_articles.py
```

---

## 重要な実装上の注意

### SearchBox コンポーネント（非制御）
`onChange` + `useState` ではなく `useRef` で DOM 値を直接参照する設計。
`inputRef.current?.value` から値を取得すること。

### IME 対応の Enter キー処理
```typescript
if (event.key === "Enter" && !event.nativeEvent.isComposing) {
  handleSearch();
}
```
`event.isComposing` は React の合成イベント型に存在しないため `event.nativeEvent.isComposing` を使う。

### firebase-admin のクライアントバンドル防止
`firebase-admin` をインポートするファイルをクライアントコンポーネントから参照しないこと。
型定義は `src/types/` に分離して共有する。

### git の push 方法
ローカル `main` ブランチのワーキングツリーが `C:\Users\sesam` に設定されているため、
マージせず直接リモートへ push する：
```bash
git push origin <branch>:refs/heads/main
```

---

## note.com API

- **記事一覧:** `GET https://note.com/api/v2/creators/{creator_id}/contents?kind=note&page={page}`
- **記事本文:** `/api/v2/notes/{id}` は認証なしで 404 → HTML 直接スクレイピングで対応
  - `<article>` タグを BeautifulSoup で抽出
  - Firestore の document ID には数値 `id` ではなく文字列 `key`（例: `n2e4af2e7d18c`）を使用

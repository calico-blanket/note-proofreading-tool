# note 校正支援ツール

team_mirai_log の note.com 過去記事から表記パターンを全文検索し、校正メモを管理できる Next.js 製 Web アプリです。

---

## 機能一覧

- **全文検索** — Firestore に保存した記事本文をキーワードで検索し、前後の文脈付きでヒット箇所を表示
- **ハイライト表示** — 検索語をカード内で黄色ハイライト
- **校正メモ追加** — 検索結果から「原文／変換後／備考／参考記事」を記録してFirestoreに保存
- **校正メモ一覧** (`/notes`) — 保存済みメモをテーブル表示
- **CSV エクスポート** — UTF-8 BOM 付きで Excel 対応
- **CSV インポート** — 既存メモをCSVから一括登録
- **自動記事取得** — GitHub Actions で毎日 JST 6:00 に差分スクレイピング

---

## 技術スタック

| 分野 | 技術 | バージョン |
|------|------|------------|
| フロントエンド | Next.js (App Router) | 15.3.2 |
| UI ライブラリ | React | 19.0.0 |
| スタイリング | Tailwind CSS | 4.x |
| データベース | Firestore (Firebase Admin SDK) | firebase-admin 13.8.0 |
| スクレイパー | Python | 3.11+ |
| HTTP クライアント | requests + BeautifulSoup4 | — |
| 環境変数管理 | python-dotenv | — |
| CI/CD | GitHub Actions | — |
| ホスティング | Vercel | — |

---

## ディレクトリ構成

```
note-proofreading-tool/
├── .github/
│   └── workflows/
│       └── update_articles.yml   # 自動記事取得ワークフロー
├── scraper/
│   ├── fetch_articles.py         # note.com スクレイパー
│   ├── requirements.txt          # Python 依存パッケージ
│   ├── .env.example              # スクレイパー用環境変数テンプレート
│   └── README.md                 # スクレイパー説明
├── src/
│   ├── app/
│   │   ├── page.tsx              # メイン検索ページ
│   │   ├── notes/
│   │   │   └── page.tsx          # 校正メモ一覧ページ
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── search/route.ts   # GET /api/search?q=
│   │       └── notes/
│   │           ├── route.ts      # GET/POST /api/notes
│   │           └── import/
│   │               └── route.ts  # POST /api/notes/import
│   ├── components/
│   │   ├── SearchBox.tsx         # 検索入力欄
│   │   ├── ResultCard.tsx        # 検索結果カード
│   │   ├── HighlightText.tsx     # キーワードハイライト
│   │   └── AddNoteForm.tsx       # 校正メモ追加モーダル
│   ├── lib/
│   │   ├── firestore-admin.ts    # Firebase Admin 初期化
│   │   └── search.ts             # 記事全文検索ロジック
│   └── types/
│       ├── search.ts             # 検索関連型定義
│       └── notes.ts              # 校正メモ型定義
├── .env.local.example
├── README.md
└── package.json
```

---

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/calico-blanket/note-proofreading-tool.git
cd note-proofreading-tool
```

### 2. Firebase プロジェクトの作成

1. [Firebase コンソール](https://console.firebase.google.com) でプロジェクトを作成
2. **Firestore Database** を有効化（本番モード）
3. 「プロジェクトの設定」→「サービスアカウント」→「新しい秘密鍵の生成」でJSONをダウンロード
4. ダウンロードしたJSONを `scraper/serviceAccountKey.json` として保存

### 3. 環境変数の設定

**スクレイパー用 (`scraper/.env`)：**

```env
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./serviceAccountKey.json
NOTE_CREATOR_ID=team_mirai_log
REQUEST_INTERVAL_SECONDS=1.5
```

**Next.js 用 (`.env.local`)：**

`serviceAccountKey.json` を Base64 エンコードした値を設定します。

```bash
# Mac / Linux
base64 -i scraper/serviceAccountKey.json | tr -d '\n'

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("scraper\serviceAccountKey.json"))
```

```env
FIREBASE_SERVICE_ACCOUNT_KEY=<上記の Base64 文字列>
```

### 4. 依存パッケージのインストール

```bash
# Node.js
npm install

# Python
pip install -r scraper/requirements.txt
```

### 5. 初回記事取得の実行

```bash
cd scraper
python fetch_articles.py
```

team_mirai_log の全記事を Firestore へ保存します（2回目以降は差分のみ）。

### 6. ローカル起動

```bash
npm run dev
```

→ [http://localhost:3000](http://localhost:3000)

### 7. Vercel デプロイ

1. [Vercel](https://vercel.com) で「Add New Project」→ このリポジトリを選択
2. 「Environment Variables」に `FIREBASE_SERVICE_ACCOUNT_KEY`（Base64値）を登録
3. 「Deploy」をクリック

### 8. GitHub Actions の設定

1. リポジトリの「Settings」→「Secrets and variables」→「Actions」
2. `FIREBASE_SERVICE_ACCOUNT_KEY` を登録（Base64値）
3. 「Actions」タブ →「Update Articles from note.com」→「Run workflow」で動作確認

---

## 日常の使い方

1. ブラウザでアプリを開く
2. 検索ボックスに表記を入力して検索（例：「係る」「いくつか」）
3. ヒットした記事・箇所を確認
4. 「📝 校正メモに追加」から表記ルールを記録
5. `/notes` ページで校正メモを一覧確認・CSV でエクスポート

---

## 作者

<!-- 作者情報をここに記載 -->
```

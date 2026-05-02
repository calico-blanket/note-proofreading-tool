# note 校正支援ツール

team_mirai_log の note.com 過去記事から表記パターンを全文検索し、校正メモを管理できるWebアプリです。

---

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/<your-username>/note-proofreading-tool.git
cd note-proofreading-tool
```

### 2. 依存パッケージのインストール

**Node.js（Next.js アプリ）:**

```bash
npm install
```

**Python（スクレイパー）:**

```bash
pip install -r scraper/requirements.txt
```

### 3. Firebase プロジェクトの作成

1. [Firebase コンソール](https://console.firebase.google.com) でプロジェクトを作成
2. Firestore Database を有効化（本番モード）
3. 「プロジェクトの設定」→「サービスアカウント」→「新しい秘密鍵の生成」でJSONをダウンロード
4. ダウンロードしたJSONを `scraper/serviceAccountKey.json` として保存

### 4. 環境変数の設定

**スクレイパー用（`scraper/.env`）:**

```env
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./serviceAccountKey.json
NOTE_CREATOR_ID=team_mirai_log
REQUEST_INTERVAL_SECONDS=1.5
```

**Next.js アプリ用（`.env.local`）:**

`serviceAccountKey.json` の内容をBase64エンコードして設定します。

```bash
# Mac / Linux
base64 -i scraper/serviceAccountKey.json | tr -d '\n'

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("scraper\serviceAccountKey.json"))
```

出力された文字列を `.env.local` に記載します：

```env
FIREBASE_SERVICE_ACCOUNT_KEY=<上記のBase64文字列>
```

---

## 初回データ取得

```bash
cd scraper
python fetch_articles.py
```

team_mirai_log の記事を Firestore に保存します（初回は全件、2回目以降は差分のみ）。

---

## ローカル開発

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

---

## Vercel へのデプロイ

1. [Vercel](https://vercel.com) にログイン
2. 「Add New Project」→ GitHubリポジトリを選択してインポート
3. 「Environment Variables」に以下を登録：
   - `FIREBASE_SERVICE_ACCOUNT_KEY`（Base64エンコード済みのサービスアカウントJSON）
4. 「Deploy」をクリック

`main` ブランチへの push で自動的に再デプロイされます。

### FIREBASE_SERVICE_ACCOUNT_KEY の Base64 エンコード方法

**Mac / Linux:**
```bash
base64 -i serviceAccountKey.json | tr -d '\n'
```

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json"))
```

---

## GitHub Secrets の設定

GitHub Actions による毎日の自動記事取得を有効にするために設定します。

1. GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」を開く
2. 「New repository secret」をクリック
3. 以下を登録：
   - **Name:** `FIREBASE_SERVICE_ACCOUNT_KEY`
   - **Secret:** サービスアカウントJSONをBase64エンコードした値
4. 「Actions」タブで「Update Articles from note.com」を選択
5. 「Run workflow」で手動実行して動作確認

---

## 自動更新の仕組み

`.github/workflows/update_articles.yml` により、毎日 JST 6:00（UTC 21:00）に自動でスクレイパーが実行されます。

- 新規記事のみ差分取得して Firestore に保存
- `workflow_dispatch` による手動実行にも対応
- 実行ログは GitHub の「Actions」タブで確認できます
# note 校正支援ツール

team_mirai_log の note.com 過去記事から表記パターンを全文検索し、校正メモを管理できるWebアプリです。

---
 
## このツールについて
 
`note.com/team_mirai_log` に掲載している国会質疑記録の校正作業を支援するための内部ツールです。
過去記事の表記パターンを前後文付きで検索し、チームの校正ナレッジを蓄積できます。
 
---
 
## 使い方
 
### 1. 表記を検索する
 
検索窓にキーワードを入力して「検索」ボタンを押します。
 
- 例：`いくつか`、`係る`、`生成AI推進基本法`、`附則`
- ヒットした箇所は**前後の段落とあわせて表示**されます。
- 検索語は**黄色でハイライト**表示されます。
- 記事タイトルをクリックすると、元の note 記事を開けます。
- 
### 2. 校正メモを残す
 
検索結果の上部にある「📝 校正メモに追加」ボタンをクリックすると、
メモ入力フォームが開きます。
 
| 入力欄 | 説明 | 自動入力 |
|---|---|---|
| 原文 | 元の表記 | ✅ 検索語が入る |
| 変換後 | 採用する表記 | 手動入力 |
| 備考 | 使い分けのルールなど | 手動入力 |
| 参考記事 | 根拠にした記事 | ✅ 検索結果1件目が入る |
 
**記入例：**
 
| 原文 | 変換後 | 備考 |
|---|---|---|
| 幾つか | いくつか | ひらく |
| 例えば | たとえば | 「例」という意味の名詞で使う場合は「例え」でもよいが、接続詞はひらく |
| 御発言 | ご発言 | 尊敬語の御はひらく |
 
### 3. 校正メモ一覧を見る
 
画面右上の「校正メモ一覧 →」をクリックすると、
蓄積されたメモをテーブル形式で確認できます。
 
### 4. CSV でエクスポート・インポート
 
校正メモ一覧ページの「CSV エクスポート」ボタンで、
メモをスプレッドシート形式でダウンロードできます。
 
- ファイル名：`proofreading_notes_YYYYMMDD.csv`
- Excel・Google スプレッドシートで開けます
---
 
## note 標準検索との違い
 
note には、クリエイターページから記事を検索する機能が標準で備わっています。
 
**note 標準検索の使い方：**
1. https://note.com/team_mirai_log を開く
2. 右上の検索窓にキーワードを入力
3. 「@team_mirai_log の記事を検索」をクリック
または、note の検索窓に `from:@team_mirai_log キーワード` と入力しても検索できます。
 
**このツールが note 標準検索と異なる点：**
 
| | note 標準検索 | このツール |
|---|---|---|
| 検索結果 | 記事タイトルのみ | **前後の文脈付きで本文を表示** |
| ハイライト | なし | **検索語をハイライト表示** |
| 校正メモ | なし | **チームで蓄積・共有できる** |
| ログイン | note アカウントが必要 | **URL を知っていれば誰でも使える** |
 
---
 
## note 利用規約とスクレイピングについて
 
このツールは、`note.com/team_mirai_log` の記事を自動取得して Firestore に保存しています。
note の利用規約との関係について、以下のとおり整理します。
 
> 参照：[note ご利用規約](https://terms.help-note.com/hc/ja/articles/44943817565465-note-%E3%81%94%E5%88%A9%E7%94%A8%E8%A6%8F%E7%B4%84)（note 総則規約）
 
### 規約上の懸念と本ツールの対応
 
**懸念1：サーバーへの過度な負荷**
 
note 総則規約には「本サービスのサーバーに過度に負担をかける行為」が禁止事項として定められています。
 
→ **本ツールの対応：**
- リクエスト間隔を **1.5 秒以上** 確保しています。（必要に応じ更に間隔を開くことも可）
- **差分取得**のため、毎日の新規取得は新着記事数件のみです。
- 全記事を毎日再取得するような処理は行いません
**懸念2：自動取得・クローリング**
 
note の利用規約には「スクレイピング」「クローリング」を明示的に禁止する条項は現時点（2025年10月時点）では確認されていません。
ただし、「本サービスの運営に支障が生じると当社が独自に判断した場合」という包括的な禁止事項は存在します。
 
→ **本ツールの対応：**
- 取得対象は **チームみらい自身が著作権を持つ記事のみ**（`team_mirai_log` アカウント配下）
- 用途は **内部校正作業のみ**（外部への再配布・転載はしない）
- User-Agent にツール名を明示し、透明性を確保しています
**懸念3：著作権**
 
note の利用規約では「クリエイターが制作したデジタルコンテンツの著作権は、クリエイターに帰属する」と定められています。つまり、`team_mirai_log` の記事の著作権はチームみらい（運営）に帰属します。
 
本ツールの開発者はチームみらいのサポーターであり、運営サイドではありません。厳密には著作権者本人による利用とは言えないため、以下の点で影響を最小化しています：
 
→ **本ツールの対応：**
- 取得したデータは **Firestore（非公開）に保存**し、校正作業という**チーム内部利用のみ**に使用します
- 記事の外部への再配布・転載・二次利用は一切行いません
 
### まとめ
 
| リスク項目 | 評価 | 根拠 |
|---|---|---|
| サーバー過負荷 | ✅ 低リスク | 1日1回・差分のみ・間隔1.5秒以上 |
| 規約上の自動取得禁止 | ✅ 該当なし | 明示的禁止条項なし（2025年10月時点） |
| 著作権 | ⚠️ 要確認 | 運営サイドへの確認・承認を推奨 |
| 外部への情報漏洩 | ✅ 低リスク | 非公開 Firestore に保存・内部利用のみ |
 
> ⚠️ 利用規約は随時改定されます。定期的に [note ご利用規約](https://terms.help-note.com/hc/ja/articles/44943817565465-note-%E3%81%94%E5%88%A9%E7%94%A8%E8%A6%8F%E7%B4%84) を確認することを推奨します。

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

---

# ライセンス

基本はPrivateリポジトリを想定していますが、公開時はMITライセンスとします。
（作者：猫柄毛布）


- 新規記事のみ差分取得して Firestore に保存
- `workflow_dispatch` による手動実行にも対応
- 実行ログは GitHub の「Actions」タブで確認できます

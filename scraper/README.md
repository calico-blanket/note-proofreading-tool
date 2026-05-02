# note.com スクレイパー

note.com の非公式APIを使って記事を取得し、Firebase Firestore に保存するPythonスクリプトです。

---

## 必要な環境

- Python 3.11 以上
- Firebase プロジェクト（Firestore が有効）

---

## セットアップ手順

### 1. 依存パッケージのインストール

```bash
pip install -r requirements.txt
```

### 2. Firebase サービスアカウントキーの取得

1. [Firebase コンソール](https://console.firebase.google.com/) にアクセスし、対象のプロジェクトを開く
2. 左サイドバー下部の「プロジェクトの設定」（歯車アイコン）をクリック
3. 「サービス アカウント」タブを選択
4. 「新しい秘密鍵の生成」ボタンをクリックし、JSONファイルをダウンロード
5. ダウンロードしたJSONファイルを `scraper/serviceAccountKey.json` として保存

> **注意**: `serviceAccountKey.json` は機密情報を含むため、`.gitignore` に追加してGitにコミットしないようにしてください。

### 3. .env ファイルの作成

`.env.example` をコピーして `.env` を作成し、環境に合わせて設定を変更します。

```bash
cp .env.example .env
```

`.env` の各設定項目：

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` | サービスアカウントキーのパス | `./serviceAccountKey.json` |
| `NOTE_CREATOR_ID` | 取得対象のnote.comクリエイターID | `team_mirai_log` |
| `REQUEST_INTERVAL_SECONDS` | リクエスト間隔（秒）。サーバー負荷軽減のため1.0以上を推奨 | `1.5` |

---

## 実行方法

```bash
cd scraper
python fetch_articles.py
```

実行中は以下のようなログが出力されます：

```
2026-05-02 10:00:00 [INFO] スクレイパーを開始します
2026-05-02 10:00:00 [INFO] 対象クリエイターID: team_mirai_log
2026-05-02 10:00:01 [INFO] 記事一覧を取得中: creator_id=team_mirai_log, page=1
2026-05-02 10:00:02 [INFO] page=1: 10件の記事を取得しました
...
2026-05-02 10:00:30 [INFO] 今回の新規保存件数: 10件
2026-05-02 10:00:30 [INFO] スキップ件数（取得済み）: 0件
```

---

## 初回実行と差分実行の違い

### 初回実行

Firestore の `articles` コレクションが空の状態から開始します。
note.com API からすべての記事を取得し、本文を含む全データを Firestore に保存します。
記事数が多い場合は時間がかかることがあります。

### 2回目以降（差分実行）

スクリプト起動時に Firestore から取得済みの記事IDを一括取得します。
API から記事一覧を取得する際、すでに保存済みの記事IDは本文取得をスキップします。
新規投稿された記事のみ本文を取得してFirestoreに追加保存します。
これにより、毎回全記事を再取得するコストを避けられます。

---

## Firestoreのデータ構造

### `articles/{article_id}` コレクション

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `title` | string | 記事タイトル |
| `published_at` | string | 公開日時（ISO8601形式） |
| `note_url` | string | 記事のURL |
| `body` | string | プレーンテキストの本文 |
| `paragraphs` | array | 段落単位に分割した本文のリスト |
| `fetched_at` | timestamp | 取得日時 |

### `meta/last_updated` ドキュメント

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `timestamp` | timestamp | 最終実行日時 |
| `article_count` | number | Firestore内の総記事数 |

---

## トラブルシューティング

### `serviceAccountKey.json が見つかりません` というエラーが出る

Firebase コンソールからサービスアカウントキーをダウンロードし、
`scraper/serviceAccountKey.json` として保存してください。
セットアップ手順の「2. Firebase サービスアカウントキーの取得」を参照してください。

### `ModuleNotFoundError: No module named 'firebase_admin'` が出る

依存パッケージがインストールされていません。以下を実行してください：

```bash
pip install -r requirements.txt
```

### `requests.exceptions.ConnectionError` が出る

インターネット接続を確認してください。
また、note.com の API に一時的な障害が発生している可能性があります。
しばらく待ってから再実行してください。

### 記事が取得できない・件数が0件になる

`NOTE_CREATOR_ID` が正しいか確認してください。
クリエイターIDは note.com のプロフィールURLの末尾部分です。
例：`https://note.com/team_mirai_log` の場合、IDは `team_mirai_log` です。

### レート制限エラー（429 Too Many Requests）が発生する

`.env` の `REQUEST_INTERVAL_SECONDS` の値を大きくしてください（例：`3.0`）。
note.com サーバーへの負荷を軽減するため、リクエスト間隔を長く設定することを推奨します。

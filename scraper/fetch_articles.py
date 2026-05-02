"""
fetch_articles.py

note.com の非公式APIから記事を取得し、Firestoreに保存するスクレイパー。
差分取得に対応しており、2回目以降は未取得の記事のみ保存する。
"""

from __future__ import annotations

import base64
import json
import logging
import os
import time
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from firebase_admin import credentials, firestore
import firebase_admin


# ─────────────────────────────────────────────
# 定数定義
# ─────────────────────────────────────────────

# note.com 非公式API のベースURL
NOTE_API_BASE_URL = "https://note.com/api/v2"

# HTTPリクエスト時のユーザーエージェント設定
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; NoteProofreadingTool/1.0)"
}

# ロギング設定：INFO レベル以上のメッセージを標準出力に表示
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# API取得関数
# ─────────────────────────────────────────────

def fetch_article_list(creator_id: str, page: int) -> list[dict]:
    """
    note.com の非公式APIから記事一覧を1ページ分取得する。

    エンドポイント:
        https://note.com/api/v2/creators/{creator_id}/contents?kind=note&page={page}

    戻り値:
        記事メタデータのリスト（id, title, published_at, noteUrl を含む）
        ページに記事がない場合は空リストを返す。

    例外:
        requests.RequestException: HTTPリクエストが失敗した場合
    """
    # ステップ1: APIのURLを組み立てる
    api_url = f"{NOTE_API_BASE_URL}/creators/{creator_id}/contents"
    query_params = {"kind": "note", "page": page}

    logger.info("記事一覧を取得中: creator_id=%s, page=%d", creator_id, page)

    try:
        # ステップ2: GETリクエストを送信（タイムアウト10秒）
        response = requests.get(api_url, headers=HEADERS, params=query_params, timeout=10)
        response.raise_for_status()

        # ステップ3: JSONレスポンスをパース
        response_data = response.json()

        # ステップ4: データ構造を確認し、記事リストを取り出す
        contents = response_data.get("data", {}).get("contents", [])

        if not contents:
            logger.info("page=%d: 記事が見つかりませんでした（最終ページに到達）", page)
            return []

        # ステップ5: 必要なフィールドのみ抽出してリストを作成
        # key はURLに使われる英数字識別子（例: n2e4af2e7d18c）
        # id は数値型の内部ID
        article_list = []
        for item in contents:
            article_list.append({
                "id": item.get("id"),
                "key": item.get("key", ""),
                "title": item.get("name", ""),
                "published_at": item.get("publishAt", ""),
                "noteUrl": item.get("noteUrl", ""),
            })

        logger.info("page=%d: %d件の記事を取得しました", page, len(article_list))
        return article_list

    except requests.RequestException as error:
        # HTTPリクエスト失敗時はエラーログを出力して例外を再スロー
        logger.error("記事一覧の取得に失敗しました: page=%d, エラー: %s", page, error)
        raise


def fetch_article_body(note_url: str) -> str:
    """
    note.com の記事ページHTMLを直接取得し、プレーンテキストの本文を返す。

    note.com の /api/v2/notes/{id} は認証が必要なため、
    HTMLページを直接スクレイピングして本文を取得する。

    引数:
        note_url: 記事のURL（例: https://note.com/team_mirai_log/n/n2e4af2e7d18c）

    戻り値:
        プレーンテキストの本文
    """
    # ステップ1: ブラウザに近いUser-Agentでリクエストを送信
    browser_headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
    }

    logger.info("記事本文を取得中: url=%s", note_url)

    try:
        response = requests.get(note_url, headers=browser_headers, timeout=15)
        response.raise_for_status()

        # ステップ2: BeautifulSoup でHTMLをパース
        soup = BeautifulSoup(response.text, "html.parser")

        # ステップ3: 記事本文要素を取得する
        # note.com の本文は <article> タグ内に含まれている
        article_element = soup.find("article")
        if article_element:
            plain_text = article_element.get_text(separator="\n")
        else:
            # articleタグがない場合はページ全体からテキストを抽出
            plain_text = soup.get_text(separator="\n")

        if not plain_text.strip():
            logger.warning("url=%s: 本文が空です", note_url)
            return ""

        logger.info("url=%s: 本文取得完了（%d文字）", note_url, len(plain_text))
        return plain_text

    except requests.RequestException as error:
        logger.error("記事本文の取得に失敗しました: url=%s, エラー: %s", note_url, error)
        raise


# ─────────────────────────────────────────────
# テキスト処理関数
# ─────────────────────────────────────────────

def split_into_paragraphs(body: str) -> list[str]:
    """
    本文を段落単位のリストに分割する。

    空行区切りで分割し、空文字列・空白のみの要素は除去する。
    各段落は strip() する。

    戻り値:
        段落文字列のリスト
    """
    # ステップ1: 空行（連続する改行）で分割する
    raw_paragraphs = body.split("\n\n")

    # ステップ2: 各段落を strip() し、空の段落を除外する
    paragraphs = [
        paragraph.strip()
        for paragraph in raw_paragraphs
        if paragraph.strip()
    ]

    return paragraphs


# ─────────────────────────────────────────────
# Firestore 操作関数
# ─────────────────────────────────────────────

def get_existing_article_ids(db: firestore.Client) -> set[str]:
    """
    Firestoreの articles コレクションから、取得済みの記事IDセットを返す。
    差分取得のために使用する。

    戻り値:
        取得済み記事IDの set
    """
    logger.info("Firestoreから取得済み記事IDを読み込み中...")

    # ステップ1: articlesコレクションの全ドキュメントIDを取得
    articles_ref = db.collection("articles")
    existing_docs = articles_ref.stream()

    # ステップ2: ドキュメントIDをセットに格納して返す
    existing_ids: set[str] = {doc.id for doc in existing_docs}

    logger.info("取得済み記事数: %d件", len(existing_ids))
    return existing_ids


def save_article(db: firestore.Client, article_id: str, data: dict) -> None:
    """
    記事データをFirestoreのarticlesコレクションに保存する。
    ドキュメントIDはarticle_idを使用する。

    引数:
        db: Firestore クライアント
        article_id: 記事の一意識別子（ドキュメントIDとして使用）
        data: 保存する記事データの辞書
    """
    # ステップ1: articlesコレクションの対象ドキュメントへの参照を取得
    doc_ref = db.collection("articles").document(article_id)

    # ステップ2: データをFirestoreに保存（上書き）
    doc_ref.set(data)

    logger.info("記事を保存しました: article_id=%s, title=%s", article_id, data.get("title", ""))


def update_meta(db: firestore.Client, article_count: int) -> None:
    """
    meta/last_updated ドキュメントを更新する。
    timestamp（現在時刻）と article_count を保存する。

    引数:
        db: Firestore クライアント
        article_count: 今回取得した記事の総数
    """
    # ステップ1: meta コレクションの last_updated ドキュメントへの参照を取得
    meta_ref = db.collection("meta").document("last_updated")

    # ステップ2: タイムスタンプと記事数を保存
    meta_data = {
        "timestamp": datetime.now(timezone.utc),
        "article_count": article_count,
    }
    meta_ref.set(meta_data)

    logger.info(
        "メタ情報を更新しました: timestamp=%s, article_count=%d",
        meta_data["timestamp"].isoformat(),
        article_count,
    )


# ─────────────────────────────────────────────
# メイン処理
# ─────────────────────────────────────────────

def main() -> None:
    """
    メイン処理：
    1. Firestoreに接続
    2. 取得済み記事IDを取得
    3. note.com からページ1から順に記事一覧を取得
    4. 未取得の記事のみ本文を取得してFirestoreに保存
    5. 全ページ処理後、metaを更新
    全ページ取得済みと判断する条件：APIが空リストを返したとき
    """

    # ステップ1: .env ファイルを読み込んで環境変数を設定
    load_dotenv()

    service_account_key_path = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_KEY_PATH", "./serviceAccountKey.json"
    )
    creator_id = os.getenv("NOTE_CREATOR_ID", "team_mirai_log")
    request_interval_seconds = float(os.getenv("REQUEST_INTERVAL_SECONDS", "1.5"))

    logger.info("スクレイパーを開始します")
    logger.info("対象クリエイターID: %s", creator_id)
    logger.info("リクエスト間隔: %.1f秒", request_interval_seconds)

    # ステップ2: Firebaseアプリを初期化してFirestoreクライアントを取得
    # GitHub Actions環境では FIREBASE_SERVICE_ACCOUNT_KEY（Base64）を使用し、
    # ローカル環境では FIREBASE_SERVICE_ACCOUNT_KEY_PATH のファイルを使用する
    key_b64 = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")

    try:
        if key_b64:
            # GitHub Actions環境：環境変数からBase64デコードして初期化
            logger.info("環境変数からFirebaseサービスアカウントキーを読み込みます")
            key_dict = json.loads(base64.b64decode(key_b64).decode("utf-8"))
            cred = credentials.Certificate(key_dict)
        else:
            # ローカル環境：ファイルから読み込み
            if not os.path.exists(service_account_key_path):
                logger.error(
                    "サービスアカウントキーが見つかりません: %s", service_account_key_path
                )
                logger.error(
                    "Firebase コンソールからサービスアカウントキーを取得し、"
                    "%s として保存するか、FIREBASE_SERVICE_ACCOUNT_KEY 環境変数を設定してください。",
                    service_account_key_path,
                )
                return
            logger.info("ファイルからFirebaseサービスアカウントキーを読み込みます: %s", service_account_key_path)
            cred = credentials.Certificate(service_account_key_path)

        firebase_admin.initialize_app(cred)
        db = firestore.client()
        logger.info("Firestoreへの接続に成功しました")
    except Exception as error:
        logger.error("Firebaseの初期化に失敗しました: %s", error)
        return

    # ステップ3: 取得済み記事IDのセットを取得（差分取得のため）
    existing_article_ids = get_existing_article_ids(db)

    # ステップ4: ページ1から順に記事一覧を取得してループ処理
    current_page = 1
    total_saved_count = 0
    total_skipped_count = 0

    while True:
        try:
            # 記事一覧を1ページ分取得
            article_list = fetch_article_list(creator_id, current_page)
        except requests.RequestException:
            logger.error(
                "page=%d の取得中にエラーが発生したため処理を中断します", current_page
            )
            break

        # APIが空リストを返したら全ページ処理完了と判断してループを終了
        if not article_list:
            logger.info("全ページの取得が完了しました（最終ページ: %d）", current_page - 1)
            break

        # ステップ5: 各記事を処理する
        for article_meta in article_list:
            # Firestoreのドキュメントキーには key（英数字）を使用する
            # key が取れない場合は数値idを文字列化してフォールバック
            article_key = article_meta.get("key") or str(article_meta["id"])
            note_url = article_meta.get("noteUrl", "")

            # 取得済みの記事はスキップ（差分取得）
            if article_key in existing_article_ids:
                logger.info(
                    "スキップ（取得済み）: article_key=%s, title=%s",
                    article_key,
                    article_meta.get("title", ""),
                )
                total_skipped_count += 1
                continue

            # 未取得の記事のみ本文を取得してFirestoreに保存
            try:
                # サーバー負荷軽減のためリクエスト間隔を設ける
                time.sleep(request_interval_seconds)

                body_text = fetch_article_body(note_url)
                paragraphs = split_into_paragraphs(body_text)

                # Firestoreに保存するデータを組み立てる
                article_data = {
                    "title": article_meta.get("title", ""),
                    "published_at": article_meta.get("published_at", ""),
                    "note_url": article_meta.get("noteUrl", ""),
                    "body": body_text,
                    "paragraphs": paragraphs,
                    "fetched_at": datetime.now(timezone.utc),
                }

                save_article(db, article_key, article_data)
                total_saved_count += 1

            except requests.RequestException as error:
                logger.error(
                    "記事の取得・保存中にエラーが発生しました: "
                    "article_key=%s, エラー: %s",
                    article_key,
                    error,
                )
                # 1件のエラーで全体を止めず、次の記事へ進む

        # 次のページへ
        current_page += 1

        # ページ間のリクエスト間隔を設ける
        time.sleep(request_interval_seconds)

    # ステップ6: メタ情報を更新して処理完了
    total_article_count = total_saved_count + len(existing_article_ids)
    update_meta(db, total_article_count)

    logger.info("スクレイパーの処理が完了しました")
    logger.info("今回の新規保存件数: %d件", total_saved_count)
    logger.info("スキップ件数（取得済み）: %d件", total_skipped_count)
    logger.info("Firestore内の総記事数: %d件", total_article_count)


if __name__ == "__main__":
    main()

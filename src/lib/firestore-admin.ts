/**
 * firestore-admin.ts
 *
 * Firebase Admin SDK を使ったサーバーサイド専用のFirestore接続モジュール。
 * Next.js の Server Components や API Routes から呼び出す。
 * クライアントサイドでは絶対にインポートしないこと（認証情報が漏洩する）。
 */

import * as admin from "firebase-admin";
import { getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────

/**
 * Firestoreの articles コレクションに保存される記事データの型定義。
 * scraper/fetch_articles.py が保存するフィールドと対応している。
 */
export interface Article {
  title: string;
  note_url: string; // スクレイパーが保存するURLフィールド名
  published_at: FirebaseFirestore.Timestamp;
  fetched_at: FirebaseFirestore.Timestamp;
  body: string;
  paragraphs: string[];
}

// ─────────────────────────────────────────────
// Firebase Admin 初期化
// ─────────────────────────────────────────────

/**
 * Firebase Admin SDK を初期化し、Firestore クライアントを返す関数。
 *
 * 二重初期化を防ぐため getApps().length でチェックしてから初期化する。
 * 環境変数 FIREBASE_SERVICE_ACCOUNT_KEY に Base64 エンコードされた
 * サービスアカウントJSONが設定されている必要がある。
 *
 * @returns Firestore クライアントインスタンス
 * @throws Error 環境変数が未設定の場合
 */
export function getAdminDb(): FirebaseFirestore.Firestore {
  // ステップ1: 環境変数からBase64エンコードされたサービスアカウントキーを取得
  const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKeyBase64) {
    throw new Error(
      "環境変数 FIREBASE_SERVICE_ACCOUNT_KEY が設定されていません。" +
        ".env.local に FIREBASE_SERVICE_ACCOUNT_KEY=<base64文字列> を追加してください。"
    );
  }

  // ステップ2: すでに初期化済みの場合はそのまま Firestore を返す（二重初期化防止）
  if (getApps().length === 0) {
    // ステップ3: Base64デコードしてサービスアカウントオブジェクトを復元
    const serviceAccountJson = Buffer.from(
      serviceAccountKeyBase64,
      "base64"
    ).toString("utf-8");
    const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;

    // ステップ4: Firebase Admin SDK を初期化
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  // ステップ5: Firestore クライアントを返す
  return getFirestore();
}

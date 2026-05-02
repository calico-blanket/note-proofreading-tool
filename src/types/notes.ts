/**
 * notes.ts — 校正メモに関する型定義
 *
 * クライアント・サーバー双方から安全にインポートできる型のみを定義する。
 */

/**
 * 校正メモ1件のデータ構造（Firestoreの proofreading_notes コレクション）
 */
export interface ProofreadingNote {
  id?: string;            // FirestoreドキュメントID（取得時のみ付与）
  original: string;       // 原文の表記（例：係る）
  converted: string;      // 変換後の表記（例：かかる）
  note: string;           // 備考
  reference_title: string; // 参考にした記事タイトル
  reference_url: string;  // 参考にした記事URL
  created_at: string;     // 作成日時（ISO文字列）
}

/**
 * メモ保存APIへのリクエストボディ
 */
export interface SaveNoteRequest {
  original: string;
  converted: string;
  note: string;
  reference_title: string;
  reference_url: string;
}

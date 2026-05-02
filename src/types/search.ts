/**
 * search.ts — 検索に関する型定義
 *
 * クライアント・サーバー双方から安全にインポートできる型のみを定義する。
 * firebase-admin などのサーバー専用パッケージには依存しない。
 */

/**
 * 検索にヒットした段落と、その前後の段落を含むデータ構造。
 * 文脈を把握しやすくするためにbefore/afterを含める。
 */
export interface MatchedParagraph {
  before: string; // ヒット段落の前の段落（先頭の場合は空文字）
  match: string;  // ヒットした段落本文
  after: string;  // ヒット段落の後の段落（末尾の場合は空文字）
  index: number;  // 段落インデックス（0始まり）
}

/**
 * 検索結果の1件分のデータ構造。
 * 記事メタデータとヒットした段落の一覧を含む。
 */
export interface SearchResult {
  articleId: string;
  title: string;
  url: string;
  published_at: string; // ISO文字列（例: "2026-04-23T14:44:58.000Z"）
  matchedParagraphs: MatchedParagraph[];
}

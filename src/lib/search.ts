/**
 * search.ts
 *
 * note.com 記事の全文検索ロジック。
 * Firestoreから全記事を取得し、サーバーサイドで部分一致検索を実行する。
 * 検索は大文字・小文字を区別しない（toLowerCaseで正規化）。
 */

import { getAdminDb, Article } from "./firestore-admin";
import type { SearchResult, MatchedParagraph } from "@/types/search";

// 型は src/types/search.ts で定義・管理する（クライアント共有のため）
export type { SearchResult, MatchedParagraph };

// ─────────────────────────────────────────────
// 検索関数
// ─────────────────────────────────────────────

/**
 * Firestoreの全記事を取得し、サーバーサイドで部分一致検索を行う。
 *
 * - queryが空文字の場合は空配列を返す
 * - 検索は大文字・小文字を区別しない（toLowerCaseで正規化）
 * - 1記事に複数ヒットがある場合はすべて返す
 * - ヒットした段落の前後1段落もコンテキストとして返す
 *
 * @param query 検索クエリ文字列
 * @returns 検索結果の配列
 */
export async function searchArticles(query: string): Promise<SearchResult[]> {
  // ステップ1: クエリが空の場合は即座に空配列を返す
  if (!query.trim()) {
    return [];
  }

  // ステップ2: Firestoreクライアントを取得
  const db = getAdminDb();

  // ステップ3: articlesコレクションの全ドキュメントを取得
  const articlesSnapshot = await db.collection("articles").get();

  // ステップ4: 検索の正規化（大文字・小文字を区別しないため小文字化）
  const normalizedQuery = query.toLowerCase();

  const searchResults: SearchResult[] = [];

  // ステップ5: 各記事に対して段落単位で検索を実行
  for (const doc of articlesSnapshot.docs) {
    const articleData = doc.data() as Article;
    const paragraphs = articleData.paragraphs ?? [];

    // ステップ5-1: この記事内でヒットした段落を収集する
    const matchedParagraphs: MatchedParagraph[] = [];

    for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex++) {
      const paragraph = paragraphs[paragraphIndex];

      // 大文字・小文字を区別しない部分一致チェック
      if (paragraph.toLowerCase().includes(normalizedQuery)) {
        // ステップ5-2: ヒットした段落の前後を取得（境界チェックあり）
        const beforeParagraph =
          paragraphIndex > 0 ? paragraphs[paragraphIndex - 1] : "";
        const afterParagraph =
          paragraphIndex < paragraphs.length - 1
            ? paragraphs[paragraphIndex + 1]
            : "";

        matchedParagraphs.push({
          before: beforeParagraph,
          match: paragraph,
          after: afterParagraph,
          index: paragraphIndex,
        });
      }
    }

    // ステップ5-3: 1件でもヒットがあれば結果に追加
    if (matchedParagraphs.length > 0) {
      // Firestore Timestamp または文字列から ISO 文字列に変換
      // スクレイパーは文字列で保存するため、両方に対応する
      let publishedAt = "";
      if (articleData.published_at) {
        const pa = articleData.published_at as unknown;
        if (typeof pa === "string") {
          publishedAt = new Date(pa).toISOString();
        } else if (typeof (pa as FirebaseFirestore.Timestamp).toDate === "function") {
          publishedAt = (pa as FirebaseFirestore.Timestamp).toDate().toISOString();
        }
      }

      searchResults.push({
        articleId: doc.id,
        title: articleData.title ?? "",
        url: articleData.note_url ?? "",
        published_at: publishedAt,
        matchedParagraphs,
      });
    }
  }

  return searchResults;
}

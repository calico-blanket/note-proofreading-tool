/**
 * route.ts — GET /api/search
 *
 * クエリパラメータ q を受け取り、note.com 記事の全文検索結果を JSON で返す。
 *
 * リクエスト例: GET /api/search?q=いくつか
 * レスポンス例:
 *   [
 *     {
 *       "articleId": "n2e4af2e7d18c",
 *       "title": "【全文】...",
 *       "url": "https://note.com/...",
 *       "published_at": "2026-04-23T14:44:58.000Z",
 *       "matchedParagraphs": [...]
 *     }
 *   ]
 */

import { NextRequest, NextResponse } from "next/server";
import { searchArticles } from "@/lib/search";

/**
 * GET /api/search?q={query}
 *
 * - queryパラメータが空または未指定の場合は 400 を返す
 * - searchArticles() を呼び出し、結果を JSON で返す
 * - エラー時は 500 を返す
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // ステップ1: クエリパラメータ q を取得する
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  // ステップ2: q が未指定または空の場合は 400 Bad Request を返す
  if (!query || query.trim() === "") {
    return NextResponse.json(
      {
        error:
          "クエリパラメータ q が必要です。例: /api/search?q=検索キーワード",
      },
      { status: 400 }
    );
  }

  try {
    // ステップ3: 検索を実行する
    const results = await searchArticles(query);

    // ステップ4: 結果を JSON で返す
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    // ステップ5: 予期しないエラーが発生した場合は 500 Internal Server Error を返す
    console.error("検索APIでエラーが発生しました:", error);
    return NextResponse.json(
      {
        error: "検索処理中にエラーが発生しました。しばらくしてから再試行してください。",
      },
      { status: 500 }
    );
  }
}

"use client";

/**
 * page.tsx — メインページ
 *
 * note.com 記事の校正支援ツールのメインUI。
 * 検索ボックスとその結果を表示するクライアントコンポーネント。
 */

import { useState } from "react";
import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import ResultCard from "@/components/ResultCard";
import AddNoteForm from "@/components/AddNoteForm";
import { SearchResult } from "@/types/search";

/**
 * メインページコンポーネント
 * 検索状態を管理し、APIを呼び出して結果を表示する
 */
export default function Home() {
  // ──────────────────────────────────────────
  // 状態管理
  // ──────────────────────────────────────────

  /** 現在の検索クエリ */
  const [query, setQuery] = useState("");
  /** 検索結果の配列 */
  const [results, setResults] = useState<SearchResult[]>([]);
  /** 検索中フラグ */
  const [isLoading, setIsLoading] = useState(false);
  /** 1回以上検索を実行したかどうかのフラグ */
  const [hasSearched, setHasSearched] = useState(false);
  /** エラーメッセージ（エラー時のみ設定） */
  const [error, setError] = useState<string | null>(null);
  /** 校正メモ追加フォームの表示フラグ */
  const [showNoteForm, setShowNoteForm] = useState(false);
  /** メモ保存成功トースト表示フラグ */
  const [noteSaved, setNoteSaved] = useState(false);

  // ──────────────────────────────────────────
  // 検索処理
  // ──────────────────────────────────────────

  /**
   * 検索を実行する非同期関数
   * /api/search?q={query} を呼び出して結果をステートに格納する
   */
  async function handleSearch(searchQuery: string) {
    // ステップ1: 検索状態を初期化
    setQuery(searchQuery);
    setIsLoading(true);
    setHasSearched(true);
    setError(null);
    setResults([]);

    try {
      // ステップ2: 検索APIを呼び出す
      const encodedQuery = encodeURIComponent(searchQuery);
      const response = await fetch(`/api/search?q=${encodedQuery}`);

      // ステップ3: レスポンスのエラーチェック
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ?? `HTTPエラー: ${response.status}`
        );
      }

      // ステップ4: 結果を取得してステートに格納
      const data: SearchResult[] = await response.json();
      setResults(data);
    } catch (err) {
      // ステップ5: エラー処理
      const errorMessage =
        err instanceof Error
          ? err.message
          : "検索中にエラーが発生しました。";
      setError(errorMessage);
    } finally {
      // ステップ6: ローディング状態を解除
      setIsLoading(false);
    }
  }

  // ──────────────────────────────────────────
  // 集計値の計算
  // ──────────────────────────────────────────

  /** ヒットした記事数 */
  const articleCount = results.length;

  /** ヒット箇所の合計数（全記事の matchedParagraphs 合計） */
  const totalHitCount = results.reduce(
    (sum, result) => sum + result.matchedParagraphs.length,
    0
  );

  // ──────────────────────────────────────────
  // レンダリング
  // ──────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      {/* 校正メモ追加フォーム（モーダル） */}
      {showNoteForm && (
        <AddNoteForm
          onClose={() => setShowNoteForm(false)}
          onSaved={() => {
            setNoteSaved(true);
            setTimeout(() => setNoteSaved(false), 3000);
          }}
          defaultOriginal={query}
          defaultReferenceTitle={results[0]?.title ?? ""}
          defaultReferenceUrl={results[0]?.url ?? ""}
        />
      )}

      {/* 保存成功トースト */}
      {noteSaved && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-800 text-white text-sm px-5 py-3 rounded-full shadow-lg">
          ✅ 校正メモを保存しました
        </div>
      )}

      {/* ── ヘッダー ── */}
      <header style={{ backgroundColor: "#64D8C6" }} className="text-white shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              📝 note 校正支援ツール
            </h1>
            <p className="text-sm mt-1 opacity-90">
              team_mirai_log の過去記事から表記パターンを検索
            </p>
          </div>
          <Link
            href="/notes"
            className="shrink-0 text-sm text-white/90 hover:text-white underline underline-offset-2 mt-1"
          >
            校正メモ一覧 →
          </Link>
        </div>
      </header>

      {/* ── メインコンテンツ ── */}
      <main className="max-w-3xl mx-auto px-4 py-6">

        {/* 検索ボックスエリア */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 mb-6">
          <SearchBox onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* 結果表示エリア */}
        <div>

          {/* ── 検索中：スピナー ── */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <div
                className="w-10 h-10 border-4 border-gray-200 border-t-[#64D8C6] rounded-full animate-spin mb-4"
              />
              <p className="text-sm">検索中...</p>
            </div>
          )}

          {/* ── エラー表示 ── */}
          {!isLoading && error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* ── 検索前：ヒント文 ── */}
          {!isLoading && !error && !hasSearched && (
            <p className="text-center text-gray-400 text-sm py-16">
              検索語を入力してください
            </p>
          )}

          {/* ── 0件：見つかりませんでした ── */}
          {!isLoading && !error && hasSearched && results.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500 text-base">
                「<span className="font-semibold text-gray-700">{query}</span>」は見つかりませんでした
              </p>
              <p className="text-gray-400 text-sm mt-2">
                別の表記や類似の表現で試してみてください。
              </p>
            </div>
          )}

          {/* ── 検索結果あり ── */}
          {!isLoading && !error && results.length > 0 && (
            <>
              {/* 件数サマリーと校正メモ追加ボタン */}
              <div className="flex items-center justify-between mb-4 gap-4">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-800">{articleCount}</span>件の記事で
                  <span className="font-semibold text-gray-800"> {totalHitCount}</span>箇所見つかりました
                </p>
                <button
                  onClick={() => setShowNoteForm(true)}
                  className="shrink-0 text-sm px-4 py-1.5 rounded-full border border-[#64D8C6] text-[#3bbaa8] hover:bg-[#64D8C6]/10 transition-colors font-medium"
                >
                  📝 校正メモに追加
                </button>
              </div>

              {/* 結果カードのリスト */}
              <div className="flex flex-col gap-4">
                {results.map((result) => (
                  <ResultCard
                    key={result.articleId}
                    result={result}
                    query={query}
                  />
                ))}
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}

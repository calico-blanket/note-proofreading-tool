"use client";

/**
 * ResultCard.tsx
 *
 * 検索結果1件（1記事）を表示するカードコンポーネント。
 * 記事タイトル（リンク付き）・公開日・ヒット段落（前後文付き）を表示する。
 * 1記事に複数ヒットがある場合は、ヒット箇所ごとにセクションを分けて表示する。
 */

import { SearchResult } from "@/types/search";
import HighlightText from "./HighlightText";

// コンポーネントのProps型定義
interface ResultCardProps {
  /** 表示する検索結果データ（1記事分） */
  result: SearchResult;
  /** 検索語（ハイライト表示に使用） */
  query: string;
}

/**
 * 公開日を「YYYY年MM月DD日」形式にフォーマットする関数
 * ISO 8601 形式の文字列を日本語の日付表示に変換する
 */
function formatPublishedDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    // Intl.DateTimeFormat で日本語形式にフォーマット
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * 検索結果カードコンポーネント
 * 1記事の検索ヒット情報をカード形式で表示する
 */
export default function ResultCard({ result, query }: ResultCardProps) {
  const publishedDate = formatPublishedDate(result.published_at);
  const hitCount = result.matchedParagraphs.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ── カードヘッダー：記事タイトルと公開日 ── */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100">
        {/* 記事タイトル（note.com へのリンク）*/}
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="
            text-base font-semibold text-gray-800
            hover:text-[#64D8C6] hover:underline
            transition-colors duration-150
            block leading-snug
          "
        >
          {result.title}
        </a>

        {/* 公開日とヒット件数バッジ */}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-xs text-gray-400">{publishedDate}</span>
          <span className="
            text-xs px-2 py-0.5 rounded-full font-medium
            bg-[#64D8C6]/15 text-[#3bbaa8]
          ">
            {hitCount}箇所ヒット
          </span>
        </div>
      </div>

      {/* ── カードボディ：ヒット段落一覧 ── */}
      <div className="divide-y divide-gray-100">
        {result.matchedParagraphs.map((paragraph, sectionIndex) => (
          <div key={paragraph.index} className="px-5 py-3">
            {/* 複数ヒットがある場合は番号を表示 */}
            {hitCount > 1 && (
              <div className="text-xs text-gray-400 mb-2 font-medium">
                ヒット {sectionIndex + 1}/{hitCount}（段落 {paragraph.index + 1}）
              </div>
            )}

            {/* 前の段落（コンテキスト） */}
            {paragraph.before && (
              <>
                <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap line-clamp-2">
                  {paragraph.before}
                </p>
                {/* 前後段落とヒット段落の区切り線 */}
                <div className="my-1.5 border-t border-gray-200" />
              </>
            )}

            {/* ヒット段落（ハイライト付き） */}
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              <HighlightText text={paragraph.match} query={query} />
            </p>

            {/* ヒット段落と後の段落の区切り線 */}
            {paragraph.after && (
              <>
                <div className="my-1.5 border-t border-gray-200" />
                <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap line-clamp-2">
                  {paragraph.after}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

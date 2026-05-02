"use client";

/**
 * HighlightText.tsx
 *
 * テキスト中の検索語を黄色くハイライトして表示するコンポーネント。
 * 大文字・小文字を区別しない部分一致で検索語を検出する。
 * 検索語が含まれない場合はそのままテキストを表示する。
 */

// コンポーネントのProps型定義
interface HighlightTextProps {
  /** 表示するテキスト全体 */
  text: string;
  /** ハイライトする検索語 */
  query: string;
}

/**
 * 検索語ハイライト表示コンポーネント
 * テキストを走査し、検索語に一致する部分を<mark>要素でラップして黄色くハイライトする
 */
export default function HighlightText({ text, query }: HighlightTextProps) {
  // ステップ1: クエリが空の場合はそのままテキストを表示
  if (!query.trim()) {
    return <span>{text}</span>;
  }

  // ステップ2: 大文字・小文字を区別しないための正規表現を作成
  // escapeRegExp でクエリ内の特殊文字をエスケープしてから正規表現を構築する
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");

  // ステップ3: テキストを検索語で分割してパーツの配列を作成
  const parts = text.split(regex);

  // ステップ4: 各パーツをレンダリング（検索語に一致する部分はハイライト）
  return (
    <span>
      {parts.map((part, index) => {
        // 大文字・小文字を無視して一致するかチェック
        const isMatch = part.toLowerCase() === query.toLowerCase();

        if (isMatch) {
          // ヒット部分：黄色いハイライトで強調表示
          return (
            <mark
              key={index}
              className="bg-yellow-200 font-bold not-italic text-gray-900 rounded-sm px-0.5"
            >
              {part}
            </mark>
          );
        }

        // 非ヒット部分：そのまま表示
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

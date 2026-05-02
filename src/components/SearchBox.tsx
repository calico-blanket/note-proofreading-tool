"use client";

/**
 * SearchBox.tsx
 *
 * 検索キーワード入力欄と検索ボタンを持つコンポーネント。
 * Enter キーでも検索を実行できる。
 * 検索中はボタンを無効化して「検索中...」と表示する。
 */

import { useRef, KeyboardEvent } from "react";

// コンポーネントのProps型定義
interface SearchBoxProps {
  /** 検索実行時に呼ばれるコールバック。検索クエリ文字列を引数で受け取る */
  onSearch: (query: string) => void;
  /** 検索中かどうか。true の場合はボタンを無効化する */
  isLoading: boolean;
}

/**
 * 検索ボックスコンポーネント
 * テキスト入力とボタンで構成されたシンプルな検索UI
 */
export default function SearchBox({ onSearch, isLoading }: SearchBoxProps) {
  // DOMから直接値を読むためのref（stateの同期ズレを防ぐ）
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * 検索を実行する内部関数
   * refから現在のDOM値を直接読み取ることで、onChange同期に依存しない
   */
  function handleSearch() {
    const trimmed = (inputRef.current?.value ?? "").trim();
    if (!trimmed) return;
    onSearch(trimmed);
  }

  /**
   * キーボードイベントのハンドラ
   * Enter キーが押されたときに検索を実行する
   * isComposing チェックで IME の変換確定 Enter と検索 Enter を区別する
   */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      handleSearch();
    }
  }

  return (
    <div className="flex gap-2 w-full">
      {/* テキスト入力欄 */}
      <input
        ref={inputRef}
        type="text"
        onKeyDown={handleKeyDown}
        placeholder="例：いくつか、生成AI推進基本法、附則"
        autoFocus
        disabled={isLoading}
        className="
          flex-1 px-4 py-2 rounded-lg border border-gray-300
          focus:outline-none focus:ring-2 focus:ring-[#64D8C6] focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          text-gray-800 placeholder-gray-400
          text-base
        "
      />

      {/* 検索ボタン */}
      <button
        onClick={handleSearch}
        disabled={isLoading}
        className="
          px-6 py-2 rounded-lg font-medium text-white
          bg-[#64D8C6] hover:bg-[#4ec9b7] active:bg-[#3bbaa8]
          disabled:bg-gray-300 disabled:cursor-not-allowed
          transition-colors duration-150
          whitespace-nowrap
        "
      >
        {isLoading ? "検索中..." : "検索"}
      </button>
    </div>
  );
}

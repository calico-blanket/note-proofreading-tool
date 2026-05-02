"use client";

/**
 * AddNoteForm.tsx
 *
 * 校正メモ追加フォームコンポーネント。
 * 検索語と参考記事情報が自動入力された状態で開く。
 * 「保存」ボタンで POST /api/notes を呼び出す。
 */

import { useState } from "react";
import type { SaveNoteRequest } from "@/types/notes";

interface AddNoteFormProps {
  /** フォームを閉じるコールバック */
  onClose: () => void;
  /** 保存成功時のコールバック */
  onSaved: () => void;
  /** 自動入力する原文（現在の検索語） */
  defaultOriginal: string;
  /** 自動入力する参考記事タイトル */
  defaultReferenceTitle: string;
  /** 自動入力する参考記事URL */
  defaultReferenceUrl: string;
}

/**
 * 校正メモ入力フォームコンポーネント
 * モーダル風のオーバーレイで表示される
 */
export default function AddNoteForm({
  onClose,
  onSaved,
  defaultOriginal,
  defaultReferenceTitle,
  defaultReferenceUrl,
}: AddNoteFormProps) {
  // フォームの各フィールドのステート
  const [original, setOriginal] = useState(defaultOriginal);
  const [converted, setConverted] = useState("");
  const [note, setNote] = useState("");
  const [referenceTitle, setReferenceTitle] = useState(defaultReferenceTitle);
  const [referenceUrl, setReferenceUrl] = useState(defaultReferenceUrl);

  // 保存処理のローディング・エラー状態
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /**
   * フォームを送信してメモを保存する
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    try {
      const requestBody: SaveNoteRequest = {
        original: original.trim(),
        converted: converted.trim(),
        note: note.trim(),
        reference_title: referenceTitle.trim(),
        reference_url: referenceUrl.trim(),
      };

      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error ?? "保存に失敗しました。");
      }

      // 保存成功
      onSaved();
      onClose();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "保存中にエラーが発生しました。"
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    // オーバーレイ背景
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        // オーバーレイクリックで閉じる
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* フォームカード */}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-gray-100"
          style={{ backgroundColor: "#64D8C6" }}
        >
          <h2 className="text-white font-semibold text-base">
            📝 校正メモに追加
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl leading-none"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {/* フォーム本体 */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* 原文 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              原文 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#64D8C6]"
              placeholder="例：係る"
            />
          </div>

          {/* 変換後 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              変換後 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={converted}
              onChange={(e) => setConverted(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#64D8C6]"
              placeholder="例：かかる"
            />
          </div>

          {/* 備考 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              備考
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#64D8C6] resize-none"
              placeholder="補足説明や注意事項など"
            />
          </div>

          {/* 参考記事タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              参考記事タイトル
            </label>
            <input
              type="text"
              value={referenceTitle}
              onChange={(e) => setReferenceTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#64D8C6]"
            />
          </div>

          {/* 参考記事URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              参考記事URL
            </label>
            <input
              type="url"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#64D8C6]"
              placeholder="https://note.com/..."
            />
          </div>

          {/* エラー表示 */}
          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ⚠️ {saveError}
            </p>
          )}

          {/* ボタン群 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSaving || !original.trim() || !converted.trim()}
              className="flex-1 px-4 py-2 rounded-lg text-sm text-white font-medium bg-[#64D8C6] hover:bg-[#4ec9b7] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

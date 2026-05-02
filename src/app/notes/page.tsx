"use client";

/**
 * /notes — 校正メモ一覧ページ
 *
 * Firestoreに保存された校正メモをテーブル形式で表示する。
 * CSVエクスポート・インポート機能を含む。
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { ProofreadingNote } from "@/types/notes";

/**
 * 日付を「YYYY年MM月DD日」形式にフォーマット
 */
function formatDate(isoString: string): string {
  if (!isoString) return "—";
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

/**
 * 校正メモ一覧ページコンポーネント
 */
export default function NotesPage() {
  // ── 状態管理 ──────────────────────────────────────
  const [notes, setNotes] = useState<ProofreadingNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── データ取得 ────────────────────────────────────

  /**
   * メモ一覧をAPIから取得する
   */
  async function loadNotes() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notes");
      if (!response.ok) throw new Error("メモ一覧の取得に失敗しました。");
      const data: ProofreadingNote[] = await response.json();
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  }

  // 初回マウント時にデータを取得
  useEffect(() => {
    loadNotes();
  }, []);

  // ── CSVエクスポート ───────────────────────────────

  /**
   * 全メモをCSV形式でダウンロードする
   * UTF-8 BOM付きでExcelでも文字化けしない
   */
  function handleExport() {
    // ヘッダー行
    const headerRow = "note表記,原稿表記,備考,参考記事タイトル,参考記事URL,作成日時";

    // データ行（フィールドにカンマや改行がある場合はダブルクォートで囲む）
    const dataRows = notes.map((note) => {
      const fields = [
        note.note_expression,
        note.draft_expression,
        note.note,
        note.reference_title,
        note.reference_url,
        note.created_at,
      ];
      return fields
        .map((field) => {
          // カンマ・改行・ダブルクォートを含む場合はクォートで囲む
          const str = String(field ?? "");
          if (str.includes(",") || str.includes("\n") || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",");
    });

    // UTF-8 BOM + ヘッダー + データ
    const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\n");

    // ダウンロード用のBlobを作成して即座にクリック
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    anchor.href = url;
    anchor.download = `proofreading_notes_${today}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // ── CSVインポート ─────────────────────────────────

  /**
   * ファイル選択ダイアログを開く
   */
  function handleImportClick() {
    fileInputRef.current?.click();
  }

  /**
   * 選択されたCSVファイルを読み込んでAPIに送信する
   */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage(null);

    try {
      // ファイルをテキストとして読み込む
      const csvText = await file.text();

      const response = await fetch("/api/notes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "インポートに失敗しました。");
      }

      setImportMessage(result.message);
      // インポート後にリストを更新
      await loadNotes();
    } catch (err) {
      setImportMessage(
        `⚠️ ${err instanceof Error ? err.message : "インポートエラー"}`
      );
    } finally {
      setIsImporting(false);
      // ファイル入力をリセット（同じファイルを再選択できるよう）
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── レンダリング ──────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ヘッダー */}
      <header style={{ backgroundColor: "#64D8C6" }} className="text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              📋 校正メモ一覧
            </h1>
            <p className="text-sm mt-1 opacity-90">
              {notes.length}件のメモが保存されています
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-white/90 hover:text-white underline underline-offset-2"
          >
            ← 検索に戻る
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* 操作バー：エクスポート・インポート */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <button
            onClick={handleExport}
            disabled={notes.length === 0}
            className="text-sm px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ⬇️ CSVエクスポート
          </button>

          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="text-sm px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isImporting ? "インポート中..." : "⬆️ CSVインポート"}
          </button>

          {/* 非表示のファイル入力 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* インポート結果メッセージ */}
          {importMessage && (
            <span className="text-sm text-gray-600">{importMessage}</span>
          )}
        </div>

        {/* ローディング */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#64D8C6] rounded-full animate-spin mr-3" />
            読み込み中...
          </div>
        )}

        {/* エラー */}
        {!isLoading && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* 0件 */}
        {!isLoading && !error && notes.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-base">校正メモがまだありません</p>
            <p className="text-sm mt-2">
              <Link href="/" className="text-[#64D8C6] underline">
                検索ページ
              </Link>
              から「校正メモに追加」ボタンで追加できます
            </p>
          </div>
        )}

        {/* メモ一覧テーブル */}
        {!isLoading && !error && notes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">note表記</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">原稿表記</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">備考</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">参考記事</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">日付</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {notes.map((note) => (
                    <tr key={note.id} className="hover:bg-gray-50 transition-colors">
                      {/* note表記 */}
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                        {note.note_expression}
                      </td>

                      {/* 原稿表記 */}
                      <td className="px-4 py-3 text-[#3bbaa8] font-medium whitespace-nowrap">
                        {note.draft_expression}
                      </td>

                      {/* 備考 */}
                      <td className="px-4 py-3 text-gray-600 max-w-xs">
                        <span className="line-clamp-2">{note.note || "—"}</span>
                      </td>

                      {/* 参考記事（リンク付き） */}
                      <td className="px-4 py-3 max-w-xs">
                        {note.reference_url ? (
                          <a
                            href={note.reference_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline line-clamp-2"
                            title={note.reference_title}
                          >
                            {note.reference_title || note.reference_url}
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* 日付 */}
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                        {formatDate(note.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

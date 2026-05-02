/**
 * route.ts — POST /api/notes/import
 *
 * CSVファイルから校正メモを一括インポートする。
 * - 1行目はヘッダー行としてスキップ
 * - 列順：原文,変換後,備考,参考記事タイトル,参考記事URL,作成日時
 * - エラーがある行はスキップして続行
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firestore-admin";
import { FieldValue } from "firebase-admin/firestore";

// Firestoreのコレクション名
const COLLECTION_NAME = "proofreading_notes";

/**
 * CSVの1行を列配列に分割するパーサー
 * ダブルクォートで囲まれたフィールド内のカンマを正しく処理する
 */
function parseCsvRow(line: string): string[] {
  const columns: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // ダブルクォートの開閉を切り替え
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされたダブルクォート（""）
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // フィールド区切り
      columns.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  columns.push(current);
  return columns;
}

/**
 * POST /api/notes/import
 * CSVから校正メモを一括インポートする
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ステップ1: リクエストボディからCSVテキストを取得
    const body = await request.json();
    const csvText: string = body.csv ?? "";

    if (!csvText.trim()) {
      return NextResponse.json(
        { error: "CSVデータが空です。" },
        { status: 400 }
      );
    }

    // ステップ2: UTF-8 BOM を除去してから行に分割
    const cleanedText = csvText.replace(/^\uFEFF/, "");
    const lines = cleanedText.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSVにヘッダー行以外のデータが含まれていません。" },
        { status: 400 }
      );
    }

    // ステップ3: Firestoreクライアントを取得
    const db = getAdminDb();

    let successCount = 0;
    let errorCount = 0;

    // ステップ4: 2行目以降をデータ行として処理（1行目はヘッダーとしてスキップ）
    for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (!line.trim()) continue;

      try {
        const columns = parseCsvRow(line);

        // 列順：note表記,原稿表記,備考,参考記事タイトル,参考記事URL,作成日時
        const note_expression = columns[0]?.trim() ?? "";
        const draft_expression = columns[1]?.trim() ?? "";
        const note = columns[2]?.trim() ?? "";
        const referenceTitle = columns[3]?.trim() ?? "";
        const referenceUrl = columns[4]?.trim() ?? "";

        // note表記と原稿表記が両方空の場合はスキップ
        if (!note_expression && !draft_expression) {
          errorCount++;
          continue;
        }

        await db.collection(COLLECTION_NAME).add({
          note_expression,
          draft_expression,
          note,
          reference_title: referenceTitle,
          reference_url: referenceUrl,
          created_at: FieldValue.serverTimestamp(),
        });

        successCount++;
      } catch (rowError) {
        // 1行のエラーで全体を止めず、エラー行数をカウント
        console.error(`行 ${lineIndex + 1} のインポートに失敗:`, rowError);
        errorCount++;
      }
    }

    return NextResponse.json(
      {
        successCount,
        errorCount,
        message: `${successCount}件追加しました${errorCount > 0 ? `（エラー: ${errorCount}件）` : ""}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("CSVインポートでエラーが発生しました:", error);
    return NextResponse.json(
      { error: "CSVインポートに失敗しました。" },
      { status: 500 }
    );
  }
}

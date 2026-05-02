/**
 * route.ts — /api/notes
 *
 * 校正メモの取得・保存APIルート。
 *
 * GET  /api/notes         → メモ一覧を作成日時の降順で取得
 * POST /api/notes         → 新規メモを保存
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firestore-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { SaveNoteRequest, ProofreadingNote } from "@/types/notes";

// Firestoreのコレクション名
const COLLECTION_NAME = "proofreading_notes";

/**
 * GET /api/notes
 * 校正メモ一覧を作成日時の降順で返す
 */
export async function GET(): Promise<NextResponse> {
  try {
    // ステップ1: Firestoreクライアントを取得
    const db = getAdminDb();

    // ステップ2: 作成日時の降順でメモを取得
    const snapshot = await db
      .collection(COLLECTION_NAME)
      .orderBy("created_at", "desc")
      .get();

    // ステップ3: ドキュメントをオブジェクトに変換
    const notes: ProofreadingNote[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        note_expression: data.note_expression ?? "",
        draft_expression: data.draft_expression ?? "",
        note: data.note ?? "",
        reference_title: data.reference_title ?? "",
        reference_url: data.reference_url ?? "",
        // Timestamp または文字列の両方に対応
        created_at:
          typeof data.created_at === "string"
            ? data.created_at
            : data.created_at?.toDate?.()?.toISOString() ?? "",
      };
    });

    return NextResponse.json(notes, { status: 200 });
  } catch (error) {
    console.error("メモ一覧の取得でエラーが発生しました:", error);
    return NextResponse.json(
      { error: "メモ一覧の取得に失敗しました。" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes
 * 新規校正メモをFirestoreに保存する
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // ステップ1: リクエストボディをパース
    const body: SaveNoteRequest = await request.json();

    // ステップ2: 必須フィールドのバリデーション
    if (!body.note_expression || !body.draft_expression) {
      return NextResponse.json(
        { error: "「note表記」と「原稿表記」は必須項目です。" },
        { status: 400 }
      );
    }

    // ステップ3: Firestoreクライアントを取得して保存
    const db = getAdminDb();
    const docRef = await db.collection(COLLECTION_NAME).add({
      note_expression: body.note_expression.trim(),
      draft_expression: body.draft_expression.trim(),
      note: body.note?.trim() ?? "",
      reference_title: body.reference_title?.trim() ?? "",
      reference_url: body.reference_url?.trim() ?? "",
      created_at: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error("メモの保存でエラーが発生しました:", error);
    return NextResponse.json(
      { error: "メモの保存に失敗しました。" },
      { status: 500 }
    );
  }
}

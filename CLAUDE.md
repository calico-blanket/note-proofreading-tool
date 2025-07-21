# CLAUDE.md

このファイルは Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## 🎌 言語とコミュニケーション設定

**最優先：日本語での開発**
- すべてのコメントは日本語で記述する
- 変数名・関数名は英語でも、説明コメントは必ず日本語
- ドキュメントやREADMEは日本語優先
- エラーメッセージも可能な限り日本語化

## 📝 バイブスコーディング スタイルガイド

### コード記述の基本原則
1. **詳細な説明コメント必須**
   - すべての関数に「何をするか」「なぜそうするか」を日本語で説明
   - 複雑なロジックには段落ごとに説明コメント
   - TODOやFIXMEも日本語で記述

2. **ステップバイステップ実装**
   - 処理を細かく分割し、各ステップに番号付けコメント
   - 例：`// ステップ1: ユーザー入力の検証`
   - 複雑な処理は複数の関数に分割

3. **可読性重視のコード構造**
   ```javascript
   // ❌ 悪い例
   const f=(x,y)=>x>y?x:y;

   // ✅ 良い例
   /**
    * 二つの数値のうち大きい方を返す関数
    * @param {number} firstNumber - 比較する最初の数値
    * @param {number} secondNumber - 比較する二番目の数値
    * @returns {number} より大きい方の数値
    */
   function getMaximumNumber(firstNumber, secondNumber) {
       // 数値の大小を比較して大きい方を返す
       if (firstNumber > secondNumber) {
           return firstNumber;
       } else {
           return secondNumber;
       }
   }
   ```

4. **徹底的なエラーハンドリング**
   - すべての外部入力に対してバリデーション実装
   - try-catch文で予期しないエラーをキャッチ
   - エラーメッセージは日本語で分かりやすく
   - ログ出力機能を積極的に活用

### 命名規則
- **変数名**: キャメルケース + 意味が分かる名前
  - `userData` (良い) vs `data` (悪い)
  - `isUserLoggedIn` (良い) vs `flag` (悪い)
- **関数名**: 動詞から始まる具体的な名前
  - `calculateTotalPrice()` (良い) vs `calc()` (悪い)
  - `validateUserEmail()` (良い) vs `check()` (悪い)
- **定数名**: UPPER_SNAKE_CASE
  - `MAX_RETRY_COUNT = 3`
  - `API_BASE_URL = 'https://example.com'`

## 🚀 プロジェクト構成

### ゲーム開発プロジェクト
- **goldfish_game.html**: 完全統合型の金魚すくいゲーム（HTML5 Canvas + JavaScript）
- **kingyo-sukui/**: モジュール分離型の金魚すくいゲーム（HTML/CSS/JS分離）

### プラットフォーム連携
- **dify/**: オープンソースLLMアプリ開発プラットフォーム
- **package.json**: React Router、Google Maps APIを使用するNode.jsプロジェクト

## 💻 開発環境とコマンド

### Difyプラットフォーム起動手順
```bash
# ステップ1: Difyのdockerディレクトリに移動
cd dify/docker

# ステップ2: 環境設定ファイルをコピー（初回のみ）
cp .env.example .env

# ステップ3: Dockerサービスを起動
docker compose up -d

# ステップ4: ブラウザでダッシュボードにアクセス
# URL: http://localhost/install
```

### Node.js開発環境セットアップ
```bash
# ステップ1: 依存関係をインストール
npm install

# ステップ2: テスト実行（現在設定されていない場合は設定が必要）
npm test

# ステップ3: 開発サーバー起動（package.jsonにスクリプトがある場合）
npm run dev
```

## 🔧 開発ワークフロー

### 新機能実装時の手順
1. **要件分析**: 何を作るか、なぜ必要かを明確化
2. **設計フェーズ**: 処理の流れを日本語でコメントとして記述
3. **実装フェーズ**: 設計したコメントに沿ってコードを記述
4. **テストフェーズ**: エラーケースを含む動作確認
5. **ドキュメント更新**: 実装内容を日本語で記録

### エラー対処の基本パターン
```javascript
/**
 * API呼び出し処理の実装例
 * エラーハンドリングと詳細ログを含む
 */
async function callApiWithErrorHandling(apiUrl, requestData) {
    try {
        // ステップ1: 入力データの検証
        if (!apiUrl || typeof apiUrl !== 'string') {
            throw new Error('APIのURLが正しく指定されていません');
        }
        
        // ステップ2: API呼び出し実行
        console.log('API呼び出し開始:', apiUrl);
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        // ステップ3: レスポンス検証
        if (!response.ok) {
            throw new Error(`APIエラー: ${response.status} - ${response.statusText}`);
        }
        
        // ステップ4: 成功時の処理
        const result = await response.json();
        console.log('API呼び出し成功:', result);
        return result;
        
    } catch (error) {
        // エラー発生時の詳細ログ出力
        console.error('API呼び出しでエラーが発生しました:', error.message);
        console.error('エラー詳細:', error);
        
        // エラーを再スローして上位で処理できるようにする
        throw error;
    }
}
```

## 🎯 開発環境固有の注意事項

- **WSL2環境**: Windowsファイルシステムとの連携に注意
- **パス区切り文字**: Linuxスタイル（/）を使用
- **Adobe Creative Suite**: デザイン資産との連携が頻繁
- **Google Drive**: クラウド同期との競合状態に注意

## 📚 コード品質チェックリスト

新しいコードを書く前に以下を確認：
- [ ] 日本語コメントが十分にあるか
- [ ] 変数名・関数名が意味を表しているか  
- [ ] エラーハンドリングが実装されているか
- [ ] ログ出力が適切に配置されているか
- [ ] ステップバイステップで理解しやすいか
- [ ] 他の開発者が読んで理解できるか
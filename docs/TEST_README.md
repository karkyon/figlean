# 🧪 FIGLEAN Backend API - Complete Test Suite

完全なAPIテストスクリプト＋サンプルデータ生成ツール

---

## 📋 目次

1. [クイックスタート](#クイックスタート)
2. [ファイル構成](#ファイル構成)
3. [3つのテスト方法](#3つのテスト方法)
4. [詳細ガイド](#詳細ガイド)
5. [トラブルシューティング](#トラブルシューティング)

---

## 🚀 クイックスタート

### 方法A: サンプルデータでテスト（Figma不要）

```bash
# 1. サンプルデータを生成
chmod +x create-sample-data.sh
./create-sample-data.sh

# 2. テスト実行
TEST_EMAIL='sample@figlean.test' \
TEST_PASSWORD='TestPass123!' \
./test-figlean-api.sh
```

**所要時間**: 約2分  
**必要なもの**: なし（完全ローカル）

---

### 方法B: Figmaトークンでテスト（インタラクティブ）

```bash
# 1. セットアップウィザード実行
chmod +x setup-test.sh
./setup-test.sh

# 2. プロンプトに従ってFigmaトークンを入力

# 3. 自動的にテスト開始
```

**所要時間**: 約3-5分  
**必要なもの**: Figmaトークン

---

### 方法C: 環境変数で完全テスト

```bash
# 1. 環境変数を設定
export FIGMA_TOKEN='your-figma-token'
export FIGMA_FILE_KEY='your-file-key'

# 2. テスト実行
./test-figlean-api.sh
```

**所要時間**: 約5-10分（インポート含む）  
**必要なもの**: Figmaトークン + ファイルキー

---

## 📁 ファイル構成

```
figlean/
├── test-figlean-api.sh          # メインテストスクリプト
├── setup-test.sh                # セットアップウィザード
├── create-sample-data.sh        # サンプルデータ生成
├── FIGMA_TOKEN_GUIDE.md         # Figmaトークン取得ガイド
├── .env.test                    # 環境変数ファイル（自動生成）
└── test-logs/                   # ログディレクトリ
    └── figlean-api-test-*.log   # 実行ログ
```

---

## 🎯 3つのテスト方法

### 1️⃣ サンプルデータでテスト

**メリット**:
- ✅ Figmaトークン不要
- ✅ 最速（2分で完了）
- ✅ 完全ローカル

**デメリット**:
- ❌ Figmaインポートはテストできない

**使用場面**:
- Phase 8（崩壊予測・改善提案）の動作確認
- CI/CDパイプライン
- ローカル開発

---

### 2️⃣ Figmaトークンでテスト

**メリット**:
- ✅ Figma連携テスト可能
- ✅ ユーザー情報・ファイル一覧取得
- ✅ 実際のAPIレスポンス確認

**デメリット**:
- ⚠️ Figmaファイルキーが必要（インポートテスト時）

**使用場面**:
- Figma API統合の検証
- 本番環境テスト
- Phase 6（診断機能）の検証

---

### 3️⃣ 完全テスト（トークン＋ファイルキー）

**メリット**:
- ✅ 全機能のテスト
- ✅ インポート～診断～提案の完全フロー
- ✅ 本番同等の動作確認

**デメリット**:
- ⏱️ 時間がかかる（5-10分）
- 🔑 Figmaファイルが必要

**使用場面**:
- リリース前の最終確認
- デモ準備
- 完全な動作保証

---

## 📖 詳細ガイド

### Figmaトークンの取得方法

詳細は [FIGMA_TOKEN_GUIDE.md](./FIGMA_TOKEN_GUIDE.md) を参照してください。

**概要**:
1. https://www.figma.com/settings にアクセス
2. "Personal access tokens" → "Create new token"
3. "Read only" 権限を選択
4. トークンをコピー

---

### 環境変数の説明

| 変数 | 必須 | デフォルト | 説明 |
|------|------|-----------|------|
| `FIGMA_TOKEN` | 方法B,C | なし | Figmaトークン |
| `FIGMA_FILE_KEY` | 方法C | なし | テスト用ファイルキー |
| `API_BASE_URL` | ❌ | `http://localhost:3101` | APIベースURL |
| `TEST_EMAIL` | ❌ | 自動生成 | テストユーザーメール |
| `TEST_PASSWORD` | ❌ | `TestPass123!` | テストユーザーパスワード |
| `TEST_NAME` | ❌ | `FIGLEANテストユーザー` | ユーザー名 |

---

### テストされるAPIエンドポイント

#### Phase 1-4: 基本機能
- ✅ `GET /api/health` - ヘルスチェック
- ✅ `POST /api/auth/register` - ユーザー登録
- ✅ `POST /api/auth/login` - ログイン
- ✅ `GET /api/auth/me` - ユーザー情報取得

#### Phase 5-8: プロジェクト管理
- ✅ `POST /api/auth/figma-token` - Figmaトークン設定
- ✅ `POST /api/projects` - プロジェクト作成
- ✅ `GET /api/projects` - プロジェクト一覧
- ✅ `GET /api/projects/:id` - プロジェクト詳細

#### Phase 9: Figma連携（トークン必要）
- ✅ `GET /api/figma/user` - Figmaユーザー情報
- ✅ `GET /api/figma/files` - Figmaファイル一覧
- ✅ `GET /api/figma/file/:fileKey` - ファイル詳細
- ✅ `POST /api/figma/import` - インポート実行
- ✅ `GET /api/figma/import/status/:jobId` - ジョブステータス

#### Phase 10-13: 診断結果
- ✅ `GET /api/analysis/:projectId` - 診断サマリー
- ✅ `GET /api/analysis/:projectId/violations` - ルール違反一覧
- ✅ `GET /api/analysis/:projectId/predictions` - 崩壊予測
- ✅ `GET /api/analysis/:projectId/suggestions` - 改善提案

#### Phase 14: Figmaコメント
- ✅ `GET /api/figma/comments/:projectId/:violationId/preview` - プレビュー
- ℹ️ `POST /api/figma/comments/:projectId/:violationId` - コメント投稿（スキップ）

#### Phase 15: クリーンアップ
- ✅ `DELETE /api/projects/:id` - プロジェクト削除

---

## 📊 ログとレポート

### ログファイルの確認

```bash
# 最新のログを表示
cat ./test-logs/figlean-api-test-*.log | tail -100

# エラーのみ抽出
cat ./test-logs/figlean-api-test-*.log | grep -E '\[✗\]|\[!\]'

# 成功したリクエストのみ
cat ./test-logs/figlean-api-test-*.log | grep '\[✓\]'
```

### ログの内容

各APIリクエストについて以下が記録されます：

```
[INFO] 📡 API Request: GET /api/analysis/{projectId}/predictions
[INFO] 📝 Description: 崩壊予測取得
📥 Response Status: 200
⏱️  Response Time: 0.123s
📄 Response Body:
{
  "success": true,
  "data": {
    "predictions": [...],
    "summary": {...}
  }
}
[✓] Request succeeded (HTTP 200)
```

---

## 🔧 トラブルシューティング

### 問題1: サーバーに接続できない

**症状**:
```
curl: (7) Failed to connect to localhost port 3101
```

**解決方法**:
```bash
cd ~/projects/figlean
docker-compose up -d
docker-compose logs -f backend
```

---

### 問題2: Figmaトークンエラー

**症状**:
```
[✗] Client error (HTTP 403)
{
  "error": {
    "code": "FIGMA_TOKEN_INVALID"
  }
}
```

**解決方法**:
1. トークンを再生成
2. `.env.test` を更新
3. `source .env.test` を実行

---

### 問題3: サンプルデータ生成エラー

**症状**:
```
Error: Command failed with exit code 1
```

**解決方法**:
```bash
# データベースをリセット
docker-compose down -v
docker-compose up -d

# 再度サンプルデータ生成
./create-sample-data.sh
```

---

### 問題4: テストがタイムアウト

**症状**:
```
[!] Import job timeout (waited 300s)
```

**解決方法**:
1. バックエンドログを確認:
   ```bash
   docker-compose logs -f backend | grep -i error
   ```
2. Figmaファイルのサイズを確認
3. ネットワーク接続を確認

---

## 🎓 高度な使用方法

### CI/CDでの使用

```yaml
# .github/workflows/api-test.yml
name: API Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Start services
        run: docker-compose up -d
      
      - name: Wait for services
        run: sleep 10
      
      - name: Create sample data
        run: ./create-sample-data.sh
      
      - name: Run API tests
        run: |
          TEST_EMAIL='sample@figlean.test' \
          TEST_PASSWORD='TestPass123!' \
          ./test-figlean-api.sh
      
      - name: Upload logs
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-logs
          path: test-logs/
```

---

### カスタムテストシナリオ

```bash
# 特定のプロジェクトIDでテスト
PROJECT_ID='your-project-id' \
JWT_TOKEN='your-jwt-token' \
./test-figlean-api.sh

# 複数回実行（負荷テスト）
for i in {1..10}; do
  ./test-figlean-api.sh
done
```

---

## 📞 サポート

### ログの提供

問題が発生した場合、以下の情報を提供してください：

1. **テストログ**:
   ```bash
   cat ./test-logs/figlean-api-test-*.log
   ```

2. **バックエンドログ**:
   ```bash
   docker-compose logs backend | tail -100
   ```

3. **データベース状態**:
   ```bash
   docker exec -it figlean-db psql -U figlean -d figlean -c "
     SELECT COUNT(*) FROM projects;
     SELECT COUNT(*) FROM analysis_results;
     SELECT COUNT(*) FROM break_predictions;
     SELECT COUNT(*) FROM improvement_suggestions;
   "
   ```

---

## 🎯 チェックリスト

### デプロイ前の最終確認

- [ ] サンプルデータでテスト成功
- [ ] Figmaトークンでテスト成功
- [ ] 完全テスト（インポート含む）成功
- [ ] 全エンドポイントが200を返す
- [ ] エラーログがない
- [ ] レスポンスタイムが許容範囲内
- [ ] ログファイルを確認

---

## 📝 更新履歴

- **2026-01-12**: 初版作成
  - Phase 8（崩壊予測・改善提案）対応
  - サンプルデータ生成機能追加
  - セットアップウィザード追加

---

**Happy Testing! 🚀**

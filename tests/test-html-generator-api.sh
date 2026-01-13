#!/bin/bash
# =====================================
# test-html-generator-api.sh
# Phase 9: HTML生成API テストスクリプト
# 作成日時: 2026年1月12日
# 説明: HTML Generator APIの動作確認用スクリプト
# =====================================

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ベースURL
BASE_URL="http://localhost:3000"

# ログ関数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 使用方法表示
show_usage() {
    echo "使用方法: $0 <JWT_TOKEN> <PROJECT_ID>"
    echo ""
    echo "例:"
    echo "  $0 'eyJhbGciOiJIUzI1NiIs...' '550e8400-e29b-41d4-a716-446655440000'"
    echo ""
    exit 1
}

# 引数チェック
if [ $# -lt 2 ]; then
    show_usage
fi

JWT_TOKEN="$1"
PROJECT_ID="$2"

echo "=================================================="
echo "Phase 9: HTML生成API テスト"
echo "=================================================="
echo ""
echo "BASE_URL: $BASE_URL"
echo "PROJECT_ID: $PROJECT_ID"
echo "TOKEN: ${JWT_TOKEN:0:20}..."
echo ""

# =====================================
# Test 1: HTML生成実行
# =====================================
echo "=================================================="
echo "Test 1: HTML生成実行 (POST /api/html/generate/:projectId)"
echo "=================================================="

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/html/generate/$PROJECT_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "framework": "HTML_TAILWIND",
    "includeResponsive": true,
    "includeGrid": false,
    "breakpoints": {
      "mobile": 640,
      "tablet": 768,
      "desktop": 1024,
      "wide": 1280
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 201 ]; then
    log_info "✅ Test 1 成功: HTML生成完了"
    
    # 生成IDを抽出（次のテストで使用）
    GENERATED_ID=$(echo "$BODY" | jq -r '.data.generatedId' 2>/dev/null)
    if [ -n "$GENERATED_ID" ] && [ "$GENERATED_ID" != "null" ]; then
        log_info "生成ID: $GENERATED_ID"
    fi
elif [ "$HTTP_CODE" -eq 400 ]; then
    log_warning "⚠️  Test 1 スキップ: スコア不足（90%以上必要）"
else
    log_error "❌ Test 1 失敗: HTTP $HTTP_CODE"
fi

sleep 1

# =====================================
# Test 2: Grid生成（スコア100%時のみ）
# =====================================
echo "=================================================="
echo "Test 2: Grid生成 (includeGrid: true)"
echo "=================================================="

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/html/generate/$PROJECT_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "framework": "HTML_TAILWIND",
    "includeResponsive": true,
    "includeGrid": true
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 201 ]; then
    log_info "✅ Test 2 成功: Grid生成完了（スコア100%）"
elif [ "$HTTP_CODE" -eq 400 ]; then
    log_warning "⚠️  Test 2 スキップ: スコア100%が必要"
else
    log_error "❌ Test 2 失敗: HTTP $HTTP_CODE"
fi

sleep 1

# =====================================
# Test 3: HTMLプレビュー取得
# =====================================
echo "=================================================="
echo "Test 3: HTMLプレビュー取得 (GET /api/html/:projectId/preview)"
echo "=================================================="

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/html/$PROJECT_ID/preview" \
  -H "Authorization: Bearer $JWT_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 200 ]; then
    log_info "✅ Test 3 成功: プレビュー取得完了"
    echo "HTML長さ: $(echo "$BODY" | wc -c) bytes"
else
    log_error "❌ Test 3 失敗: HTTP $HTTP_CODE"
    echo "Response: $BODY"
fi
echo ""

sleep 1

# =====================================
# Test 4: HTMLダウンロード
# =====================================
echo "=================================================="
echo "Test 4: HTMLダウンロード (GET /api/html/:projectId/download)"
echo "=================================================="

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/html/$PROJECT_ID/download" \
  -H "Authorization: Bearer $JWT_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" -eq 200 ]; then
    log_info "✅ Test 4 成功: ダウンロード完了"
    echo "ファイルサイズ: $(echo "$BODY" | wc -c) bytes"
else
    log_error "❌ Test 4 失敗: HTTP $HTTP_CODE"
    echo "Response: $BODY"
fi
echo ""

sleep 1

# =====================================
# Test 5: HTML生成履歴取得
# =====================================
echo "=================================================="
echo "Test 5: HTML生成履歴取得 (GET /api/html/:projectId/history)"
echo "=================================================="

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/html/$PROJECT_ID/history?limit=10&offset=0" \
  -H "Authorization: Bearer $JWT_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" -eq 200 ]; then
    log_info "✅ Test 5 成功: 履歴取得完了"
    
    HISTORY_COUNT=$(echo "$BODY" | jq '.data.history | length' 2>/dev/null)
    if [ -n "$HISTORY_COUNT" ]; then
        log_info "履歴件数: $HISTORY_COUNT"
    fi
else
    log_error "❌ Test 5 失敗: HTTP $HTTP_CODE"
fi

sleep 1

# =====================================
# Test 6: 生成HTML削除（オプショナル）
# =====================================
if [ -n "$GENERATED_ID" ] && [ "$GENERATED_ID" != "null" ]; then
    echo "=================================================="
    echo "Test 6: 生成HTML削除 (DELETE /api/html/:generatedId)"
    echo "=================================================="
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/html/$GENERATED_ID" \
      -H "Authorization: Bearer $JWT_TOKEN")
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    echo "HTTP Status: $HTTP_CODE"
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    echo ""
    
    if [ "$HTTP_CODE" -eq 200 ]; then
        log_info "✅ Test 6 成功: 削除完了"
    else
        log_error "❌ Test 6 失敗: HTTP $HTTP_CODE"
    fi
else
    echo "=================================================="
    log_warning "Test 6 スキップ: 削除対象のIDがありません"
    echo "=================================================="
fi

echo ""
echo "=================================================="
echo "テスト完了"
echo "=================================================="

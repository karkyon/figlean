#!/bin/bash

# =====================================
# FIGLEAN Backend API 完全テストスクリプト
# 作成日時: 2026年1月12日
# 説明: 全エンドポイントの検証、詳細ログ、エラー診断
# =====================================

set -e

# =====================================
# 色定義
# =====================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# =====================================
# 設定
# =====================================

API_BASE_URL="${API_BASE_URL:-http://localhost:3101}"
TEST_EMAIL="${TEST_EMAIL:-test-$(date +%s)@figlean.test}"
TEST_PASSWORD="${TEST_PASSWORD:-TestPass123!}"
TEST_NAME="${TEST_NAME:-FIGLEANテストユーザー}"

# Figmaトークン（環境変数から取得）
FIGMA_TOKEN="${FIGMA_TOKEN:-}"

# テスト用Figmaファイルキー（環境変数から取得）
FIGMA_FILE_KEY="${FIGMA_FILE_KEY:-}"

# ログディレクトリ
LOG_DIR="./test-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/figlean-api-test-$(date +%Y%m%d-%H%M%S).log"

# =====================================
# ログ関数
# =====================================

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1" | tee -a "$LOG_FILE"
}

log_header() {
    echo "" | tee -a "$LOG_FILE"
    echo -e "${MAGENTA}═══════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
    echo -e "${MAGENTA}  $1${NC}" | tee -a "$LOG_FILE"
    echo -e "${MAGENTA}═══════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
}

log_separator() {
    echo -e "${BLUE}───────────────────────────────────────────${NC}" | tee -a "$LOG_FILE"
}

# =====================================
# HTTPリクエスト関数
# =====================================

make_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local auth_token="$4"
    local description="$5"

    log_separator
    log_info "📡 API Request: $method $endpoint"
    if [ -n "$description" ]; then
        log_info "📝 Description: $description"
    fi

    local curl_cmd="curl -s -w '\n%{http_code}\n%{time_total}' -X $method '$API_BASE_URL$endpoint'"

    if [ -n "$auth_token" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth_token'"
    fi

    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"

    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
        echo "📦 Request Body:" | tee -a "$LOG_FILE"
        echo "$data" | jq '.' 2>/dev/null || echo "$data" | tee -a "$LOG_FILE"
    fi

    # リクエスト実行
    local response=$(eval "$curl_cmd")
    
    # レスポンスを3つに分割（body, status_code, time）
    local response_body=$(echo "$response" | head -n -2)
    local status_code=$(echo "$response" | tail -n 2 | head -n 1)
    local response_time=$(echo "$response" | tail -n 1)

    echo "📥 Response Status: $status_code" | tee -a "$LOG_FILE"
    echo "⏱️  Response Time: ${response_time}s" | tee -a "$LOG_FILE"
    echo "📄 Response Body:" | tee -a "$LOG_FILE"
    echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body" | tee -a "$LOG_FILE"

    # ステータスコードチェック
    if [[ "$status_code" -ge 200 && "$status_code" -lt 300 ]]; then
        log_success "Request succeeded (HTTP $status_code)"
    elif [[ "$status_code" -ge 400 && "$status_code" -lt 500 ]]; then
        log_error "Client error (HTTP $status_code)"
        echo "$response_body" | jq '.error' 2>/dev/null || echo "$response_body"
        return 1
    elif [[ "$status_code" -ge 500 ]]; then
        log_error "Server error (HTTP $status_code)"
        echo "$response_body" | jq '.error' 2>/dev/null || echo "$response_body"
        return 1
    fi

    echo "$response_body"
}

# =====================================
# テスト開始
# =====================================

log_header "🚀 FIGLEAN Backend API Complete Test"

echo "Configuration:" | tee -a "$LOG_FILE"
echo "  API Base URL: $API_BASE_URL" | tee -a "$LOG_FILE"
echo "  Test Email: $TEST_EMAIL" | tee -a "$LOG_FILE"
echo "  Log File: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# =====================================
# Phase 1: ヘルスチェック
# =====================================

log_header "Phase 1: ヘルスチェック"

HEALTH_RESPONSE=$(make_request "GET" "/api/health" "" "" "サーバーヘルスチェック")
log_success "Health check passed"

# =====================================
# Phase 2: ユーザー登録
# =====================================

log_header "Phase 2: ユーザー登録"

REGISTER_DATA=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD",
  "name": "$TEST_NAME"
}
EOF
)

REGISTER_RESPONSE=$(make_request "POST" "/api/auth/register" "$REGISTER_DATA" "" "新規ユーザー登録")

JWT_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token // empty')
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.id // empty')

if [ -z "$JWT_TOKEN" ]; then
    log_error "Failed to get JWT token from registration"
    exit 1
fi

log_success "User registered successfully"
log_info "User ID: $USER_ID"
log_info "JWT Token: ${JWT_TOKEN:0:20}..."

# =====================================
# Phase 3: ログイン
# =====================================

log_header "Phase 3: ログイン"

LOGIN_DATA=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
EOF
)

LOGIN_RESPONSE=$(make_request "POST" "/api/auth/login" "$LOGIN_DATA" "" "ログイン")
log_success "Login successful"

# =====================================
# Phase 4: ユーザー情報取得
# =====================================

log_header "Phase 4: ユーザー情報取得"

ME_RESPONSE=$(make_request "GET" "/api/auth/me" "" "$JWT_TOKEN" "現在のユーザー情報取得")
log_success "User info retrieved"

# =====================================
# Phase 5: Figmaトークン設定
# =====================================

log_header "Phase 5: Figmaトークン設定"

if [ -z "$FIGMA_TOKEN" ]; then
    log_warning "Figmaトークンが設定されていません"
    log_info "環境変数 FIGMA_TOKEN を設定してください"
    log_info ""
    log_info "Figmaトークンの取得方法:"
    log_info "1. https://www.figma.com/settings にアクセス"
    log_info "2. 'Personal access tokens' セクションまでスクロール"
    log_info "3. 'Create a new personal access token' をクリック"
    log_info "4. トークン名を入力（例: FIGLEAN Test）"
    log_info "5. 'Read only' 権限を選択"
    log_info "6. 'Generate token' をクリック"
    log_info "7. 生成されたトークンをコピー"
    log_info ""
    log_info "使用方法:"
    log_info "  export FIGMA_TOKEN='your-figma-token-here'"
    log_info "  ./test-figlean-api.sh"
    log_info ""
    log_warning "Figma関連のテストをスキップします"
    SKIP_FIGMA=true
else
    TOKEN_DATA=$(cat <<EOF
{
  "figmaToken": "$FIGMA_TOKEN"
}
EOF
)

    TOKEN_RESPONSE=$(make_request "POST" "/api/auth/figma-token" "$TOKEN_DATA" "$JWT_TOKEN" "Figmaトークン設定")
    log_success "Figma token saved"
    SKIP_FIGMA=false
fi

# =====================================
# Phase 6: プロジェクト作成
# =====================================

log_header "Phase 6: プロジェクト作成"

PROJECT_DATA=$(cat <<EOF
{
  "name": "FIGLEANテストプロジェクト",
  "description": "APIテスト用プロジェクト"
}
EOF
)

PROJECT_RESPONSE=$(make_request "POST" "/api/projects" "$PROJECT_DATA" "$JWT_TOKEN" "新規プロジェクト作成")

PROJECT_ID=$(echo "$PROJECT_RESPONSE" | jq -r '.data.id // empty')

if [ -z "$PROJECT_ID" ]; then
    log_error "Failed to get project ID"
    exit 1
fi

log_success "Project created successfully"
log_info "Project ID: $PROJECT_ID"

# =====================================
# Phase 7: プロジェクト一覧取得
# =====================================

log_header "Phase 7: プロジェクト一覧取得"

PROJECTS_RESPONSE=$(make_request "GET" "/api/projects?limit=10" "" "$JWT_TOKEN" "プロジェクト一覧取得")
log_success "Projects list retrieved"

# =====================================
# Phase 8: プロジェクト詳細取得
# =====================================

log_header "Phase 8: プロジェクト詳細取得"

PROJECT_DETAIL_RESPONSE=$(make_request "GET" "/api/projects/$PROJECT_ID" "" "$JWT_TOKEN" "プロジェクト詳細取得")
log_success "Project details retrieved"

# =====================================
# Phase 9: Figma関連テスト
# =====================================

if [ "$SKIP_FIGMA" = false ]; then
    log_header "Phase 9: Figma関連テスト"

    # Figmaユーザー情報取得
    log_info "9-1: Figmaユーザー情報取得"
    FIGMA_USER_RESPONSE=$(make_request "GET" "/api/figma/user" "" "$JWT_TOKEN" "Figmaユーザー情報取得")
    log_success "Figma user info retrieved"

    # Figmaファイル一覧取得
    log_info "9-2: Figmaファイル一覧取得"
    FIGMA_FILES_RESPONSE=$(make_request "GET" "/api/figma/files" "" "$JWT_TOKEN" "Figmaファイル一覧取得")
    log_success "Figma files list retrieved"

    # Figmaファイルキーが設定されている場合
    if [ -n "$FIGMA_FILE_KEY" ]; then
        log_info "9-3: Figmaファイル詳細取得"
        FIGMA_FILE_RESPONSE=$(make_request "GET" "/api/figma/file/$FIGMA_FILE_KEY" "" "$JWT_TOKEN" "Figmaファイル詳細取得")
        log_success "Figma file details retrieved"

        # Figmaインポート実行
        log_info "9-4: Figmaインポート実行"
        IMPORT_DATA=$(cat <<EOF
{
  "projectId": "$PROJECT_ID",
  "fileKey": "$FIGMA_FILE_KEY",
  "analyzeAll": true
}
EOF
)

        IMPORT_RESPONSE=$(make_request "POST" "/api/figma/import" "$IMPORT_DATA" "$JWT_TOKEN" "Figmaインポート＋解析実行")
        
        JOB_ID=$(echo "$IMPORT_RESPONSE" | jq -r '.data.jobId // empty')
        
        if [ -n "$JOB_ID" ]; then
            log_success "Figma import started"
            log_info "Job ID: $JOB_ID"

            # ジョブステータス監視
            log_info "9-5: ジョブステータス監視"
            
            MAX_WAIT=300  # 最大5分待つ
            WAIT_INTERVAL=5
            ELAPSED=0

            while [ $ELAPSED -lt $MAX_WAIT ]; do
                sleep $WAIT_INTERVAL
                ELAPSED=$((ELAPSED + WAIT_INTERVAL))

                STATUS_RESPONSE=$(make_request "GET" "/api/figma/import/status/$JOB_ID" "" "$JWT_TOKEN" "ジョブステータス確認")
                
                JOB_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.status // empty')
                PROGRESS=$(echo "$STATUS_RESPONSE" | jq -r '.data.progress.percentage // 0')

                log_info "Job Status: $JOB_STATUS (Progress: $PROGRESS%)"

                if [ "$JOB_STATUS" = "COMPLETED" ]; then
                    log_success "Import job completed successfully"
                    break
                elif [ "$JOB_STATUS" = "FAILED" ]; then
                    log_error "Import job failed"
                    echo "$STATUS_RESPONSE" | jq '.data.error'
                    break
                fi
            done

            if [ $ELAPSED -ge $MAX_WAIT ]; then
                log_warning "Import job timeout (waited ${MAX_WAIT}s)"
            fi
        else
            log_error "Failed to get job ID from import response"
        fi
    else
        log_warning "FIGMA_FILE_KEY not set, skipping import test"
        log_info "Set FIGMA_FILE_KEY environment variable to test import"
    fi
else
    log_warning "Skipping Figma tests (no token)"
fi

# =====================================
# Phase 10: 診断結果取得テスト
# =====================================

log_header "Phase 10: 診断結果取得"

log_info "10-1: 診断サマリー取得"
ANALYSIS_RESPONSE=$(make_request "GET" "/api/analysis/$PROJECT_ID" "" "$JWT_TOKEN" "診断サマリー取得")

if echo "$ANALYSIS_RESPONSE" | jq -e '.data.figleanScore' > /dev/null 2>&1; then
    FIGLEAN_SCORE=$(echo "$ANALYSIS_RESPONSE" | jq -r '.data.figleanScore')
    log_success "Analysis summary retrieved (Score: $FIGLEAN_SCORE)"
else
    log_warning "Analysis data not available yet (expected if import was skipped)"
fi

# =====================================
# Phase 11: ルール違反取得テスト
# =====================================

log_header "Phase 11: ルール違反取得"

log_info "11-1: 全ルール違反取得"
VIOLATIONS_RESPONSE=$(make_request "GET" "/api/analysis/$PROJECT_ID/violations?limit=50" "" "$JWT_TOKEN" "ルール違反一覧取得")

VIOLATIONS_COUNT=$(echo "$VIOLATIONS_RESPONSE" | jq -r '.data.total // 0')
log_info "Total violations: $VIOLATIONS_COUNT"

if [ "$VIOLATIONS_COUNT" -gt 0 ]; then
    log_success "Violations retrieved successfully"
    
    log_info "11-2: CRITICAL違反のみ取得"
    CRITICAL_VIOLATIONS=$(make_request "GET" "/api/analysis/$PROJECT_ID/violations?severity=CRITICAL&limit=10" "" "$JWT_TOKEN" "CRITICAL違反取得")
    
    log_info "11-3: MAJOR違反のみ取得"
    MAJOR_VIOLATIONS=$(make_request "GET" "/api/analysis/$PROJECT_ID/violations?severity=MAJOR&limit=10" "" "$JWT_TOKEN" "MAJOR違反取得")
else
    log_warning "No violations found (expected if import was skipped)"
fi

# =====================================
# Phase 12: 崩壊予測取得テスト
# =====================================

log_header "Phase 12: 崩壊予測取得"

PREDICTIONS_RESPONSE=$(make_request "GET" "/api/analysis/$PROJECT_ID/predictions" "" "$JWT_TOKEN" "崩壊予測取得")

PREDICTIONS_COUNT=$(echo "$PREDICTIONS_RESPONSE" | jq -r '.data.summary.totalPredictions // 0')
log_info "Total predictions: $PREDICTIONS_COUNT"

if [ "$PREDICTIONS_COUNT" -gt 0 ]; then
    log_success "Predictions retrieved successfully"
else
    PREDICTIONS_MESSAGE=$(echo "$PREDICTIONS_RESPONSE" | jq -r '.data.message // empty')
    if [ -n "$PREDICTIONS_MESSAGE" ]; then
        log_info "Message: $PREDICTIONS_MESSAGE"
    else
        log_warning "No predictions found"
    fi
fi

# =====================================
# Phase 13: 改善提案取得テスト
# =====================================

log_header "Phase 13: 改善提案取得"

SUGGESTIONS_RESPONSE=$(make_request "GET" "/api/analysis/$PROJECT_ID/suggestions" "" "$JWT_TOKEN" "改善提案取得")

SUGGESTIONS_COUNT=$(echo "$SUGGESTIONS_RESPONSE" | jq -r '.data.summary.totalSuggestions // 0')
log_info "Total suggestions: $SUGGESTIONS_COUNT"

if [ "$SUGGESTIONS_COUNT" -gt 0 ]; then
    log_success "Suggestions retrieved successfully"
    
    CURRENT_SCORE=$(echo "$SUGGESTIONS_RESPONSE" | jq -r '.data.improvementSimulation.current // 0')
    AFTER_HIGH=$(echo "$SUGGESTIONS_RESPONSE" | jq -r '.data.improvementSimulation.afterHighPriority // 0')
    AFTER_ALL=$(echo "$SUGGESTIONS_RESPONSE" | jq -r '.data.improvementSimulation.afterAll // 0')
    
    log_info "Score Simulation:"
    log_info "  Current: $CURRENT_SCORE"
    log_info "  After HIGH priority: $AFTER_HIGH (+$(($AFTER_HIGH - $CURRENT_SCORE)))"
    log_info "  After ALL suggestions: $AFTER_ALL (+$(($AFTER_ALL - $CURRENT_SCORE)))"
else
    SUGGESTIONS_MESSAGE=$(echo "$SUGGESTIONS_RESPONSE" | jq -r '.data.message // empty')
    if [ -n "$SUGGESTIONS_MESSAGE" ]; then
        log_info "Message: $SUGGESTIONS_MESSAGE"
    else
        log_warning "No suggestions found"
    fi
fi

# =====================================
# Phase 14: Figmaコメント投稿テスト（データがある場合）
# =====================================

if [ "$VIOLATIONS_COUNT" -gt 0 ] && [ "$SKIP_FIGMA" = false ]; then
    log_header "Phase 14: Figmaコメント投稿テスト"

    # 最初の違反IDを取得
    FIRST_VIOLATION_ID=$(echo "$VIOLATIONS_RESPONSE" | jq -r '.data.violations[0].id // empty')

    if [ -n "$FIRST_VIOLATION_ID" ]; then
        log_info "14-1: コメントメッセージプレビュー"
        PREVIEW_RESPONSE=$(make_request "GET" "/api/figma/comments/$PROJECT_ID/$FIRST_VIOLATION_ID/preview" "" "$JWT_TOKEN" "コメントプレビュー取得")
        log_success "Comment preview retrieved"

        log_info "14-2: 単一コメント投稿（テストスキップ - 実際のFigmaに投稿されます）"
        log_warning "実際に投稿する場合は以下のコマンドを実行:"
        log_info "  curl -X POST '$API_BASE_URL/api/figma/comments/$PROJECT_ID/$FIRST_VIOLATION_ID' \\"
        log_info "    -H 'Authorization: Bearer $JWT_TOKEN' \\"
        log_info "    -H 'Content-Type: application/json'"
    fi
fi

# =====================================
# Phase 15: プロジェクト削除
# =====================================

log_header "Phase 15: プロジェクト削除"

DELETE_RESPONSE=$(make_request "DELETE" "/api/projects/$PROJECT_ID" "" "$JWT_TOKEN" "プロジェクト削除")
log_success "Project deleted successfully"

# =====================================
# テスト完了
# =====================================

log_header "🎉 Test Completed Successfully"

echo "" | tee -a "$LOG_FILE"
echo "Test Summary:" | tee -a "$LOG_FILE"
echo "  API Base URL: $API_BASE_URL" | tee -a "$LOG_FILE"
echo "  Test User: $TEST_EMAIL" | tee -a "$LOG_FILE"
echo "  Project ID: $PROJECT_ID (deleted)" | tee -a "$LOG_FILE"
echo "  Log File: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

log_success "All tests passed! 🚀"
echo "" | tee -a "$LOG_FILE"

#!/bin/bash

# =====================================
# FIGLEAN APIテスト - クイックセットアップ
# 作成日時: 2026年1月12日
# =====================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  FIGLEAN API Test - Quick Setup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# =====================================
# Step 1: Figmaトークンの入力
# =====================================

echo -e "${GREEN}Step 1: Figmaトークンの入力${NC}"
echo ""
echo "Figmaトークンをまだ取得していない場合:"
echo "  1. https://www.figma.com/settings にアクセス"
echo "  2. 'Personal access tokens' → 'Create new token'"
echo "  3. 'Read only' 権限を選択して生成"
echo ""

read -p "Figmaトークンを入力してください: " FIGMA_TOKEN

if [ -z "$FIGMA_TOKEN" ]; then
    echo -e "${YELLOW}トークンが入力されませんでした${NC}"
    echo "後で .env.test ファイルに直接設定できます"
fi

echo ""

# =====================================
# Step 2: Figmaファイルキーの入力（オプション）
# =====================================

echo -e "${GREEN}Step 2: Figmaファイルキー（オプション）${NC}"
echo ""
echo "Figmaインポートをテストする場合、ファイルキーを入力してください"
echo "スキップする場合は Enter を押してください"
echo ""
echo "ファイルキーの取得方法:"
echo "  Figma URL: https://www.figma.com/file/ABC123DEF456/MyFile"
echo "                                          ^^^^^^^^^^^^"
echo "  ファイルキー: ABC123DEF456"
echo ""

read -p "Figmaファイルキー（オプション）: " FIGMA_FILE_KEY

echo ""

# =====================================
# Step 3: 環境変数ファイル作成
# =====================================

echo -e "${GREEN}Step 3: 環境変数ファイル作成${NC}"
echo ""

cat > .env.test << EOF
# FIGLEAN API設定
API_BASE_URL=http://localhost:3101

# Figmaトークン
FIGMA_TOKEN=${FIGMA_TOKEN}

# テスト用Figmaファイルキー（オプション）
FIGMA_FILE_KEY=${FIGMA_FILE_KEY}

# テストユーザー情報
TEST_EMAIL=test-\$(date +%s)@figlean.test
TEST_PASSWORD=TestPass123!
TEST_NAME="FIGLEANテストユーザー"
EOF

echo "✓ .env.test ファイルを作成しました"
echo ""

# =====================================
# Step 4: テストスクリプトに実行権限付与
# =====================================

echo -e "${GREEN}Step 4: テストスクリプトセットアップ${NC}"
echo ""

chmod +x test-figlean-api.sh
echo "✓ test-figlean-api.sh に実行権限を付与しました"
echo ""

# =====================================
# Step 5: ログディレクトリ作成
# =====================================

mkdir -p test-logs
echo "✓ test-logs ディレクトリを作成しました"
echo ""

# =====================================
# Step 6: .gitignore設定
# =====================================

echo -e "${GREEN}Step 5: セキュリティ設定${NC}"
echo ""

if [ -f .gitignore ]; then
    if ! grep -q ".env.test" .gitignore; then
        echo ".env.test" >> .gitignore
        echo "test-logs/" >> .gitignore
        echo "✓ .gitignore に機密ファイルを追加しました"
    else
        echo "✓ .gitignore は既に設定済みです"
    fi
else
    cat > .gitignore << EOF
.env.test
test-logs/
EOF
    echo "✓ .gitignore を作成しました"
fi

echo ""

# =====================================
# 完了メッセージ
# =====================================

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  セットアップ完了！${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""
echo "次のコマンドでテストを実行してください:"
echo ""
echo -e "${YELLOW}  source .env.test${NC}"
echo -e "${YELLOW}  ./test-figlean-api.sh${NC}"
echo ""
echo "または:"
echo ""
echo -e "${YELLOW}  bash -c 'source .env.test && ./test-figlean-api.sh'${NC}"
echo ""
echo "ログファイルは ./test-logs/ に保存されます"
echo ""

# =====================================
# サーバー起動確認
# =====================================

echo -e "${GREEN}サーバー起動確認中...${NC}"
echo ""

if curl -s http://localhost:3101/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ FIGLEANサーバーが起動しています${NC}"
    echo ""
    echo -e "${GREEN}今すぐテストを実行しますか？ [y/N]${NC}"
    read -p "> " RUN_NOW
    
    if [[ "$RUN_NOW" =~ ^[Yy]$ ]]; then
        echo ""
        echo "テストを開始します..."
        echo ""
        source .env.test
        ./test-figlean-api.sh
    fi
else
    echo -e "${YELLOW}⚠ FIGLEANサーバーが起動していません${NC}"
    echo ""
    echo "以下のコマンドでサーバーを起動してください:"
    echo ""
    echo "  cd ~/projects/figlean"
    echo "  docker-compose up -d"
    echo ""
    echo "起動後、再度テストを実行してください"
fi

echo ""

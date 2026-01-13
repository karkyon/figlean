#!/bin/bash

# =====================================
# FIGLEAN サンプルデータ投入スクリプト
# 作成日時: 2026年1月12日
# 説明: Figmaトークンなしでテストできるダミーデータを生成
# =====================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  FIGLEAN Sample Data Generator${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# =====================================
# Prisma経由でサンプルデータ投入
# =====================================

echo -e "${GREEN}サンプルデータを生成中...${NC}"
echo ""

# Dockerコンテナでtsxを使ってTypeScriptを実行
docker exec -i figlean-backend npx tsx << 'EOF'
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  既存のテストデータをクリア中...');
  
  // テストユーザーを削除
  const testUsers = await prisma.user.findMany({
    where: {
      email: {
        contains: '@figlean.test'
      }
    }
  });

  for (const user of testUsers) {
    await prisma.project.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }

  console.log('✅ クリア完了');
  console.log('');
  console.log('👤 サンプルユーザーを作成中...');

  // サンプルユーザー作成
  const passwordHash = await bcrypt.hash('TestPass123!', 12);
  
  const user = await prisma.user.create({
    data: {
      email: 'sample@figlean.test',
      passwordHash,
      name: 'サンプルユーザー',
      plan: 'FREE'
    }
  });

  console.log(`✅ ユーザー作成完了: ${user.email}`);
  console.log('');
  console.log('📁 サンプルプロジェクトを作成中...');

  // サンプルプロジェクト作成
  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: 'サンプルランディングページ',
      description: 'FIGLEAN APIテスト用サンプルプロジェクト',
      figmaFileKey: 'sample-file-key-12345',
      figmaFileName: 'Sample Landing Page',
      figleanScore: 82,
      layoutScore: 85,
      componentScore: 78,
      responsiveScore: 80,
      semanticScore: 85,
      htmlGeneratable: false,
      analysisStatus: 'COMPLETED',
      lastAnalyzedAt: new Date()
    }
  });

  console.log(`✅ プロジェクト作成完了: ${project.name}`);
  console.log('');
  console.log('📊 診断結果を作成中...');

  // 診断結果作成
  const analysisResult = await prisma.analysisResult.create({
    data: {
      projectId: project.id,
      figleanScore: 82,
      layoutScore: 85,
      componentScore: 78,
      responsiveScore: 80,
      semanticScore: 85,
      totalFrames: 25,
      analyzedFrames: 25,
      autoLayoutFrames: 18,
      componentUsage: 12,
      totalViolations: 19,
      criticalViolations: 3,
      majorViolations: 7,
      minorViolations: 9,
      htmlGeneratable: false,
      generatableReason: 'FIGLEAN適合度が90%未満のため生成不可',
      mobileReady: false,
      tabletReady: false,
      desktopReady: true,
      analysisTimeMs: 2500
    }
  });

  console.log(`✅ 診断結果作成完了`);
  console.log('');
  console.log('⚠️  ルール違反を作成中...');

  // ルール違反作成
  const violations = [
    {
      projectId: project.id,
      analysisId: analysisResult.id,
      frameName: 'HeroSection',
      frameId: '12:34',
      ruleId: 'AUTO_LAYOUT_REQUIRED',
      ruleName: 'Auto Layout必須',
      ruleCategory: 'LAYOUT',
      severity: 'CRITICAL',
      description: 'このFrameにAuto Layoutが設定されていません',
      impact: 'レスポンシブ対応が困難になります',
      suggestion: 'Shift + A でAuto Layoutを適用してください',
      detectedValue: 'No Auto Layout',
      expectedValue: 'Auto Layout',
      commentPosted: false
    },
    {
      projectId: project.id,
      analysisId: analysisResult.id,
      frameName: 'HeroSection',
      frameId: '12:34',
      ruleId: 'FIXED_SIZE_DETECTED',
      ruleName: '固定サイズ検出',
      ruleCategory: 'RESPONSIVE',
      severity: 'CRITICAL',
      description: 'Widthが固定値に設定されています',
      impact: 'SP幅で横スクロールが発生します',
      suggestion: 'Width を Fill に変更してください',
      detectedValue: 'Width: 480px (Fixed)',
      expectedValue: 'Width: Fill',
      commentPosted: false
    },
    {
      projectId: project.id,
      analysisId: analysisResult.id,
      frameName: 'FeatureGrid',
      frameId: '12:37',
      ruleId: 'WRAP_OFF',
      ruleName: 'Wrap未設定',
      ruleCategory: 'RESPONSIVE',
      severity: 'MAJOR',
      description: 'Auto LayoutのWrapがOFFです',
      impact: '要素が折り返されず、レイアウトが崩れます',
      suggestion: 'Wrap を ON に設定してください',
      detectedValue: 'Wrap: OFF',
      expectedValue: 'Wrap: ON',
      commentPosted: false
    },
    {
      projectId: project.id,
      analysisId: analysisResult.id,
      frameName: 'Frame 123',
      frameId: '12:35',
      ruleId: 'NON_SEMANTIC_NAME',
      ruleName: 'セマンティックでない名前',
      ruleCategory: 'SEMANTIC',
      severity: 'MAJOR',
      description: 'Frameの名前がセマンティックではありません',
      impact: 'コード生成時に適切な要素名が付与されません',
      suggestion: 'section-hero のようなセマンティックな名前に変更してください',
      detectedValue: 'Frame 123',
      expectedValue: 'section-*',
      commentPosted: false
    },
    {
      projectId: project.id,
      analysisId: analysisResult.id,
      frameName: 'ButtonPrimary',
      frameId: '12:36',
      ruleId: 'COMPONENT_NOT_USED',
      ruleName: 'Component未使用',
      ruleCategory: 'COMPONENT',
      severity: 'MINOR',
      description: 'ボタンがComponentになっていません',
      impact: '一貫性が保てず、管理が困難になります',
      suggestion: 'Componentとして作成してください',
      detectedValue: 'Frame (非Component)',
      expectedValue: 'Component',
      commentPosted: false
    }
  ];

  await prisma.ruleViolation.createMany({ data: violations });

  console.log(`✅ ルール違反 ${violations.length}件 作成完了`);
  console.log('');
  console.log('🔮 崩壊予測を作成中...');

  // 崩壊予測作成
  const predictions = [
    {
      projectId: project.id,
      breakType: 'HORIZONTAL_SCROLL',
      breakTitle: 'SP幅で横スクロール発生',
      breakDescription: 'HeroSectionが固定幅480px → Widthをfillに変更',
      affectedFrame: 'HeroSection',
      affectedFrameId: '12:34',
      breakpoint: 'mobile',
      screenWidth: 375,
      fixSuggestion: 'Width を Fill Container に変更してください',
      severity: 'CRITICAL'
    },
    {
      projectId: project.id,
      breakType: 'FLEX_WRAP_FAILURE',
      breakTitle: 'Flex折り返しが機能しません',
      breakDescription: 'FeatureGridでWrap: OFF → WrapをONに変更',
      affectedFrame: 'FeatureGrid',
      affectedFrameId: '12:37',
      breakpoint: 'tablet',
      screenWidth: 768,
      fixSuggestion: 'Auto Layout Settings → Wrap: ON',
      severity: 'MAJOR'
    },
    {
      projectId: project.id,
      breakType: 'HEIGHT_MISMATCH',
      breakTitle: 'ボタン高さ不一致',
      breakDescription: 'ButtonPrimary(48px) vs ButtonSecondary(40px) → Component化',
      affectedFrame: 'ButtonGroup',
      affectedFrameId: '12:39',
      breakpoint: null,
      screenWidth: null,
      fixSuggestion: 'ボタンをComponentとして統一してください',
      severity: 'MINOR'
    }
  ];

  await prisma.breakPrediction.createMany({ data: predictions });

  console.log(`✅ 崩壊予測 ${predictions.length}件 作成完了`);
  console.log('');
  console.log('💡 改善提案を作成中...');

  // 改善提案作成
  const suggestions = [
    {
      projectId: project.id,
      priority: 1,
      title: 'HeroSection に Auto Layout を設定',
      description: 'Direction: Horizontal / Gap: 24px',
      targetFrame: 'HeroSection',
      targetFrameId: '12:34',
      impactLevel: 'HIGH',
      scoreImprovement: 8,
      estimatedTime: '5分',
      difficulty: 'EASY',
      actionSteps: JSON.stringify([
        'HeroSectionを選択',
        'Shift + A でAuto Layout適用',
        'Direction: Horizontal',
        'Gap: 24px'
      ]),
      beforeValue: 'No Auto Layout',
      afterValue: 'Auto Layout (Horizontal, Gap: 24px)'
    },
    {
      projectId: project.id,
      priority: 2,
      title: 'HeroSection の Width を Fill に変更',
      description: '現在: Fixed (480px) → 推奨: Fill Container',
      targetFrame: 'HeroSection',
      targetFrameId: '12:34',
      impactLevel: 'HIGH',
      scoreImprovement: 6,
      estimatedTime: '3分',
      difficulty: 'EASY',
      actionSteps: JSON.stringify([
        'HeroSectionを選択',
        'プロパティパネルで Width を選択',
        'Fill Container を選択'
      ]),
      beforeValue: 'Width: Fixed (480px)',
      afterValue: 'Width: Fill Container'
    },
    {
      projectId: project.id,
      priority: 3,
      title: 'FeatureGrid の Wrap を ON に設定',
      description: 'レスポンシブ対応のため折り返しを有効化',
      targetFrame: 'FeatureGrid',
      targetFrameId: '12:37',
      impactLevel: 'MEDIUM',
      scoreImprovement: 4,
      estimatedTime: '2分',
      difficulty: 'EASY',
      actionSteps: JSON.stringify([
        'FeatureGridを選択',
        'Auto Layout Settings を開く',
        'Wrap: ON を選択'
      ]),
      beforeValue: 'Wrap: OFF',
      afterValue: 'Wrap: ON'
    }
  ];

  await prisma.improvementSuggestion.createMany({ data: suggestions });

  console.log(`✅ 改善提案 ${suggestions.length}件 作成完了`);
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('🎉 サンプルデータ生成完了！');
  console.log('═══════════════════════════════════════════');
  console.log('');
  console.log('ログイン情報:');
  console.log(`  Email: ${user.email}`);
  console.log('  Password: TestPass123!');
  console.log('');
  console.log(`プロジェクトID: ${project.id}`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF

echo ""
echo -e "${GREEN}✅ サンプルデータの生成が完了しました${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  テストの実行方法${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""
echo "1. サンプルデータを使ったテスト:"
echo ""
echo "   TEST_EMAIL='sample@figlean.test' \\"
echo "   TEST_PASSWORD='TestPass123!' \\"
echo "   ./test-figlean-api.sh"
echo ""
echo "2. または、手動でログイン:"
echo ""
echo "   Email: sample@figlean.test"
echo "   Password: TestPass123!"
echo ""

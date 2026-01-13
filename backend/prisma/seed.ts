// =====================================
// FIGLEAN - Database Seed Script
// サンプルデータ投入スクリプト
// =====================================

import { PrismaClient, UserRole, AnalysisStatus, Severity, RuleCategory, Framework, GenerationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // =====================================
  // 1. ユーザー作成
  // =====================================
  console.log('👤 Creating users...');

  const passwordHash = await bcrypt.hash('password123', 10);

  const userJunji = await prisma.user.upsert({
    where: { email: 'junji@figlean.com' },
    update: {},
    create: {
      username: 'junji',
      email: 'junji@figlean.com',
      passwordHash,
      name: 'じゅんじ',
      role: UserRole.ADMIN,
      figmaAccessToken: 'figd_dummy_token_12345',
      figmaUserId: 'figma_user_001',
      emailVerifiedAt: new Date(),
      lastLoginAt: new Date(),
    },
  });

  const userPro = await prisma.user.upsert({
    where: { email: 'pro@figlean.com' },
    update: {},
    create: {
      username: 'prouser',
      email: 'pro@figlean.com',
      passwordHash,
      name: 'Proユーザー',
      role: UserRole.PRO,
      planExpiredAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年後
      emailVerifiedAt: new Date(),
    },
  });

  const userFree = await prisma.user.upsert({
    where: { email: 'free@figlean.com' },
    update: {},
    create: {
      username: 'freeuser',
      email: 'free@figlean.com',
      passwordHash,
      name: 'Freeユーザー',
      role: UserRole.FREE,
      emailVerifiedAt: new Date(),
    },
  });

  console.log('✅ Users created');

  // =====================================
  // 2. プロジェクト作成
  // =====================================
  console.log('📁 Creating projects...');

  const projectLandingPage = await prisma.project.create({
    data: {
      userId: userJunji.id,
      name: 'Landing Page Project',
      description: 'FIGLEANランディングページのデザイン診断プロジェクト',
      figmaFileKey: 'abc123def456',
      figmaFileUrl: 'https://www.figma.com/file/abc123def456/Landing-Page',
      figmaFileName: 'Landing Page Design',
      figmaNodeId: '1:2',
      figleanScore: 82,
      layoutScore: 92,
      componentScore: 78,
      responsiveScore: 75,
      semanticScore: 85,
      analysisStatus: AnalysisStatus.COMPLETED,
      lastAnalyzedAt: new Date(),
      analysisCount: 3,
      htmlGeneratable: false,
    },
  });

  const projectDashboard = await prisma.project.create({
    data: {
      userId: userPro.id,
      name: 'Dashboard UI Kit',
      description: 'ダッシュボードUIコンポーネント集',
      figmaFileKey: 'xyz789ghi012',
      figmaFileUrl: 'https://www.figma.com/file/xyz789ghi012/Dashboard',
      figmaFileName: 'Dashboard Components',
      figleanScore: 95,
      layoutScore: 98,
      componentScore: 94,
      responsiveScore: 92,
      semanticScore: 96,
      analysisStatus: AnalysisStatus.COMPLETED,
      lastAnalyzedAt: new Date(),
      analysisCount: 1,
      htmlGeneratable: true,
    },
  });

  const projectPending = await prisma.project.create({
    data: {
      userId: userFree.id,
      name: 'E-commerce Site',
      description: 'ECサイトデザイン（診断待ち）',
      figmaFileKey: 'pending123',
      figmaFileUrl: 'https://www.figma.com/file/pending123/Ecommerce',
      figmaFileName: 'E-commerce Design',
      analysisStatus: AnalysisStatus.PENDING,
    },
  });

  console.log('✅ Projects created');

  // =====================================
  // 3. 診断結果作成
  // =====================================
  console.log('📊 Creating analysis results...');

  const analysisLanding = await prisma.analysisResult.create({
    data: {
      projectId: projectLandingPage.id,
      figleanScore: 82,
      layoutScore: 92,
      componentScore: 78,
      responsiveScore: 75,
      semanticScore: 85,
      tailwindOptScore: 88,
      unnecessaryClassRate: 0.18,
      redundantSpacingCount: 6,
      standardValueMatch: 0.92,
      totalFrames: 45,
      analyzedFrames: 45,
      autoLayoutFrames: 38,
      componentUsage: 12,
      criticalViolations: 2,
      majorViolations: 5,
      minorViolations: 12,
      totalViolations: 19,
      htmlGeneratable: false,
      generatableReason: 'CRITICAL違反2件の修正が必要です',
      mobileReady: false,
      tabletReady: true,
      desktopReady: true,
      analysisTimeMs: 3245,
    },
  });

  const analysisDashboard = await prisma.analysisResult.create({
    data: {
      projectId: projectDashboard.id,
      figleanScore: 95,
      layoutScore: 98,
      componentScore: 94,
      responsiveScore: 92,
      semanticScore: 96,
      tailwindOptScore: 94,
      unnecessaryClassRate: 0.05,
      redundantSpacingCount: 2,
      standardValueMatch: 0.98,
      totalFrames: 32,
      analyzedFrames: 32,
      autoLayoutFrames: 32,
      componentUsage: 24,
      criticalViolations: 0,
      majorViolations: 1,
      minorViolations: 3,
      totalViolations: 4,
      htmlGeneratable: true,
      generatableReason: 'すべての条件を満たしています',
      mobileReady: true,
      tabletReady: true,
      desktopReady: true,
      analysisTimeMs: 2156,
    },
  });

  console.log('✅ Analysis results created');

  // =====================================
  // 4. ルール違反作成
  // =====================================
  console.log('⚠️  Creating rule violations...');

  await prisma.ruleViolation.createMany({
    data: [
      {
        projectId: projectLandingPage.id,
        frameName: 'HeroSection',
        frameId: '12:34',
        framePath: 'Page / HeroSection',
        ruleId: 'AL001',
        ruleName: 'Auto Layout Required',
        ruleCategory: RuleCategory.LAYOUT,
        severity: Severity.CRITICAL,
        description: 'Auto Layoutが設定されていません',
        impact: 'レイアウトが崩れます',
        suggestion: 'Auto Layoutを設定してください',
        detectedValue: 'None',
        expectedValue: 'Auto Layout (Horizontal)',
      },
      {
        projectId: projectLandingPage.id,
        frameName: 'NavBar',
        frameId: '12:35',
        framePath: 'Page / NavBar',
        ruleId: 'POS001',
        ruleName: 'Absolute Positioning Detected',
        ruleCategory: RuleCategory.LAYOUT,
        severity: Severity.CRITICAL,
        description: '絶対配置が使用されています',
        impact: 'レスポンシブで確実に崩れます',
        suggestion: 'Auto Layoutに変更してください',
        detectedValue: 'Absolute',
        expectedValue: 'Auto Layout',
      },
      {
        projectId: projectLandingPage.id,
        frameName: 'ButtonPrimary',
        frameId: '12:36',
        framePath: 'Page / HeroSection / ButtonPrimary',
        ruleId: 'SIZE001',
        ruleName: 'Fixed Size Detected',
        ruleCategory: RuleCategory.CONSTRAINT,
        severity: Severity.MAJOR,
        description: '固定サイズ(320px)が使われています',
        impact: 'モバイルではみ出します',
        suggestion: 'Widthをfillに変更してください',
        detectedValue: 'Fixed (320px)',
        expectedValue: 'Fill Container',
      },
      {
        projectId: projectLandingPage.id,
        frameName: 'FeatureGrid',
        frameId: '12:37',
        framePath: 'Page / FeatureGrid',
        ruleId: 'AL002',
        ruleName: 'Wrap Off Detected',
        ruleCategory: RuleCategory.RESPONSIVE,
        severity: Severity.MAJOR,
        description: 'Auto LayoutでWrapがOFFです',
        impact: '横スクロール発生の可能性',
        suggestion: 'Wrapを有効化してください',
        detectedValue: 'Wrap: OFF',
        expectedValue: 'Wrap: ON',
      },
      {
        projectId: projectLandingPage.id,
        frameName: 'Frame 12',
        frameId: '12:38',
        framePath: 'Page / Frame 12',
        ruleId: 'NM001',
        ruleName: 'Non-Semantic Name',
        ruleCategory: RuleCategory.SEMANTIC,
        severity: Severity.MINOR,
        description: 'Frameがsemanticではありません',
        impact: '生成HTMLが<div>になります',
        suggestion: 'section-features等にリネーム',
        detectedValue: 'Frame 12',
        expectedValue: 'section-features',
      },
    ],
  });

  console.log('✅ Rule violations created');

  // =====================================
  // 5. 崩壊予測作成
  // =====================================
  console.log('🔮 Creating break predictions...');

  await prisma.breakPrediction.createMany({
    data: [
      {
        projectId: projectLandingPage.id,
        breakType: 'HORIZONTAL_SCROLL',
        breakTitle: 'SP幅（375px）で横スクロール発生',
        breakDescription: 'HeroSectionが固定幅480px → Widthをfillに変更',
        affectedFrame: 'HeroSection',
        affectedFrameId: '12:34',
        breakpoint: 'mobile',
        screenWidth: 375,
        fixSuggestion: 'Width を Fill に変更してください',
        severity: Severity.CRITICAL,
      },
      {
        projectId: projectLandingPage.id,
        breakType: 'FLEX_WRAP_FAILURE',
        breakTitle: 'Flex折り返しが機能しません',
        breakDescription: 'FeatureGridでWrap: OFF → WrapをONに変更',
        affectedFrame: 'FeatureGrid',
        affectedFrameId: '12:37',
        breakpoint: 'tablet',
        screenWidth: 768,
        fixSuggestion: 'Auto Layout Settings → Wrap: ON',
        severity: Severity.MAJOR,
      },
      {
        projectId: projectLandingPage.id,
        breakType: 'HEIGHT_MISMATCH',
        breakTitle: 'ボタン高さ不一致',
        breakDescription: 'ButtonPrimary(48px) vs ButtonSecondary(40px) → Component化',
        affectedFrame: 'ButtonGroup',
        affectedFrameId: '12:39',
        fixSuggestion: 'ボタンをComponentとして統一してください',
        severity: Severity.MINOR,
      },
    ],
  });

  console.log('✅ Break predictions created');

  // =====================================
  // 6. 改善提案作成
  // =====================================
  console.log('💡 Creating improvement suggestions...');

  await prisma.improvementSuggestion.createMany({
    data: [
      {
        projectId: projectLandingPage.id,
        priority: 1,
        title: 'HeroSection に Auto Layout を設定',
        description: 'Direction: Horizontal / Gap: 24px',
        targetFrame: 'HeroSection',
        targetFrameId: '12:34',
        impactLevel: 'HIGH',
        scoreImprovement: 6,
        estimatedTime: '5分',
        difficulty: 'EASY',
        actionSteps: JSON.stringify([
          'HeroSectionを選択',
          'Shift + A でAuto Layout適用',
          'Direction: Horizontal',
          'Gap: 24px',
        ]),
        beforeValue: 'No Auto Layout',
        afterValue: 'Auto Layout (Horizontal, Gap: 24px)',
      },
      {
        projectId: projectLandingPage.id,
        priority: 2,
        title: 'ButtonPrimary の Width を Fill に変更',
        description: '現在: Fixed (320px) → 推奨: Fill Container',
        targetFrame: 'ButtonPrimary',
        targetFrameId: '12:36',
        impactLevel: 'HIGH',
        scoreImprovement: 4,
        estimatedTime: '2分',
        difficulty: 'EASY',
        actionSteps: JSON.stringify([
          'ButtonPrimaryを選択',
          'Width設定を開く',
          'Fill Containerを選択',
        ]),
        beforeValue: 'Fixed (320px)',
        afterValue: 'Fill Container',
      },
      {
        projectId: projectLandingPage.id,
        priority: 3,
        title: 'FeatureGrid で Wrap を有効化',
        description: 'Auto Layout Settings → Wrap: ON',
        targetFrame: 'FeatureGrid',
        targetFrameId: '12:37',
        impactLevel: 'MEDIUM',
        scoreImprovement: 3,
        estimatedTime: '3分',
        difficulty: 'EASY',
        actionSteps: JSON.stringify([
          'FeatureGridを選択',
          'Auto Layout設定を開く',
          'Wrap: ONに変更',
        ]),
        beforeValue: 'Wrap: OFF',
        afterValue: 'Wrap: ON',
      },
      {
        projectId: projectLandingPage.id,
        priority: 4,
        title: 'Frameをsemanticに変更',
        description: '「Frame 12」 → 「section-features」',
        targetFrame: 'Frame 12',
        targetFrameId: '12:38',
        impactLevel: 'LOW',
        scoreImprovement: 1,
        estimatedTime: '1分',
        difficulty: 'EASY',
        actionSteps: JSON.stringify([
          'Frame 12を選択',
          'Cmd + R でリネーム',
          'section-featuresと入力',
        ]),
        beforeValue: 'Frame 12',
        afterValue: 'section-features',
      },
      {
        projectId: projectLandingPage.id,
        priority: 5,
        title: 'ボタンをComponentとして統一',
        description: 'ButtonPrimary, ButtonSecondary を Variant で統合',
        targetFrame: 'ButtonGroup',
        targetFrameId: '12:39',
        impactLevel: 'LOW',
        scoreImprovement: 2,
        estimatedTime: '10分',
        difficulty: 'MEDIUM',
        actionSteps: JSON.stringify([
          'ボタンを選択',
          'Create Componentを実行',
          'Add Variantで種類を追加',
          'プロパティを統一',
        ]),
        beforeValue: '個別Frame',
        afterValue: 'Component with Variants',
      },
    ],
  });

  console.log('✅ Improvement suggestions created');

  // =====================================
  // 7. HTML生成履歴作成
  // =====================================
  console.log('🎨 Creating generated HTML...');

  await prisma.generatedHtml.create({
    data: {
      projectId: projectDashboard.id,
      userId: userPro.id,
      framework: Framework.HTML_TAILWIND,
      includeResponsive: true,
      includeGrid: false,
      breakpoints: JSON.stringify({
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      }),
      generationStatus: GenerationStatus.COMPLETED,
      htmlCode: `<section class="flex flex-col md:flex-row gap-6 py-12 px-6">
  <article class="flex-1 p-6 bg-white rounded-lg shadow-md">
    <h2 class="text-2xl font-bold mb-4">Dashboard</h2>
    <p class="text-gray-600 mb-6">Analytics overview</p>
    <button class="px-6 py-3 bg-blue-600 text-white rounded-lg">
      View Details
    </button>
  </article>
</section>`,
      cssCode: '/* Tailwind CSS を使用 */',
      totalLines: 12,
      tailwindClasses: 18,
      componentCount: 1,
      reproductionRate: 0.98,
      codeQualityScore: 94,
      generationTimeMs: 1234,
    },
  });

  console.log('✅ Generated HTML created');

  // =====================================
  // 8. Figmaキャッシュ作成
  // =====================================
  console.log('💾 Creating Figma cache...');

  const figmaFile = await prisma.figmaFileCache.create({
    data: {
      fileKey: 'abc123def456',
      fileName: 'Landing Page Design',
      thumbnailUrl: 'https://example.com/thumbnail.png',
      lastModified: new Date('2026-01-09T12:00:00Z'),
      version: '1.2.3',
      editorType: 'figma',
      cacheExpiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24時間後
      accessCount: 3,
      lastAccessedAt: new Date(),
    },
  });

  await prisma.figmaNodeCache.createMany({
    data: [
      {
        fileKey: 'abc123def456',
        nodeId: '12:34',
        nodeName: 'HeroSection',
        nodeType: 'FRAME',
        depth: 1,
        path: 'Page / HeroSection',
        hasAutoLayout: false,
        width: 1440,
        height: 800,
        isComponent: false,
        rawNodeData: JSON.stringify({ type: 'FRAME', name: 'HeroSection' }),
        cacheExpiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      {
        fileKey: 'abc123def456',
        nodeId: '12:36',
        nodeName: 'ButtonPrimary',
        nodeType: 'FRAME',
        depth: 2,
        path: 'Page / HeroSection / ButtonPrimary',
        hasAutoLayout: true,
        layoutMode: 'HORIZONTAL',
        width: 320,
        height: 48,
        paddingLeft: 24,
        paddingRight: 24,
        paddingTop: 12,
        paddingBottom: 12,
        itemSpacing: 8,
        isComponent: false,
        rawNodeData: JSON.stringify({ type: 'FRAME', name: 'ButtonPrimary' }),
        cacheExpiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    ],
  });

  await prisma.figmaLoadHistory.create({
    data: {
      projectId: projectLandingPage.id,
      userId: userJunji.id,
      fileKey: 'abc123def456',
      nodeId: '1:2',
      status: 'SUCCESS',
      totalNodes: 45,
      successNodes: 45,
      failedNodes: 0,
      loadTimeMs: 3245,
      apiCallCount: 3,
      cacheHitRate: 0.67,
    },
  });

  console.log('✅ Figma cache created');

  // =====================================
  // 9. ルール定義マスタ作成
  // =====================================
  console.log('📋 Creating rule definitions...');

  await prisma.ruleDefinition.createMany({
    data: [
      {
        ruleId: 'AL001',
        ruleName: 'Auto Layout Required',
        ruleCategory: RuleCategory.LAYOUT,
        severity: Severity.CRITICAL,
        description: 'Auto Layoutが設定されていません',
        impactTemplate: 'レイアウトが崩れます',
        checkLogic: JSON.stringify({ check: 'hasAutoLayout', expected: true }),
        suggestionTemplate: 'Auto Layoutを設定してください',
        scoreImpact: -10,
      },
      {
        ruleId: 'POS001',
        ruleName: 'Absolute Positioning Detected',
        ruleCategory: RuleCategory.LAYOUT,
        severity: Severity.CRITICAL,
        description: '絶対配置が使用されています',
        impactTemplate: 'レスポンシブで確実に崩れます',
        checkLogic: JSON.stringify({ check: 'layoutPositioning', expected: 'AUTO' }),
        suggestionTemplate: 'Auto Layoutに変更してください',
        scoreImpact: -12,
      },
      {
        ruleId: 'SIZE001',
        ruleName: 'Fixed Size Detected',
        ruleCategory: RuleCategory.CONSTRAINT,
        severity: Severity.MAJOR,
        description: '固定サイズが使われています',
        impactTemplate: 'モバイルではみ出します',
        checkLogic: JSON.stringify({ check: 'primaryAxisSizing', expected: 'FILL' }),
        suggestionTemplate: 'Widthをfillに変更してください',
        scoreImpact: -5,
      },
      {
        ruleId: 'AL002',
        ruleName: 'Wrap Off Detected',
        ruleCategory: RuleCategory.RESPONSIVE,
        severity: Severity.MAJOR,
        description: 'Auto LayoutでWrapがOFFです',
        impactTemplate: '横スクロール発生の可能性',
        checkLogic: JSON.stringify({ check: 'layoutWrap', expected: 'WRAP' }),
        suggestionTemplate: 'Wrapを有効化してください',
        scoreImpact: -4,
      },
      {
        ruleId: 'NM001',
        ruleName: 'Non-Semantic Name',
        ruleCategory: RuleCategory.SEMANTIC,
        severity: Severity.MINOR,
        description: 'Frame名がsemanticではありません',
        impactTemplate: '生成HTMLが<div>になります',
        checkLogic: JSON.stringify({ check: 'nodeName', pattern: '^(section|article|header|footer|nav|main)-' }),
        suggestionTemplate: 'section-*, article-*等にリネーム',
        scoreImpact: -1,
      },
    ],
  });

  console.log('✅ Rule definitions created');

  console.log('');
  console.log('🎉 Seeding completed successfully!');
  console.log('');
  console.log('📊 Created:');
  console.log('  - 3 Users (ADMIN, PRO, FREE)');
  console.log('  - 3 Projects');
  console.log('  - 2 Analysis Results');
  console.log('  - 5 Rule Violations');
  console.log('  - 3 Break Predictions');
  console.log('  - 5 Improvement Suggestions');
  console.log('  - 1 Generated HTML');
  console.log('  - Figma Cache Data');
  console.log('  - 5 Rule Definitions');
  console.log('');
  console.log('🔐 Test Accounts:');
  console.log('  Admin: junji@figlean.com / password123');
  console.log('  Pro:   pro@figlean.com / password123');
  console.log('  Free:  free@figlean.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
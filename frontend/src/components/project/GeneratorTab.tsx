/**
 * FIGLEAN Frontend - GeneratorTabコンポーネント（日本語化版）
 * ファイルパス: frontend/src/components/project/GeneratorTab.tsx
 * 
 * 機能:
 * 1. HTMLコード生成インターフェース
 * 2. 生成オプション設定
 * 3. 生成結果のプレビューとダウンロード
 * 4. 生成履歴管理
 * 5. Grid判定・プレビュー
 * 
 * 作成日: 2026年1月14日
 * 更新日: 2026年1月14日 - 日本語化対応
 */

'use client';

import { useState } from 'react';
import type { Project } from '@/types/models';
import type { 
  Framework, 
  GenerateHTMLRequest,
  GenerateHTMLResponse,
  ProjectBreakpoints 
} from '@/types/html';
import { generateHTML, downloadHTML } from '@/lib/api/html';
import HTMLHistoryTab from './HTMLHistoryTab';
import GridPreviewCard from './GridPreviewCard';
import { logger } from '@/lib/logger';

interface GeneratorTabProps {
  project: Project;
}

type SubTab = 'generate' | 'history';

export default function GeneratorTab({ project }: GeneratorTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('generate');
  const [framework, setFramework] = useState<Framework>('HTML_TAILWIND');
  const [includeResponsive, setIncludeResponsive] = useState(true);
  const [includeGrid, setIncludeGrid] = useState(false);
  const [customBreakpoints, setCustomBreakpoints] = useState(false);
  const [breakpoints, setBreakpoints] = useState<ProjectBreakpoints>({
    mobile: 640,
    tablet: 768,
    desktop: 1024,
    wide: 1280
  });
  
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateHTMLResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = project.figleanScore !== null && project.figleanScore >= 90;
  const canUseGrid = project.figleanScore === 100;

  const handleGenerate = async () => {
    logger.component('GeneratorTab', 'HTML生成開始', { projectId: project.id, framework, includeResponsive, includeGrid });
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const request: GenerateHTMLRequest = {
        framework,
        includeResponsive,
        includeGrid: canUseGrid && includeGrid,
        breakpoints: customBreakpoints ? breakpoints : undefined
      };

      logger.api('POST', `/html/generate/${project.id}`, request);
      const response = await generateHTML(project.id, request);
      setResult(response);
      logger.apiSuccess('POST', `/html/generate/${project.id}`, {
        generatedId: response.generatedId,
        metadata: response.metadata,
        generationTimeMs: response.generationTimeMs
      });
      logger.success('HTML生成完了', { projectId: project.id, generationTimeMs: response.generationTimeMs });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'HTML生成に失敗しました';
      logger.apiError('POST', `/html/generate/${project.id}`, err);
      logger.error('HTML生成失敗', err, { projectId: project.id, errorMessage });
      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;

    try {
      logger.component('GeneratorTab', 'HTMLダウンロード開始', { projectId: project.id });
      logger.api('GET', `/html/${project.id}/download`);
      const blob = await downloadHTML(project.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name || 'generated'}-html.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      logger.success('HTMLダウンロード完了', { projectId: project.id, filename: a.download });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'ダウンロードに失敗しました';
      logger.apiError('GET', `/html/${project.id}/download`, err);
      logger.error('HTMLダウンロード失敗', err, { projectId: project.id, errorMessage });
      setError(errorMessage);
    }
  };

  return (
    <div className="space-y-6">
      {/* サブタブナビゲーション */}
      <div className="border-b">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveSubTab('generate')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSubTab === 'generate'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🎨 生成
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSubTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 履歴
          </button>
        </nav>
      </div>

      {/* サブタブコンテンツ */}
      {activeSubTab === 'generate' && (
        <div className="space-y-6">
          {/* Grid判定カード */}
          <GridPreviewCard project={project} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左側: 生成オプション */}
            <div className="space-y-6">
              {/* スコアチェック */}
              {!canGenerate && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <h4 className="font-semibold text-yellow-800 mb-1">
                        スコア90%未満
                      </h4>
                      <p className="text-sm text-yellow-700">
                        HTML生成機能を利用するには、FIGLEAN適合度90%以上が必要です。
                        現在: {project.figleanScore}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {canGenerate && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <h4 className="font-semibold text-green-800 mb-1">
                        生成可能
                      </h4>
                      <p className="text-sm text-green-700">
                        FIGLEAN適合度{project.figleanScore}%達成！HTML生成機能が利用可能です
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* フレームワーク選択 */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-4">出力形式</h3>
                <select
                  value={framework}
                  onChange={(e) => setFramework(e.target.value as Framework)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="HTML_TAILWIND">HTML + Tailwind CSS</option>
                  <option value="REACT_JSX">React Component (JSX)</option>
                  <option value="VUE_SFC">Vue Component (SFC)</option>
                </select>
              </div>

              {/* レスポンシブ・Grid設定 */}
              <div className="bg-white rounded-lg border p-4 space-y-4">
                <h3 className="font-semibold">レイアウト設定</h3>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeResponsive}
                    onChange={(e) => setIncludeResponsive(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">レスポンシブ対応</span>
                </label>

                <label className={`flex items-center gap-3 ${canUseGrid ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                  <input
                    type="checkbox"
                    checked={includeGrid}
                    onChange={(e) => setIncludeGrid(e.target.checked)}
                    disabled={!canUseGrid}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <span className="font-medium">Grid Layout変換</span>
                    {canUseGrid ? (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">100%限定</span>
                    ) : (
                      <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">要100%</span>
                    )}
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customBreakpoints}
                    onChange={(e) => setCustomBreakpoints(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">カスタムBreakpoint</span>
                </label>

                {customBreakpoints && (
                  <div className="ml-7 space-y-2 p-4 bg-gray-50 rounded">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-gray-600">Mobile</label>
                        <input
                          type="number"
                          value={breakpoints.mobile}
                          onChange={(e) => setBreakpoints({
                            ...breakpoints,
                            mobile: parseInt(e.target.value)
                          })}
                          className="w-full px-3 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Tablet</label>
                        <input
                          type="number"
                          value={breakpoints.tablet}
                          onChange={(e) => setBreakpoints({
                            ...breakpoints,
                            tablet: parseInt(e.target.value)
                          })}
                          className="w-full px-3 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Desktop</label>
                        <input
                          type="number"
                          value={breakpoints.desktop}
                          onChange={(e) => setBreakpoints({
                            ...breakpoints,
                            desktop: parseInt(e.target.value)
                          })}
                          className="w-full px-3 py-1 border rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Wide</label>
                        <input
                          type="number"
                          value={breakpoints.wide}
                          onChange={(e) => setBreakpoints({
                            ...breakpoints,
                            wide: parseInt(e.target.value)
                          })}
                          className="w-full px-3 py-1 border rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? '生成中...' : 'HTML生成'}
              </button>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                  {error}
                </div>
              )}
            </div>

            {/* 右側: プレビュー・結果 */}
            <div className="space-y-6">
              {result && (
                <>
                  <div className="bg-white rounded-lg border p-6">
                    <h3 className="text-lg font-semibold mb-4">生成プレビュー（参考）</h3>
                    <div className="bg-gray-50 rounded p-4 max-h-96 overflow-auto">
                      <pre className="text-xs font-mono">
                        {result.htmlCode.substring(0, 1000)}...
                      </pre>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border p-6">
                    <h3 className="text-lg font-semibold mb-4">生成情報</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">総行数:</dt>
                        <dd className="font-medium">{result.metadata.totalLines} 行</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Tailwindクラス数:</dt>
                        <dd className="font-medium">{result.metadata.tailwindClasses}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">コンポーネント数:</dt>
                        <dd className="font-medium">{result.metadata.componentCount}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">再現率:</dt>
                        <dd className="font-medium">
                          {(result.metadata.reproductionRate * 100).toFixed(1)}%
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">コード品質:</dt>
                        <dd className="font-medium">{result.metadata.codeQualityScore}/100</dd>
                      </div>
                      {result.metadata.gridUsed && (
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Grid使用:</dt>
                          <dd className="font-medium text-green-600">✓ 使用</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-gray-600">生成時間:</dt>
                        <dd className="font-medium">{result.generationTimeMs}ms</dd>
                      </div>
                    </dl>
                  </div>

                  <button
                    onClick={handleDownload}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    📥 ダウンロード
                  </button>
                </>
              )}

              {!result && !error && (
                <div className="bg-gray-50 rounded-lg border-2 border-dashed p-12 text-center text-gray-500">
                  <div className="text-4xl mb-4">🎨</div>
                  <p>HTML生成をクリックして<br />コード生成を開始</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History タブ */}
      {activeSubTab === 'history' && (
        <HTMLHistoryTab project={project} />
      )}
    </div>
  );
}
/**
 * FIGLEAN Frontend - GeneratorTabコンポーネント
 * ファイルパス: frontend/src/components/project/GeneratorTab.tsx
 * 
 * 機能:
 * 1. HTMLコード生成インターフェース
 * 2. 生成オプション設定
 * 3. 生成結果のプレビューとダウンロード
 * 
 * 作成日: 2026年1月14日
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

interface GeneratorTabProps {
  project: Project;
}

export default function GeneratorTab({ project }: GeneratorTabProps) {
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
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const request: GenerateHTMLRequest = {
        framework,
        includeResponsive,
        includeGrid: canUseGrid && includeGrid,
        breakpoints: customBreakpoints ? breakpoints : undefined,
        minifyOutput: false,
        includeComments: false
      };

      const response = await generateHTML(project.id, request);
      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'HTML生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;

    try {
      const blob = await downloadHTML(project.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('ダウンロードに失敗しました');
    }
  };

  return (
    <div className="space-y-6">
      {/* スコア警告 */}
      {!canGenerate && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-900">
                FIGLEAN適合度90%以上で利用可能になります（現在{project.figleanScore}%）
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                {project.figleanScore !== null && (
                  <>
                    あと<strong>{90 - project.figleanScore}ポイント</strong>の改善が必要です
                  </>
                )}
                <br />
                （CRITICAL 2件の修正で達成可能）
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側: 生成設定 */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">生成可能な形式</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="framework"
                  value="HTML_TAILWIND"
                  checked={framework === 'HTML_TAILWIND'}
                  onChange={(e) => setFramework(e.target.value as Framework)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium">✓ HTML + Tailwind CSS</div>
                  <div className="text-sm text-gray-600">最もシンプルな形式</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="framework"
                  value="REACT_JSX"
                  checked={framework === 'REACT_JSX'}
                  onChange={(e) => setFramework(e.target.value as Framework)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium">✓ React Component (JSX)</div>
                  <div className="text-sm text-gray-600">React プロジェクト向け</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="framework"
                  value="VUE_SFC"
                  checked={framework === 'VUE_SFC'}
                  onChange={(e) => setFramework(e.target.value as Framework)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium">✓ Vue Component (SFC)</div>
                  <div className="text-sm text-gray-600">Vue プロジェクト向け</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer opacity-50">
                <input
                  type="radio"
                  name="framework"
                  value="GRID"
                  disabled
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium">⊘ Grid Layout（100%で解放）</div>
                  <div className="text-sm text-gray-600">
                    {canUseGrid ? 'Grid Layoutでの生成が可能' : 'スコア100%達成で利用可能'}
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">オプション設定</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeResponsive}
                  onChange={(e) => setIncludeResponsive(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="font-medium">レスポンシブ対応を含める</span>
              </label>

              {canUseGrid && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeGrid}
                    onChange={(e) => setIncludeGrid(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">Grid Layout生成（100%達成特典）</span>
                </label>
              )}

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
          </div>

          <button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? '生成中...' : 'Generate HTML'}
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
              <p>Generate HTMLをクリックして<br />コード生成を開始</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
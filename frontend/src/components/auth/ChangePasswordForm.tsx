/**
 * FIGLEAN Frontend - パスワード変更画面
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as authApi from '@/lib/api/auth';
import { showSuccessToast, showErrorToast } from '@/store/uiStore';

// =====================================
// パスワード変更画面コンポーネント
// =====================================

export default function ChangePasswordForm() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // フォーム入力ハンドラー
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // エラーをクリア
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // バリデーション
  const validate = (): boolean => {
    const newErrors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
    
    let isValid = true;

    // 現在のパスワード検証
    if (!formData.currentPassword) {
      newErrors.currentPassword = '現在のパスワードを入力してください';
      isValid = false;
    }

    // 新しいパスワード検証
    if (!formData.newPassword) {
      newErrors.newPassword = '新しいパスワードを入力してください';
      isValid = false;
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'パスワードは8文字以上で入力してください';
      isValid = false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
      newErrors.newPassword = 'パスワードは大文字、小文字、数字を含む必要があります';
      isValid = false;
    } else if (formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = '新しいパスワードは現在のパスワードと異なる必要があります';
      isValid = false;
    }

    // パスワード確認検証
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワード（確認）を入力してください';
      isValid = false;
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // パスワード変更処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      
      showSuccessToast('パスワードを変更しました');
      
      // フォームをリセット
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      // ダッシュボードに戻る
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'パスワードの変更に失敗しました';
      showErrorToast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* ヘッダー */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            パスワード変更
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            新しいパスワードを設定してください
          </p>
        </div>

        {/* パスワード変更フォーム */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* 現在のパスワード */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                現在のパスワード <span className="text-red-500">*</span>
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                value={formData.currentPassword}
                onChange={handleChange}
                className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                  errors.currentPassword ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="現在のパスワード"
              />
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
              )}
            </div>

            {/* 新しいパスワード */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                新しいパスワード <span className="text-red-500">*</span>
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                value={formData.newPassword}
                onChange={handleChange}
                className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                  errors.newPassword ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="8文字以上（大文字、小文字、数字を含む）"
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
              )}
            </div>

            {/* パスワード確認 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                新しいパスワード（確認） <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="新しいパスワードを再入力"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* パスワード要件 */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">パスワード要件</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• 8文字以上</li>
              <li>• 大文字を含む</li>
              <li>• 小文字を含む</li>
              <li>• 数字を含む</li>
            </ul>
          </div>

          {/* ボタン */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  変更中...
                </span>
              ) : (
                'パスワードを変更'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

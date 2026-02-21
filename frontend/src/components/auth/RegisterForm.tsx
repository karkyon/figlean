/**
 * FIGLEAN Frontend - Figleanユーザー登録画面
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { showSuccessToast, showErrorToast } from '@/store/uiStore';

// =====================================
// ユーザー登録画面コンポーネント
// =====================================

export default function RegisterForm() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

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
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    };
    
    let isValid = true;

    // ユーザー名検証
    if (!formData.username) {
      newErrors.username = 'ユーザー名を入力してください';
      isValid = false;
    } else if (formData.username.length < 3) {
      newErrors.username = 'ユーザー名は3文字以上で入力してください';
      isValid = false;
    }

    // メールアドレス検証
    if (!formData.email) {
      newErrors.email = 'メールアドレスを入力してください';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '正しいメールアドレスを入力してください';
      isValid = false;
    }

    // パスワード検証
    if (!formData.password) {
      newErrors.password = 'パスワードを入力してください';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = 'パスワードは8文字以上で入力してください';
      isValid = false;
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'パスワードに大文字を含めてください';
      isValid = false;
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = 'パスワードに小文字を含めてください';
      isValid = false;
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'パスワードに数字を含めてください';
      isValid = false;
    }

    // パスワード確認検証
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワード（確認）を入力してください';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'パスワードが一致しません';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // 登録処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      // FIGLEAN用: email, password, name の3引数
      // nameがない場合はusernameを使用
      await register(
        formData.email,
        formData.password,
        formData.name || formData.username
      );
      showSuccessToast('ユーザー登録が完了しました');
      router.push('/dashboard');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'ユーザー登録に失敗しました';
      showErrorToast(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* ヘッダー */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            FIGLEANアカウント作成
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              ログイン
            </Link>
          </p>
        </div>

        {/* フォーム */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            {/* ユーザー名 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                ユーザー名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="ユーザー名"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            {/* 名前（オプション） */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                名前（オプション）
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="山田太郎"
              />
            </div>

            {/* メールアドレス */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* パスワード */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="8文字以上（大文字・小文字・数字を含む）"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* パスワード確認 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                パスワード（確認）
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="パスワードを再入力"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* 送信ボタン */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? '登録中...' : 'アカウント作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
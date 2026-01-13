/**
 * FIGLEAN Frontend - パスワード変更ページ
 * パス: /settings/change-password
 */

import { Suspense } from 'react';
import ChangePasswordForm from '@/components/auth/ChangePasswordForm';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function ChangePasswordPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<div>読み込み中...</div>}>
        <ChangePasswordForm />
      </Suspense>
    </AuthGuard>
  );
}

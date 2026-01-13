/**
 * FIGLEAN Frontend - ログインページ
 * パス: /login
 */

import { Suspense } from 'react';
import LoginForm from '@/components/auth/LoginForm';
import { GuestGuard } from '@/components/auth/AuthGuard';

export default function LoginPage() {
  return (
    <GuestGuard>
      <Suspense fallback={<div>読み込み中...</div>}>
        <LoginForm />
      </Suspense>
    </GuestGuard>
  );
}

/**
 * FIGLEAN Frontend - ユーザー登録ページ
 * パス: /register
 */

import { Suspense } from 'react';
import RegisterForm from '@/components/auth/RegisterForm';
import { GuestGuard } from '@/components/auth/AuthGuard';

export default function RegisterPage() {
  return (
    <GuestGuard>
      <Suspense fallback={<div>読み込み中...</div>}>
        <RegisterForm />
      </Suspense>
    </GuestGuard>
  );
}

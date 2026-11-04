import { AuthForm } from '@/components/account/AuthForm';

export const metadata = { title: 'Reset your password' };

export default function Page() {
  return <AuthForm mode="reset" />;
}

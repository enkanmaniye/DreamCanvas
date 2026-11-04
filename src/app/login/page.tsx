import { AuthForm } from '@/components/account/AuthForm';

export const metadata = { title: 'Log in to DreamCanvas' };

export default function Page() {
  return <AuthForm mode="login" />;
}

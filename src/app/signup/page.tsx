import { AuthForm } from '@/components/account/AuthForm';

export const metadata = { title: 'Create a DreamCanvas account' };

export default function Page() {
  return <AuthForm mode="signup" />;
}

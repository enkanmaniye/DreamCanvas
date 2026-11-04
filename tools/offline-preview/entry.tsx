import { createRoot } from 'react-dom/client';
import { Dashboard } from '@/components/account/Dashboard';
import { AuthForm } from '@/components/account/AuthForm';
import { PrivacyPage } from '@/components/account/PrivacyPage';
import { Settings } from '@/components/account/Settings';
import { CreateWizard } from '@/components/create/CreateWizard';
import { Review } from '@/components/create/Review';
import { EditorApp } from '@/components/editor/EditorApp';
import { Landing } from '@/components/landing/Landing';
import { Providers } from '@/components/Providers';
import { usePathname } from 'next/navigation';

function Route() {
  const path = usePathname();
  if (path === '/') return <Landing />;
  if (path === '/create') return <CreateWizard />;
  if (path === '/create/review') return <Review />;
  if (path === '/dashboard') return <Dashboard />;
  if (path === '/settings') return <Settings />;
  if (path === '/privacy') return <PrivacyPage />;
  if (path === '/login') return <AuthForm key="login" mode="login" />;
  if (path === '/signup') return <AuthForm key="signup" mode="signup" />;
  if (path === '/reset-password') return <AuthForm key="reset" mode="reset" />;
  if (path.startsWith('/board/')) return <EditorApp key={path} />;
  return <h1>Not found</h1>;
}

createRoot(document.getElementById('root') as HTMLElement).render(<Providers><Route /></Providers>);

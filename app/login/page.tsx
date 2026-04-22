import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { LoginForm } from '@/app/login/login-form';

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Kalos Member Login</h1>
        <p className="text-sm text-slate-600">
          Use one of the seeded demo member accounts to sign in.
        </p>
      </div>

      <LoginForm />

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        Demo password for all seeded members: <span className="font-semibold">kalos-demo-123</span>
        <p className="mt-2 font-medium">Quick demo emails:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>ariana@kalos-demo.com (1 scan baseline)</li>
          <li>marcus@kalos-demo.com (2 scan comparison)</li>
          <li>sarah@kalos-demo.com (6 scan trend)</li>
        </ul>
      </div>
    </main>
  );
}


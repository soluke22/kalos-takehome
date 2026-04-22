import { MemberGptChat } from '@/app/membergpt/membergpt-chat';

export default function MemberGptPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-4 p-6 md:p-8">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">MemberGPT</h1>
        <p className="mt-2 text-sm text-slate-600">
          Coach-facing grounded chat across all members in the shared scan database.
        </p>
        <a href="/dashboard" className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline">
          Back to dashboard
        </a>
      </header>

      <MemberGptChat />
    </main>
  );
}

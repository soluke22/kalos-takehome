'use client';

import { FormEvent, useState } from 'react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const starterPrompts = [
  'How many members have had 3+ scans?',
  'Which members have lost lean mass between their last two scans?',
  'Which members improved body fat percentage between their last two scans?',
  "How has Sarah's body fat percentage trended over the last 6 months?",
  "Give me a coaching summary for Marcus's next session.",
];

export function MemberGptChat() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  async function submit(nextQuestion: string) {
    if (!nextQuestion.trim()) {
      return;
    }

    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: nextQuestion }]);

    try {
      const response = await fetch('/api/membergpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: nextQuestion }),
      });

      const payload = (await response.json()) as { answer?: string; error?: string };
      const content = payload.answer ?? payload.error ?? 'Something went wrong.';

      setMessages((prev) => [...prev, { role: 'assistant', content }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Request failed. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuestion = question;
    setQuestion('');
    await submit(nextQuestion);
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-600">
        MemberGPT answers from shared database scan records only. If data is insufficient, it says so explicitly.
      </p>

      <div className="flex flex-wrap gap-2">
        {starterPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => submit(prompt)}
            disabled={loading}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">Ask a question to begin.</p>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-lg px-3 py-2 text-sm ${
                message.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-white text-slate-800'
              }`}
            >
              {message.content}
            </div>
          ))
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          placeholder="Ask cross-member or named-member coaching questions grounded in scan data."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-400 focus:ring"
        />

        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Thinking...' : 'Ask MemberGPT'}
        </button>
      </form>
    </div>
  );
}


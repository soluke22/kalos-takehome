'use client';

import { useActionState } from 'react';
import { uploadScanAction, type UploadFormState } from '@/app/dashboard/actions';

const initialState: UploadFormState = {};

export function ScanUploadForm() {
  const [state, action, pending] = useActionState(uploadScanAction, initialState);

  return (
    <form action={action} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-slate-900">Upload Next DEXA Scan</h2>
        <p className="text-sm text-slate-600">Parse a DEXA PDF and add the scan to this member record.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="scanDate" className="text-sm font-medium text-slate-700">
            Scan date
          </label>
          <input
            id="scanDate"
            name="scanDate"
            type="date"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-400 focus:ring"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="scanFile" className="text-sm font-medium text-slate-700">
            Scan PDF
          </label>
          <input
            id="scanFile"
            name="scanFile"
            type="file"
            accept="application/pdf"
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="notes" className="text-sm font-medium text-slate-700">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-blue-400 focus:ring"
          placeholder="Coach note, scan machine location, etc."
        />
      </div>

      {state.error ? <p className="text-sm text-rose-700">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? 'Uploading...' : 'Upload scan'}
      </button>
    </form>
  );
}


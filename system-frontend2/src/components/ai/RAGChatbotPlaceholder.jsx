import { useState } from 'react'
import { MessageSquare, X } from 'lucide-react'

const WAITLIST_KEY = 'netiv-ai-waitlist-email'

export default function RAGChatbotPlaceholder() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [saved, setSaved] = useState(() => {
    try {
      return localStorage.getItem(WAITLIST_KEY) || ''
    } catch {
      return ''
    }
  })

  const submit = (e) => {
    e.preventDefault()
    const v = email.trim()
    if (!v) return
    try {
      localStorage.setItem(WAITLIST_KEY, v)
    } catch {
      /* ignore */
    }
    setSaved(v)
    setEmail('')
  }

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="pointer-events-auto mb-3 w-[min(100vw-2rem,360px)] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-brand-navy dark:text-white">Netiv AI</span>
              <span className="rounded bg-brand-blue-light px-1.5 py-0.5 text-[10px] font-medium text-brand-blue">Beta</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Context-aware operational intelligence powered by your live data. Launching soon — we&apos;ll notify you when
            it&apos;s ready.
          </p>
          <input
            disabled
            className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 dark:border-gray-700 dark:bg-gray-800"
            placeholder="Ask about your operations..."
          />
          {saved ? (
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">You&apos;re on the list: {saved}</p>
          ) : (
            <form onSubmit={submit} className="mt-2 flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email for notifications"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-brand-blue px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Notify me
              </button>
            </form>
          )}
        </div>
      )}
      <div className="pointer-events-auto relative">
        <span className="absolute -inset-1 animate-ping rounded-full bg-brand-blue/25" aria-hidden />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title="AI Assistant (Coming Soon)"
          className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full bg-brand-blue text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700"
        >
          <MessageSquare className="h-[22px] w-[22px]" />
        </button>
      </div>
    </div>
  )
}

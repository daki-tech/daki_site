"use client";

import { useState, useEffect } from "react";
import { X, Send } from "lucide-react";

const STORAGE_KEY = "daki_newsletter_popup_shown";

export function NewsletterPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or subscribed
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }

    // Show after 8 seconds on first visit
    const timer = setTimeout(() => setVisible(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSubmitted(true);
        try {
          localStorage.setItem(STORAGE_KEY, "subscribed");
        } catch { /* ignore */ }
        // Auto-close after 3 seconds
        setTimeout(() => setVisible(false), 3000);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={dismiss}>
      <div
        className="relative w-full max-w-sm overflow-hidden bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center text-neutral-400 transition hover:text-black"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="px-8 pt-10 pb-8">
          {submitted ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200">
                <Send className="h-4 w-4 text-neutral-600" />
              </div>
              <p className="mt-4 text-sm font-medium tracking-wide uppercase">Дякуємо!</p>
              <p className="mt-1.5 text-xs text-neutral-500">
                Ви підписані на оновлення DaKi.
              </p>
            </div>
          ) : (
            <>
              <p className="text-center text-lg tracking-[0.3em] font-light">DAKI</p>
              <div className="mx-auto mt-3 h-px w-8 bg-neutral-200" />
              <h3 className="mt-5 text-center text-[13px] font-medium uppercase tracking-[0.15em]">
                Будьте першими
              </h3>
              <p className="mt-2.5 text-center text-xs leading-relaxed text-neutral-500">
                Підпишіться та дізнавайтесь про нові колекції, знижки та спеціальні пропозиції.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-3">
                <input
                  type="email"
                  placeholder="Ваш email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border-b border-neutral-200 bg-transparent px-1 py-2.5 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-black py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition hover:bg-neutral-800 disabled:opacity-50"
                >
                  {loading ? "..." : "Підписатися"}
                </button>
              </form>
              <button
                onClick={dismiss}
                className="mt-4 w-full text-center text-[11px] text-neutral-400 transition hover:text-neutral-600"
              >
                Ні, дякую
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={dismiss}>
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-neutral-500 transition hover:bg-white hover:text-black"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Top decorative band */}
        <div className="bg-black px-6 py-8 text-center text-white">
          <p className="font-serif text-2xl tracking-wider">DAKI</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-white/60">
            Жіночий верхній одяг
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {submitted ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                <Send className="h-5 w-5 text-green-600" />
              </div>
              <p className="mt-3 font-medium">Дякуємо!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ви підписані на оновлення DaKi.
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-center text-lg font-light uppercase tracking-wider">
                Будьте першими
              </h3>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Підпишіться та дізнавайтесь про нові колекції, знижки та спеціальні пропозиції.
              </p>
              <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                <input
                  type="email"
                  placeholder="Ваш email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-black py-3 text-xs font-medium uppercase tracking-[0.15em] text-white transition hover:bg-neutral-800 disabled:opacity-50"
                >
                  {loading ? "..." : "Підписатися"}
                </button>
              </form>
              <button
                onClick={dismiss}
                className="mt-3 w-full text-center text-xs text-muted-foreground transition hover:text-foreground"
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

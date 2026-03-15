"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function NewsletterCta() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

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
        setEmail("");
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div className="mx-auto max-w-[1600px] px-4 lg:px-6">
        <div className="grid items-center gap-10 py-12 md:grid-cols-2 md:gap-20 md:py-16">
          {/* Left — text */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
              Будьте в курсі
            </p>
            <h2 className="mt-3 text-2xl font-light uppercase tracking-[0.15em] md:text-3xl">
              Нові надходження
            </h2>
            <p className="mt-6 max-w-md text-sm leading-[1.8] text-muted-foreground">
              Підпишіться, щоб першими дізнаватися про нові моделі, спеціальні пропозиції та оновлення залишків.
            </p>
          </div>

          {/* Right — form */}
          <div>
            {submitted ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Дякуємо за підписку!</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Ми повідомимо вас про нові надходження.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    type="email"
                    placeholder="Ваш email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-14 w-full border-b border-border bg-transparent px-0 text-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-foreground"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-14 whitespace-nowrap bg-black px-10 text-[11px] font-medium uppercase tracking-[0.15em] text-white transition hover:bg-neutral-800 disabled:opacity-50"
                >
                  {loading ? "..." : "Підписатися"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-[calc(100dvh-64px)] items-center justify-center px-4 py-12 bg-neutral-50/50">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl bg-white/90 backdrop-blur-xl border border-neutral-200/60 shadow-xl overflow-hidden">
          <div className="px-8 pt-8 pb-2 text-center space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="text-sm text-neutral-500">{subtitle}</p> : null}
          </div>
          <div className="px-8 pb-8 pt-4">{children}</div>
        </div>
      </motion.div>
    </div>
  );
}

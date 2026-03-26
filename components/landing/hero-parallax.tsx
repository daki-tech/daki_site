"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRef } from "react";
import { SmartImage } from "@/components/ui/smart-image";

const SUPABASE_STORAGE =
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/landing`;
const DEFAULT_VIDEO = "";

interface HeroParallaxProps {
  title?: string;
  subtitle?: string;
  bgUrl?: string;
}

function isVideo(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export function HeroParallax({ title, subtitle, bgUrl }: HeroParallaxProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const bgSrc = bgUrl || DEFAULT_VIDEO;
  const showVideo = isVideo(bgSrc);

  return (
    <section className="relative h-[100vh] min-h-[600px] w-full overflow-hidden bg-black">
      {showVideo ? (
        <video
          ref={videoRef}
          src={bgSrc}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <SmartImage src={bgSrc} alt="" fill className="object-cover" sizes="100vw" priority />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-black/10" />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center font-sans text-3xl font-semibold uppercase tracking-[0.2em] text-white sm:text-4xl md:text-5xl lg:text-[3.5rem]"
        >
          {title || "Нова весняна колекція"}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 text-[11px] font-semibold uppercase tracking-[0.5em] text-white/70 sm:text-sm"
        >
          {subtitle || "Spring — 2026"}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10"
        >
          <Link
            href="/catalog"
            className="inline-block border border-white/60 px-12 py-4 text-[11px] font-medium uppercase tracking-[0.3em] text-white backdrop-blur-[2px] transition-all duration-500 hover:border-white hover:bg-white hover:text-black"
          >
            Переглянути каталог
          </Link>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="h-10 w-[1px] bg-gradient-to-b from-transparent via-white/40 to-transparent"
        />
      </motion.div>
    </section>
  );
}

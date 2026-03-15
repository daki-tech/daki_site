"use client";

import * as React from "react";

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = React.createContext<LanguageContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: (key) => key,
});

interface LanguageProviderProps {
  children: React.ReactNode;
  locale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
  persistKey?: string;
}

export function LanguageProvider({
  children,
  locale = DEFAULT_LOCALE,
  onLocaleChange,
  persistKey = "app-locale",
}: LanguageProviderProps) {
  const [currentLocale, setCurrentLocale] = React.useState<Locale>(locale);

  React.useEffect(() => {
    const stored = localStorage.getItem(persistKey) as Locale | null;
    if (stored && SUPPORTED_LOCALES.includes(stored)) {
      setCurrentLocale(stored);
      onLocaleChange?.(stored);
      return;
    }

    setCurrentLocale(locale);
  }, [locale, onLocaleChange, persistKey]);

  const setLocale = React.useCallback(
    (nextLocale: Locale) => {
      setCurrentLocale(nextLocale);
      localStorage.setItem(persistKey, nextLocale);
      onLocaleChange?.(nextLocale);
    },
    [onLocaleChange, persistKey],
  );

  const value = React.useMemo<LanguageContextValue>(() => {
    const dict = getDictionary(currentLocale);
    return {
      locale: currentLocale,
      setLocale,
      t: (key: string, fallback?: string) => dict[key] ?? fallback ?? key,
    };
  }, [currentLocale, setLocale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return React.useContext(LanguageContext);
}

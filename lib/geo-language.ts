import { headers } from "next/headers";

import { DEFAULT_LOCALE } from "@/lib/constants";
import { normalizeLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

const countryToLocale: Record<string, Locale> = {
  UA: "uk",
  RU: "ru",
  KZ: "ru",
  BY: "ru",
  US: "en",
  GB: "en",
  CA: "en",
  DE: "en",
  PL: "en",
};

export async function detectLocaleFromHeaders(): Promise<Locale> {
  const headerStore = await headers();

  const vercelCountry = headerStore.get("x-vercel-ip-country");
  if (vercelCountry && countryToLocale[vercelCountry]) {
    return countryToLocale[vercelCountry];
  }

  const acceptLanguage = headerStore.get("accept-language");
  if (acceptLanguage) {
    const preferred = acceptLanguage.split(",")[0]?.split("-")[0];
    return normalizeLocale(preferred);
  }

  return DEFAULT_LOCALE;
}

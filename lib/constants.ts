import type { Locale } from "@/lib/types";

export const APP_NAME = "DaKi";
export const APP_DESCRIPTION =
  "DaKi — виробник верхнього жіночого одягу. Оптовий каталог, замовлення та партнерство.";

export const SUPPORTED_LOCALES: Locale[] = ["ru", "uk", "en"];
export const DEFAULT_LOCALE: Locale = "uk";

export const PROTECTED_ROUTES = ["/profile", "/settings", "/orders", "/admin", "/dashboard"];
export const AUTH_ROUTES = ["/login", "/signup", "/verify", "/forgot-password", "/new-password"];

export const CATALOG_CATEGORIES = [
  "Пальта",
  "Пуховики",
  "Куртки",
  "Тренчі",
  "Парки",
  "Жилети",
];


export const MODEL_SEASONS = ["Осінньо-весняна", "Зимова", "Літо"];

export const DEFAULT_SIZE_SCALE = ["42", "44", "46", "48", "50", "52", "54"];

export const NAV_LINKS = {
  marketing: [
    { href: "/catalog", labelKey: "nav.catalog" },
    { href: "/dostavka-ta-oplata", labelKey: "nav.delivery" },
    { href: "/obmin-ta-povernennya", labelKey: "nav.returns" },
    { href: "/pidbir-rozmiru", labelKey: "nav.sizeGuide" },
    { href: "/faq", labelKey: "nav.faq" },
    { href: "/about", labelKey: "nav.about" },
    { href: "/contact", labelKey: "nav.contact" },
  ],
  dashboard: [
    { href: "/profile", labelKey: "nav.profile" },
    { href: "/orders", labelKey: "nav.orders" },
    { href: "/settings", labelKey: "nav.settings" },
    { href: "/admin", labelKey: "nav.admin" },
  ],
};

export const CONTACTS = {
  phones: [] as string[],
  email: "daki.fashion.ua@gmail.com",
  telegram: "https://t.me/DaKiWholesale",
  telegram_support: "daki_support",
  viber: "+380973952163",
  whatsapp: "",
  instagram: "https://instagram.com/daki.ua",
};

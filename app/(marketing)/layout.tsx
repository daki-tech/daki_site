import { LanguageProvider } from "@/components/providers/language-provider";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { FooterWrapper } from "@/components/marketing/footer-wrapper";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  // Force Ukrainian locale — geo-detection disabled for now
  const locale = "uk";

  return (
    <LanguageProvider locale={locale} persistKey="marketing-locale">
      <div className="flex min-h-[100dvh] flex-col bg-background">
        <MarketingHeader />
        <main className="flex-1">{children}</main>
        <FooterWrapper />
      </div>
    </LanguageProvider>
  );
}

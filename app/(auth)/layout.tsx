import { LanguageProvider } from "@/components/providers/language-provider";
import { MarketingHeader } from "@/components/marketing/marketing-header";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider locale="uk" persistKey="auth-locale">
      <div className="relative min-h-[100dvh] flex flex-col bg-background">
        <MarketingHeader />
        <main className="flex-1">{children}</main>
      </div>
    </LanguageProvider>
  );
}

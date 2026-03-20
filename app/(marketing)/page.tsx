import { HeroParallax } from "@/components/landing/hero-parallax";
import { FeaturedCollection } from "@/components/landing/featured-collection";
import { AboutPreview } from "@/components/landing/about-preview";
import { NewsletterCta } from "@/components/landing/newsletter-cta";
import { getCatalogModels, getHomepageSettings } from "@/lib/data";

// Revalidate every 60 seconds so admin changes appear within a minute
export const revalidate = 60;

export default async function LandingPage() {
  const [models, settings] = await Promise.all([
    getCatalogModels(),
    getHomepageSettings(),
  ]);

  return (
    <>
      <HeroParallax
        title={settings.hero_title}
        subtitle={settings.hero_subtitle}
        bgUrl={settings.hero_bg_url}
      />
      <FeaturedCollection models={models.slice(0, 4)} />
      <AboutPreview
        title={settings.about_title}
        subtitle={settings.about_subtitle}
        text={settings.about_text}
        mediaUrl={settings.about_media_url}
        aspect={settings.about_aspect}
      />
      <NewsletterCta />
    </>
  );
}

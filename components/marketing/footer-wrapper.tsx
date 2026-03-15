import { getHomepageSettings } from "@/lib/data";
import { CONTACTS } from "@/lib/constants";
import { Footer } from "./footer";

export async function FooterWrapper() {
  let contacts;
  try {
    const settings = await getHomepageSettings();
    let phones: string[] = [];
    try {
      phones = JSON.parse(settings.contact_phones || "[]");
    } catch {
      if (settings.contact_phone) phones = [settings.contact_phone];
    }

    contacts = {
      phones: phones.length > 0 ? phones : CONTACTS.phones,
      email: settings.contact_email || CONTACTS.email,
      telegram: settings.contact_telegram || CONTACTS.telegram,
      viber: settings.contact_viber || CONTACTS.viber,
      whatsapp: settings.contact_whatsapp || CONTACTS.whatsapp,
      instagram: settings.contact_instagram || CONTACTS.instagram,
      tiktok: settings.contact_tiktok || "",
    };
  } catch {
    contacts = {
      phones: CONTACTS.phones,
      email: CONTACTS.email,
      telegram: CONTACTS.telegram,
      viber: CONTACTS.viber,
      whatsapp: CONTACTS.whatsapp,
      instagram: CONTACTS.instagram,
      tiktok: "",
    };
  }

  return <Footer contacts={contacts} />;
}

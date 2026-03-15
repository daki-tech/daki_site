const LOGO_URL = "https://kisoqylqmbajwbffnrpj.supabase.co/storage/v1/object/public/media/branding/mini-logo.svg";

/**
 * Unified DaKi email template wrapper.
 * All company emails (order confirmations, verification, subscriptions, etc.) should use this.
 */
export function dakiEmailWrapper(content: string): string {
  return `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
      <div style="text-align:center;padding:32px 24px 20px;border-bottom:1px solid #e5e5e5">
        <img src="${LOGO_URL}" alt="DaKi" width="40" height="40" style="display:inline-block;margin-bottom:8px" />
        <h1 style="font-size:26px;font-weight:300;letter-spacing:0.35em;margin:0;color:#000">D A K I</h1>
        <p style="margin:4px 0 0;color:#999;font-size:11px;letter-spacing:0.15em">ВЕРХНІЙ ЖІНОЧИЙ ОДЯГ</p>
      </div>
      <div style="padding:32px 24px">
        ${content}
      </div>
      <div style="text-align:center;padding:24px 24px 16px;border-top:1px solid #e5e5e5">
        <div style="margin-bottom:16px">
          <a href="https://t.me/DaKiWholesale" style="display:inline-block;margin:0 8px;text-decoration:none;color:#000;font-size:13px">Telegram</a>
          <span style="color:#ccc">|</span>
          <a href="https://instagram.com/daki.ua" style="display:inline-block;margin:0 8px;text-decoration:none;color:#000;font-size:13px">Instagram</a>
        </div>
        <p style="margin:0 0 8px;color:#999;font-size:12px">Якщо у вас є питання: <a href="mailto:info@daki.ua" style="color:#000;text-decoration:none">info@daki.ua</a></p>
        <p style="margin:0;color:#bbb;font-size:11px">&copy; 2026 DaKi. Усі права захищено.</p>
      </div>
    </div>
  `;
}

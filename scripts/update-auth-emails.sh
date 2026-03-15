#!/bin/bash
# Update Supabase Auth email templates with DaKi branding
#
# Usage:
#   SUPABASE_ACCESS_TOKEN=sbp_xxxxx bash scripts/update-auth-emails.sh
#
# To get your access token:
#   1. Go to https://supabase.com/dashboard/account/tokens
#   2. Generate a new token
#   3. Export it: export SUPABASE_ACCESS_TOKEN=sbp_xxxxx

PROJECT_REF="goihhwjnsbzdtfzldxzb"

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN is not set."
  echo "Get one at: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

LOGO_URL="https://dakifashion.com/mini-logo.svg"

# --- Confirmation email (signup OTP) ---
CONFIRMATION_HTML='<div style="font-family:'"'"'Helvetica Neue'"'"',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff"><div style="text-align:center;padding:32px 24px 20px;border-bottom:1px solid #e5e5e5"><img src="'"$LOGO_URL"'" alt="DaKi" width="40" height="40" style="display:inline-block;margin-bottom:8px" /><h1 style="font-size:26px;font-weight:300;letter-spacing:0.35em;margin:0;color:#000">D A K I</h1><p style="margin:4px 0 0;color:#999;font-size:11px;letter-spacing:0.15em">ВЕРХНІЙ ЖІНОЧИЙ ОДЯГ</p></div><div style="padding:32px 24px"><h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#000">Підтвердження email</h2><p style="color:#666;margin:0 0 24px;font-size:14px">Ваш код підтвердження:</p><div style="text-align:center;margin:24px 0"><span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:0.3em;color:#000;background:#f5f5f5;padding:16px 32px;border:1px solid #e5e5e5">{{ .Token }}</span></div><p style="color:#999;font-size:13px;margin:16px 0 0;text-align:center">Код дійсний протягом 60 хвилин</p></div><div style="text-align:center;padding:24px 24px 16px;border-top:1px solid #e5e5e5"><p style="margin:0;color:#bbb;font-size:11px">&copy; 2026 DaKi. Усі права захищено.</p></div></div>'

# --- Recovery email (password reset OTP) ---
RECOVERY_HTML='<div style="font-family:'"'"'Helvetica Neue'"'"',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff"><div style="text-align:center;padding:32px 24px 20px;border-bottom:1px solid #e5e5e5"><img src="'"$LOGO_URL"'" alt="DaKi" width="40" height="40" style="display:inline-block;margin-bottom:8px" /><h1 style="font-size:26px;font-weight:300;letter-spacing:0.35em;margin:0;color:#000">D A K I</h1><p style="margin:4px 0 0;color:#999;font-size:11px;letter-spacing:0.15em">ВЕРХНІЙ ЖІНОЧИЙ ОДЯГ</p></div><div style="padding:32px 24px"><h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#000">Відновлення паролю</h2><p style="color:#666;margin:0 0 24px;font-size:14px">Ваш код для відновлення паролю:</p><div style="text-align:center;margin:24px 0"><span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:0.3em;color:#000;background:#f5f5f5;padding:16px 32px;border:1px solid #e5e5e5">{{ .Token }}</span></div><p style="color:#999;font-size:13px;margin:16px 0 0;text-align:center">Код дійсний протягом 60 хвилин</p></div><div style="text-align:center;padding:24px 24px 16px;border-top:1px solid #e5e5e5"><p style="margin:0;color:#bbb;font-size:11px">&copy; 2026 DaKi. Усі права захищено.</p></div></div>'

# --- Magic link email ---
MAGIC_LINK_HTML='<div style="font-family:'"'"'Helvetica Neue'"'"',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff"><div style="text-align:center;padding:32px 24px 20px;border-bottom:1px solid #e5e5e5"><img src="'"$LOGO_URL"'" alt="DaKi" width="40" height="40" style="display:inline-block;margin-bottom:8px" /><h1 style="font-size:26px;font-weight:300;letter-spacing:0.35em;margin:0;color:#000">D A K I</h1><p style="margin:4px 0 0;color:#999;font-size:11px;letter-spacing:0.15em">ВЕРХНІЙ ЖІНОЧИЙ ОДЯГ</p></div><div style="padding:32px 24px"><h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#000">Вхід до акаунту</h2><p style="color:#666;margin:0 0 24px;font-size:14px">Ваш код для входу:</p><div style="text-align:center;margin:24px 0"><span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:0.3em;color:#000;background:#f5f5f5;padding:16px 32px;border:1px solid #e5e5e5">{{ .Token }}</span></div><p style="color:#999;font-size:13px;margin:16px 0 0;text-align:center">Код дійсний протягом 60 хвилин</p></div><div style="text-align:center;padding:24px 24px 16px;border-top:1px solid #e5e5e5"><p style="margin:0;color:#bbb;font-size:11px">&copy; 2026 DaKi. Усі права захищено.</p></div></div>'

echo "Updating Supabase Auth email templates for project: $PROJECT_REF"

# Build JSON payload
PAYLOAD=$(cat <<ENDJSON
{
  "mailer_templates_confirmation_content": $(echo "$CONFIRMATION_HTML" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))"),
  "mailer_templates_recovery_content": $(echo "$RECOVERY_HTML" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))"),
  "mailer_templates_magic_link_content": $(echo "$MAGIC_LINK_HTML" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))"),
  "mailer_templates_confirmation_subject": "DaKi — Підтвердження email",
  "mailer_templates_recovery_subject": "DaKi — Відновлення паролю",
  "mailer_templates_magic_link_subject": "DaKi — Вхід до акаунту"
}
ENDJSON
)

RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH \
  "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "SUCCESS: All 3 email templates updated!"
  echo "  - Confirmation (signup OTP)"
  echo "  - Recovery (password reset)"
  echo "  - Magic link (login)"
else
  echo "ERROR ($HTTP_CODE): $BODY"
fi

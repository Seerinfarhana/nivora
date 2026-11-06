# NIVORA update 2 (apply AFTER nivora-update.zip)

Copy these files over your project (same folders). Do NOT replace your .env files or nivora.db.
No new Python packages are needed. Restart the backend; your database upgrades itself.

## Turn on real OTP emails (backend/.env)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.gmail@gmail.com
SMTP_PASS=<a Gmail "App password", not your normal password>
SMTP_FROM=your.gmail@gmail.com
(Google account > Security > 2-Step Verification > App passwords)
Without these, the OTP is printed in the backend terminal instead of being emailed.

## Turn on the AI assistant (backend/.env)
ANTHROPIC_API_KEY=<key from console.anthropic.com>
ANTHROPIC_MODEL=claude-haiku-5-5
Web search must be enabled for your organisation in the Anthropic console (Settings > Privacy).
With no key, or if the AI service fails, the built-in rule-based assistant is used automatically.

## What changed
- OTP: /api/otp/send and /api/otp/verify. Registration needs the verified-email token.
- Delete account: Profile & security > Security. Needs password + typing DELETE.
- Assistant pays by UPI ID, 10-digit mobile number or saved payee. PIN is entered on the confirmation card.
- Assistant is an AI agent (agent.py + llm.py) with banking tools and web search, and it remembers the chat.

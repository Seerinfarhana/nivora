import smtplib
from email.message import EmailMessage

from .config import SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER


def send_mail(to: str, subject: str, body: str, dev_line: str = "") -> str:
    """Returns 'sent', 'dev' (no SMTP set up, printed in the console) or 'failed'."""
    if not SMTP_HOST:
        print(f"[DEV] Email to {to}: {dev_line or subject}")
        return "dev"
    msg = EmailMessage()
    msg["Subject"], msg["From"], msg["To"] = subject, SMTP_FROM, to
    msg.set_content(body)
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASS)
            smtp.send_message(msg)
        return "sent"
    except Exception as e:  # shown in the server console, never to the visitor
        print(f"[WARN] Could not send email to {to}: {e}")
        return "failed"


def send_reset_email(to: str, link: str):
    send_mail(to, "Reset your NIVORA password",
              f"Use this link to choose a new password (valid for 30 minutes):\n\n{link}\n\nIf you did not ask for this, ignore this email.",
              dev_line=f"password reset link {link}")


def send_otp_email(to: str, code: str, minutes: int) -> str:
    return send_mail(to, "Your NIVORA verification code",
                     f"Your NIVORA verification code is {code}.\n\nIt expires in {minutes} minutes. Never share this code with anyone, including NIVORA staff.",
                     dev_line=f"verification code {code}")

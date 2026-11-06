import httpx

from .config import TWILIO_FROM, TWILIO_SID, TWILIO_TOKEN


def sms_enabled() -> bool:
    return bool(TWILIO_SID and TWILIO_TOKEN and TWILIO_FROM)


def send_sms(phone10: str, text: str) -> bool:
    """Sends an SMS through Twilio to an Indian mobile number. Returns True if Twilio accepted it."""
    if not sms_enabled():
        return False
    try:
        r = httpx.post(f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json",
                       auth=(TWILIO_SID, TWILIO_TOKEN), data={"To": f"+91{phone10}", "From": TWILIO_FROM, "Body": text}, timeout=15)
        if r.status_code >= 300:
            print(f"[WARN] Twilio rejected the SMS: {r.status_code} {r.text[:160]}")
        return r.status_code < 300
    except Exception as e:
        print(f"[WARN] SMS failed: {e}")
        return False

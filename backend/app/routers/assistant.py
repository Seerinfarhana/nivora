"""AI banking assistant.
route() below is a rule-based brain so the whole app works offline.
To use an LLM later, replace route() with a tool-calling loop that calls the same functions in tools.py."""
import re

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session

from .. import tools
from ..db import get_session
from ..models import User
from ..security import current_user
from ..tools import inr

router = APIRouter()


class ChatIn(BaseModel):
    message: str
    language: str = "en"


class ConfirmIn(BaseModel):
    pin: str


def out(text: str, confirm: dict | None = None):
    return {"reply": text, "needs_confirmation": confirm}


def route(msg: str, s: Session, u: User):
    t = msg.lower()

    if re.search(r"\b(otp|pin|cvv|password)\b", t):
        tools.log(s, u, "Sensitive data", "Refused sharing credentials", "Blocked")
        return out("For your safety, never share your PIN, OTP, CVV or password in chat. NIVORA will never ask for them here.")

    if re.search(r"balance|बैलेंस|शेष|இருப்பு|பேலன்ஸ்", t):
        b = tools.get_balance(s, u)
        tools.log(s, u, "Balance", "Read balances", "Approved")
        parts = ", ".join(f"{a['type']} {inr(a['balance'])}" for a in b["accounts"])
        return out(f"Your total balance is {inr(b['total'])}. {parts}.")

    if re.search(r"spend|spent|expense|खर्च|செலவு", t):
        r = tools.spending_summary(s, u, 30)
        tools.log(s, u, "Spending", "Read spending summary", "Approved")
        if not r["categories"]:
            return out("You have no spending in the last 30 days.")
        top = r["categories"][0]
        share = round(top["value"] / r["total"] * 100)
        return out(f"You spent {inr(r['total'])} in the last 30 days. {top['name']} is the largest at {inr(top['value'])} ({share}%).")

    if re.search(r"transaction|recent|statement|लेन|பரிவர்த்தனை", t):
        rows = tools.get_transactions(s, u, 5)
        tools.log(s, u, "Transactions", "Read recent transactions", "Approved")
        lines = "; ".join(f"{x['name']} {inr(x['amount'])} ({x['date']})" for x in rows)
        return out(f"Your latest transactions: {lines}.")

    if re.search(r"loan|eligib|लोन|கடன்", t):
        r = tools.loan_eligibility(s, u)
        if r["eligible"]:
            return out(f"Based on your income of about {inr(r['avg_monthly_income'])} a month, you may qualify for up to {inr(r['max_amount'])} at {r['rate']}. Checking this does not affect your credit score.")
        return out("Your recent income is below our minimum for a personal loan. A savings goal or a smaller product may suit you better.")

    if re.match(r"\s*(how|what|why|when|where|can i|is there)\b", t):
        f = tools.faq_search(msg)
        return out(f["answer"] if f else "I couldn't find that in our help articles. You can ask me about balances, spending, transfers or your card.")

    if re.search(r"block|freeze|ब्लॉक|முடக்க", t):
        tools.block_card(s, u)
        return out("Your debit card is blocked right now. You can request a replacement from Profile and security.")

    if re.search(r"send|transfer|भेज|அனுப்ப", t):
        amt = re.search(r"(\d[\d,]*(?:\.\d+)?)", t)
        ben = tools.find_beneficiary(s, u, t)
        if not ben:
            return out("Who should I send it to? I can only pay people saved in your payees.")
        if not amt:
            return out(f"How much would you like to send to {ben.name}?")
        r = tools.prepare_transfer(s, u, ben, float(amt.group(1).replace(",", "")))
        if r["status"] == "needs_confirmation":
            return out(f"Please confirm: send {inr(r['amount'])} to {r['to']}. Enter your PIN to approve.", {"to": r["to"], "amount": r["amount"]})
        return out(r["reason"])

    f = tools.faq_search(msg)
    if f:
        return out(f["answer"])
    return out("I can help with balances, spending, recent transactions, transfers, card blocking, loans and banking questions. Try 'What is my balance?'")


@router.post("/chat")
def chat(body: ChatIn, s: Session = Depends(get_session), u: User = Depends(current_user)):
    return route(body.message, s, u)


@router.post("/confirm")
def confirm(body: ConfirmIn, s: Session = Depends(get_session), u: User = Depends(current_user)):
    r = tools.confirm_transfer(s, u, body.pin)
    if r["status"] == "done":
        return {"status": "done", "reply": f"Done. {inr(r['amount'])} sent to {r['to']}. Reference {r['ref']}. New balance {inr(r['balance'])}."}
    return {"status": "rejected", "reply": r["reason"]}


@router.post("/cancel")
def cancel(s: Session = Depends(get_session), u: User = Depends(current_user)):
    tools.cancel_transfer(s, u)
    return {"status": "cancelled", "reply": "Okay, I cancelled that transfer."}

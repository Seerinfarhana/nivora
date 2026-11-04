import { accounts, spendByCategory } from "./mockData";
import { timeNow } from "./utils";

export type Lang = "en" | "hi" | "ta";

export type Card =
  | { type: "balance"; rows: { name: string; mask: string; balance: number }[] }
  | { type: "spend"; total: number; rows: { label: string; value: number }[] }
  | { type: "confirm"; kind: "transfer" | "block"; title: string; detail: string; status: "pending" | "done" | "cancelled" }
  | { type: "links"; rows: { label: string; to: string }[] };

export interface Msg { id: string; role: "user" | "bot"; text: string; card?: Card; time: string; }

const t = {
  en: {
    hello: "Hello! I am the NIVORA assistant. I can check balances, summarise spending, send money, block a card or explain loans.",
    balance: "Here are your current balances:",
    spend: "Here is where your money went this month:",
    fallback: "I can help with balances, spending, transfers, card services and loans. Try one of the suggestions below.",
  },
  hi: {
    hello: "नमस्ते! मैं निवोरा सहायक हूँ। मैं बैलेंस, खर्च, ट्रांसफर और कार्ड सेवाओं में आपकी मदद कर सकता हूँ।",
    balance: "आपके खातों का बैलेंस यह है:",
    spend: "इस महीने का आपका खर्च ये रहा:",
    fallback: "मैं अभी बैलेंस, खर्च, ट्रांसफर, कार्ड और लोन की जानकारी में मदद कर सकता हूँ।",
  },
  ta: {
    hello: "வணக்கம்! நான் நிவோரா உதவியாளர். இருப்பு, செலவுகள், பணப் பரிமாற்றம், கார்டு சேவைகளில் உதவ முடியும்.",
    balance: "உங்கள் கணக்குகளின் இருப்பு இதோ:",
    spend: "இந்த மாதத்தின் செலவுகள் இதோ:",
    fallback: "தற்போது இருப்பு, செலவு, பணப் பரிமாற்றம், கார்டு மற்றும் கடன் தகவல்களில் உதவ முடியும்.",
  },
};

export const quickPrompts = [
  "What is my balance?",
  "How much did I spend this month?",
  "Send ₹500 to Ravi",
  "Block my debit card",
  "Am I eligible for a loan?",
];

let n = 0;
const mk = (role: Msg["role"], text: string, card?: Card): Msg => ({ id: `m${Date.now()}-${n++}`, role, text, card, time: timeNow() });
export const userMsg = (text: string) => mk("user", text);

/**
 * Demo brain. To go live, replace this with:
 *   const res = await fetch("/api/assistant/chat", { method: "POST", body: JSON.stringify({ message, lang }) });
 * The backend LLM should answer ONLY from secure tool results (get_balance, spending_summary, transfer_money ...).
 */
export function respond(input: string, lang: Lang): Msg {
  const q = input.toLowerCase();
  const L = t[lang];

  const transfer = q.match(/(?:send|transfer|pay)\s+(?:₹|rs\.?\s*)?(\d[\d,]*)\s*(?:to|for)?\s*([a-z]+)/i);
  if (transfer) {
    const amount = Number(transfer[1].replace(/,/g, ""));
    const payee = transfer[2][0].toUpperCase() + transfer[2].slice(1);
    return mk("bot", `I can send this for you. Please check the details and confirm. Nothing moves until you do.`, {
      type: "confirm", kind: "transfer", status: "pending",
      title: `Send ₹${amount.toLocaleString("en-IN")} to ${payee}`,
      detail: "From Savings •••• 4821 via UPI. Payee is saved in your beneficiaries.",
    });
  }
  if (/block|lost|stolen|कार्ड|கார்டு/.test(q) && /card|कार्ड|கார்டு/.test(q)) {
    return mk("bot", "I can block your debit card right now. You can unblock it later from Profile > Security.", {
      type: "confirm", kind: "block", status: "pending", title: "Block debit card •••• 5532", detail: "Blocks all card payments and ATM withdrawals immediately.",
    });
  }
  if (/balance|how much (money|do i have)|बैलेंस|शेष|இருப்பு|பேலன்ஸ்/.test(q)) {
    return mk("bot", L.balance, { type: "balance", rows: accounts.map(a => ({ name: a.name, mask: a.mask, balance: a.balance })) });
  }
  if (/spen[dt]|expense|food|खर्च|செலவு/.test(q)) {
    return mk("bot", L.spend, { type: "spend", total: spendByCategory.reduce((s, c) => s + c.value, 0), rows: spendByCategory.slice(0, 5) });
  }
  if (/loan|eligib|ऋण|लोन|கடன்/.test(q)) {
    return mk("bot", "Based on your steady salary and clean repayment record, you are likely to qualify for a personal loan of up to ₹2,50,000. This is an estimate, not an offer. The final decision follows a credit check.", {
      type: "links", rows: [{ label: "See loan options", to: "/recommendations" }, { label: "Read: what decides eligibility", to: "/knowledge" }],
    });
  }
  if (/goal|saving|save|बचत|சேமிப்பு/.test(q)) {
    return mk("bot", "You have 3 active goals. Your emergency fund is 65% complete.", { type: "links", rows: [{ label: "Open savings goals", to: "/goals" }] });
  }
  if (/^(hi|hello|hey|namaste|vanakkam|नमस्ते|வணக்கம்)/.test(q)) return mk("bot", L.hello);
  return mk("bot", L.fallback);
}

export const greeting = (lang: Lang) => mk("bot", t[lang].hello);

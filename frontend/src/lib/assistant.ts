import { api } from "./api";
import { inr, timeNow } from "./utils";

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

export const botMsg = (text: string) => mk("bot", text);

interface ChatReply { reply: string; needs_confirmation: { to: string; amount: number } | null; }

export async function askAssistant(message: string, lang: Lang): Promise<Msg> {
  const r = await api<ChatReply>("/api/assistant/chat", { method: "POST", body: JSON.stringify({ message, language: lang }) });
  const c = r.needs_confirmation;
  return mk("bot", r.reply, c ? {
    type: "confirm", kind: "transfer", status: "pending",
    title: `Send ${inr(c.amount)} to ${c.to}`,
    detail: "From your Savings account. Enter your PIN to approve.",
  } : undefined);
}

export const confirmTransfer = (pin: string) =>
  api<{ status: "done" | "rejected" | "locked"; reply: string }>("/api/assistant/confirm", { method: "POST", body: JSON.stringify({ pin }) });

export const cancelTransfer = () =>
  api<{ reply: string }>("/api/assistant/cancel", { method: "POST" });

export const greeting = (lang: Lang) => mk("bot", t[lang].hello);

import { api } from "./api";
import { inr, timeNow } from "./utils";

export type Card =
  | { type: "balance"; rows: { name: string; mask: string; balance: number }[] }
  | { type: "spend"; total: number; rows: { label: string; value: number }[] }
  | { type: "confirm"; kind: "transfer" | "block"; title: string; detail: string; status: "pending" | "done" | "cancelled" }
  | { type: "links"; rows: { label: string; to: string }[] };

export interface Msg { id: string; role: "user" | "bot"; text: string; card?: Card; time: string; }

const hello = "Hello! I am the NIVORA assistant. I can check balances, send money to a UPI ID or mobile number, block a card, and help with banking questions like resetting a PIN or enabling international use. What do you need?";

export const quickPrompts = [
  "What is my balance?",
  "How much did I spend this month?",
  "Send ₹500 to Ravi",
  "Block my debit card",
  "Am I eligible for a loan?",
  "I forgot my card PIN",
  "How do I enable international transactions?",
];

let n = 0;
const mk = (role: Msg["role"], text: string, card?: Card): Msg => ({ id: `m${Date.now()}-${n++}`, role, text, card, time: timeNow() });
export const userMsg = (text: string) => mk("user", text);

export const botMsg = (text: string) => mk("bot", text);

interface ChatReply { reply: string; needs_confirmation: { to: string; amount: number } | null; }

export interface Turn { role: "user" | "assistant"; content: string }

/** history = the earlier messages of this chat, so the assistant remembers what you were talking about */
export async function askAssistant(message: string, history: Turn[] = []): Promise<Msg> {
  const r = await api<ChatReply>("/api/assistant/chat", { method: "POST", body: JSON.stringify({ message, language: "en", history }) });
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

export const greeting = () => mk("bot", hello);

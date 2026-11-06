// All data here is fake. Each export maps to a FastAPI endpoint you will build later.

export const accounts = [
  { id: "sav", name: "Savings Account", mask: "•••• 4821", balance: 184250.5, type: "savings", change: 4.2 },
  { id: "rd", name: "Recurring Deposit", mask: "•••• 7710", balance: 36000, type: "rd", change: 1.1 },
  { id: "fd", name: "Fixed Deposit", mask: "•••• 3092", balance: 150000, type: "fd", change: 0.6 },
];

export const transactions = [
  { id: 1, date: "04 Nov", merchant: "Annapoorna Restaurant", category: "Food & dining", amount: -640, channel: "UPI" },
  { id: 2, date: "03 Nov", merchant: "Salary, Brightwave Labs", category: "Income", amount: 62000, channel: "NEFT" },
  { id: 3, date: "03 Nov", merchant: "TNEB Electricity", category: "Bills & utilities", amount: -1840, channel: "Bill pay" },
  { id: 4, date: "02 Nov", merchant: "Metro Smart Card", category: "Transport", amount: -500, channel: "UPI" },
  { id: 5, date: "01 Nov", merchant: "Fresh Basket", category: "Groceries", amount: -2315, channel: "Card" },
  { id: 6, date: "31 Oct", merchant: "Ravi Kumar", category: "Transfer", amount: -5000, channel: "IMPS" },
  { id: 7, date: "30 Oct", merchant: "Apollo Pharmacy", category: "Health", amount: -870, channel: "UPI" },
  { id: 8, date: "29 Oct", merchant: "Streamly Premium", category: "Entertainment", amount: -299, channel: "Auto-pay" },
];

export const spendByCategory = [
  { label: "Food & dining", value: 8450 },
  { label: "Groceries", value: 6200 },
  { label: "Bills & utilities", value: 5400 },
  { label: "Shopping", value: 4800 },
  { label: "Transport", value: 3100 },
  { label: "Health", value: 1900 },
  { label: "Entertainment", value: 1450 },
];

export const monthly = [
  { m: "Jun", income: 58000, spend: 33200 },
  { m: "Jul", income: 58000, spend: 36100 },
  { m: "Aug", income: 60000, spend: 31800 },
  { m: "Sep", income: 60000, spend: 38400 },
  { m: "Oct", income: 62000, spend: 34900 },
  { m: "Nov", income: 62000, spend: 31300 },
];

export const weekly = [
  { w: "Wk 1", spend: 9800 }, { w: "Wk 2", spend: 7600 }, { w: "Wk 3", spend: 8900 }, { w: "Wk 4", spend: 5000 },
];

export const insights = [
  { tone: "sand" as const, title: "Dining is up 18% on last month", body: "You spent ₹8,450 on food and dining. Cooking at home two more evenings a week would bring it back near ₹7,000." },
  { tone: "mint" as const, title: "You saved 49% of your income", body: "That is your best month since June. Moving ₹10,000 into your Recurring Deposit would lock it in." },
  { tone: "sky" as const, title: "Electricity bill is due in 6 days", body: "TNEB usually bills around ₹1,840. Your balance covers it comfortably." },
  { tone: "lav" as const, title: "One subscription renews on 12 Nov", body: "Streamly Premium renews at ₹299. You have used it twice in 30 days." },
];

export const goals = [
  { id: 1, name: "Emergency fund", target: 120000, saved: 78000, due: "Mar 2027", tone: "brand" as const },
  { id: 2, name: "New laptop", target: 75000, saved: 52500, due: "Jan 2027", tone: "sky" as const },
  { id: 3, name: "Family trip to Kerala", target: 60000, saved: 14000, due: "Jun 2027", tone: "lav" as const },
];

export const articles = [
  { id: 1, cat: "Getting started", title: "Set up your first UPI payment", mins: 3, body: "Open Payments, choose Pay by UPI, and enter the UPI ID or scan a QR code. Review the name shown, enter the amount and confirm with your 6-digit UPI PIN. NIVORA never asks for your PIN outside this screen." },
  { id: 2, cat: "Safety", title: "How to spot a fake bank call", mins: 4, body: "Your bank will never ask for your PIN, OTP or full card number on a call. If someone does, hang up and report it from Profile > Security. Scammers create urgency, so slow down before you share anything." },
  { id: 3, cat: "Savings", title: "Fixed Deposit or Recurring Deposit?", mins: 5, body: "A Fixed Deposit locks a lump sum for a set time at a fixed rate. A Recurring Deposit collects a small amount every month. Choose an FD when you have money ready, and an RD when you save from a monthly salary." },
  { id: 4, cat: "Loans", title: "What decides your loan eligibility", mins: 5, body: "Lenders look at income stability, existing EMIs, repayment history and credit score. Paying bills on time and keeping card use below 30% of the limit helps most." },
  { id: 5, cat: "Payments", title: "Failed transfer, money debited: what now", mins: 3, body: "Most failed transfers reverse automatically within 3 to 5 working days. If nothing returns after 5 days, raise a dispute from the transaction details and keep the reference number." },
  { id: 6, cat: "Getting started", title: "Complete your KYC in 2 minutes", mins: 2, body: "Keep your Aadhaar and PAN ready. Verify with an OTP, take a short selfie, and your account is fully active. Your documents are encrypted and are never shown to the AI assistant." },
];

export const faqs = [
  { q: "Is it safe to talk to the AI assistant about my money?", a: "Yes. The assistant only sees masked account details, and it can read data or start a payment only through secure, permissioned actions. Every payment needs your confirmation and PIN." },
  { q: "What is the daily transfer limit?", a: "The default limit is ₹1,00,000 per day for UPI and ₹2,00,000 for IMPS. You can lower it any time in Profile > Security." },
  { q: "How do I block a lost card?", a: "Ask the assistant to block your card, or go to Profile > Security > Cards. The block is instant and you can lift it from the same place." },
];

/* ---------- Admin ---------- */
export const adminKpis = [
  { label: "Active customers", value: 48210, delta: "+3.4%", tone: "brand" as const },
  { label: "Assistant chats today", value: 9632, delta: "+12%", tone: "lav" as const },
  { label: "KYC completed (24h)", value: 842, delta: "+6.1%", tone: "mint" as const },
  { label: "Risky actions blocked", value: 37, delta: "-8%", tone: "rose" as const },
];

export const adminDaily = [
  { d: "Mon", chats: 7400, resolved: 6600 }, { d: "Tue", chats: 8100, resolved: 7300 },
  { d: "Wed", chats: 7900, resolved: 7100 }, { d: "Thu", chats: 8800, resolved: 8000 },
  { d: "Fri", chats: 9400, resolved: 8600 }, { d: "Sat", chats: 6200, resolved: 5800 }, { d: "Sun", chats: 9632, resolved: 8900 },
];

export const adminIntents = [
  { label: "Balance & statements", value: 34 }, { label: "Transfers", value: 24 }, { label: "Card services", value: 15 },
  { label: "Loans", value: 11 }, { label: "Support & FAQs", value: 16 },
];

export const customersTable = [
  { id: "C-10482", name: "Aarav Menon", city: "Chennai", segment: "Salaried", kyc: "Verified", risk: "Low" },
  { id: "C-10483", name: "Lakshmi Textiles", city: "Erode", segment: "Small business", kyc: "Verified", risk: "Medium" },
  { id: "C-10484", name: "Govindan R", city: "Thanjavur", segment: "Senior citizen", kyc: "Verified", risk: "Low" },
  { id: "C-10485", name: "Nisha Pillai", city: "Kochi", segment: "First-time user", kyc: "Pending", risk: "Low" },
  { id: "C-10486", name: "Sathya Traders", city: "Madurai", segment: "Small business", kyc: "Review", risk: "High" },
  { id: "C-10487", name: "Farhan Ali", city: "Hyderabad", segment: "Salaried", kyc: "Verified", risk: "Low" },
  { id: "C-10488", name: "Padma Devi", city: "Salem", segment: "Senior citizen", kyc: "Pending", risk: "Low" },
];

export const riskAlerts = [
  { id: 1, sev: "High", title: "Unusual transfer pattern", detail: "Sathya Traders: 6 transfers above ₹40,000 in 20 minutes to new payees.", when: "12 min ago" },
  { id: 2, sev: "Medium", title: "Repeated PIN failures", detail: "Account C-10231 failed PIN entry 4 times from a new device.", when: "41 min ago" },
  { id: 3, sev: "Medium", title: "Prompt injection attempt blocked", detail: "A chat message tried to override assistant rules. The request was refused and logged.", when: "1 hr ago" },
  { id: 4, sev: "Low", title: "Large cash deposit flagged", detail: "Deposit of ₹9,80,000 at Salem branch queued for compliance review.", when: "3 hr ago" },
];

export const kycQueue = [
  { id: "K-5521", name: "Nisha Pillai", doc: "Aadhaar + PAN", wait: "4 min" },
  { id: "K-5522", name: "Padma Devi", doc: "Aadhaar + Voter ID", wait: "11 min" },
  { id: "K-5523", name: "Imran Sheikh", doc: "Passport", wait: "26 min" },
];

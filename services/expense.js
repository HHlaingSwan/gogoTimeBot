import Expense from "../models/Expense.js";

const CATEGORIES = {
  breakfast: ["breakfast", "မနက်စာ", "မနက်ခင်းစာ"],
  lunch: ["lunch", "နေ့လည်စာ", "နေ့ခင်းစာ"],
  dinner: ["dinner", "ညနေစာ", "ညနေခင်းစာ"],
  snack: ["snack", "မုန့်", "အစားအသောက်", "မာလာရှမ်းကော"],
  coffee: ["coffee", "ကော်ဖီ", "လက်ဖက်ရည်", "လက်ဖက်ရည်တိုက်"],
  transport: ["transport", "ကားခ", "ဘတ်စ်ကား", "တက္ကစီ", "taxi", "bus"],
  grocery: ["grocery", "ဈေး", "စျေးဝယ်", "စျေးကုန်"],
};

function detectCategory(text) {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some((k) => lower.includes(k))) {
      return category.charAt(0).toUpperCase() + category.slice(1);
    }
  }
  if (!text.trim()) return "Other";
  return text
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function parseExpense(input) {
  const trimmed = input.trim();

  const amountMatch = trimmed.match(/^(\d+(?:,\d{3})*(?:\.\d+)?)/);
  if (!amountMatch) {
    return { success: false, error: "Amount not found" };
  }

  const amountStr = amountMatch[1].replace(/,/g, "");
  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount <= 0) {
    return { success: false, error: "Invalid amount" };
  }

  const description = trimmed.slice(amountMatch[0].length).trim();

  if (description.length > 150) {
    return { success: false, error: "Description too long (max 150 chars)" };
  }

  const category = detectCategory(description);

  return {
    success: true,
    data: {
      amount,
      description: description || category,
      category,
    },
  };
}

export async function addExpense(chatId, amount, description, category) {
  const now = new Date();
  const expense = await Expense.create({
    amount,
    description,
    category,
    date: now,
    chatId,
  });
  return expense;
}

export async function getTodayExpenses(chatId) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59
  );

  const expenses = await Expense.find({
    chatId,
    date: { $gte: startOfDay, $lte: endOfDay },
  }).sort({ date: -1 });

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return { expenses, total };
}

export async function getMonthExpenses(chatId, year, month) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const expenses = await Expense.find({
    chatId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  }).sort({ date: -1 });

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byDay = expenses.reduce((acc, e) => {
    const day = e.date.getDate();
    acc[day] = (acc[day] || 0) + e.amount;
    return acc;
  }, {});

  return { expenses, total, byDay };
}

import Expense from "../models/Expense.js";
import Budget from "../models/Budget.js";

const CATEGORIES = {
  breakfast: ["breakfast", "မနက်စာ", "မနက္ခင်းစာ"],
  lunch: ["lunch", "နေ့လည်စာ", "နေ့ခင်းစာ"],
  dinner: ["dinner", "ညနေစာ", "ညနေခင်းစာ"],
  snack: ["snack", "မုနပျံ", "အစားအသောက်", "ကော်ကီ"],
  coffee: ["coffee", "ကော်ဖီ", "လက်ဖက်ရည်", "လက်ဖက်ရည်တိုက်"],
  transport: ["transport", "ကားခ", "ဘတ်စ်ကား", "လမ်း", "တက္ကစီ", "ဂိုးလေကား"],
  grocery: ["grocery", "ဈေး", "စျေးဝယ်", "စျေးကုန်"],
};

function detectCategory(text) {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some((k) => lower.includes(k))) {
      return category.charAt(0).toUpperCase() + category.slice(1);
    }
  }
  return "Other";
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
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

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

export async function getMonthTotal(chatId, year, month) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const result = await Expense.aggregate([
    {
      $match: {
        chatId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  return result[0]?.total || 0;
}

export async function getBudget(chatId) {
  const budget = await Budget.findOne({ chatId });
  return budget?.monthlyLimit || 0;
}

export async function setBudget(chatId, limit) {
  const budget = await Budget.findOneAndUpdate(
    { chatId },
    { monthlyLimit: limit },
    { upsert: true, new: true }
  );
  return budget.monthlyLimit;
}

export function checkBudgetWarning(monthlyTotal, monthlyLimit) {
  if (monthlyLimit <= 0) return null;

  const percent = Math.round((monthlyTotal / monthlyLimit) * 100);

  if (percent >= 100) {
    return {
      type: "exceeded",
      message: `Budget exceeded by ${percent - 100}%`,
      percent,
    };
  } else if (percent >= 80) {
    return {
      type: "warning",
      message: `Budget: ${percent}% used`,
      percent,
    };
  }

  return null;
}

export async function getBudgetReport(chatId, year, month) {
  const { total, byDay } = await getMonthExpenses(chatId, year, month);
  const monthlyLimit = await getBudget(chatId);

  const now = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const currentDay = now.getDate();
  const daysLeft = daysInMonth - currentDay;

  const averageDaily = currentDay > 0 ? Math.round(total / currentDay) : 0;
  const projectedTotal = Math.round(averageDaily * daysInMonth);

  const remaining = monthlyLimit - total;
  const percentUsed = monthlyLimit > 0 ? Math.round((total / monthlyLimit) * 100) : 0;

  return {
    total,
    budget: monthlyLimit,
    remaining: Math.max(0, remaining),
    daysLeft,
    averageDaily,
    projectedTotal,
    percentUsed,
    byDay,
  };
}

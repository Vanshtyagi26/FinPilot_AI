const xlsx = require("xlsx");
const Transaction = require("../models/Transaction");

function parseTransactionBody(body) {
  const { type, transactionKind, amount, category, date, description } = body;
  if (!type || !["income", "expense"].includes(type)) {
    return { error: "type must be income or expense" };
  }
  const normalizedKind = String(transactionKind || "one_time")
    .trim()
    .toLowerCase();
  if (!["recurring", "one_time"].includes(normalizedKind)) {
    return { error: "transactionKind must be recurring or one_time" };
  }
  if (
    amount === undefined ||
    amount === null ||
    Number(amount) < 0 ||
    Number.isNaN(Number(amount))
  ) {
    return { error: "amount must be a non-negative number" };
  }
  if (!category || String(category).trim() === "") {
    return { error: "category is required" };
  }
  if (!date) {
    return { error: "date is required" };
  }
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    return { error: "invalid date" };
  }
  return {
    data: {
      type,
      transactionKind: normalizedKind,
      amount: Number(amount),
      category: String(category).trim(),
      date: d,
      description: description != null ? String(description).trim() : "",
    },
  };
}

function normalizeTransactionKind(value) {
  if (value === undefined || value === null || value === "") {
    return "one_time";
  }
  const text = String(value).trim().toLowerCase();
  if (
    [
      "recurring",
      "monthly",
      "repeat",
      "scheduled",
      "fixed",
      "yes",
      "true",
    ].includes(text)
  ) {
    return "recurring";
  }
  return "one_time";
}

function normalizeTransactionType(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const text = String(value).trim().toLowerCase();
  if (
    ["income", "inflow", "credit", "deposit", "salary", "revenue"].includes(
      text,
    )
  ) {
    return "income";
  }
  if (
    ["expense", "outflow", "debit", "withdrawal", "payment", "cost"].includes(
      text,
    )
  ) {
    return "expense";
  }
  return null;
}

function normalizeDate(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "number" && value > 1000 && value < 50000) {
    const parsed = new Date((value - 25569) * 86400000);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
}

function normalizedAmount(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return null;
  }
  return Math.abs(amount);
}

function getValue(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return undefined;
}

function parseImportRow(row) {
  const rawType = getValue(row, [
    "type",
    "Type",
    "transactionType",
    "Transaction Type",
    "kind",
    "Kind",
  ]);
  const normalizedType = normalizeTransactionType(rawType);
  const rawAmount = getValue(row, [
    "amount",
    "Amount",
    "total",
    "Total",
    "value",
    "Value",
    "amountUsd",
    "Amount USD",
    "Amount ($)",
    "amount($)",
  ]);
  const amount = normalizedAmount(rawAmount);
  const rawCategory = getValue(row, [
    "category",
    "Category",
    "expenseCategory",
    "Expense Category",
    "incomeCategory",
    "Income Category",
    "label",
    "Label",
  ]);
  const category = rawCategory != null ? String(rawCategory).trim() : "";
  const rawDate = getValue(row, [
    "date",
    "Date",
    "transactionDate",
    "Transaction Date",
    "postedOn",
    "Posted On",
  ]);
  const date = normalizeDate(rawDate);
  const rawDescription = getValue(row, [
    "description",
    "Description",
    "note",
    "Note",
    "details",
    "Details",
    "memo",
    "Memo",
  ]);
  const description =
    rawDescription != null ? String(rawDescription).trim() : "";
  const rawKind = getValue(row, [
    "transactionKind",
    "transaction kind",
    "frequency",
    "Frequency",
    "recurring",
    "Recurring",
  ]);
  const transactionKind = normalizeTransactionKind(rawKind);

  if (!amount || amount < 0 || !category || !date) {
    return null;
  }

  const type = normalizedType || "expense";
  return {
    type,
    transactionKind,
    amount,
    category,
    date,
    description,
  };
}

function buildUpcomingReminders(transactions, referenceDate = new Date()) {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  return transactions
    .filter((transaction) => transaction.transactionKind === "recurring")
    .map((transaction) => {
      const anchorDate =
        transaction.date instanceof Date
          ? transaction.date
          : new Date(transaction.date);
      if (Number.isNaN(anchorDate.getTime())) {
        return null;
      }

      const startDate = new Date(anchorDate);
      startDate.setHours(0, 0, 0, 0);
      let nextDue = new Date(startDate);

      while (nextDue < today) {
        nextDue = new Date(
          nextDue.getFullYear(),
          nextDue.getMonth() + 1,
          nextDue.getDate(),
        );
      }

      const daysUntil = Math.ceil((nextDue - today) / 86400000);
      return {
        _id: transaction._id,
        category: transaction.category,
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        nextDue,
        daysUntil,
        label:
          daysUntil === 0
            ? "Today"
            : daysUntil === 1
              ? "Tomorrow"
              : `${daysUntil} days`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.daysUntil - b.daysUntil || a.nextDue - b.nextDue)
    .slice(0, 5);
}

async function list(req, res, next) {
  try {
    const items = await Transaction.find({ user: req.user._id }).sort({
      date: -1,
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
}

async function summary(req, res, next) {
  try {
    const items = await Transaction.find({ user: req.user._id });
    let totalIncome = 0;
    let totalExpense = 0;
    const byMonth = {};
    for (const t of items) {
      if (t.type === "income") totalIncome += t.amount;
      else totalExpense += t.amount;
      const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth[key]) {
        byMonth[key] = { month: key, income: 0, expense: 0 };
      }
      if (t.type === "income") byMonth[key].income += t.amount;
      else byMonth[key].expense += t.amount;
    }
    const monthly = Object.values(byMonth).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
    res.json({
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      monthly,
    });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const doc = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!doc) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const parsed = parseTransactionBody(req.body);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }
    const doc = await Transaction.create({
      ...parsed.data,
      user: req.user._id,
    });
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const parsed = parseTransactionBody(req.body);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }
    const doc = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: parsed.data },
      { new: true, runValidators: true },
    );
    if (!doc) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const doc = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!doc) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.json({ message: "Transaction removed", id: doc._id });
  } catch (err) {
    next(err);
  }
}

async function reminders(req, res, next) {
  try {
    const items = await Transaction.find({ user: req.user._id }).sort({
      date: -1,
    });
    res.json(buildUpcomingReminders(items));
  } catch (err) {
    next(err);
  }
}

async function importTransactions(req, res, next) {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Please upload a .csv or .xlsx file" });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    const validDocs = [];
    let skippedRows = 0;

    rows.forEach((row) => {
      const parsed = parseImportRow(row);
      if (!parsed) {
        skippedRows += 1;
        return;
      }
      validDocs.push({ ...parsed, user: req.user._id });
    });

    if (!validDocs.length) {
      return res.status(400).json({
        message: "No valid transactions were found in the uploaded file",
        importedCount: 0,
        skippedCount: skippedRows,
      });
    }

    const created = await Transaction.insertMany(validDocs);
    res.status(201).json({
      message: `Imported ${created.length} transactions`,
      importedCount: created.length,
      skippedCount: skippedRows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  summary,
  getOne,
  create,
  update,
  remove,
  reminders,
  importTransactions,
  buildUpcomingReminders,
};

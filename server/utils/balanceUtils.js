const Expense         = require("../models/Expense");
const Settlement      = require("../models/Settlement");
const BalanceSnapshot = require("../models/BalanceSnapshot");

const computeBalances = async (groupId) => {
  const [expenses, settlements] = await Promise.all([
    Expense.find({ group: groupId }).lean(),
    Settlement.find({ group: groupId, status: "accepted" }).lean(),
  ]);

  const raw = {};

  expenses.forEach((expense) => {
    const paidBy = expense.paidBy.toString();
    expense.splitBetween.forEach((split) => {
      const owedBy = split.user.toString();
      if (owedBy === paidBy) return;
      if (!raw[owedBy])         raw[owedBy]         = {};
      if (!raw[owedBy][paidBy]) raw[owedBy][paidBy] = 0;
      raw[owedBy][paidBy] += split.share;
    });
  });

  settlements.forEach((s) => {
    const paidBy = s.paidBy.toString();
    const paidTo = s.paidTo.toString();
    if (raw[paidBy]?.[paidTo] !== undefined) {
      raw[paidBy][paidTo] = Math.max(0, raw[paidBy][paidTo] - s.amount);
    }
  });

  // Minimise transactions via net-balance algorithm
  const net = {};
  for (const debtor in raw) {
    for (const creditor in raw[debtor]) {
      const amt = raw[debtor][creditor];
      if (amt <= 0) continue;
      net[debtor]   = (net[debtor]   || 0) - amt;
      net[creditor] = (net[creditor] || 0) + amt;
    }
  }

  const creditors = Object.entries(net).filter(([, v]) => v >  0.5).map(([id, amt]) => ({ id, amt })).sort((a, b) => b.amt - a.amt);
  const debtors   = Object.entries(net).filter(([, v]) => v < -0.5).map(([id, amt]) => ({ id, amt: -amt })).sort((a, b) => b.amt - a.amt);

  const result = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const transfer = Math.min(debtors[i].amt, creditors[j].amt);
    result.push({ owedBy: debtors[i].id, owedTo: creditors[j].id, amount: +(transfer / 100).toFixed(2) });
    debtors[i].amt   -= transfer;
    creditors[j].amt -= transfer;
    if (debtors[i].amt   < 0.5) i++;
    if (creditors[j].amt < 0.5) j++;
  }

  return result;
};

// Recompute and persist — called fire-and-forget after any mutation
const refreshBalanceSnapshot = async (groupId) => {
  try {
    const balances = await computeBalances(groupId);
    await BalanceSnapshot.findOneAndUpdate(
      { groupId },
      { balances, updatedAt: new Date() },
      { upsert: true, new: true },
    );
  } catch (err) {
    console.error("refreshBalanceSnapshot:", err.message);
  }
};

module.exports = { refreshBalanceSnapshot };

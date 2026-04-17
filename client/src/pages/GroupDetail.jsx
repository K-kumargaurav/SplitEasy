import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import MemberSearch from "../components/MemberSearch";
import toast from "react-hot-toast";

export default function GroupDetail() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("expenses");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [customSplits, setCustomSplits] = useState([]);
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", splitType: "equal" });
  const [error, setError] = useState("");
  const [settleModal, setSettleModal] = useState(null);
  const [settleAmount, setSettleAmount] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    fetchAll();
  }, [id, user, authLoading]);

  const fetchAll = async () => {
    try {
      const [groupRes, expensesRes, balancesRes] = await Promise.allSettled([
        api.get(`/groups/${id}`),
        api.get(`/groups/${id}/expenses`),
        api.get(`/groups/${id}/balances`),
      ]);
      if (groupRes.status === "fulfilled") setGroup(groupRes.value.data);
      if (expensesRes.status === "fulfilled") setExpenses(expensesRes.value.data);
      if (expensesRes.status === "rejected") setError("Failed to load expenses");
      if (balancesRes.status === "fulfilled") setBalances(balancesRes.value.data);
      if (balancesRes.status === "rejected") setError("Failed to load balances");
      if (groupRes.status === "rejected") setError("Failed to load group data");
    } catch (err) {
      setError("Failed to load group data");
    } finally {
      setLoading(false);
    }
  };

  const getMemberName = (userId) => {
    const member = group?.members.find((m) => m._id.toString() === userId.toString());
    return member ? member.name : userId;
  };

  const handleSendInvite = async (invitedUser) => {
    setError("");
    try {
      await api.post(`/groups/${id}/invite`, { userId: invitedUser._id });
      setInviteSuccess(`Invite sent to ${invitedUser.name}!`);
      setShowAddMember(false);
      setTimeout(() => setInviteSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send invite");
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setError("");
    if (newExpense.splitType === "custom") {
      const total = customSplits.reduce((sum, s) => sum + (parseFloat(s.share) || 0), 0);
      if (Math.abs(total - parseFloat(newExpense.amount)) > 0.01) {
        setError(`Custom splits must add up to ₹${newExpense.amount}. Currently: ₹${total}`);
        return;
      }
    }
    const amt = parseFloat(newExpense.amount);
    if (!amt || amt <= 0 || amt > 1000000) return setError("Enter a valid amount (1 – 10,00,000)");
    try {
      await api.post(`/groups/${id}/expenses`, {
        description: newExpense.description,
        amount: amt,
        splitType: newExpense.splitType,
        customSplits: newExpense.splitType === "custom"
          ? customSplits.map((s) => ({ userId: s.userId, share: parseFloat(s.share) }))
          : undefined,
      });
      setNewExpense({ description: "", amount: "", splitType: "equal" });
      setCustomSplits([]);
      setShowExpenseForm(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add expense");
    }
  };

  const openSettleModal = (balance) => {
    setSettleModal({ owedTo: balance.owedTo, maxAmount: balance.amount });
    setSettleAmount(balance.amount.toFixed(2));
    setError("");
  };

  const handleSettle = async () => {
    const amt = parseFloat(settleAmount);
    if (!amt || amt <= 0 || amt > settleModal.maxAmount) {
      setError(`Enter a valid amount between ₹0.01 and ₹${settleModal.maxAmount}`);
      return;
    }
    setError("");
    try {
      await api.post(`/groups/${id}/settle`, { paidToId: settleModal.owedTo, amount: amt });
      toast.success("Settlement request sent!");
      setSettleModal(null);
      setSettleAmount("");
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to settle");
    }
  };

  if (authLoading || loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
    </div>
  );

  const myBalances = balances.filter((b) => b.owedBy === user?._id);
  const theyOweMe = balances.filter((b) => b.owedTo === user?._id);
  const othersBalances = balances.filter((b) => b.owedBy !== user?._id && b.owedTo !== user?._id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{group?.name}</h1>
            {group?.description && <p className="text-xs text-gray-400 truncate">{group.description}</p>}
          </div>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full shrink-0">
            {group?.members.length} members
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-28 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{error}</div>
        )}

        {/* Members */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Members</p>
            {group?.createdBy?._id === user?._id && (
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="text-emerald-600 text-sm font-semibold hover:text-emerald-700 transition"
              >
                + Invite
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {group?.members.map((member) => (
              <div key={member._id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full">
                <div className="w-5 h-5 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-[10px] font-bold">
                  {member.name[0].toUpperCase()}
                </div>
                <span className="text-sm text-gray-700 font-medium">{member.name}</span>
                {member._id === user?._id && (
                  <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-semibold">YOU</span>
                )}
              </div>
            ))}
          </div>
          {inviteSuccess && <p className="text-emerald-600 text-sm mt-3 font-medium">{inviteSuccess}</p>}
          {showAddMember && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <MemberSearch onAdd={handleSendInvite} existingMembers={group?.members} />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1">
          {["expenses", "balances"].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setError(""); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all ${
                activeTab === tab ? "bg-white shadow-sm text-emerald-600" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Expenses Tab */}
        {activeTab === "expenses" && (
          <div>
            {expenses.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-3">🧾</p>
                <p className="text-gray-700 font-semibold">No expenses yet</p>
                <p className="text-gray-400 text-sm mt-1 mb-4">Add your first expense to get started</p>
                <button
                  onClick={() => setShowExpenseForm(true)}
                  className="bg-linear-to-r from-emerald-500 to-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition"
                >
                  + Add Expense
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div key={expense._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{expense.description}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Paid by <span className="text-emerald-600 font-semibold">{expense.paidBy.name}</span>
                        </p>
                      </div>
                      <span className="text-xl font-bold text-gray-900 ml-3">₹{expense.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {expense.splitBetween.map((split) => (
                        <span
                          key={split._id}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                            split.paid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-600 border border-red-200"
                          }`}
                        >
                          {split.paid ? "✓" : "✗"} {split.user.name}: ₹{split.share.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Balances Tab */}
        {activeTab === "balances" && (
          <div className="space-y-3">
            {balances.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-3">🎉</p>
                <p className="text-gray-700 font-semibold">All settled up!</p>
                <p className="text-gray-400 text-sm mt-1">No pending balances</p>
              </div>
            ) : (
              <>
                {myBalances.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">You Owe</p>
                    {myBalances.map((balance, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-red-100 shadow-sm p-4 mb-3">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm text-gray-600">
                            You owe <span className="font-semibold text-gray-900">{getMemberName(balance.owedTo)}</span>
                          </p>
                          <span className="text-xl font-bold text-red-500">₹{balance.amount}</span>
                        </div>
                        <button
                          onClick={() => openSettleModal(balance)}
                          className="w-full bg-linear-to-r from-emerald-500 to-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition"
                        >
                          Settle Up
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {theyOweMe.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Owed to You</p>
                    {theyOweMe.map((balance, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 mb-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold text-gray-900">{getMemberName(balance.owedBy)}</span> owes you
                          </p>
                          <span className="text-xl font-bold text-emerald-600">₹{balance.amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {othersBalances.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Others</p>
                    {othersBalances.map((balance, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold text-gray-900">{getMemberName(balance.owedBy)}</span>
                            {" owes "}
                            <span className="font-semibold text-gray-900">{getMemberName(balance.owedTo)}</span>
                          </p>
                          <span className="text-lg font-bold text-gray-700">₹{balance.amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Expense FAB */}
      {activeTab === "expenses" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur border-t border-gray-100 p-4 pb-6 flex justify-end">
          <button
            onClick={() => setShowExpenseForm(true)}
            className="bg-linear-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg hover:opacity-90 transition"
          >
            + Add Expense
          </button>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Expense</h2>
              <button
                onClick={() => setShowExpenseForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
              >✕</button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Hotel booking, Dinner..."
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Split Type</label>
                <div className="flex gap-2">
                  {["equal", "custom"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setNewExpense({ ...newExpense, splitType: type });
                        if (type === "custom") {
                          setCustomSplits(group?.members?.map((m) => ({ userId: m._id, name: m.name, share: "" })));
                        } else {
                          setCustomSplits([]);
                        }
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all border ${
                        newExpense.splitType === type
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {type} Split
                    </button>
                  ))}
                </div>
              </div>

              {newExpense.splitType === "custom" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Amount per member</label>
                  <div className="space-y-2">
                    {customSplits.map((split, index) => (
                      <div key={split.userId} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {split.name[0].toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700 w-24 truncate font-medium">{split.name}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="0"
                          value={split.share}
                          onChange={(e) => {
                            const updated = [...customSplits];
                            updated[index].share = e.target.value;
                            setCustomSplits(updated);
                          }}
                          className="flex-1 border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-sm flex justify-between text-gray-400">
                    <span>Total entered</span>
                    <span className={`font-semibold ${
                      Math.abs(customSplits.reduce((s, c) => s + (parseFloat(c.share) || 0), 0) - parseFloat(newExpense.amount || 0)) < 0.01
                        ? "text-emerald-600" : "text-red-500"
                    }`}>
                      ₹{customSplits.reduce((s, c) => s + (parseFloat(c.share) || 0), 0)} / ₹{newExpense.amount || 0}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="submit" className="flex-1 bg-linear-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition">
                  Add Expense
                </button>
                <button
                  type="button"
                  onClick={() => { setShowExpenseForm(false); setCustomSplits([]); setNewExpense({ description: "", amount: "", splitType: "equal" }); setError(""); }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Modal */}
      {settleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Settle Up</h2>
            <p className="text-sm text-gray-400 mb-4">
              Max: <span className="font-semibold text-gray-700">₹{settleModal.maxAmount.toFixed(2)}</span>
            </p>
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              max={settleModal.maxAmount}
              step="0.01"
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
              className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition mb-3"
              placeholder="Enter amount"
            />
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleSettle}
                className="flex-1 bg-linear-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition"
              >
                Send Request
              </button>
              <button
                onClick={() => { setSettleModal(null); setSettleAmount(""); setError(""); }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

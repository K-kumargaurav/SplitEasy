import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../utils/api";
import MemberSearch from "../components/MemberSearch";
import toast from "react-hot-toast";

/* ─────────────────────────────────────────
   Local UI components
───────────────────────────────────────── */

/** Initials avatar with color derived from name */
function Avatar({ name = "?", size = 36 }) {
  const COLORS = [
    "bg-emerald-500", "bg-violet-500", "bg-orange-500",
    "bg-sky-500",     "bg-pink-500",   "bg-amber-500",
  ];
  const color    = COLORS[name.charCodeAt(0) % COLORS.length];
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={`${color} rounded-full flex items-center justify-center
                  text-white font-bold shrink-0 select-none`}
    >
      {initials}
    </div>
  );
}

/** Section label */
function SectionLabel({ children }) {
  return (
    <p className="px-1 mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400
                  uppercase tracking-wider">
      {children}
    </p>
  );
}

/** Grouped white card with optional divided children */
function ListGroup({ children }) {
  return (
    <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl overflow-hidden
                    divide-y divide-gray-100 dark:divide-[#3a3a3c] shadow-sm">
      {children}
    </div>
  );
}

function BottomSheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#2c2c2e] rounded-t-3xl sheet
                      max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4
                        border-b border-gray-100 dark:border-[#3a3a3c]">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       bg-gray-100 dark:bg-[#3a3a3c] text-gray-500 dark:text-gray-400
                       active:bg-gray-200 dark:active:bg-[#48484a] transition"
          >
            ✕
          </button>
        </div>
        <div className="p-5 pb-safe">{children}</div>
      </div>
    </div>
  );
}

function Dialog({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#2c2c2e] rounded-2xl w-full
                      max-w-sm shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       bg-gray-100 dark:bg-[#3a3a3c] text-gray-500 dark:text-gray-400
                       active:bg-gray-200 dark:active:bg-[#48484a] transition"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   GroupDetail Page
───────────────────────────────────────── */

const COUNTRY_FLAGS = {
  "India":"🇮🇳","United States":"🇺🇸","United Kingdom":"🇬🇧","Canada":"🇨🇦",
  "Australia":"🇦🇺","Germany":"🇩🇪","France":"🇫🇷","Japan":"🇯🇵","China":"🇨🇳",
  "Brazil":"🇧🇷","Russia":"🇷🇺","South Korea":"🇰🇷","Italy":"🇮🇹","Spain":"🇪🇸",
  "Mexico":"🇲🇽","Indonesia":"🇮🇩","Netherlands":"🇳🇱","Saudi Arabia":"🇸🇦",
  "Turkey":"🇹🇷","Switzerland":"🇨🇭","Argentina":"🇦🇷","Sweden":"🇸🇪","Poland":"🇵🇱",
  "Belgium":"🇧🇪","Thailand":"🇹🇭","Nigeria":"🇳🇬","UAE":"🇦🇪","Singapore":"🇸🇬",
  "Malaysia":"🇲🇾","Pakistan":"🇵🇰","Bangladesh":"🇧🇩","Vietnam":"🇻🇳",
  "Philippines":"🇵🇭","Egypt":"🇪🇬","Iran":"🇮🇷","Iraq":"🇮🇶",
  "South Africa":"🇿🇦","Colombia":"🇨🇴","Ukraine":"🇺🇦","Romania":"🇷🇴",
  "New Zealand":"🇳🇿","Nepal":"🇳🇵","Sri Lanka":"🇱🇰","Other":"🌍",
};

export default function GroupDetail() {
  const { id }                          = useParams();
  const { user, loading: authLoading }  = useAuth();
  const { dark, toggle }                = useTheme();
  const navigate                        = useNavigate();

  /* ── Data ── */
  const [group,              setGroup]              = useState(null);
  const [expenses,           setExpenses]           = useState([]);
  const [balances,           setBalances]           = useState([]);
  const [myPendingSettlements, setMyPendingSettlements] = useState([]); // settlements I sent, still pending

  /* ── UI state ── */
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState("expenses");
  const [error,         setError]         = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);

  /* ── Add expense form ── */
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount:      "",
    splitType:   "equal",
  });
  const [customSplits, setCustomSplits] = useState([]);

  /* ── Settle modal ── */
  const [settleModal,  setSettleModal]  = useState(null); // { owedTo, maxAmount }
  const [settleAmount, setSettleAmount] = useState("");

  /* ── Member profile sheet ── */
  const [memberProfile, setMemberProfile] = useState(null); // { loading, data, memberId }

  const openMemberProfile = async (member) => {
    if (member._id === user?._id) return; // own profile — skip
    setMemberProfile({ loading: true, data: null, memberId: member._id, name: member.name });
    try {
      const { data } = await api.get(`/users/${member._id}`);
      setMemberProfile((p) => ({ ...p, loading: false, data }));
    } catch {
      setMemberProfile((p) => ({ ...p, loading: false }));
    }
  };

  /* ─── Auth guard ─── */
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    fetchAll();
  }, [id, user, authLoading]);

  /* ─────── Data fetching ─────── */

  const fetchAll = async () => {
    try {
      const [groupRes, expensesRes, balancesRes, settlementsRes] = await Promise.allSettled([
        api.get(`/groups/${id}`),
        api.get(`/groups/${id}/expenses`),
        api.get(`/groups/${id}/balances`),
        api.get(`/groups/${id}/settlements`),
      ]);

      if (groupRes.status       === "fulfilled") setGroup(groupRes.value.data);
      if (expensesRes.status    === "fulfilled") setExpenses(expensesRes.value.data);
      if (balancesRes.status    === "fulfilled") setBalances(balancesRes.value.data);
      if (settlementsRes.status === "fulfilled") {
        const pending = settlementsRes.value.data.filter(
          (s) => s.status === "pending" && s.paidBy._id === user?._id
        );
        setMyPendingSettlements(pending);
      }

      if (groupRes.status    === "rejected")  setError("Failed to load group");
      if (expensesRes.status === "rejected")  setError("Failed to load expenses");
      if (balancesRes.status === "rejected")  setError("Failed to load balances");
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  /* ─────── Helpers ─────── */

  /** Returns display name for a user ID using the loaded member list */
  const getMemberName = (userId) =>
    group?.members.find((m) => m._id.toString() === userId.toString())?.name ?? userId;

  /* ─────── Action handlers ─────── */

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

    const amt = parseFloat(newExpense.amount);
    if (!amt || amt <= 0 || amt > 1_000_000)
      return setError("Enter a valid amount (₹1 – ₹10,00,000)");

    if (newExpense.splitType === "custom") {
      const total = customSplits.reduce((s, c) => s + (parseFloat(c.share) || 0), 0);
      if (Math.abs(total - amt) > 0.01)
        return setError(`Splits must add up to ₹${amt}. Currently ₹${total}`);
    }

    try {
      await api.post(`/groups/${id}/expenses`, {
        description: newExpense.description,
        amount:      amt,
        splitType:   newExpense.splitType,
        customSplits:
          newExpense.splitType === "custom"
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
    if (!amt || amt <= 0 || amt > settleModal.maxAmount)
      return setError(`Enter an amount between ₹0.01 and ₹${settleModal.maxAmount}`);

    setError("");
    try {
      await api.post(`/groups/${id}/settle`, {
        paidToId: settleModal.owedTo,
        amount:   amt,
      });
      toast.success("Settlement request sent!");
      setSettleModal(null);
      setSettleAmount("");
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to settle");
    }
  };

  /* ─────── Split-type toggle handler ─────── */
  const handleSplitTypeChange = (type) => {
    setNewExpense((prev) => ({ ...prev, splitType: type }));
    if (type === "custom") {
      setCustomSplits(
        group?.members?.map((m) => ({ userId: m._id, name: m.name, share: "" })) ?? []
      );
    } else {
      setCustomSplits([]);
    }
  };

  /* ─────── Derived balance buckets ─────── */
  const myDebts    = balances.filter((b) => b.owedBy === user?._id);
  const theyOweMe  = balances.filter((b) => b.owedTo === user?._id);
  const otherDebts = balances.filter(
    (b) => b.owedBy !== user?._id && b.owedTo !== user?._id
  );

  /* ─────── Custom split total (for live validation UI) ─────── */
  const customTotal = customSplits.reduce((s, c) => s + (parseFloat(c.share) || 0), 0);
  const targetAmt   = parseFloat(newExpense.amount || 0);
  const splitsMatch = Math.abs(customTotal - targetAmt) < 0.01;

  /* ─────────────────────────────────────────
     Loading state
  ───────────────────────────────────────── */
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#efeff4] dark:bg-[#1c1c1e]
                      flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500
                        border-t-transparent animate-spin" />
      </div>
    );
  }

  /* ─────────────────────────────────────────
     Render
  ───────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#efeff4] dark:bg-[#1c1c1e]">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-[#1c1c1e]/90
                         backdrop-blur border-b border-gray-200/60
                         dark:border-[#3a3a3c]/60 shadow-sm">
        <div className="max-w-lg mx-auto h-14 px-4 flex items-center gap-3">
          {/* Back button */}
          <button
            onClick={() => navigate("/dashboard")}
            className="w-10 h-10 flex items-center justify-center rounded-full
                       hover:bg-gray-100 dark:hover:bg-[#3a3a3c]
                       active:bg-gray-200 dark:active:bg-[#48484a] transition
                       touch-manipulation shrink-0"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {group?.name}
            </h1>
            {group?.description && (
              <p className="text-xs text-gray-400 truncate">{group.description}</p>
            )}
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="w-10 h-10 flex items-center justify-center rounded-full
                       hover:bg-gray-100 dark:hover:bg-[#3a3a3c]
                       active:bg-gray-200 dark:active:bg-[#48484a]
                       transition touch-manipulation shrink-0"
            aria-label="Toggle dark mode"
          >
            {dark ? (
              <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0
                         01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894
                         6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06
                         1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0
                         010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0
                         001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59
                         1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5
                         0v-2.25A.75.75 0 0112 18zM7.166 17.834a.75.75 0 00-1.06
                         1.06l1.59 1.591a.75.75 0 001.061-1.06l-1.59-1.591zM6
                         12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016
                         12zM6.166 6.166a.75.75 0 011.06-1.06l1.591 1.59a.75.75 0
                         01-1.061 1.061l-1.59-1.59z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0
                       009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0
                       01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799
                       0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112
                       6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Member count pill */}
          <span className="text-xs text-gray-500 dark:text-gray-400
                           bg-gray-100 dark:bg-[#3a3a3c] px-2.5 py-1
                           rounded-full shrink-0 select-none">
            {group?.members.length} members
          </span>
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <main className="max-w-lg mx-auto px-4 py-4 pb-32 space-y-4">

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200
                          dark:border-red-800/30 rounded-xl px-4 py-3
                          text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ── Members row ── */}
        <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400
                          uppercase tracking-wider">
              Members
            </p>
            {group?.createdBy?._id === user?._id && (
              <button
                onClick={() => setShowAddMember((v) => !v)}
                className="text-sm text-emerald-600 font-semibold
                           touch-manipulation select-none"
              >
                + Invite
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {group?.members.map((member) => (
              <button
                key={member._id}
                onClick={() => openMemberProfile(member)}
                className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#3a3a3c]
                           border border-gray-100 dark:border-[#48484a]
                           px-3 py-1.5 rounded-full active:bg-gray-100
                           dark:active:bg-[#48484a] touch-manipulation transition"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500
                                flex items-center justify-center text-white
                                text-[10px] font-bold select-none">
                  {member.name[0].toUpperCase()}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                  {member.name}
                </span>
                {member._id === user?._id && (
                  <span className="text-[10px] bg-emerald-600 text-white
                                   px-1.5 py-0.5 rounded-full font-semibold
                                   select-none">
                    YOU
                  </span>
                )}
              </button>
            ))}
          </div>

          {inviteSuccess && (
            <p className="text-emerald-600 text-sm mt-3 font-medium">
              {inviteSuccess}
            </p>
          )}

          {showAddMember && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <MemberSearch onAdd={handleSendInvite} existingMembers={group?.members} />
            </div>
          )}
        </div>

        {/* ── Tab switcher ── */}
        <div className="flex bg-gray-200 dark:bg-[#3a3a3c] rounded-2xl p-1">
          {["expenses", "balances"].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setError(""); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold
                          capitalize transition-all touch-manipulation select-none
                          ${activeTab === tab
                            ? "bg-white dark:bg-[#2c2c2e] shadow-sm text-emerald-600"
                            : "text-gray-500 dark:text-gray-400"}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ════════════════ EXPENSES TAB ════════════════ */}
        {activeTab === "expenses" && (
          <>
            {expenses.length === 0 ? (
              <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-sm py-16 text-center">
                <p className="text-4xl mb-3">🧾</p>
                <p className="text-gray-700 dark:text-gray-200 font-semibold">No expenses yet</p>
                <p className="text-gray-400 text-sm mt-1">
                  Add the first one to start tracking
                </p>
              </div>
            ) : (
              <ListGroup>
                {expenses.map((expense) => (
                  <div key={expense._id} className="px-4 py-3.5">
                    {/* Expense header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-base font-medium text-gray-900 dark:text-white truncate">
                          {expense.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Paid by{" "}
                          <span className="text-emerald-600 font-semibold">
                            {expense.paidBy.name}
                          </span>
                        </p>
                      </div>
                      <span className="text-base font-bold text-gray-900 dark:text-white shrink-0">
                        ₹{expense.amount.toFixed(2)}
                      </span>
                    </div>

                    {/* Per-person split chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {expense.splitBetween.map((split) => (
                        <span
                          key={split._id}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium
                            ${split.paid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50   text-red-600   border border-red-200"}`}
                        >
                          {split.paid ? "✓" : "✗"}{" "}
                          {split.user.name}: ₹{split.share.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </ListGroup>
            )}
          </>
        )}

        {/* ════════════════ BALANCES TAB ════════════════ */}
        {activeTab === "balances" && (
          <>
            {balances.length === 0 ? (
              <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-sm py-16 text-center">
                <p className="text-4xl mb-3">🎉</p>
                <p className="text-gray-700 dark:text-gray-200 font-semibold">All settled up!</p>
                <p className="text-gray-400 text-sm mt-1">No pending balances</p>
              </div>
            ) : (
              <div className="space-y-4">

                {/* You owe */}
                {myDebts.length > 0 && (
                  <div>
                    <SectionLabel>You Owe</SectionLabel>
                    <ListGroup>
                      {myDebts.map((b, i) => (
                        <div key={i} className="px-4 py-3.5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={getMemberName(b.owedTo)} size={32} />
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                You owe{" "}
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {getMemberName(b.owedTo)}
                                </span>
                              </p>
                            </div>
                            <span className="text-base font-bold text-red-500">
                              ₹{b.amount}
                            </span>
                          </div>
                          {(() => {
                            const alreadyPending = myPendingSettlements.some(
                              (s) => s.paidTo._id === b.owedTo || s.paidTo === b.owedTo
                            );
                            return (
                              <button
                                onClick={() => !alreadyPending && openSettleModal(b)}
                                disabled={alreadyPending}
                                className={`w-full h-10 text-sm font-semibold rounded-xl
                                            transition touch-manipulation select-none
                                            ${alreadyPending
                                              ? "bg-gray-100 dark:bg-[#3a3a3c] text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                              : "bg-emerald-500 active:bg-emerald-600 text-white"}`}
                              >
                                {alreadyPending ? "⏳ Request Pending" : "Settle Up"}
                              </button>
                            );
                          })()}
                        </div>
                      ))}
                    </ListGroup>
                  </div>
                )}

                {/* Owed to you */}
                {theyOweMe.length > 0 && (
                  <div>
                    <SectionLabel>Owed to You</SectionLabel>
                    <ListGroup>
                      {theyOweMe.map((b, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={getMemberName(b.owedBy)} size={32} />
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {getMemberName(b.owedBy)}
                              </span>{" "}
                              owes you
                            </p>
                          </div>
                          <span className="text-base font-bold text-emerald-600">
                            ₹{b.amount}
                          </span>
                        </div>
                      ))}
                    </ListGroup>
                  </div>
                )}

                {/* Other members' debts */}
                {otherDebts.length > 0 && (
                  <div>
                    <SectionLabel>Others</SectionLabel>
                    <ListGroup>
                      {otherDebts.map((b, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3.5">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {getMemberName(b.owedBy)}
                            </span>{" "}
                            owes{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {getMemberName(b.owedTo)}
                            </span>
                          </p>
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            ₹{b.amount}
                          </span>
                        </div>
                      ))}
                    </ListGroup>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Add Expense FAB (expenses tab only) ── */}
      {activeTab === "expenses" && (
        <div className="fixed bottom-0 inset-x-0 bg-white/80 dark:bg-[#1c1c1e]/80
                        backdrop-blur border-t border-gray-200/60 dark:border-[#3a3a3c]/60
                        px-4 py-3 pb-safe flex justify-end">
          <button
            onClick={() => setShowExpenseForm(true)}
            className="h-12 px-6 bg-emerald-500 active:bg-emerald-600 text-white
                       text-sm font-semibold rounded-2xl shadow-lg transition
                       touch-manipulation select-none"
          >
            + Add Expense
          </button>
        </div>
      )}

      {/* ─────────── Add Expense Bottom Sheet ─────────── */}
      <BottomSheet
        open={showExpenseForm}
        onClose={() => {
          setShowExpenseForm(false);
          setCustomSplits([]);
          setNewExpense({ description: "", amount: "", splitType: "equal" });
          setError("");
        }}
        title="Add Expense"
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200
                            dark:border-red-800/30 rounded-xl px-4 py-3
                            text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Description
            </label>
            <input
              type="text"
              placeholder="e.g. Dinner, Hotel, Fuel…"
              value={newExpense.description}
              onChange={(e) => setNewExpense((p) => ({ ...p, description: e.target.value }))}
              className="w-full h-12 bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200
                         dark:border-[#48484a] rounded-xl px-4 text-base
                         text-gray-900 dark:text-white placeholder-gray-400
                         dark:placeholder-gray-500
                         focus:outline-none focus:border-emerald-500
                         focus:ring-2 focus:ring-emerald-500/20 transition"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Amount (₹)
            </label>
            <input
              type="number"
              min="1"
              max="1000000"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={newExpense.amount}
              onChange={(e) => setNewExpense((p) => ({ ...p, amount: e.target.value }))}
              className="w-full h-12 bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200
                         dark:border-[#48484a] rounded-xl px-4 text-base
                         text-gray-900 dark:text-white placeholder-gray-400
                         dark:placeholder-gray-500
                         focus:outline-none focus:border-emerald-500
                         focus:ring-2 focus:ring-emerald-500/20 transition"
              required
            />
          </div>

          {/* Split type toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Split Type
            </label>
            <div className="flex bg-gray-100 dark:bg-[#3a3a3c] rounded-xl p-1">
              {["equal", "custom"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSplitTypeChange(type)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize
                              transition touch-manipulation select-none
                              ${newExpense.splitType === type
                                ? "bg-white dark:bg-[#2c2c2e] shadow-sm text-emerald-600"
                                : "text-gray-500 dark:text-gray-400"}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Custom split inputs */}
          {newExpense.splitType === "custom" && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Amount per member
              </label>
              <div className="space-y-2">
                {customSplits.map((split, idx) => (
                  <div key={split.userId} className="flex items-center gap-3">
                    <Avatar name={split.name} size={32} />
                    <span className="text-sm text-gray-700 font-medium w-24 truncate">
                      {split.name}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={split.share}
                      onChange={(e) => {
                        const updated = [...customSplits];
                        updated[idx].share = e.target.value;
                        setCustomSplits(updated);
                      }}
                      className="flex-1 h-10 bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200
                                 dark:border-[#48484a] rounded-xl px-3 text-base
                                 text-gray-900 dark:text-white
                                 focus:outline-none focus:border-emerald-500
                                 focus:ring-2 focus:ring-emerald-500/20 transition"
                    />
                  </div>
                ))}
              </div>

              {/* Live total indicator */}
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-gray-400">Total</span>
                <span className={`font-semibold ${splitsMatch ? "text-emerald-600" : "text-red-500"}`}>
                  ₹{customTotal} / ₹{newExpense.amount || 0}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              className="flex-1 h-12 bg-emerald-500 active:bg-emerald-600
                         text-white font-semibold rounded-xl transition
                         touch-manipulation select-none"
            >
              Add Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setShowExpenseForm(false);
                setCustomSplits([]);
                setNewExpense({ description: "", amount: "", splitType: "equal" });
                setError("");
              }}
              className="flex-1 h-12 bg-gray-100 dark:bg-[#3a3a3c]
                         active:bg-gray-200 dark:active:bg-[#48484a]
                         text-gray-700 dark:text-gray-200 font-semibold rounded-xl
                         transition touch-manipulation select-none"
            >
              Cancel
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* ─────────── Member Profile Sheet ─────────── */}
      <BottomSheet
        open={!!memberProfile}
        onClose={() => setMemberProfile(null)}
        title="Member Profile"
      >
        {memberProfile?.loading ? (
          <div className="flex flex-col items-center gap-4 animate-pulse py-8">
            <div className="w-20 h-20 rounded-full bg-gray-200" />
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
        ) : memberProfile?.data ? (
          (() => {
            const d = memberProfile.data;
            const COLORS = ["bg-emerald-500","bg-violet-500","bg-orange-500","bg-sky-500","bg-pink-500","bg-amber-500"];
            const color = COLORS[(d.name || "?").charCodeAt(0) % COLORS.length];
            const initials = (d.name || "?").split(" ").map((w) => w[0]).join("").slice(0,2).toUpperCase();
            const flag = d.profilePublic ? (COUNTRY_FLAGS[d.country] || "") : "";

            const formatLastSeen = (ts) => {
              const dt = new Date(ts);
              const now = new Date();
              const time = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
              if (dt.toDateString() === now.toDateString()) return `Today at ${time}`;
              const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
              if (dt.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`;
              return `${dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} at ${time}`;
            };

            return (
              <div className="flex flex-col items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                  {d.profilePublic && d.profilePhoto ? (
                    <img src={d.profilePhoto} alt={d.name}
                         className="w-24 h-24 rounded-full object-cover" />
                  ) : (
                    <div className={`${color} w-24 h-24 rounded-full flex items-center
                                     justify-center text-white text-4xl font-bold select-none`}>
                      {initials}
                    </div>
                  )}
                  <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2
                                    border-white dark:border-[#2c2c2e]
                                    ${d.isOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
                  {flag && (
                    <span className="absolute top-0 left-0 text-xl leading-none select-none">
                      {flag}
                    </span>
                  )}
                </div>

                {/* Name & username */}
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{d.name}</p>
                  {d.profilePublic && d.username && (
                    <p className="text-sm text-emerald-600 font-medium mt-0.5">@{d.username}</p>
                  )}
                  <p className={`text-xs mt-1 ${d.isOnline ? "text-emerald-500" : "text-gray-400"}`}>
                    {d.isOnline ? "🟢 Online" : d.lastSeen ? `Last seen ${formatLastSeen(d.lastSeen)}` : "Offline"}
                  </p>
                </div>

                {/* Bio */}
                {d.profilePublic && d.bio && (
                  <div className="w-full bg-gray-50 dark:bg-[#3a3a3c] rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bio</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{d.bio}</p>
                  </div>
                )}

                {!d.profilePublic && (
                  <p className="text-sm text-gray-400 text-center">
                    🔒 This member's profile is private
                  </p>
                )}
              </div>
            );
          })()
        ) : (
          <p className="text-center text-gray-400 text-sm py-8">Could not load profile</p>
        )}
      </BottomSheet>

      {/* ─────────── Settle Up Dialog ─────────── */}
      <Dialog
        open={!!settleModal}
        onClose={() => { setSettleModal(null); setSettleAmount(""); setError(""); }}
        title="Settle Up"
      >
        <p className="text-sm text-gray-400 mb-4">
          Max amount:{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            ₹{settleModal?.maxAmount.toFixed(2)}
          </span>
        </p>

        <input
          type="number"
          inputMode="decimal"
          min="0.01"
          max={settleModal?.maxAmount}
          step="0.01"
          value={settleAmount}
          onChange={(e) => setSettleAmount(e.target.value)}
          className="w-full h-12 bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200
                     dark:border-[#48484a] rounded-xl px-4 text-base
                     text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                     focus:outline-none focus:border-emerald-500
                     focus:ring-2 focus:ring-emerald-500/20 transition mb-3"
          placeholder="Enter amount"
        />

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleSettle}
            className="flex-1 h-12 bg-emerald-500 active:bg-emerald-600
                       text-white font-semibold rounded-xl transition
                       touch-manipulation select-none"
          >
            Send Request
          </button>
          <button
            onClick={() => { setSettleModal(null); setSettleAmount(""); setError(""); }}
            className="flex-1 h-12 bg-gray-100 active:bg-gray-200
                       text-gray-700 font-semibold rounded-xl transition
                       touch-manipulation select-none"
          >
            Cancel
          </button>
        </div>
      </Dialog>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import api from "../utils/api";
import MemberSearch from "../components/MemberSearch";
import CalcInput from "../components/CalcInput";
import toast from "react-hot-toast";

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */

const CATEGORIES = [
  { value: "food",          label: "Food",        icon: "🍔" },
  { value: "transport",     label: "Transport",   icon: "🚗" },
  { value: "accommodation", label: "Stay",        icon: "🏠" },
  { value: "entertainment", label: "Fun",         icon: "🎬" },
  { value: "shopping",      label: "Shopping",    icon: "🛍️" },
  { value: "utilities",     label: "Utilities",   icon: "💡" },
  { value: "travel",        label: "Travel",      icon: "✈️" },
  { value: "other",         label: "Other",       icon: "📦" },
];

const catIcon  = (v) => CATEGORIES.find((c) => c.value === v)?.icon  ?? "📦";
const catLabel = (v) => CATEGORIES.find((c) => c.value === v)?.label ?? "Other";

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

/* ─────────────────────────────────────────
   Local UI components
───────────────────────────────────────── */

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

function SectionLabel({ children }) {
  return (
    <p className="px-1 mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400
                  uppercase tracking-wider">
      {children}
    </p>
  );
}

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

export default function GroupDetail() {
  const { id }                          = useParams();
  const { user, loading: authLoading }  = useAuth();
  const { dark, toggle }                = useTheme();
  const { t }                           = useLanguage();
  const navigate                        = useNavigate();
  const groupPhotoRef                   = useRef(null);

  /* ── Data ── */
  const [group,                setGroup]                = useState(null);
  const [expenses,             setExpenses]             = useState([]);
  const [balances,             setBalances]             = useState([]);
  const [settlements,          setSettlements]          = useState([]);
  const [myPendingSettlements, setMyPendingSettlements] = useState([]);

  /* ── UI state ── */
  const [loading,         setLoading]         = useState(true);
  const [activeTab,       setActiveTab]       = useState("expenses");
  const [error,           setError]           = useState("");
  const [inviteSuccess,   setInviteSuccess]   = useState("");
  const [showAddMember,   setShowAddMember]   = useState(false);
  const [showBreakdown,   setShowBreakdown]   = useState(false);
  const [groupPhotoSaving, setGroupPhotoSaving] = useState(false);

  /* ── Add expense form ── */
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount:      "",
    splitType:   "equal",
    paidById:    "",
    category:    "other",
  });
  const [customSplits, setCustomSplits] = useState([]);

  /* ── Settle modal ── */
  const [settleModal,  setSettleModal]  = useState(null);
  const [settleAmount, setSettleAmount] = useState("");

  /* ── Member profile sheet ── */
  const [memberProfile, setMemberProfile] = useState(null);

  /* ── Comments ── */
  const [showCommentFor,  setShowCommentFor]  = useState(null);
  const [commentInputs,   setCommentInputs]   = useState({});
  const [commentLoading,  setCommentLoading]  = useState(null);

  /* ── Edit expense ── */
  const [editExpense,     setEditExpense]     = useState(null);
  const [editForm,        setEditForm]        = useState({ description: "", category: "other" });

  /* ── Pending approval invites (creator only) ── */
  const [pendingApprovals, setPendingApprovals] = useState([]);

  /* ── Pending actions (voting system) ── */
  const [pendingActions,   setPendingActions]   = useState([]);
  const [votingId,         setVotingId]         = useState(null);

  /* ── Edit / Delete group ── */
  const [showGroupMenu,    setShowGroupMenu]    = useState(false);
  const [showEditGroup,    setShowEditGroup]    = useState(false);
  const [editGroupForm,    setEditGroupForm]    = useState({ name: "", description: "" });
  const [editGroupSaving,  setEditGroupSaving]  = useState(false);
  const [deletingGroup,    setDeletingGroup]    = useState(false);

  /* ── Expense pagination ── */
  const [expensesCursor,   setExpensesCursor]   = useState(null);
  const [expensesHasMore,  setExpensesHasMore]  = useState(false);
  const [loadingMore,      setLoadingMore]      = useState(false);
  const groupMenuRef                            = useRef(null);

  /* ─── Auth guard ─── */
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    fetchAll();
  }, [id, user, authLoading]);

  /* ─── Click-outside to close group menu ─── */
  useEffect(() => {
    const handler = (e) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(e.target))
        setShowGroupMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ─────── Data fetching ─────── */

  const fetchAll = async () => {
    try {
      const [groupRes, expensesRes, balancesRes, settlementsRes, actionsRes] = await Promise.allSettled([
        api.get(`/groups/${id}`),
        api.get(`/groups/${id}/expenses`),
        api.get(`/groups/${id}/balances`),
        api.get(`/groups/${id}/settlements`),
        api.get(`/groups/${id}/pending-actions`),
      ]);

      if (groupRes.status       === "fulfilled") setGroup(groupRes.value.data);
      if (expensesRes.status    === "fulfilled") {
        const { expenses, hasMore, nextCursor } = expensesRes.value.data;
        setExpenses(expenses);
        setExpensesHasMore(hasMore);
        setExpensesCursor(nextCursor);
      }
      if (balancesRes.status    === "fulfilled") setBalances(balancesRes.value.data);
      if (settlementsRes.status === "fulfilled") {
        const all = settlementsRes.value.data;
        setSettlements(all);
        const pending = all.filter(
          (s) => s.status === "pending" && s.paidBy._id === user?._id
        );
        setMyPendingSettlements(pending);
      }

      if (groupRes.status === "fulfilled") {
        const g = groupRes.value.data;
        const approvals = (g.invites || []).filter((i) => i.status === "pending_approval");
        setPendingApprovals(approvals);
      }
      if (actionsRes.status === "fulfilled") setPendingActions(actionsRes.value.data);
      if (groupRes.status    === "rejected") setError("Failed to load group");
      if (expensesRes.status === "rejected") setError("Failed to load expenses");
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadMoreExpenses = async () => {
    if (!expensesCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data } = await api.get(`/groups/${id}/expenses?cursor=${expensesCursor}`);
      setExpenses((prev) => [...prev, ...data.expenses]);
      setExpensesHasMore(data.hasMore);
      setExpensesCursor(data.nextCursor);
    } catch {
      // silently fail — user can retry
    } finally {
      setLoadingMore(false);
    }
  };

  /* ─────── Helpers ─────── */

  const getMemberName = (userId) =>
    group?.members.find((m) => m._id.toString() === userId.toString())?.name ?? userId;

  const formatDate = (ts) =>
    new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  /* ─────── Export CSV ─────── */

  const handleExportCSV = () => {
    const rows = [
      ["Date", "Description", "Category", "Amount (₹)", "Paid By", "Split Type"],
      ...expenses.map((e) => [
        formatDate(e.createdAt),
        `"${e.description}"`,
        catLabel(e.category),
        e.amount.toFixed(2),
        e.paidBy.name,
        e.splitType,
      ]),
    ];
    const csv  = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${group?.name || "expenses"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ─────── Group photo upload ─────── */

  const handleGroupPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10 MB"); return; }
    setGroupPhotoSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", "spliteasy/groups");
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!res.ok) throw new Error("Upload failed");
      const { secure_url } = await res.json();
      const { data } = await api.put(`/groups/${id}`, { groupPhoto: secure_url });
      setGroup((g) => ({ ...g, groupPhoto: data.groupPhoto }));
      toast.success("Group photo updated");
    } catch { toast.error("Failed to update photo"); }
    finally { setGroupPhotoSaving(false); }
  };

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

    // Close form immediately for instant feel
    setNewExpense({ description: "", amount: "", splitType: "equal", paidById: "", category: "other" });
    setCustomSplits([]);
    setShowExpenseForm(false);

    try {
      const { data } = await api.post(`/groups/${id}/expenses`, {
        description:  newExpense.description,
        amount:       amt,
        splitType:    newExpense.splitType,
        paidById:     newExpense.paidById || undefined,
        category:     newExpense.category,
        customSplits:
          newExpense.splitType === "custom"
            ? customSplits.map((s) => ({ userId: s.userId, share: parseFloat(s.share) }))
            : undefined,
      });
      // Prepend new expense, then refresh only balances in background
      setExpenses((prev) => [data.expense, ...prev]);
      api.get(`/groups/${id}/balances`).then((r) => setBalances(r.data)).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add expense");
      fetchAll();
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

  const handleAddComment = async (expenseId) => {
    const text = (commentInputs[expenseId] || "").trim();
    if (!text) return;
    setCommentLoading(expenseId);
    try {
      const { data } = await api.post(`/groups/${id}/expenses/${expenseId}/comments`, { text });
      setExpenses((prev) =>
        prev.map((e) => (e._id === expenseId ? { ...e, comments: data.comments } : e))
      );
      setCommentInputs((prev) => ({ ...prev, [expenseId]: "" }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add comment");
    } finally {
      setCommentLoading(null);
    }
  };

  const handleCastVote = async (actionId, approve) => {
    setVotingId(actionId);
    try {
      const { data } = await api.post(`/groups/${id}/pending-actions/${actionId}/vote`, { approve });
      if (data.resolved) {
        toast.success(data.status === "approved" ? "Action approved ✓" : "Action rejected ✗");
        fetchAll();
      } else {
        toast.success("Vote recorded");
        setPendingActions((prev) =>
          prev.map((a) =>
            a._id === actionId
              ? { ...a, votes: [...a.votes, { user: { _id: user._id, name: user.name }, approve }] }
              : a
          )
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to vote");
    } finally {
      setVotingId(null);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm(t("gd.confirm_leave"))) return;
    try {
      await api.delete(`/groups/${id}/leave`);
      toast.success("Leave request sent to group creator");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send leave request");
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(t("gd.confirm_remove", { name: memberName }))) return;
    try {
      await api.delete(`/groups/${id}/members/${memberId}`);
      toast.success(`Removal vote started for ${memberName}`);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start removal vote");
    }
  };

  const handleEditExpense = async () => {
    if (!editExpense) return;
    try {
      const { data } = await api.put(`/groups/${id}/expenses/${editExpense._id}`, {
        description: editForm.description,
        category:    editForm.category,
      });
      setExpenses((prev) => prev.map((e) => (e._id === editExpense._id ? data.expense : e)));
      setEditExpense(null);
      toast.success("Expense updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update expense");
    }
  };

  const handleApproveInvite = async (userId, approved) => {
    try {
      await api.put(`/groups/${id}/invite/approve`, { userId, approved });
      toast.success(approved ? "Invite approved and sent!" : "Invite request declined");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to process invite");
    }
  };

  const handleEditGroup = async (e) => {
    e.preventDefault();
    if (!editGroupForm.name.trim()) return;
    setEditGroupSaving(true);
    try {
      const { data } = await api.put(`/groups/${id}`, {
        name:        editGroupForm.name.trim(),
        description: editGroupForm.description.trim(),
      });
      setGroup((g) => ({ ...g, name: data.name, description: data.description }));
      setShowEditGroup(false);
      toast.success("Group updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update group");
    } finally {
      setEditGroupSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm(t("gd.confirm_delete_group", { name: group?.name || "" }))) return;
    setDeletingGroup(true);
    try {
      await api.delete(`/groups/${id}`);
      toast.success("Group deleted");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete group");
      setDeletingGroup(false);
    }
  };

  const openMemberProfile = async (member) => {
    if (member._id === user?._id) return;
    setMemberProfile({ loading: true, data: null, memberId: member._id, name: member.name });
    try {
      const { data } = await api.get(`/users/${member._id}`);
      setMemberProfile((p) => ({ ...p, loading: false, data }));
    } catch {
      setMemberProfile((p) => ({ ...p, loading: false }));
    }
  };

  /* ─────── Derived ─────── */

  const myDebts    = balances.filter((b) => b.owedBy === user?._id);
  const theyOweMe  = balances.filter((b) => b.owedTo === user?._id);
  const otherDebts = balances.filter(
    (b) => b.owedBy !== user?._id && b.owedTo !== user?._id
  );

  const customTotal = customSplits.reduce((s, c) => s + (parseFloat(c.share) || 0), 0);
  const targetAmt   = parseFloat(newExpense.amount || 0);
  const splitsMatch = Math.abs(customTotal - targetAmt) < 0.01;

  /* ── Spending breakdown by category ── */
  const breakdown = CATEGORIES.map((cat) => {
    const total = expenses
      .filter((e) => (e.category || "other") === cat.value)
      .reduce((s, e) => s + e.amount, 0);
    return { ...cat, total };
  }).filter((c) => c.total > 0);
  const breakdownMax = Math.max(...breakdown.map((c) => c.total), 1);

  /* ── Activity timeline: merge expenses + settlements ── */
  const activityItems = [
    ...expenses.map((e) => ({
      type:    "expense",
      date:    new Date(e.createdAt),
      icon:    catIcon(e.category),
      title:   e.description,
      subtitle: `${t("gd.paid_by")} ${e.paidBy.name}`,
      amount:  `₹${e.amount.toFixed(2)}`,
      amountColor: "text-gray-900 dark:text-white",
    })),
    ...settlements.map((s) => ({
      type:    "settlement",
      date:    new Date(s.createdAt),
      icon:    s.status === "accepted" ? "✅" : s.status === "rejected" ? "❌" : "⏳",
      title:   `${s.paidBy.name} → ${s.paidTo.name}`,
      subtitle: s.status === "accepted" ? t("gd.status_settled") : s.status === "rejected" ? t("gd.status_rejected") : t("gd.status_pending"),
      amount:  `₹${(s.amount / 100).toFixed(2)}`,
      amountColor: s.status === "accepted" ? "text-emerald-600" : "text-gray-400",
    })),
  ].sort((a, b) => b.date - a.date);

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
          {/* Back */}
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

          {/* Group photo + title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => groupPhotoRef.current?.click()}
              disabled={groupPhotoSaving}
              className="relative shrink-0 w-8 h-8 rounded-full overflow-hidden
                         active:opacity-70 transition touch-manipulation"
              title="Change group photo"
            >
              {group?.groupPhoto ? (
                <img src={group.groupPhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-base">
                  👥
                </div>
              )}
              {groupPhotoSaving && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
            <input
              ref={groupPhotoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleGroupPhotoChange}
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {group?.name}
              </h1>
              {group?.description && (
                <p className="text-xs text-gray-400 truncate">{group.description}</p>
              )}
            </div>
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="w-10 h-10 flex items-center justify-center rounded-full
                       hover:bg-gray-100 dark:hover:bg-[#3a3a3c]
                       active:bg-gray-200 dark:active:bg-[#48484a]
                       transition touch-manipulation shrink-0"
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

          {/* Member count */}
          <span className="text-xs text-gray-500 dark:text-gray-400
                           bg-gray-100 dark:bg-[#3a3a3c] px-2.5 py-1
                           rounded-full shrink-0 select-none">
            {group?.members.length} {t("gd.members_count")}
          </span>

          {/* ⋯ menu — creator only */}
          {(group?.createdBy?._id === user?._id || group?.createdBy === user?._id) && (
            <div className="relative shrink-0" ref={groupMenuRef}>
              <button
                onClick={() => setShowGroupMenu((v) => !v)}
                className="w-9 h-9 flex items-center justify-center rounded-full
                           hover:bg-gray-100 dark:hover:bg-[#3a3a3c]
                           active:bg-gray-200 dark:active:bg-[#48484a]
                           transition touch-manipulation text-gray-500 dark:text-gray-400
                           text-lg font-bold select-none"
                aria-label="Group options"
              >
                ⋯
              </button>
              {showGroupMenu && (
                <div className="absolute right-0 top-11 w-44 bg-white dark:bg-[#2c2c2e]
                                rounded-2xl shadow-xl border border-gray-100
                                dark:border-[#3a3a3c] overflow-hidden z-20">
                  <button
                    onClick={() => {
                      setEditGroupForm({ name: group?.name || "", description: group?.description || "" });
                      setShowEditGroup(true);
                      setShowGroupMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-3
                               text-sm font-medium text-gray-700 dark:text-gray-200
                               hover:bg-gray-50 dark:hover:bg-[#3a3a3c]
                               active:bg-gray-100 transition touch-manipulation"
                  >
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0
                               002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828
                               15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {t("gd.edit_group")}
                  </button>
                  <div className="h-px bg-gray-100 dark:bg-[#3a3a3c]" />
                  <button
                    onClick={() => { setShowGroupMenu(false); handleDeleteGroup(); }}
                    disabled={deletingGroup}
                    className="w-full flex items-center gap-2.5 px-4 py-3
                               text-sm font-medium text-red-500
                               hover:bg-red-50 dark:hover:bg-red-900/20
                               active:bg-red-100 transition touch-manipulation
                               disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0
                               01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0
                               00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {deletingGroup ? t("gd.deleting") : t("gd.delete_group")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <main className="max-w-lg mx-auto px-4 py-4 pb-32 space-y-4">

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
              {t("gd.members")}
            </p>
            <button
              onClick={() => setShowAddMember((v) => !v)}
              className="text-sm text-emerald-600 font-semibold touch-manipulation select-none"
            >
              {t("gd.invite")}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {group?.members.map((member) => {
              const isMe      = member._id === user?._id;
              const isCreator = group.createdBy?._id === user?._id || group.createdBy === user?._id;
              const hasDebt   = balances.some((b) => b.owedBy === member._id);
              const allPaid   = !hasDebt;
              return (
                <div key={member._id}
                     className="flex items-center gap-1 bg-gray-50 dark:bg-[#3a3a3c]
                                border border-gray-100 dark:border-[#48484a]
                                px-2 py-1.5 rounded-full">
                  <button
                    onClick={() => openMemberProfile(member)}
                    className="flex items-center gap-1.5 touch-manipulation"
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-500
                                    flex items-center justify-center text-white
                                    text-[10px] font-bold select-none">
                      {member.name[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                      {member.name}
                    </span>
                    {isMe && (
                      <span className="text-[10px] bg-emerald-600 text-white
                                       px-1.5 py-0.5 rounded-full font-semibold select-none">
                        {t("gd.you_badge")}
                      </span>
                    )}
                    {allPaid && (
                      <span className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30
                                       text-emerald-600 dark:text-emerald-400
                                       border border-emerald-200 dark:border-emerald-700/40
                                       px-1.5 py-0.5 rounded-full font-semibold select-none">
                        ✓
                      </span>
                    )}
                  </button>
                  {/* Creator can remove others; non-creator can leave via their own chip */}
                  {isCreator && !isMe && (
                    <button
                      onClick={() => handleRemoveMember(member._id, member.name)}
                      className="w-4 h-4 flex items-center justify-center rounded-full
                                 text-gray-400 hover:text-red-500 transition touch-manipulation ml-1"
                      title={`Remove ${member.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Leave group (non-creator only) */}
          {group?.createdBy?._id !== user?._id && group?.createdBy !== user?._id && (
            <button
              onClick={handleLeaveGroup}
              className="mt-3 text-xs text-red-500 font-medium touch-manipulation"
            >
              {t("gd.leave_group")}
            </button>
          )}

          {/* Pending approval invites (creator only) */}
          {pendingApprovals.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#3a3a3c] space-y-2">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                {t("gd.invite_requests")} ({pendingApprovals.length})
              </p>
              {pendingApprovals.map((inv) => (
                <div key={inv.user} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {t("gd.user_invited")}
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleApproveInvite(inv.user, true)}
                      className="text-xs px-2.5 py-1 bg-emerald-500 text-white
                                 rounded-lg font-semibold touch-manipulation"
                    >
                      {t("gd.approve")}
                    </button>
                    <button
                      onClick={() => handleApproveInvite(inv.user, false)}
                      className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-[#3a3a3c]
                                 text-gray-600 dark:text-gray-300 rounded-lg font-semibold
                                 touch-manipulation"
                    >
                      {t("gd.decline")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {inviteSuccess && (
            <p className="text-emerald-600 text-sm mt-3 font-medium">{inviteSuccess}</p>
          )}
          {showAddMember && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <MemberSearch onAdd={handleSendInvite} existingMembers={group?.members} />
            </div>
          )}
        </div>

        {/* ── Pending Actions (voting) ── */}
        {pendingActions.length > 0 && (() => {
          const myActions = pendingActions.filter((a) =>
            a.type !== "expense_edit" &&
            a.requiredVoters.some((v) => (v._id || v).toString() === user?._id) &&
            !a.votes.some((v) => (v.user?._id || v.user).toString() === user?._id)
          );
          if (myActions.length === 0) return null;
          return (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl shadow-sm overflow-hidden
                            border border-amber-200/60 dark:border-amber-700/40">
              <div className="px-4 py-3 border-b border-amber-200/60 dark:border-amber-700/40">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400
                               uppercase tracking-wider">
                  🗳 {t("gd.pending_approval")} ({myActions.length})
                </p>
              </div>
              <div className="divide-y divide-amber-100 dark:divide-amber-800/30">
                {myActions.map((action) => {
                  const totalVoters  = action.requiredVoters.length;
                  const approvals    = action.votes.filter((v) => v.approve).length;
                  const rejections   = action.votes.filter((v) => !v.approve).length;
                  const isVoting     = votingId === action._id;

                  let headline = "";
                  let detail   = "";
                  if (action.type === "leave_request") {
                    headline = `${action.initiator?.name} ${t("gd.wants_to_leave")}`;
                    detail   = t("gd.leave_detail");
                  } else if (action.type === "remove_member") {
                    headline = `${t("gd.remove_prefix")} ${action.targetUser?.name}?`;
                    detail   = `${t("gd.proposed_by")} ${action.initiator?.name} · ${t("gd.majority_required")}`;
                  } else if (action.type === "expense_edit") {
                    headline = `Edit proposed for "${action.expenseId?.description || "expense"}"`;
                    const changes = [];
                    if (action.proposedChanges?.description)
                      changes.push(`Desc: "${action.proposedChanges.description}"`);
                    if (action.proposedChanges?.category)
                      changes.push(`Cat: ${catLabel(action.proposedChanges.category)}`);
                    detail = changes.length ? changes.join(" · ") : "Proposed by " + action.initiator?.name;
                  }

                  return (
                    <div key={action._id} className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                        {headline}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{detail}</p>

                      {/* Vote progress (for multi-voter actions) */}
                      {totalVoters > 1 && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>✓ {t("gd.approved_count", { n: approvals })}</span>
                            <span>✗ {t("gd.rejected_count", { n: rejections })}</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-[#3a3a3c] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${totalVoters > 0 ? (approvals / totalVoters) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          disabled={isVoting}
                          onClick={() => handleCastVote(action._id, true)}
                          className="flex-1 h-9 bg-emerald-500 active:bg-emerald-600
                                     text-white text-sm font-semibold rounded-xl
                                     transition touch-manipulation disabled:opacity-50"
                        >
                          {isVoting ? "…" : t("gd.approve_vote")}
                        </button>
                        <button
                          disabled={isVoting}
                          onClick={() => handleCastVote(action._id, false)}
                          className="flex-1 h-9 bg-red-50 dark:bg-red-900/20 active:bg-red-100
                                     text-red-600 dark:text-red-400 text-sm font-semibold
                                     rounded-xl transition touch-manipulation disabled:opacity-50"
                        >
                          {isVoting ? "…" : t("gd.decline_vote")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── Tab switcher ── */}
        <div className="flex bg-gray-200 dark:bg-[#3a3a3c] rounded-2xl p-1">
          {["expenses", "balances", "activity"].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setError(""); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold
                          transition-all touch-manipulation select-none
                          ${activeTab === tab
                            ? "bg-white dark:bg-[#2c2c2e] shadow-sm text-emerald-600"
                            : "text-gray-500 dark:text-gray-400"}`}
            >
              {t(`gd.tab_${tab}`)}
            </button>
          ))}
        </div>

        {/* ════════════════ EXPENSES TAB ════════════════ */}
        {activeTab === "expenses" && (
          <>
            {/* Toolbar: breakdown toggle + export */}
            {expenses.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBreakdown((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                              transition touch-manipulation select-none
                              ${showBreakdown
                                ? "bg-emerald-500 text-white"
                                : "bg-white dark:bg-[#2c2c2e] text-gray-600 dark:text-gray-300 shadow-sm"}`}
                >
                  {t("gd.breakdown")}
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                             bg-white dark:bg-[#2c2c2e] text-gray-600 dark:text-gray-300
                             shadow-sm transition touch-manipulation select-none"
                >
                  {t("gd.export_csv")}
                </button>
              </div>
            )}

            {/* Spending Breakdown */}
            {showBreakdown && breakdown.length > 0 && (
              <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-sm p-4 space-y-2.5">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  {t("gd.spending_breakdown")}
                </p>
                {breakdown.map((cat) => (
                  <div key={cat.value}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 dark:text-gray-200">
                        {cat.icon} {t(`cat.${cat.value}`)}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₹{cat.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-[#3a3a3c] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${(cat.total / breakdownMax) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {expenses.length === 0 ? (
              <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-sm py-16 text-center">
                <p className="text-4xl mb-3">🧾</p>
                <p className="text-gray-700 dark:text-gray-200 font-semibold">{t("gd.no_expenses_title")}</p>
                <p className="text-gray-400 text-sm mt-1">{t("gd.no_expenses_sub")}</p>
              </div>
            ) : (
              <>
              <ListGroup>
                {expenses.map((expense) => (
                  <div key={expense._id} className="px-4 py-3.5">
                    {/* Header row */}
                    {(() => {
                      const isMyExpense = expense.paidBy._id === user?._id;
                      const mySplit = !isMyExpense
                        ? expense.splitBetween.find(
                            (s) => (s.user._id || s.user) === user?._id
                          )
                        : null;
                      const mySharePaid = mySplit?.paid === true;
                      return (
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0 mr-3">
                        <span className="text-xl shrink-0 mt-0.5">{catIcon(expense.category)}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-base font-medium text-gray-900 dark:text-white truncate">
                              {expense.description}
                            </p>
                            {mySharePaid && (
                              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5
                                               bg-emerald-100 dark:bg-emerald-900/30
                                               text-emerald-700 dark:text-emerald-400
                                               rounded-full border border-emerald-200
                                               dark:border-emerald-700/40 select-none">
                                ✓ Paid
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {t("gd.paid_by")}{" "}
                            <span className="text-emerald-600 font-semibold">
                              {expense.paidBy.name}
                            </span>
                            {" · "}
                            <span className="text-gray-400">{formatDate(expense.createdAt)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-base font-bold text-gray-900 dark:text-white">
                          ₹{expense.amount.toFixed(2)}
                        </span>
                        {expense.paidBy._id === user?._id && (
                          <>
                            {/* Edit */}
                            <button
                              onClick={() => {
                                setEditExpense(expense);
                                setEditForm({ description: expense.description, category: expense.category || "other" });
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-full
                                         bg-blue-50 dark:bg-blue-900/20 text-blue-500
                                         active:bg-blue-100 transition touch-manipulation"
                              title="Edit expense"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0
                                         002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828
                                         15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {/* Delete */}
                            <button
                              onClick={async () => {
                                if (!window.confirm(t("gd.confirm_delete"))) return;
                                const snapshot = expenses;
                                setExpenses((prev) => prev.filter((e) => e._id !== expense._id));
                                try {
                                  await api.delete(`/groups/${id}/expenses/${expense._id}`);
                                  toast.success("Expense deleted");
                                  api.get(`/groups/${id}/balances`).then((r) => setBalances(r.data)).catch(() => {});
                                } catch (err) {
                                  setExpenses(snapshot);
                                  toast.error(err.response?.data?.message || "Failed to delete");
                                }
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-full
                                         bg-red-50 dark:bg-red-900/20 text-red-500
                                         active:bg-red-100 transition touch-manipulation"
                              title="Delete expense"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0
                                         01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0
                                         00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                      ); })()}

                    {/* Split chips */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {expense.splitBetween.map((split) => (
                        <span
                          key={split._id}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium
                            ${split.paid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-600 border border-red-200"}`}
                        >
                          {split.paid ? "✓" : "✗"} {split.user.name}: ₹{split.share.toFixed(2)}
                        </span>
                      ))}
                    </div>

                    {/* Comments toggle */}
                    <button
                      onClick={() =>
                        setShowCommentFor((prev) => (prev === expense._id ? null : expense._id))
                      }
                      className="text-xs text-gray-400 hover:text-emerald-600 transition
                                 touch-manipulation select-none"
                    >
                      💬 {t("gd.notes_count", { n: expense.comments?.length || 0 })}
                    </button>

                    {/* Comments section */}
                    {showCommentFor === expense._id && (
                      <div className="mt-2 space-y-2">
                        {(expense.comments || []).map((c, i) => (
                          <div key={i} className="flex gap-2 items-start">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center
                                            justify-center text-white text-[10px] font-bold shrink-0">
                              {(c.user?.name || "?")[0].toUpperCase()}
                            </div>
                            <div className="flex-1 bg-gray-50 dark:bg-[#3a3a3c] rounded-xl px-3 py-2">
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                {c.user?.name || "Unknown"}
                              </span>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{c.text}</p>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            placeholder={t("gd.note_placeholder")}
                            value={commentInputs[expense._id] || ""}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({ ...prev, [expense._id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddComment(expense._id);
                            }}
                            maxLength={300}
                            className="flex-1 h-9 bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200
                                       dark:border-[#48484a] rounded-xl px-3 text-sm
                                       text-gray-900 dark:text-white placeholder-gray-400
                                       focus:outline-none focus:border-emerald-500 transition"
                          />
                          <button
                            onClick={() => handleAddComment(expense._id)}
                            disabled={commentLoading === expense._id}
                            className="h-9 px-3 bg-emerald-500 active:bg-emerald-600 text-white
                                       text-sm font-semibold rounded-xl transition
                                       touch-manipulation disabled:opacity-50"
                          >
                            {commentLoading === expense._id ? "…" : t("gd.post")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </ListGroup>

              {/* Load More */}
              {expensesHasMore && (
                <button
                  onClick={loadMoreExpenses}
                  disabled={loadingMore}
                  className="w-full py-3 text-sm font-semibold text-emerald-600
                             dark:text-emerald-400 bg-white dark:bg-[#2c2c2e]
                             rounded-2xl shadow-sm border border-gray-100
                             dark:border-[#3a3a3c] touch-manipulation
                             disabled:opacity-50 transition"
                >
                  {loadingMore ? "Loading…" : "Load more expenses"}
                </button>
              )}
              </>
            )}
          </>
        )}

        {/* ════════════════ BALANCES TAB ════════════════ */}
        {activeTab === "balances" && (
          <>
            {balances.length === 0 ? (
              <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-sm py-16 text-center">
                <p className="text-4xl mb-3">🎉</p>
                <p className="text-gray-700 dark:text-gray-200 font-semibold">{t("gd.all_settled")}</p>
                <p className="text-gray-400 text-sm mt-1">{t("gd.no_balances")}</p>
              </div>
            ) : (
              <div className="space-y-4">

                {myDebts.length > 0 && (
                  <div>
                    <SectionLabel>{t("gd.you_owe")}</SectionLabel>
                    <ListGroup>
                      {myDebts.map((b, i) => (
                        <div key={i} className="px-4 py-3.5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={getMemberName(b.owedTo)} size={32} />
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {t("gd.you_owe_text")}{" "}
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {getMemberName(b.owedTo)}
                                </span>
                              </p>
                            </div>
                            <span className="text-base font-bold text-red-500">
                              ₹{b.amount.toFixed(2)}
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
                                              ? "bg-gray-100 dark:bg-[#3a3a3c] text-gray-400 cursor-not-allowed"
                                              : "bg-emerald-500 active:bg-emerald-600 text-white"}`}
                              >
                                {alreadyPending ? t("gd.request_pending") : t("gd.settle_up")}
                              </button>
                            );
                          })()}
                        </div>
                      ))}
                    </ListGroup>
                  </div>
                )}

                {theyOweMe.length > 0 && (
                  <div>
                    <SectionLabel>{t("gd.owed_to_you")}</SectionLabel>
                    <ListGroup>
                      {theyOweMe.map((b, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <Avatar name={getMemberName(b.owedBy)} size={32} />
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {getMemberName(b.owedBy)}
                              </span>{" "}
                              {t("gd.owes_you")}
                            </p>
                          </div>
                          <span className="text-base font-bold text-emerald-600">
                            ₹{b.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </ListGroup>
                  </div>
                )}

                {otherDebts.length > 0 && (
                  <div>
                    <SectionLabel>{t("gd.others")}</SectionLabel>
                    <ListGroup>
                      {otherDebts.map((b, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3.5">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {getMemberName(b.owedBy)}
                            </span>{" "}
                            {t("gd.owes")}{" "}
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {getMemberName(b.owedTo)}
                            </span>
                          </p>
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            ₹{b.amount.toFixed(2)}
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

        {/* ════════════════ ACTIVITY TAB ════════════════ */}
        {activeTab === "activity" && (
          <>
            {activityItems.length === 0 ? (
              <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-sm py-16 text-center">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-gray-700 dark:text-gray-200 font-semibold">{t("gd.no_activity_title")}</p>
                <p className="text-gray-400 text-sm mt-1">{t("gd.no_activity_sub")}</p>
              </div>
            ) : (
              <ListGroup>
                {activityItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                    <span className="text-2xl shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-400">{item.subtitle}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.date.toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${item.amountColor}`}>
                      {item.amount}
                    </span>
                  </div>
                ))}
              </ListGroup>
            )}
          </>
        )}

      </main>

      {/* ── Add Expense FAB ── */}
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
            {t("gd.add_expense")}
          </button>
        </div>
      )}

      {/* ─────────── Add Expense Bottom Sheet ─────────── */}
      <BottomSheet
        open={showExpenseForm}
        onClose={() => {
          setShowExpenseForm(false);
          setCustomSplits([]);
          setNewExpense({ description: "", amount: "", splitType: "equal", paidById: "", category: "other" });
          setError("");
        }}
        title={t("gd.add_expense_sheet_title")}
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
              {t("gd.description")}
            </label>
            <input
              type="text"
              placeholder={t("gd.description_placeholder")}
              value={newExpense.description}
              onChange={(e) => setNewExpense((p) => ({ ...p, description: e.target.value }))}
              className="w-full h-12 bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200
                         dark:border-[#48484a] rounded-xl px-4 text-base
                         text-gray-900 dark:text-white placeholder-gray-400
                         focus:outline-none focus:border-emerald-500
                         focus:ring-2 focus:ring-emerald-500/20 transition"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              {t("gd.amount")}
            </label>
            <CalcInput
              value={newExpense.amount}
              onChange={(val) => setNewExpense((p) => ({ ...p, amount: val }))}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              {t("gd.category")}
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setNewExpense((p) => ({ ...p, category: cat.value }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                              font-medium transition touch-manipulation select-none
                              ${newExpense.category === cat.value
                                ? "bg-emerald-500 text-white"
                                : "bg-gray-100 dark:bg-[#3a3a3c] text-gray-600 dark:text-gray-300"}`}
                >
                  <span>{cat.icon}</span>
                  {t(`cat.${cat.value}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Paid by */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              {t("gd.paid_by_label")}
            </label>
            <div className="flex flex-wrap gap-2">
              {group?.members.map((m) => {
                const isSelected = newExpense.paidById
                  ? newExpense.paidById === m._id
                  : m._id === user?._id;
                return (
                  <button
                    key={m._id}
                    type="button"
                    onClick={() => setNewExpense((p) => ({ ...p, paidById: m._id }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                                font-medium transition touch-manipulation select-none
                                ${isSelected
                                  ? "bg-emerald-500 text-white"
                                  : "bg-gray-100 dark:bg-[#3a3a3c] text-gray-600 dark:text-gray-300"}`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center
                                      text-[9px] font-bold
                                      ${isSelected ? "bg-white/30 text-white" : "bg-gray-300 dark:bg-[#48484a] text-gray-600"}`}>
                      {m.name[0].toUpperCase()}
                    </span>
                    {m._id === user?._id ? t("gd.you_label") : m.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split type */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              {t("gd.split_type")}
            </label>
            <div className="flex bg-gray-100 dark:bg-[#3a3a3c] rounded-xl p-1">
              {["equal", "custom"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSplitTypeChange(type)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold
                              transition touch-manipulation select-none
                              ${newExpense.splitType === type
                                ? "bg-white dark:bg-[#2c2c2e] shadow-sm text-emerald-600"
                                : "text-gray-500 dark:text-gray-400"}`}
                >
                  {t(`gd.split_${type}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Custom splits */}
          {newExpense.splitType === "custom" && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                {t("gd.amount_per_member")}
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
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-gray-400">{t("gd.total")}</span>
                <span className={`font-semibold ${splitsMatch ? "text-emerald-600" : "text-red-500"}`}>
                  ₹{customTotal.toFixed(2)} / ₹{parseFloat(newExpense.amount || 0).toFixed(2)}
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
              {t("gd.add_expense_btn")}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowExpenseForm(false);
                setCustomSplits([]);
                setNewExpense({ description: "", amount: "", splitType: "equal", paidById: "", category: "other" });
                setError("");
              }}
              className="flex-1 h-12 bg-gray-100 dark:bg-[#3a3a3c]
                         active:bg-gray-200 dark:active:bg-[#48484a]
                         text-gray-700 dark:text-gray-200 font-semibold rounded-xl
                         transition touch-manipulation select-none"
            >
              {t("gd.cancel")}
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* ─────────── Member Profile Sheet ─────────── */}
      <BottomSheet
        open={!!memberProfile}
        onClose={() => setMemberProfile(null)}
        title={t("gd.member_profile")}
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
              if (dt.toDateString() === now.toDateString()) return `${t("gd.today_at")} ${time}`;
              const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
              if (dt.toDateString() === yesterday.toDateString()) return `${t("gd.yesterday_at")} ${time}`;
              return `${dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ${time}`;
            };

            return (
              <div className="flex flex-col items-center gap-4">
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
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{d.name}</p>
                  {d.profilePublic && d.username && (
                    <p className="text-sm text-emerald-600 font-medium mt-0.5">@{d.username}</p>
                  )}
                  <p className={`text-xs mt-1 ${d.isOnline ? "text-emerald-500" : "text-gray-400"}`}>
                    {d.isOnline ? t("gd.online") : d.lastSeen ? `${t("gd.last_seen")} ${formatLastSeen(d.lastSeen)}` : t("profile.offline")}
                  </p>
                </div>
                {d.profilePublic && d.bio && (
                  <div className="w-full bg-gray-50 dark:bg-[#3a3a3c] rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t("gd.bio")}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{d.bio}</p>
                  </div>
                )}
                {!d.profilePublic && (
                  <p className="text-sm text-gray-400 text-center">
                    {t("gd.private_profile")}
                  </p>
                )}
              </div>
            );
          })()
        ) : (
          <p className="text-center text-gray-400 text-sm py-8">{t("gd.could_not_load")}</p>
        )}
      </BottomSheet>

      {/* ─────────── Edit Expense Dialog ─────────── */}
      <Dialog
        open={!!editExpense}
        onClose={() => setEditExpense(null)}
        title={t("gd.edit_expense")}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              {t("gd.description")}
            </label>
            <input
              type="text"
              value={editForm.description}
              onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full h-11 bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200
                         dark:border-[#48484a] rounded-xl px-4 text-base
                         text-gray-900 dark:text-white focus:outline-none
                         focus:border-emerald-500 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              {t("gd.category")}
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setEditForm((p) => ({ ...p, category: cat.value }))}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm
                              font-medium transition touch-manipulation
                              ${editForm.category === cat.value
                                ? "bg-emerald-500 text-white"
                                : "bg-gray-100 dark:bg-[#3a3a3c] text-gray-600 dark:text-gray-300"}`}
                >
                  {cat.icon} {t(`cat.${cat.value}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleEditExpense}
              className="flex-1 h-11 bg-emerald-500 active:bg-emerald-600
                         text-white font-semibold rounded-xl transition touch-manipulation"
            >
              {t("gd.save")}
            </button>
            <button
              onClick={() => setEditExpense(null)}
              className="flex-1 h-11 bg-gray-100 dark:bg-[#3a3a3c] text-gray-700
                         dark:text-gray-200 font-semibold rounded-xl transition touch-manipulation"
            >
              {t("gd.cancel")}
            </button>
          </div>
        </div>
      </Dialog>

      {/* ─────────── Edit Group Bottom Sheet ─────────── */}
      <BottomSheet
        open={showEditGroup}
        onClose={() => setShowEditGroup(false)}
        title={t("gd.edit_group")}
      >
        <form onSubmit={handleEditGroup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              {t("gd.group_name")}
            </label>
            <input
              type="text"
              value={editGroupForm.name}
              onChange={(e) => setEditGroupForm((p) => ({ ...p, name: e.target.value }))}
              maxLength={100}
              required
              className="w-full h-12 bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200
                         dark:border-[#48484a] rounded-xl px-4 text-base
                         text-gray-900 dark:text-white placeholder-gray-400
                         focus:outline-none focus:border-emerald-500
                         focus:ring-2 focus:ring-emerald-500/20 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              {t("gd.group_desc")}{" "}
              <span className="text-gray-400 font-normal">{t("gd.group_desc_optional")}</span>
            </label>
            <input
              type="text"
              value={editGroupForm.description}
              onChange={(e) => setEditGroupForm((p) => ({ ...p, description: e.target.value }))}
              maxLength={300}
              className="w-full h-12 bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200
                         dark:border-[#48484a] rounded-xl px-4 text-base
                         text-gray-900 dark:text-white placeholder-gray-400
                         focus:outline-none focus:border-emerald-500
                         focus:ring-2 focus:ring-emerald-500/20 transition"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={editGroupSaving}
              className="flex-1 h-12 bg-emerald-500 active:bg-emerald-600
                         text-white font-semibold rounded-xl transition
                         touch-manipulation disabled:opacity-50"
            >
              {editGroupSaving ? "…" : t("gd.save_group")}
            </button>
            <button
              type="button"
              onClick={() => setShowEditGroup(false)}
              className="flex-1 h-12 bg-gray-100 dark:bg-[#3a3a3c]
                         text-gray-700 dark:text-gray-200 font-semibold rounded-xl
                         transition touch-manipulation"
            >
              {t("gd.cancel")}
            </button>
          </div>
        </form>
      </BottomSheet>

      {/* ─────────── Settle Up Dialog ─────────── */}
      <Dialog
        open={!!settleModal}
        onClose={() => { setSettleModal(null); setSettleAmount(""); setError(""); }}
        title={t("gd.settle_up_title")}
      >
        <p className="text-sm text-gray-400 mb-4">
          {t("gd.max_amount")}{" "}
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
                     text-gray-900 dark:text-white placeholder-gray-400
                     focus:outline-none focus:border-emerald-500
                     focus:ring-2 focus:ring-emerald-500/20 transition mb-3"
          placeholder={t("gd.enter_amount")}
        />
        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={handleSettle}
            className="flex-1 h-12 bg-emerald-500 active:bg-emerald-600
                       text-white font-semibold rounded-xl transition
                       touch-manipulation select-none"
          >
            {t("gd.send_request")}
          </button>
          <button
            onClick={() => { setSettleModal(null); setSettleAmount(""); setError(""); }}
            className="flex-1 h-12 bg-gray-100 active:bg-gray-200
                       text-gray-700 font-semibold rounded-xl transition
                       touch-manipulation select-none"
          >
            {t("gd.cancel")}
          </button>
        </div>
      </Dialog>

    </div>
  );
}

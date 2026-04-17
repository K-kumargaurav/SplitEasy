import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import MemberSearch from "../components/MemberSearch";
import socket from "../utils/socket";
import toast from "react-hot-toast";

/* ─────────────────────────────────────────
   Local UI components
───────────────────────────────────────── */

function Avatar({ name = "?", size = 40 }) {
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

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between px-4 mb-1">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {title}
      </span>
      {action}
    </div>
  );
}

function ListGroup({ children }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-sm">
      {children}
    </div>
  );
}

function BottomSheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sheet max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       bg-gray-100 text-gray-500 active:bg-gray-200 transition"
          >
            ✕
          </button>
        </div>
        <div className="p-5 pb-safe">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Floating glass pill bottom navigation
───────────────────────────────────────── */

const NAV_TABS = [
  {
    id: "groups",
    label: "Groups",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3
                 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15
                 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: "payments",
    label: "Payments",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2
                 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: "activity",
    label: "Activity",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0
                 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

function GlassPillNav({ active, onChange, badge }) {
  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center bg-white/80 backdrop-blur-2xl
                      border border-white/60 shadow-2xl rounded-full px-2 py-2 gap-1">
        {NAV_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex flex-col items-center justify-center gap-1
                        px-5 py-2.5 rounded-full transition-all duration-200
                        touch-manipulation select-none min-w-[72px]
                        ${active === tab.id
                          ? "bg-emerald-500 text-white shadow-md"
                          : "text-gray-400 active:bg-gray-100"}`}
          >
            {tab.icon}
            <span className="text-[10px] font-semibold leading-none">{tab.label}</span>

            {/* Badge (for payments tab) */}
            {tab.id === "payments" && badge > 0 && (
              <span className={`absolute top-1.5 right-2 w-4 h-4 rounded-full
                               text-[9px] font-bold flex items-center justify-center
                               ${active === "payments"
                                 ? "bg-white text-emerald-600"
                                 : "bg-red-500 text-white"}`}>
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────
   Dashboard Page
───────────────────────────────────────── */

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  /* ── Data ── */
  const [groups,             setGroups]             = useState([]);
  const [invites,            setInvites]            = useState([]);
  const [notifications,      setNotifications]      = useState([]);
  const [pendingSettlements, setPendingSettlements] = useState([]);
  const [activity,           setActivity]           = useState([]);
  const [debts,              setDebts]              = useState([]);

  /* ── UI state ── */
  const [loading,            setLoading]            = useState(true);
  const [activityLoading,    setActivityLoading]    = useState(false);
  const [debtsLoading,       setDebtsLoading]       = useState(false);
  const [activeView,         setActiveView]         = useState("groups");
  const [showCreateForm,     setShowCreateForm]     = useState(false);
  const [showNotifications,  setShowNotifications]  = useState(false);
  const [error,              setError]              = useState("");

  /* ── New group form ── */
  const [newGroup,        setNewGroup]        = useState({ name: "", description: "" });
  const [selectedMembers, setSelectedMembers] = useState([]);

  const notifRef = useRef(null);

  /* ─── Socket setup ─── */
  useEffect(() => {
    if (!user?._id) return;

    socket.emit("join", user._id);

    const onSettlementRequest = (data) =>
      toast(() => (
        <span className="cursor-pointer" onClick={() => navigate(`/groups/${data.groupId}`)}>
          💰 {data.message}
        </span>
      ));

    const onSettlementUpdate = (data) =>
      toast(data.status === "accepted" ? "✅ Settlement accepted" : "❌ Settlement rejected");

    const onNewInvite = () => {
      fetchInvites();
      toast("📩 New group invite received");
    };

    socket.on("settlement_request", onSettlementRequest);
    socket.on("settlement_update",  onSettlementUpdate);
    socket.on("new_invite",         onNewInvite);

    return () => {
      socket.off("settlement_request", onSettlementRequest);
      socket.off("settlement_update",  onSettlementUpdate);
      socket.off("new_invite",         onNewInvite);
      socket.disconnect();
    };
  }, [user?._id]);

  /* ─── Initial data fetch ─── */
  useEffect(() => {
    if (!user?._id) return;
    fetchGroups();
    fetchInvites();
    fetchNotifications();
    fetchPendingSettlements();
  }, [user]);

  /* ─── Fetch activity / debts on tab switch ─── */
  useEffect(() => {
    if (activeView === "activity" && activity.length === 0) fetchActivity();
    if (activeView === "payments" && debts.length === 0) fetchDebts();
  }, [activeView]);

  /* ─── Click-outside to close notifications ─── */
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))
        setShowNotifications(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ─────── API helpers ─────── */

  const fetchGroups = async () => {
    try {
      const { data } = await api.get("/groups");
      setGroups(data);
    } catch {
      setError("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const { data } = await api.get("/groups/invites/pending");
      setInvites(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/users/notifications");
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingSettlements = async () => {
    try {
      const { data } = await api.get("/settlements/pending");
      setPendingSettlements(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActivity = async () => {
    setActivityLoading(true);
    try {
      const { data } = await api.get("/users/activity");
      setActivity(data);
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchDebts = async () => {
    setDebtsLoading(true);
    try {
      const { data } = await api.get("/users/debts");
      setDebts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDebtsLoading(false);
    }
  };

  const handleInviteResponse = async (groupId, status) => {
    try {
      await api.put(`/groups/${groupId}/invite/respond`, { status });
      setInvites((prev) => prev.filter((i) => i.groupId !== groupId));
      if (status === "accepted") fetchGroups();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to respond");
    }
  };

  const handleSettlementResponse = async (settlementId, status) => {
    try {
      await api.put(`/settlements/${settlementId}/respond`, { status });
      setPendingSettlements((prev) => prev.filter((s) => s._id !== settlementId));
      toast.success(status === "accepted" ? "Settlement confirmed!" : "Settlement rejected");
      // Refresh debts since a settlement was accepted
      if (status === "accepted") fetchDebts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to respond");
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/groups", {
        ...newGroup,
        members: selectedMembers.map((m) => m._id),
      });
      setNewGroup({ name: "", description: "" });
      setSelectedMembers([]);
      setShowCreateForm(false);
      fetchGroups();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create group");
    }
  };

  const handleNotificationClick = async () => {
    setShowNotifications((v) => !v);
    const unread = notifications.filter((n) => !n.read).length;
    if (!showNotifications && unread > 0) {
      await api.put("/users/notifications/read");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const unreadCount  = notifications.filter((n) => !n.read).length;
  /* payments badge = pending settlements to confirm + active debts */
  const paymentsBadge = pendingSettlements.length + debts.length;

  /* ─────────────────────────────────────────
     Render helpers
  ───────────────────────────────────────── */

  const renderGroups = () => (
    <>
      {/* Settlement Requests */}
      {pendingSettlements.length > 0 && (
        <section>
          <SectionHeader title={`Settlement Requests (${pendingSettlements.length})`} />
          <ListGroup>
            {pendingSettlements.map((s) => (
              <div key={s._id} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={s.paidBy.name} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {s.paidBy.name} wants to pay you
                    </p>
                    <p className="text-xs text-gray-400 truncate">{s.group.name}</p>
                  </div>
                  <span className="text-base font-bold text-emerald-600 shrink-0">
                    ₹{s.amount / 100}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSettlementResponse(s._id, "accepted")}
                    className="flex-1 h-10 bg-emerald-500 active:bg-emerald-600
                               text-white text-sm font-semibold rounded-xl
                               transition touch-manipulation select-none"
                  >
                    Confirm ✓
                  </button>
                  <button
                    onClick={() => handleSettlementResponse(s._id, "rejected")}
                    className="flex-1 h-10 bg-gray-100 active:bg-gray-200
                               text-gray-700 text-sm font-semibold rounded-xl
                               transition touch-manipulation select-none"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </ListGroup>
        </section>
      )}

      {/* Pending Invites */}
      {invites.length > 0 && (
        <section>
          <SectionHeader title={`Invites (${invites.length})`} />
          <ListGroup>
            {invites.map((invite) => (
              <div key={invite.groupId} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100
                                  flex items-center justify-center text-lg shrink-0">
                    👥
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {invite.groupName}
                    </p>
                    <p className="text-xs text-gray-400">
                      from{" "}
                      <span className="text-emerald-600 font-medium">
                        {invite.invitedBy.name}
                      </span>
                    </p>
                    {invite.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {invite.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInviteResponse(invite.groupId, "accepted")}
                    className="flex-1 h-10 bg-emerald-500 active:bg-emerald-600
                               text-white text-sm font-semibold rounded-xl
                               transition touch-manipulation select-none"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleInviteResponse(invite.groupId, "rejected")}
                    className="flex-1 h-10 bg-gray-100 active:bg-gray-200
                               text-gray-700 text-sm font-semibold rounded-xl
                               transition touch-manipulation select-none"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </ListGroup>
        </section>
      )}

      {/* Groups list */}
      <section>
        <SectionHeader
          title="Your Groups"
          action={
            <button
              onClick={() => { setError(""); setShowCreateForm(true); }}
              className="text-sm text-emerald-600 font-semibold touch-manipulation select-none"
            >
              + New
            </button>
          }
        />

        {loading ? (
          <ListGroup>
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-100 rounded w-20" />
                </div>
              </div>
            ))}
          </ListGroup>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-gray-700 font-semibold text-base">No groups yet</p>
            <p className="text-gray-400 text-sm mt-1">Create one and start splitting</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 px-5 h-10 bg-emerald-500 active:bg-emerald-600
                         text-white text-sm font-semibold rounded-xl
                         transition touch-manipulation select-none"
            >
              + Create Group
            </button>
          </div>
        ) : (
          <ListGroup>
            {groups.map((group) => (
              <button
                key={group._id}
                onClick={() => navigate(`/groups/${group._id}`)}
                className="w-full flex items-center gap-3 px-4 py-3.5
                           active:bg-gray-50 transition text-left
                           touch-manipulation select-none"
              >
                <div className="w-11 h-11 rounded-full bg-emerald-100
                                flex items-center justify-center text-xl shrink-0">
                  👥
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-gray-900 truncate">
                    {group.name}
                  </p>
                  <p className="text-sm text-gray-400 truncate">
                    {group.description || `${group.members.length} members`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {group.description && (
                    <span className="text-xs text-gray-400">{group.members.length}</span>
                  )}
                  <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </ListGroup>
        )}
      </section>
    </>
  );

  /* ── Payments tab — what you owe + pending outgoing settlements ── */
  const renderPayments = () => (
    <>
      {debtsLoading ? (
        <ListGroup>
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-200 rounded w-40" />
                <div className="h-3 bg-gray-100 rounded w-24" />
              </div>
            </div>
          ))}
        </ListGroup>
      ) : debts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm py-20 text-center">
          <p className="text-5xl mb-3">🎉</p>
          <p className="text-gray-700 font-semibold text-base">All settled up!</p>
          <p className="text-gray-400 text-sm mt-1">You don't owe anyone right now</p>
        </div>
      ) : (
        <section>
          <SectionHeader title={`You Owe (${debts.length})`} />
          <ListGroup>
            {debts.map((debt, i) => (
              <button
                key={i}
                onClick={() => navigate(`/groups/${debt.groupId}`)}
                className="w-full flex items-center gap-3 px-4 py-3.5
                           active:bg-gray-50 transition text-left
                           touch-manipulation select-none"
              >
                <Avatar name={debt.owedToName} size={42} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {debt.owedToName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{debt.groupName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-base font-bold text-red-500">
                    ₹{debt.amount.toFixed(2)}
                  </span>
                  <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </ListGroup>
          <p className="text-center text-xs text-gray-400 mt-3">
            Tap a row to go to that group and settle up
          </p>
        </section>
      )}
    </>
  );

  /* ── Activity tab — full settlement history ── */
  const renderActivity = () => (
    <>
      {activityLoading ? (
        <ListGroup>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-200 rounded w-44" />
                <div className="h-3 bg-gray-100 rounded w-28" />
              </div>
              <div className="w-16 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </ListGroup>
      ) : activity.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm py-20 text-center">
          <p className="text-5xl mb-3">📭</p>
          <p className="text-gray-700 font-semibold text-base">No activity yet</p>
          <p className="text-gray-400 text-sm mt-1">Your settlement history will show here</p>
        </div>
      ) : (
        <section>
          <SectionHeader title="Recent Activity" />
          <ListGroup>
            {activity.map((s) => {
              const isSender   = s.paidBy._id === user?._id;
              const otherParty = isSender ? s.paidTo.name : s.paidBy.name;
              const statusColor =
                s.status === "accepted" ? "text-emerald-600 bg-emerald-50"
                : s.status === "rejected" ? "text-red-500 bg-red-50"
                : "text-amber-600 bg-amber-50";
              const statusLabel =
                s.status === "accepted" ? "Confirmed"
                : s.status === "rejected" ? "Rejected"
                : "Pending";

              return (
                <button
                  key={s._id}
                  onClick={() => navigate(`/groups/${s.group._id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3.5
                             active:bg-gray-50 transition text-left
                             touch-manipulation select-none"
                >
                  {/* Direction icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center
                                   shrink-0 text-lg
                                   ${isSender ? "bg-red-50" : "bg-emerald-50"}`}>
                    {isSender ? "↑" : "↓"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {isSender ? `You → ${otherParty}` : `${otherParty} → You`}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{s.group.name}</p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      {new Date(s.updatedAt).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-base font-bold ${isSender ? "text-red-500" : "text-emerald-600"}`}>
                      {isSender ? "-" : "+"}₹{s.amount.toFixed(2)}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </ListGroup>
        </section>
      )}
    </>
  );

  /* ─────────────────────────────────────────
     Render
  ───────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#efeff4]">

      {/* ── Sticky top bar ── */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur
                         border-b border-gray-200/60 shadow-sm">
        <div className="max-w-lg mx-auto h-14 px-4 flex items-center justify-between">

          <div className="flex items-center gap-2 select-none">
            <span className="text-xl">💸</span>
            <span className="text-lg font-bold text-gray-900 tracking-tight">SplitEasy</span>
          </div>

          <div className="flex items-center gap-1">

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleNotificationClick}
                className="relative w-10 h-10 flex items-center justify-center
                           rounded-full hover:bg-gray-100 active:bg-gray-200
                           transition touch-manipulation"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6
                           6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6
                           0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500
                                   text-white text-[10px] font-bold rounded-full
                                   flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl
                                shadow-xl border border-gray-100 overflow-hidden z-20">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm">Notifications</p>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">Nothing here yet</p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                      {notifications.map((n, i) => (
                        <div key={i} className={`px-4 py-3 ${!n.read ? "bg-emerald-50/60" : ""}`}>
                          <p className="text-sm text-gray-700">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User avatar → logout */}
            <button
              onClick={handleLogout}
              className="touch-manipulation select-none"
              title="Logout"
            >
              <Avatar name={user?.name} size={36} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <main className="max-w-lg mx-auto px-4 py-5 pb-36 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3
                          text-sm text-red-600 flex items-center gap-2">
            <span>⚠</span> {error}
          </div>
        )}

        {activeView === "groups"   && renderGroups()}
        {activeView === "payments" && renderPayments()}
        {activeView === "activity" && renderActivity()}
      </main>

      {/* ── Floating glass pill bottom nav ── */}
      <GlassPillNav
        active={activeView}
        onChange={setActiveView}
        badge={paymentsBadge}
      />

      {/* ── Create Group Bottom Sheet ── */}
      <BottomSheet
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Create Group"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3
                          text-sm text-red-600 mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              placeholder="e.g. Goa Trip, Monthly Rent…"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl
                         px-4 text-base focus:outline-none focus:border-emerald-500
                         focus:ring-2 focus:ring-emerald-500/20 transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Notes{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Purpose, dates, etc."
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl
                         px-4 text-base focus:outline-none focus:border-emerald-500
                         focus:ring-2 focus:ring-emerald-500/20 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              Invite Members
            </label>
            <MemberSearch
              onAdd={(u) => setSelectedMembers((prev) => [...prev, u])}
              existingMembers={selectedMembers}
            />

            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedMembers.map((member) => (
                  <span
                    key={member._id}
                    className="flex items-center gap-1.5 bg-emerald-50
                               border border-emerald-200 text-emerald-700
                               px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {member.name}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedMembers((prev) =>
                          prev.filter((m) => m._id !== member._id)
                        )
                      }
                      className="text-emerald-400 hover:text-red-500 transition
                                 leading-none touch-manipulation"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              className="flex-1 h-12 bg-emerald-500 active:bg-emerald-600
                         text-white font-semibold rounded-xl transition
                         touch-manipulation select-none"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="flex-1 h-12 bg-gray-100 active:bg-gray-200
                         text-gray-700 font-semibold rounded-xl transition
                         touch-manipulation select-none"
            >
              Cancel
            </button>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}

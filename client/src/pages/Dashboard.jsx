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

/** Circular avatar with initials, color derived from name */
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

/** Section label with optional right-side action */
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

/** Grouped list wrapper — white card with dividers between children */
function ListGroup({ children }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100 shadow-sm">
      {children}
    </div>
  );
}

/** Bottom sheet modal — slides up from bottom */
function BottomSheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
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
   Dashboard Page
───────────────────────────────────────── */

export default function Dashboard() {
  /* ── Auth ── */
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  /* ── Data ── */
  const [groups,             setGroups]             = useState([]);
  const [invites,            setInvites]            = useState([]);
  const [notifications,      setNotifications]      = useState([]);
  const [pendingSettlements, setPendingSettlements] = useState([]);

  /* ── UI state ── */
  const [loading,          setLoading]          = useState(true);
  const [showCreateForm,   setShowCreateForm]   = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [error,            setError]            = useState("");

  /* ── New group form ── */
  const [newGroup,         setNewGroup]         = useState({ name: "", description: "" });
  const [selectedMembers,  setSelectedMembers]  = useState([]);

  const notifRef = useRef(null);

  /* ─── Socket setup ─── */
  useEffect(() => {
    if (!user?._id) return;

    socket.emit("join", user._id);

    const onSettlementRequest = (data) =>
      toast(() => (
        <span
          className="cursor-pointer"
          onClick={() => navigate(`/groups/${data.groupId}`)}
        >
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ─────────────────────────────────────────
     Render
  ───────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#efeff4]">

      {/* ── Top navigation bar ── */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur
                         border-b border-gray-200/60 shadow-sm">
        <div className="max-w-lg mx-auto h-14 px-4 flex items-center justify-between">

          {/* Brand */}
          <div className="flex items-center gap-2 select-none">
            <span className="text-xl">💸</span>
            <span className="text-lg font-bold text-gray-900 tracking-tight">SplitEasy</span>
          </div>

          {/* Right actions */}
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

              {/* Notification dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl
                                shadow-xl border border-gray-100 overflow-hidden z-20">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm">Notifications</p>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">
                      Nothing here yet
                    </p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                      {notifications.map((n, i) => (
                        <div
                          key={i}
                          className={`px-4 py-3 ${!n.read ? "bg-emerald-50/60" : ""}`}
                        >
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

            {/* User avatar — taps to log out */}
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
      <main className="max-w-lg mx-auto px-4 py-5 pb-32 space-y-6">

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3
                          text-sm text-red-600 flex items-center gap-2">
            <span>⚠</span> {error}
          </div>
        )}

        {/* ── Settlement Requests ── */}
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

        {/* ── Pending Invites ── */}
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

        {/* ── Groups ── */}
        <section>
          <SectionHeader
            title="Your Groups"
            action={
              <button
                onClick={() => { setError(""); setShowCreateForm(true); }}
                className="text-sm text-emerald-600 font-semibold
                           touch-manipulation select-none"
              >
                + New
              </button>
            }
          />

          {loading ? (
            /* Skeleton placeholders */
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
              <p className="text-gray-400 text-sm mt-1">
                Create one and start splitting
              </p>
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
                  {/* Group icon */}
                  <div className="w-11 h-11 rounded-full bg-emerald-100
                                  flex items-center justify-center text-xl shrink-0">
                    👥
                  </div>

                  {/* Group info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-gray-900 truncate">
                      {group.name}
                    </p>
                    <p className="text-sm text-gray-400 truncate">
                      {group.description || `${group.members.length} members`}
                    </p>
                  </div>

                  {/* Member count + chevron */}
                  <div className="flex items-center gap-1 shrink-0">
                    {group.description && (
                      <span className="text-xs text-gray-400">
                        {group.members.length}
                      </span>
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
      </main>

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

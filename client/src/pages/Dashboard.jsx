import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../utils/api";
import MemberSearch from "../components/MemberSearch";
import socket from "../utils/socket";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

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
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400
                       uppercase tracking-wider">
        {title}
      </span>
      {action}
    </div>
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
                      max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4
                        border-b border-gray-100 dark:border-[#3a3a3c]">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
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

function GlassPillNav({ active, onChange, badge, user }) {
  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="flex items-center bg-white/80 dark:bg-[#2c2c2e]/85 backdrop-blur-2xl
                      border border-white/60 dark:border-[#3a3a3c]/60
                      shadow-2xl rounded-full px-2 py-2 gap-1">
        {NAV_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex flex-col items-center justify-center gap-1
                        px-5 py-2.5 rounded-full transition-all duration-200
                        touch-manipulation select-none min-w-[72px]
                        ${active === tab.id
                          ? "bg-emerald-500 text-white shadow-md"
                          : "text-gray-400 active:bg-gray-100 dark:active:bg-[#3a3a3c]"}`}
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

        {/* Profile tab */}
        <button
          onClick={() => onChange("profile")}
          className={`relative flex flex-col items-center justify-center gap-1
                      px-4 py-2 rounded-full transition-all duration-200
                      touch-manipulation select-none min-w-16
                      ${active === "profile"
                        ? "bg-emerald-500 text-white shadow-md"
                        : "text-gray-400 active:bg-gray-100 dark:active:bg-[#3a3a3c]"}`}
        >
          <Avatar name={user?.name || "?"} size={28} />
          <span className="text-[10px] font-semibold leading-none">Profile</span>
        </button>
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────
   Dashboard Page
───────────────────────────────────────── */

export default function Dashboard() {
  const { user, logout, updateUser } = useAuth();
  const { dark, toggle }  = useTheme();
  const navigate          = useNavigate();

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

  /* ── Profile tab state ── */
  const [profileData,        setProfileData]        = useState(null);
  const [profileLoading,     setProfileLoading]     = useState(false);
  const [editingBio,         setEditingBio]         = useState(false);
  const [bioText,            setBioText]            = useState("");
  const [profileSaving,      setProfileSaving]      = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm,       setPasswordForm]       = useState({ old: "", new: "", confirm: "" });
  const [showPw,             setShowPw]             = useState({ old: false, new: false, confirm: false });
  const [passwordSaving,     setPasswordSaving]     = useState(false);
  const [passwordError,      setPasswordError]      = useState("");
  const [passwordSuccess,    setPasswordSuccess]    = useState(false);
  const photoInputRef = useRef(null);

  const notifRef = useRef(null);

  /* ─── Socket setup ─── */
  useEffect(() => {
    if (!user?._id) return;

    socket.emit("join", user._id);

    const onSettlementRequest = (data) => {
      fetchPendingSettlements();
      toast(() => (
        <span className="cursor-pointer" onClick={() => navigate(`/groups/${data.groupId}`)}>
          💰 {data.message}
        </span>
      ));
    };

    const onSettlementUpdate = (data) => {
      fetchPendingSettlements();
      fetchDebts();
      toast(data.status === "accepted" ? "✅ Settlement accepted!" : "❌ Settlement rejected");
    };

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

  /* ─── Fetch activity / debts / profile on tab switch ─── */
  useEffect(() => {
    if (activeView === "activity" && activity.length === 0) fetchActivity();
    if (activeView === "payments" && debts.length === 0) fetchDebts();
    if (activeView === "profile"  && !profileData) fetchProfileData();
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

  const fetchProfileData = async () => {
    setProfileLoading(true);
    try {
      const { data } = await api.get("/users/profile");
      setProfileData(data);
      setBioText(data.bio || "");
    } catch (err) {
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10 MB"); return; }
    setProfileSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      formData.append("folder", "spliteasy/profiles");

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!res.ok) throw new Error("Cloudinary upload failed");
      const { secure_url } = await res.json();

      const { data } = await api.put("/users/profile", { profilePhoto: secure_url });
      setProfileData((p) => ({ ...p, profilePhoto: data.profilePhoto }));
      updateUser({ profilePhoto: data.profilePhoto });
      toast.success("Photo updated");
    } catch { toast.error("Failed to update photo"); }
    finally { setProfileSaving(false); }
  };

  const handleBioSave = async () => {
    setProfileSaving(true);
    try {
      const { data } = await api.put("/users/profile", { bio: bioText });
      setProfileData((p) => ({ ...p, bio: data.bio }));
      setEditingBio(false);
      toast.success("Bio saved");
    } catch { toast.error("Failed to save bio"); }
    finally { setProfileSaving(false); }
  };

  const handleOnlineToggle = async () => {
    const next = !profileData.isOnline;
    setProfileData((p) => ({ ...p, isOnline: next }));
    try {
      const { data } = await api.put("/users/profile", { isOnline: next });
      setProfileData((p) => ({ ...p, isOnline: data.isOnline, lastSeen: data.lastSeen }));
    } catch { setProfileData((p) => ({ ...p, isOnline: !next })); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError("New passwords don't match"); return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordError("Password must be at least 6 characters"); return;
    }
    setPasswordSaving(true);
    try {
      await api.put("/users/change-password", { oldPassword: passwordForm.old, newPassword: passwordForm.new });
      setPasswordSuccess(true);
      setPasswordForm({ old: "", new: "", confirm: "" });
      setTimeout(() => { setPasswordSuccess(false); setShowChangePassword(false); }, 2000);
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Failed to change password");
    } finally { setPasswordSaving(false); }
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
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
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
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
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
          <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-sm py-16 text-center">
            <p className="text-4xl mb-3">💸</p>
            <p className="text-gray-700 dark:text-gray-200 font-semibold text-base">No groups yet</p>
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
                  <p className="text-base font-medium text-gray-900 dark:text-white truncate">
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
        <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-sm py-20 text-center">
          <p className="text-5xl mb-3">🎉</p>
          <p className="text-gray-700 dark:text-gray-200 font-semibold text-base">All settled up!</p>
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
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
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
        <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-sm py-20 text-center">
          <p className="text-5xl mb-3">📭</p>
          <p className="text-gray-700 dark:text-gray-200 font-semibold text-base">No activity yet</p>
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
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {isSender ? `You → ${otherParty}` : `${otherParty} → You`}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{s.group.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
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

  /* ── Profile tab ── */
  const renderProfile = () => {
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

    const formatLastSeen = (ts) => {
      const d = new Date(ts);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
      if (isToday) return `Last seen today at ${time}`;
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return `Last seen yesterday at ${time}`;
      const date = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      return `Last seen ${date} at ${time}`;
    };

    const pd = profileData;
    const displayName = pd?.name || user?.name || "?";
    const COLORS = ["bg-emerald-500","bg-violet-500","bg-orange-500","bg-sky-500","bg-pink-500","bg-amber-500"];
    const color   = COLORS[displayName.charCodeAt(0) % COLORS.length];
    const initials = displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const countryFlag = COUNTRY_FLAGS[pd?.country] || COUNTRY_FLAGS[user?.country] || "";

    if (profileLoading) return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl h-52" />
        <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl h-32" />
        <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl h-16" />
      </div>
    );

    return (
      <section className="space-y-4">

        {/* ── Photo + name + username ── */}
        <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-sm p-6 flex flex-col items-center gap-3">

          {/* Photo */}
          <div className="relative">
            <button
              onClick={() => photoInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full overflow-hidden shrink-0
                         active:opacity-80 transition touch-manipulation"
              disabled={profileSaving}
            >
              {pd?.profilePhoto ? (
                <img src={pd.profilePhoto} alt="profile"
                     className="w-full h-full object-cover" />
              ) : (
                <div className={`${color} w-full h-full flex items-center justify-center
                                 text-white text-4xl font-bold select-none`}>
                  {initials}
                </div>
              )}
              {/* Camera overlay / upload spinner */}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center
                              opacity-0 hover:opacity-100 transition">
                {profileSaving ? (
                  <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0
                             011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0
                             01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
            </button>
            {/* Online dot */}
            <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2
                              border-white dark:border-[#2c2c2e]
                              ${pd?.isOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
            {/* Country flag */}
            {countryFlag && (
              <span className="absolute top-0 left-0 text-xl leading-none select-none"
                    title={pd?.country}>
                {countryFlag}
              </span>
            )}
            <input ref={photoInputRef} type="file" accept="image/*"
                   className="hidden" onChange={handlePhotoChange} />
          </div>

          <div className="text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{displayName}</p>
            {pd?.username && (
              <button
                onClick={() => { navigator.clipboard?.writeText(`@${pd.username}`); toast.success("Username copied!"); }}
                className="text-sm text-emerald-600 font-medium mt-0.5 touch-manipulation"
              >
                @{pd.username}
              </button>
            )}
            <p className="text-xs text-gray-400 mt-1">{pd?.email || user?.email}</p>
          </div>

          {/* Online / Offline toggle */}
          <button
            onClick={handleOnlineToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                        transition touch-manipulation border
                        ${pd?.isOnline
                          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"
                          : "bg-gray-100 dark:bg-[#3a3a3c] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#48484a]"}`}
          >
            <span className={`w-2 h-2 rounded-full ${pd?.isOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
            {pd?.isOnline ? "Online" : pd?.lastSeen ? formatLastSeen(pd.lastSeen) : "Offline"}
          </button>
        </div>

        {/* ── Bio ── */}
        <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-sm px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bio</span>
            {!editingBio && (
              <button onClick={() => { setEditingBio(true); setBioText(pd?.bio || ""); }}
                      className="text-xs text-emerald-600 font-semibold touch-manipulation">
                {pd?.bio ? "Edit" : "+ Add"}
              </button>
            )}
          </div>
          {editingBio ? (
            <div className="space-y-2">
              <textarea
                value={bioText}
                onChange={(e) => setBioText(e.target.value.slice(0, 150))}
                rows={3}
                placeholder="Tell people a bit about yourself…"
                className="w-full bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200
                           dark:border-[#48484a] rounded-xl px-3 py-2 text-sm
                           text-gray-900 dark:text-white placeholder-gray-400
                           resize-none focus:outline-none focus:border-emerald-500
                           focus:ring-2 focus:ring-emerald-500/20 transition"
              />
              <p className="text-xs text-gray-400 text-right">{bioText.length}/150</p>
              <div className="flex gap-2">
                <button onClick={handleBioSave} disabled={profileSaving}
                        className="flex-1 h-10 bg-emerald-500 active:bg-emerald-600 text-white
                                   text-sm font-semibold rounded-xl transition touch-manipulation
                                   disabled:opacity-50">
                  {profileSaving ? "Saving…" : "Save"}
                </button>
                <button onClick={() => setEditingBio(false)}
                        className="flex-1 h-10 bg-gray-100 dark:bg-[#3a3a3c] text-gray-700
                                   dark:text-gray-300 text-sm font-semibold rounded-xl
                                   transition touch-manipulation">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className={`text-sm ${pd?.bio ? "text-gray-700 dark:text-gray-200" : "text-gray-400 italic"}`}>
              {pd?.bio || "No bio yet"}
            </p>
          )}
        </div>

        {/* ── Privacy toggle ── */}
        <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-sm px-4 py-3.5
                        flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Public Profile</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {pd?.profilePublic
                ? "Others can see your photo, bio & username"
                : "Only your name is visible to others"}
            </p>
          </div>
          <button
            onClick={async () => {
              const next = !pd?.profilePublic;
              setProfileData((p) => ({ ...p, profilePublic: next }));
              try {
                await api.put("/users/profile", { profilePublic: next });
                toast.success(next ? "Profile made public" : "Profile set to private");
              } catch {
                setProfileData((p) => ({ ...p, profilePublic: !next }));
                toast.error("Failed to update privacy");
              }
            }}
            className={`relative w-12 h-6 rounded-full transition-colors touch-manipulation
                        ${pd?.profilePublic ? "bg-emerald-500" : "bg-gray-300 dark:bg-[#48484a]"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow
                              transition-transform ${pd?.profilePublic ? "translate-x-6" : ""}`} />
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-sm overflow-hidden
                        divide-y divide-gray-100 dark:divide-[#3a3a3c]">
          <button
            className="w-full flex items-center justify-between px-4 py-3.5
                       active:bg-gray-50 dark:active:bg-[#3a3a3c] transition touch-manipulation"
            onClick={() => setActiveView("groups")}
          >
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Groups joined</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-gray-900 dark:text-white">{groups.length}</span>
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Pending payments</span>
            <span className={`text-sm font-bold ${debts.length > 0 ? "text-red-500" : "text-emerald-600"}`}>
              {debts.length > 0 ? debts.length : "All clear ✓"}
            </span>
          </div>
        </div>

        {/* ── Change Password ── */}
        <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => { setShowChangePassword((v) => !v); setPasswordError(""); setPasswordSuccess(false); }}
            className="w-full flex items-center justify-between px-4 py-4
                       active:bg-gray-50 dark:active:bg-[#3a3a3c] transition touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/20
                              flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0
                           00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Change Password</span>
            </div>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${showChangePassword ? "rotate-90" : ""}`}
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {showChangePassword && (
            <form onSubmit={handleChangePassword} className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-[#3a3a3c] pt-3">
              {passwordError && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-xl">
                  Password changed successfully ✓
                </p>
              )}
              {[
                { key: "old",     label: "Current Password",  auto: "current-password" },
                { key: "new",     label: "New Password",      auto: "new-password" },
                { key: "confirm", label: "Confirm Password",  auto: "new-password" },
              ].map(({ key, label, auto }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                  <div className="relative">
                    <input
                      type={showPw[key] ? "text" : "password"}
                      value={passwordForm[key]}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, [key]: e.target.value }))}
                      autoComplete={auto}
                      required
                      className="w-full h-11 bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200
                                 dark:border-[#48484a] rounded-xl px-4 pr-11 text-sm
                                 text-gray-900 dark:text-white placeholder-gray-400
                                 focus:outline-none focus:border-emerald-500
                                 focus:ring-2 focus:ring-emerald-500/20 transition"
                    />
                    <button type="button"
                            onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                                       hover:text-gray-600 dark:hover:text-gray-300 transition p-1">
                      {showPw[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}
              <button type="submit" disabled={passwordSaving}
                      className="w-full h-11 bg-emerald-500 active:bg-emerald-600 text-white
                                 text-sm font-semibold rounded-xl transition touch-manipulation
                                 disabled:opacity-50 mt-1">
                {passwordSaving ? "Changing…" : "Change Password"}
              </button>
            </form>
          )}
        </div>

        {/* ── Sign out ── */}
        <button
          onClick={handleLogout}
          className="w-full h-12 bg-red-50 dark:bg-red-900/20 active:bg-red-100
                     dark:active:bg-red-900/30 text-red-600 dark:text-red-400
                     font-semibold rounded-2xl transition touch-manipulation select-none"
        >
          Sign Out
        </button>

      </section>
    );
  };

  /* ─────────────────────────────────────────
     Render
  ───────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#efeff4] dark:bg-[#1c1c1e]">

      {/* ── Sticky top bar ── */}
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-[#1c1c1e]/90
                         backdrop-blur border-b border-gray-200/60
                         dark:border-[#3a3a3c]/60 shadow-sm">
        <div className="max-w-lg mx-auto h-14 px-4 flex items-center justify-between">

          <div className="flex items-center gap-2 select-none">
            <span className="text-xl">💸</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              SplitEasy
            </span>
          </div>

          <div className="flex items-center gap-1">

            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="w-10 h-10 flex items-center justify-center rounded-full
                         hover:bg-gray-100 dark:hover:bg-[#3a3a3c]
                         active:bg-gray-200 dark:active:bg-[#48484a]
                         transition touch-manipulation"
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
                <div className="absolute right-0 top-12 w-80 bg-white dark:bg-[#2c2c2e]
                                rounded-2xl shadow-xl border border-gray-100
                                dark:border-[#3a3a3c] overflow-hidden z-20">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-[#3a3a3c]">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      Notifications
                    </p>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">Nothing here yet</p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50
                                    dark:divide-[#3a3a3c]">
                      {notifications.map((n, i) => (
                        <div key={i} className={`px-4 py-3
                          ${!n.read ? "bg-emerald-50/60 dark:bg-emerald-900/10" : ""}`}>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {n.message}
                          </p>
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

          </div>
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <main className="max-w-lg mx-auto px-4 py-5 pb-36 space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200
                          dark:border-red-800/30 rounded-xl px-4 py-3
                          text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <span>⚠</span> {error}
          </div>
        )}

        {activeView === "groups"   && renderGroups()}
        {activeView === "payments" && renderPayments()}
        {activeView === "activity" && renderActivity()}
        {activeView === "profile"  && renderProfile()}
      </main>

      {/* ── Floating glass pill bottom nav ── */}
      <GlassPillNav
        active={activeView}
        onChange={setActiveView}
        badge={paymentsBadge}
        user={user}
      />

      {/* ── Create Group Bottom Sheet ── */}
      <BottomSheet
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Create Group"
      >
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200
                          dark:border-red-800/30 rounded-xl px-4 py-3
                          text-sm text-red-600 dark:text-red-400 mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              placeholder="e.g. Goa Trip, Monthly Rent…"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              className="w-full h-12 bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200
                         dark:border-[#48484a] rounded-xl px-4 text-base
                         text-gray-900 dark:text-white placeholder-gray-400
                         dark:placeholder-gray-500
                         focus:outline-none focus:border-emerald-500
                         focus:ring-2 focus:ring-emerald-500/20 transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Notes{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="Purpose, dates, etc."
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              className="w-full h-12 bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200
                         dark:border-[#48484a] rounded-xl px-4 text-base
                         text-gray-900 dark:text-white placeholder-gray-400
                         dark:placeholder-gray-500
                         focus:outline-none focus:border-emerald-500
                         focus:ring-2 focus:ring-emerald-500/20 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
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
    </div>
  );
}

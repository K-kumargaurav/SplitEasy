import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import MemberSearch from "../components/MemberSearch";

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("expenses");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    splitType: "equal",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    try {
      const [groupRes, expensesRes, balancesRes] = await Promise.all([
        api.get(`/groups/${id}`),
        api.get(`/groups/${id}/expenses`),
        api.get(`/groups/${id}/balances`),
      ]);
      setGroup(groupRes.data);
      setExpenses(expensesRes.data);
      setBalances(balancesRes.data);
    } catch (err) {
      setError("Failed to load group data");
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (user) => {
    try {
      await api.post(`/groups/${id}/invite`, { userId: user._id });
      setInviteSuccess(`Invite sent to ${user.name}!`);
      setShowAddMember(false);
      setTimeout(() => setInviteSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send invite");
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/groups/${id}/expenses`, {
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        splitType: newExpense.splitType,
      });
      setNewExpense({ description: "", amount: "", splitType: "equal" });
      setShowExpenseForm(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add expense");
    }
  };

  const getMemberName = (userId) => {
    const member = group?.members.find((m) => m._id === userId);
    return member ? member.name : userId;
  };

  const handleSettle = async (balance) => {
    try {
      await api.post(`/groups/${id}/settle`, {
        paidToId: balance.owedTo,
        amount: balance.amount,
      });
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to settle");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold text-green-600">{group?.name}</h1>
        </div>
        <span className="text-gray-500 text-sm">
          {group?.members.length} members
        </span>
      </nav>

      {/* Members */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <p className="bg-red-100 text-red-600 p-3 rounded-lg mb-4">{error}</p>
        )}

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-gray-600">
              Members ({group?.members.length})
            </span>
            {group?.createdBy._id === user?.id && (
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                className="text-green-600 text-sm font-medium hover:underline"
              >
                + Invite Member
              </button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {group?.members.map((member) => (
              <span
                key={member._id}
                className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium"
              >
                {member.name} {member._id === user?.id ? "(You)" : ""}
              </span>
            ))}
          </div>

          {inviteSuccess && (
            <p className="text-green-600 text-sm mt-2">{inviteSuccess}</p>
          )}

          {showAddMember && (
            <div className="mt-3">
              <MemberSearch
                onAdd={handleSendInvite}
                existingMembers={group?.members}
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {["expenses", "balances"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-medium capitalize transition ${
                activeTab === tab
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Expenses Tab */}
        {activeTab === "expenses" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Expenses</h2>
              <button
                onClick={() => setShowExpenseForm(!showExpenseForm)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                + Add Expense
              </button>
            </div>

            {/* Add Expense Form */}
            {showExpenseForm && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      placeholder="Hotel booking"
                      value={newExpense.description}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          description: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="2000"
                      value={newExpense.amount}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, amount: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Split Type
                    </label>
                    <select
                      value={newExpense.splitType}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          splitType: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="equal">Equal Split</option>
                      <option value="custom">Custom Split</option>
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowExpenseForm(false)}
                      className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Expenses List */}
            {expenses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No expenses yet!</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {expenses.map((expense) => (
                  <div
                    key={expense._id}
                    className="bg-white rounded-xl shadow-sm p-5"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {expense.description}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Paid by{" "}
                          <span className="text-green-600 font-medium">
                            {expense.paidBy.name}
                          </span>
                        </p>
                      </div>
                      <span className="text-lg font-bold text-gray-800">
                        ₹{expense.amount}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {expense.splitBetween.map((split) => (
                        <span
                          key={split._id}
                          className={`text-xs px-2 py-1 rounded-full ${
                            split.paid
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {split.user.name}: ₹{split.share}{" "}
                          {split.paid ? "✓" : "✗"}
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
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Balances
            </h2>
            {balances.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <p className="text-green-600 text-lg font-medium">
                  🎉 All settled up!
                </p>
                <p className="text-gray-400 mt-1">No pending balances</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {balances.map((balance, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl shadow-sm p-5 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        <span className="text-red-500">
                          {getMemberName(balance.owedBy)}
                        </span>
                        {" owes "}
                        <span className="text-green-600">
                          {getMemberName(balance.owedTo)}
                        </span>
                      </p>
                      <p className="text-2xl font-bold text-gray-800 mt-1">
                        ₹{balance.amount}
                      </p>
                    </div>
                    {balance.owedBy === user?.id && (
                      <button
                        onClick={() => handleSettle(balance)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                      >
                        Settle Up
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

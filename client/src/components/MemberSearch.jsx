import { useState, useRef } from "react";
import api from "../utils/api";

export default function MemberSearch({ onAdd, existingMembers = [] }) {
  const debounceRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (value) => {
    setQuery(value);
    if (value.length < 3) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/users/search?email=${value}`);
        const filtered = res.data.filter(
          (u) => !existingMembers.find((m) => m._id === u._id || m === u._id),
        );
        setResults(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleAdd = (user) => {
    onAdd(user);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by email..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full border border-gray-200 bg-gray-50 rounded-xl pl-9 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-sm"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        )}
      </div>

      {results.length > 0 && (
        <div className="absolute z-10 w-full bg-white border border-gray-100 rounded-2xl shadow-xl mt-2 overflow-hidden">
          {results.map((user) => (
            <button
              key={user._id}
              type="button"
              onClick={() => handleAdd(user)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left"
            >
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {user.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{user.name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              <span className="text-emerald-600 text-sm font-semibold shrink-0">+ Add</span>
            </button>
          ))}
        </div>
      )}

      {query.length >= 3 && !loading && results.length === 0 && (
        <p className="text-sm text-gray-400 mt-2 pl-1">No users found</p>
      )}
    </div>
  );
}

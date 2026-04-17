import { useState, useRef } from "react";
import api from "../utils/api";

export default function MemberSearch({ onAdd, existingMembers = [] }) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef(null);

  const handleSearch = (value) => {
    setQuery(value);

    if (value.length < 3) {
      setResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/users/search?email=${value}`);
        const filtered = data.filter(
          (u) => !existingMembers.find((m) => m._id === u._id || m === u._id)
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
      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4
                     text-gray-400 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>

        <input
          type="text"
          placeholder="Search by email…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full h-11 bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200
                     dark:border-[#48484a] rounded-xl pl-9 pr-10 text-sm
                     text-gray-900 dark:text-white placeholder-gray-400
                     dark:placeholder-gray-500
                     focus:outline-none focus:border-emerald-500
                     focus:ring-2 focus:ring-emerald-500/20 transition"
        />

        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2
                          w-4 h-4 rounded-full border-2 border-emerald-500
                          border-t-transparent animate-spin" />
        )}
      </div>

      {query.length > 0 && query.length < 3 && (
        <p className="text-xs text-gray-400 mt-1.5 pl-1">Type at least 3 characters</p>
      )}

      {query.length >= 3 && !loading && results.length === 0 && (
        <p className="text-xs text-gray-400 mt-1.5 pl-1">No users found</p>
      )}

      {results.length > 0 && (
        <div className="absolute z-10 w-full mt-1.5 bg-white dark:bg-[#2c2c2e]
                        border border-gray-100 dark:border-[#3a3a3c]
                        rounded-2xl shadow-xl overflow-hidden">
          {results.map((user) => (
            <button
              key={user._id}
              type="button"
              onClick={() => handleAdd(user)}
              className="w-full flex items-center gap-3 px-4 py-3
                         hover:bg-gray-50 dark:hover:bg-[#3a3a3c]
                         active:bg-gray-100 dark:active:bg-[#48484a]
                         transition text-left touch-manipulation"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center
                              justify-center text-white text-sm font-bold shrink-0
                              select-none">
                {user.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              <span className="text-emerald-600 text-sm font-semibold shrink-0">
                + Add
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

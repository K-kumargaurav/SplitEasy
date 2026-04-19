import { useState } from "react";

function evalExpr(raw) {
  const s = raw
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
  if (!/^[\d\s+\-*/().]+$/.test(s)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const r = new Function(`return (${s})`)();
    return Number.isFinite(r) && r >= 0 ? parseFloat(r.toFixed(2)) : null;
  } catch {
    return null;
  }
}

// Returns formatted display string for a number
function fmt(n) {
  if (n === null || n === undefined) return null;
  const s = String(n);
  // Add thousands separators only if no decimal in progress
  if (!s.includes(".") && s.length > 3) {
    return parseFloat(s).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  return s;
}

const KEYS = [
  { k: "C",   col: 1, row: 1 },
  { k: "⌫",   col: 2, row: 1 },
  { k: "%",   col: 3, row: 1 },
  { k: "÷",   col: 4, row: 1 },
  { k: "7",   col: 1, row: 2 },
  { k: "8",   col: 2, row: 2 },
  { k: "9",   col: 3, row: 2 },
  { k: "×",   col: 4, row: 2 },
  { k: "4",   col: 1, row: 3 },
  { k: "5",   col: 2, row: 3 },
  { k: "6",   col: 3, row: 3 },
  { k: "−",   col: 4, row: 3 },
  { k: "1",   col: 1, row: 4 },
  { k: "2",   col: 2, row: 4 },
  { k: "3",   col: 3, row: 4 },
  { k: "+",   col: 4, row: 4 },
  { k: "0",   col: 1, row: 5, colSpan: 2 },
  { k: ".",   col: 3, row: 5 },
  { k: "=",   col: 4, row: 5 },
];

function btnClass(k) {
  if (k === "=")
    return "bg-emerald-500 active:bg-emerald-600 text-white text-2xl font-bold shadow-sm shadow-emerald-200 dark:shadow-emerald-900";
  if (["+", "−", "×", "÷"].includes(k))
    return "bg-amber-50 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 text-xl font-bold border border-amber-100 dark:border-amber-900/40";
  if (k === "%")
    return "bg-blue-50 dark:bg-blue-950/60 text-blue-500 dark:text-blue-400 text-lg font-bold border border-blue-100 dark:border-blue-900/40";
  if (k === "C")
    return "bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 text-lg font-bold border border-red-100 dark:border-red-900/30";
  if (k === "⌫")
    return "bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 text-xl font-bold border border-red-100 dark:border-red-900/30";
  return "bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white text-xl font-semibold border border-gray-100 dark:border-[#3a3a3c]";
}

export default function CalcInput({ value, onChange, placeholder = "0.00" }) {
  const [open,    setOpen]    = useState(false);
  const [expr,    setExpr]    = useState("");
  const [flash,   setFlash]   = useState(false); // result flash animation

  const hasOp   = /[+\-×÷%]/.test(expr);
  const lastNum = expr.split(/[+\-×÷]/).pop() ?? "";

  // Live result — only shown when expression has an operator
  const liveResult = hasOp ? evalExpr(expr) : null;

  const press = (key) => {
    switch (key) {
      case "C":
        setExpr("");
        onChange("");
        return;
      case "⌫":
        setExpr((p) => p.slice(0, -1));
        return;
      case "=": {
        const result = hasOp
          ? evalExpr(expr)
          : expr ? parseFloat(expr) : null;
        if (result !== null) {
          const s = String(result);
          setExpr(s);
          onChange(s);
          // Brief flash to confirm
          setFlash(true);
          setTimeout(() => setFlash(false), 300);
        }
        setTimeout(() => setOpen(false), 160);
        return;
      }
      case "+":
      case "−":
      case "×":
      case "÷":
        if (!expr || /[+\-×÷]$/.test(expr)) return;
        setExpr((p) => p + key);
        return;
      case "%":
        if (!expr || /[+\-×÷%]$/.test(expr)) return;
        setExpr((p) => p + "%");
        return;
      case ".":
        if (lastNum.includes(".")) return;
        setExpr((p) => (p === "" ? "0." : p + "."));
        return;
      default:
        setExpr((p) => p + key);
    }
  };

  const handleOpen = () => {
    setExpr(value || "");
    setFlash(false);
    setOpen(true);
  };

  const handleClose = () => {
    // If no operator, commit whatever was typed
    if (!hasOp && expr) onChange(expr);
    setOpen(false);
  };

  // What to show in the large display area
  const displayMain  = expr || "0";
  const displaySmall = hasOp ? expr : null;

  return (
    <>
      {/* Input row */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-12 bg-gray-50 dark:bg-[#3a3a3c] border border-gray-200
                     dark:border-[#48484a] rounded-xl px-4 text-base
                     text-gray-900 dark:text-white placeholder-gray-400
                     focus:outline-none focus:border-emerald-500
                     focus:ring-2 focus:ring-emerald-500/20 transition"
        />
        <button
          type="button"
          onClick={handleOpen}
          title="Calculator"
          className="h-12 w-12 shrink-0 flex items-center justify-center
                     bg-gray-100 dark:bg-[#3a3a3c] border border-gray-200
                     dark:border-[#48484a] rounded-xl text-gray-500 dark:text-gray-400
                     active:bg-gray-200 dark:active:bg-[#48484a] transition
                     touch-manipulation select-none"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth={1.8} className="w-5 h-5">
            <rect x="4" y="2" width="16" height="20" rx="2"/>
            <line x1="8"  y1="7"  x2="16" y2="7"/>
            <line x1="8"  y1="11" x2="10" y2="11"/>
            <line x1="12" y1="11" x2="14" y2="11"/>
            <line x1="16" y1="11" x2="16" y2="11" strokeLinecap="round" strokeWidth={2}/>
            <line x1="8"  y1="15" x2="10" y2="15"/>
            <line x1="12" y1="15" x2="14" y2="15"/>
            <line x1="16" y1="15" x2="16" y2="17" strokeLinecap="round"/>
            <line x1="14" y1="16" x2="18" y2="16" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Calculator sheet */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm"
          onPointerDown={handleClose}
        >
          <div
            className="bg-[#f2f2f7] dark:bg-[#1c1c1e] rounded-t-3xl shadow-2xl px-3 pt-3"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-9 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />

            {/* Display card */}
            <div className={`rounded-2xl px-5 py-4 mb-3 text-right transition-colors
                            ${flash
                              ? "bg-emerald-50 dark:bg-emerald-900/30"
                              : "bg-white dark:bg-[#2c2c2e]"}`}>

              {/* Expression line */}
              <p className="text-sm text-gray-400 dark:text-gray-500 font-mono truncate min-h-5 leading-5">
                {displaySmall || "\u00A0"}
              </p>

              {/* Main number */}
              <p className={`font-mono font-bold leading-tight mt-0.5 transition-all
                             ${liveResult !== null ? "text-2xl text-gray-400 dark:text-gray-500" : "text-4xl text-gray-900 dark:text-white"}`}>
                {displayMain}
              </p>

              {/* Live result preview */}
              {liveResult !== null && (
                <p className="text-4xl font-bold font-mono text-emerald-500 dark:text-emerald-400 mt-0.5 leading-tight">
                  = {fmt(liveResult) ?? liveResult}
                </p>
              )}

              {/* "pending" indicator when expression is incomplete */}
              {hasOp && liveResult === null && (
                <p className="text-4xl font-bold font-mono text-gray-300 dark:text-gray-600 mt-0.5 leading-tight">
                  …
                </p>
              )}
            </div>

            {/* Keypad */}
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: "repeat(4, 1fr)",
                gridTemplateRows:    "repeat(5, 3.5rem)",
              }}
            >
              {KEYS.map(({ k, col, row, colSpan = 1, rowSpan = 1 }) => (
                <button
                  key={k}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    press(k);
                  }}
                  style={{
                    gridColumn: colSpan > 1 ? `${col} / span ${colSpan}` : col,
                    gridRow:    rowSpan > 1 ? `${row} / span ${rowSpan}` : row,
                  }}
                  className={`rounded-2xl select-none active:scale-95 transition-transform ${btnClass(k)}`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

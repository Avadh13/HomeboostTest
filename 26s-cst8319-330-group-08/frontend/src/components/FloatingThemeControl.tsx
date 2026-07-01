import { useState } from "react";
import { useTheme, type ThemePreference } from "./ThemeProvider";

const options: Array<{ value: ThemePreference; label: string; icon: string }> = [
  { value: "auto", label: "Auto", icon: "◐" },
  { value: "light", label: "Light", icon: "☼" },
  { value: "dark", label: "Dark", icon: "☾" },
  { value: "soft", label: "Soft", icon: "✦" },
];

function FloatingThemeControl() {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-24 left-4 z-50 md:bottom-5">
      {open && (
        <div className="mb-2 w-48 rounded-3xl border border-white/70 bg-white/95 p-2 shadow-2xl shadow-slate-900/20 backdrop-blur-xl">
          <p className="px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Theme preference</p>
          <div className="grid gap-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setPreference(option.value);
                  setOpen(false);
                }}
                className={`flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-black transition ${preference === option.value ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
              >
                <span className="flex items-center gap-2"><span>{option.icon}</span>{option.label}</span>
                {preference === option.value && <span>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-lg font-black text-white shadow-2xl shadow-slate-900/30 ring-1 ring-white/20 transition hover:-translate-y-0.5"
        title={`Theme: ${preference} (${resolvedTheme})`}
      >
        {resolvedTheme === "dark" ? "☾" : resolvedTheme === "soft" ? "✦" : "☼"}
      </button>
    </div>
  );
}

export default FloatingThemeControl;

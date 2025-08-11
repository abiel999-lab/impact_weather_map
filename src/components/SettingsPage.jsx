export default function SettingsPage({ dark, setDark }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 max-w-xl mt-4">
      <div className="font-semibold mb-2">Theme</div>
      <div className="inline-flex rounded-2xl overflow-hidden border border-[#ac94d8] bg-white dark:bg-slate-900">
        <button
          onClick={() => setDark(false)}
          className={`px-4 py-2 text-sm ${!dark ? "bg-[#ac94d8] text-white" : "text-[#ac94d8] hover:bg-[#ac94d8]/10"}`}
          style={{ borderRight: "1px solid #ac94d8" }}
        >
          Light
        </button>
        <button
          onClick={() => setDark(true)}
          className={`px-4 py-2 text-sm ${dark ? "bg-[#ac94d8] text-white" : "text-[#ac94d8] hover:bg-[#ac94d8]/10"}`}
        >
          Dark
        </button>
      </div>
    </div>
  );
}

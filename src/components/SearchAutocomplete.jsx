// ===== src/components/SearchAutocomplete.jsx =====
import { useEffect, useMemo, useRef, useState } from "react";
import { searchCity } from "../lib/openmeteo";
import useDebounce from "../hooks/useDebounce";

export default function SearchAutocomplete({
  value,
  onChange,
  onPick,
  inputId = "global-search",
  placeholder = "",
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1); // index item ter-highlight
  const debounced = useDebounce(value, 350);

  const wrapRef = useRef(null);
  const listId = `${inputId}-listbox`;

  // Query ke geocoding (debounced)
  useEffect(() => {
    if (!debounced || debounced.trim().length < 2) {
      setItems([]);
      setActive(-1);
      return;
    }
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const hint = debounced.match(/,\s*([A-Za-z]{2})$/);
        const results = await searchCity(
          debounced,
          hint ? { country: hint[1].toUpperCase() } : undefined
        );
        if (!alive) return;
        setItems(results.slice(0, 8));
        setOpen(true);
        setActive(results.length ? 0 : -1);
      } catch {
        if (alive) {
          setItems([]);
          setActive(-1);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [debounced]);

  // Klik di luar -> tutup
  useEffect(() => {
    const onClickOutside = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) {
        setOpen(false);
        setActive(-1);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const show = open && (loading || items.length > 0);

  // id unik fallback bila item.id tidak ada
  const keyOf = (it, idx) =>
    it.id ?? `${it.lat ?? ""},${it.lon ?? ""}-${idx}`;

  const pick = (it) => {
    onPick?.(it);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className="relative w-full" ref={wrapRef}>
      <input
        id={inputId}
        aria-label={placeholder || "Search"}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          active >= 0 && items[active] ? `${listId}-opt-${active}` : undefined
        }
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!items.length) return;
            setOpen(true);
            setActive((i) => (i + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!items.length) return;
            setOpen(true);
            setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
          } else if (e.key === "Enter") {
            if (show) {
              e.preventDefault();
              const sel =
                active >= 0 && items[active] ? items[active] : items[0];
              if (sel) pick(sel);
            }
          } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            setActive(-1);
            onChange("");
            // optional: e.currentTarget.blur();
          }
        }}
        placeholder={placeholder || "Search"}
        autoComplete="off"
        className="w-full border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2 text-sm bg-white dark:bg-slate-900"
      />

      {show && (
        <div
          className="absolute left-0 right-0 top-[110%] z-30 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow"
          role="listbox"
          id={listId}
        >
          {loading && (
            <div className="px-3 py-2 text-xs opacity-60">Mencari…</div>
          )}
          {!loading && items.length === 0 && (
            <div className="px-3 py-2 text-xs opacity-60">Tidak ada hasil</div>
          )}

          <ul className="max-h-64 overflow-auto">
            {items.map((it, idx) => {
              const isActive = idx === active;
              return (
                <li key={keyOf(it, idx)}>
                  <button
                    id={`${listId}-opt-${idx}`}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActive(idx)}
                    onMouseDown={(e) => e.preventDefault()} // cegah blur sebelum click
                    onClick={() => pick(it)}
                    className={[
                      "w-full text-left px-3 py-2 text-sm",
                      isActive
                        ? "bg-[#ac94d8]/20"
                        : "hover:bg-[#ac94d8]/10",
                    ].join(" ")}
                  >
                    {it.display}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

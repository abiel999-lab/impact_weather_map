export function fmtDate(d, lang = "id") {
  return new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(d);
}

export function fmtTime(d, lang = "id", hour24 = true) {
  return new Intl.DateTimeFormat(lang, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !hour24,
  }).format(d);
}

export function fmtDateTime(d, lang = "id", hour24 = true) {
  return `${fmtDate(d, lang)} ${fmtTime(d, lang, hour24)}`;
}

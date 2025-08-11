export async function ensurePermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const r = await Notification.requestPermission();
  return r === "granted";
}

export async function notify(title, body, tag = "impact-weather") {
  const ok = await ensurePermission();
  if (!ok) return false;
  new Notification(title, { body, tag });
  return true;
}

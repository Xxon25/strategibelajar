export function todayJakarta(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

export function fmtDate(iso: string | null | undefined, add = 0): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + add));
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('id-ID', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function monthInfo(days: string[]) {
  const today = todayJakarta();
  const [y, m, td] = today.split('-').map(Number);
  const first = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const prefix = today.slice(0, 8);
  const on = new Set(days.filter((d) => d.startsWith(prefix)).map((d) => Number(d.slice(8))));
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('id-ID', { timeZone: 'UTC', month: 'long', year: 'numeric' });
  return { label, first, count, today: td, on, n: on.size };
}

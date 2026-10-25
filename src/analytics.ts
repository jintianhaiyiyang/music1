export type RawRow = Record<string, unknown>;
export type Track = { id: string; name: string; artists: string[]; album: string; seconds: number | null; added: string | null; url: string; release: string | null; explicit: boolean | null; popularity: number | null; raw: RawRow };
export const COLORS = ['#285844', '#82a67b', '#d4a068', '#a29cc5', '#7198a5', '#cd8c83'];
export function duration(value: unknown, milliseconds = false): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value.getUTCHours() * 3600 + value.getUTCMinutes() * 60 + value.getUTCSeconds();
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? (milliseconds ? value / 1000 : value < 1 ? Math.round(value * 86400) : value) : null;
  const str = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(str)) return duration(Number(str), milliseconds);
  if (!/^\d+:\d{1,2}(:\d{1,2})?$/.test(str)) return null;
  const parts = str.split(':').map(Number);
  if (parts.slice(1).some(v => v >= 60)) return null;
  const seconds = parts.reduce((s, n) => s * 60 + n, 0);
  return seconds > 0 ? seconds : null;
}
export function isoDate(value: unknown): string | null {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value === 'number') return value > 20000 && value < 100000 ? isoDate(new Date(Date.UTC(1899, 11, 30) + Math.round(value * 86400000))) : null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : null;
  const m = String(value).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:$|[T\s])/);
  if (!m) return null;
  const date = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return date.getUTCFullYear() === +m[1] && date.getUTCMonth() === +m[2] - 1 && date.getUTCDate() === +m[3] ? date.toISOString().slice(0, 10) : null;
}
const key = (s: string) => s.toLowerCase().replace(/[\s_\-（）()]/g, '');
function get(row: RawRow, aliases: string[]): unknown {
  const keys = Object.keys(row);
  for (const alias of aliases) { const found = keys.find(k => key(k) === key(alias)); if (found && row[found] !== '' && row[found] != null) return row[found]; }
  return null;
}
const str = (v: unknown) => v == null ? '' : String(v).trim();
const boolean = (v: unknown) => v === null ? null : /^(true|1|yes|是)$/i.test(str(v)) ? true : /^(false|0|no|否)$/i.test(str(v)) ? false : null;
export function normalize(rows: RawRow[]): { tracks: Track[]; skipped: number } {
  let skipped = 0;
  const tracks: Track[] = [];
  rows.forEach((source, index) => {
    const nested = source.track && typeof source.track === 'object' ? source.track as RawRow : null;
    const row = nested ? { ...nested, added_at: source.added_at } : source;
    const name = str(get(row, ['歌曲名', '歌曲名称', '歌曲', '歌名', 'track_name', 'track name', 'name', 'title']));
    if (!name) { skipped++; return; }
    const artistValue = Array.isArray(row.artists) ? row.artists : get(row, ['艺人', '艺术家', '歌手', 'artists', 'artist', 'artist_name', 'artist name(s)', 'artist names']);
    const artists = Array.isArray(artistValue) ? artistValue.map(a => typeof a === 'object' && a ? str((a as RawRow).name) : str(a)).filter(Boolean) : str(artistValue).split(/[,，;；]/).map(a => a.trim()).filter(Boolean);
    const albumValue = get(row, ['专辑', '专辑名', 'album', 'album_name', 'album name']);
    const albumObject = typeof albumValue === 'object' && albumValue ? albumValue as RawRow : null;
    const ms = get(row, ['duration_ms', '时长毫秒', '时长(ms)', 'duration (ms)']);
    const external = row.external_urls && typeof row.external_urls === 'object' ? (row.external_urls as RawRow).spotify : '';
    const url = str(get(row, ['链接', 'url', 'spotify_url', 'track url']) || external);
    const release = str(get(row, ['发行日期', 'release_date', 'album release date']) || albumObject?.release_date);
    const popValue = get(row, ['热度', 'popularity', 'track popularity']);
    const pop = popValue === null ? null : Number(popValue);
    tracks.push({ id: str(row.id) || `row-${index}`, name, artists: [...new Set(artists)], album: albumObject ? str(albumObject.name) : str(albumValue), seconds: ms !== null ? duration(ms, true) : duration(get(row, ['时长', 'duration', 'duration_sec', 'duration_seconds', '时长秒'])), added: isoDate(get(row, ['添加时间', '收藏日期', '添加日期', 'added_at', 'added on', 'added date'])), url: /^https:\/\/open\.spotify\.com\/(?:intl-[^/]+\/)?track\/[a-zA-Z0-9]+(?:\?.*)?$/.test(url) ? url : '', release: /^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(release) ? release : null, explicit: boolean(get(row, ['explicit', '露骨内容'])), popularity: pop !== null && Number.isFinite(pop) && pop >= 0 && pop <= 100 ? pop : null, raw: source });
  });
  return { tracks, skipped };
}
export const fmt = (n: number) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(n);
export const clock = (n: number | null) => n === null ? '—' : `${Math.floor(Math.round(n) / 60)}:${String(Math.round(n) % 60).padStart(2, '0')}`;
export const hours = (n: number) => fmt(n / 3600);
export const pct = (n: number, total: number) => total ? `${(n / total * 100).toFixed(1)}%` : '—';
export const median = (values: number[]) => { const a = [...values].sort((a, b) => a - b); return a.length ? (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2 : 0; };
export function analyze(tracks: Track[], mode: 'all' | 'primary' = 'all') {
  const artistMap = new Map<string, { name: string; count: number; total: number; validDuration: number; albums: Set<string>; first: string; last: string }>();
  const albums = new Map<string, { name: string; artist: string; count: number; seconds: number }>();
  const months = new Map<string, number>(); const days = new Map<string, number>();
  const durations: number[] = []; const seen = new Set<string>(); let duplicates = 0; let collabs = 0;
  const years = new Map<string, number>();
  const weekday = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map(name => ({ name, count: 0 }));
  const bins = ['< 2 分钟', '2–3 分钟', '3–4 分钟', '4–5 分钟', '5–6 分钟', '≥ 6 分钟'].map(name => ({ name, count: 0 }));
  for (const t of tracks) {
    const identity = t.url ? t.url.split('?')[0] : JSON.stringify([t.name.toLowerCase(), t.artists, t.album]);
    if (seen.has(identity)) duplicates++; seen.add(identity);
    if (t.artists.length > 1) collabs++;
    for (const name of mode === 'primary' ? t.artists.slice(0, 1) : t.artists) {
      let a = artistMap.get(name);
      if (!a) { a = { name, count: 0, total: 0, validDuration: 0, albums: new Set(), first: '', last: '' }; artistMap.set(name, a); }
      a.count++; a.total += t.seconds || 0; if (t.seconds !== null) a.validDuration++;
      if (t.album) a.albums.add(t.album);
      if (t.added) { if (!a.first || t.added < a.first) a.first = t.added; if (t.added > a.last) a.last = t.added; }
    }
    if (t.seconds !== null) { durations.push(t.seconds); bins[Math.min(5, Math.max(0, Math.floor(t.seconds / 60) - 1))].count++; }
    if (t.album) { const artist = t.artists[0] || '未知艺人'; const k = JSON.stringify([t.album, artist]); const a = albums.get(k) || { name: t.album, artist, count: 0, seconds: 0 }; a.count++; a.seconds += t.seconds || 0; albums.set(k, a); }
    if (t.added) { const month = t.added.slice(0, 7); months.set(month, (months.get(month) || 0) + 1); days.set(t.added, (days.get(t.added) || 0) + 1); weekday[(new Date(t.added + 'T00:00:00Z').getUTCDay() + 6) % 7].count++; }
    if (t.release) { const year = t.release.slice(0, 4); years.set(year, (years.get(year) || 0) + 1); }
  }
  const artists = [...artistMap.values()].map(a => ({ ...a, albums: a.albums.size, avg: a.validDuration ? a.total / a.validDuration : null })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const timeline: { name: string; count: number; cumulative: number }[] = [];
  const sortedMonths = [...months.keys()].sort();
  let timelineUnit = '月';
  if (sortedMonths.length) {
    const start = new Date(sortedMonths[0] + '-01T00:00:00Z'); const end = sortedMonths[sortedMonths.length - 1];
    const span = (+end.slice(0, 4) - start.getUTCFullYear()) * 12 + +end.slice(5, 7) - start.getUTCMonth();
    let cumulative = 0;
    if (span > 120) {
      timelineUnit = '年'; const grouped = new Map<string, number>();
      months.forEach((count, month) => grouped.set(month.slice(0, 4), (grouped.get(month.slice(0, 4)) || 0) + count));
      for (let y = start.getUTCFullYear(); y <= +end.slice(0, 4); y++) { const name = String(y); const count = grouped.get(name) || 0; cumulative += count; timeline.push({ name, count, cumulative }); }
    } else while (start.toISOString().slice(0, 7) <= end) { const name = start.toISOString().slice(0, 7); const count = months.get(name) || 0; cumulative += count; timeline.push({ name, count, cumulative }); start.setUTCMonth(start.getUTCMonth() + 1); }
  }
  const total = durations.reduce((a, b) => a + b, 0);
  return { count: tracks.length, total, avg: durations.length ? total / durations.length : null, median: durations.length ? median(durations) : null, artists, albums: [...albums.values()].sort((a, b) => b.count - a.count), timeline, timelineUnit, weekday, bins, duplicates, collabs, validDuration: durations.length, validDates: [...days.values()].reduce((a, b) => a + b, 0), activeDays: days.size, peakDay: [...days.entries()].sort((a, b) => b[1] - a[1])[0], years: [...years.entries()].sort().map(([name, count]) => ({ name, count })), shortest: tracks.filter(t => t.seconds !== null).sort((a, b) => a.seconds! - b.seconds!)[0], longest: tracks.filter(t => t.seconds !== null).sort((a, b) => b.seconds! - a.seconds!)[0], dated: [...tracks.filter(t => t.added).map(t => t.added!)].sort() };
}
export function profile(rows: RawRow[]) {
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
  return keys.map(name => {
    const values = rows.map(r => r[name]).filter(v => v !== null && v !== undefined && v !== '');
    const numbers = values.map(v => typeof v === 'number' ? v : typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : NaN);
    const numeric = values.length > 0 && numbers.every(Number.isFinite);
    const counts = new Map<string, number>();
    values.forEach(v => { const s = typeof v === 'object' ? JSON.stringify(v) : String(v); counts.set(s, (counts.get(s) || 0) + 1); });
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return { name, filled: values.length, unique: counts.size, type: numeric ? '数值' : '文本 / 日期', detail: numeric ? `最小 ${fmt(numbers.reduce((a, b) => Math.min(a, b), Infinity))} · 最大 ${fmt(numbers.reduce((a, b) => Math.max(a, b), -Infinity))} · 均值 ${fmt(numbers.reduce((a, b) => a + b, 0) / numbers.length)}` : top ? `最常见：${top[0].slice(0, 90)}（${top[1]} 次）` : '无有效数据' };
  });
}

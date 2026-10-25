import Papa from 'papaparse';
import type { RawRow, Track } from './analytics';
export async function parseFile(file: File): Promise<RawRow[]> {
  if (file.size > 20 * 1024 * 1024) throw new Error('文件超过 20 MB，请拆分后导入。');
  const ext = file.name.split('.').pop()?.toLowerCase(); let rows: RawRow[];
  if (ext === 'xlsx') {
    const module = await import('exceljs');
    const ExcelJS = module.default || module;
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.worksheets.find(s => s.name === '喜欢的音乐') || workbook.worksheets[0];
    if (!sheet) throw new Error('工作簿没有工作表。');
    if (sheet.rowCount > 50001 || sheet.columnCount > 200) throw new Error('最多支持 50,000 行、200 列，请精简文件后再试。');
    const cellValue = (v: unknown): unknown => { if (v && typeof v === 'object' && !(v instanceof Date)) { const o = v as Record<string, unknown>; if ('result' in o) return o.result; if ('text' in o) return o.text; if (Array.isArray(o.richText)) return o.richText.map((t: { text: string }) => t.text).join(''); return null; } return v; };
    const headers: string[] = []; sheet.getRow(1).eachCell((c, i) => { headers[i - 1] = String(cellValue(c.value) || '').trim(); });
    rows = []; sheet.eachRow((row, n) => { if (n === 1) return; const out: RawRow = {}; headers.forEach((h, i) => { if (h) out[h] = cellValue(row.getCell(i + 1).value); }); if (Object.values(out).some(v => v != null && v !== '')) rows.push(out); });
  } else if (ext === 'csv' || ext === 'tsv') {
    const parsed = Papa.parse<RawRow>(await file.text(), { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.replace(/^\uFEFF/, '').trim(), delimiter: ext === 'tsv' ? '\t' : '' });
    if (parsed.errors.some(e => e.code === 'MissingQuotes' || e.code === 'TooManyFields' || e.code === 'TooFewFields')) throw new Error('CSV 列数或引号格式有误，请用 UTF-8 格式重新导出。');
    rows = parsed.data;
  } else if (ext === 'json') {
    const json = JSON.parse(await file.text()); rows = Array.isArray(json) ? json : json.items || json.tracks || json.songs;
    if (!Array.isArray(rows)) throw new Error('JSON 应为歌曲数组，或包含 items / tracks / songs 数组。');
  } else throw new Error('请选择 .xlsx、.csv、.tsv 或 .json 文件。旧版 .xls 请先另存为 .xlsx。');
  if (!rows.length) throw new Error('文件中没有歌曲记录，请确认第一行为列名。');
  if (rows.length > 50000) throw new Error('最多支持 50,000 首歌曲，请拆分文件后导入。');
  if (rows.some(r => !r || typeof r !== 'object' || Array.isArray(r))) throw new Error('文件中存在无效的歌曲记录。');
  return rows;
}
export function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 2000); }
export function csv(rows: Record<string, unknown>[]) {
  const safe = rows.map(row => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === 'string' && /^[=+@\-\t\r]/.test(v) ? `'${v}` : v])));
  return new Blob(['\uFEFF', Papa.unparse(safe)], { type: 'text/csv;charset=utf-8;' });
}
export function exportTracks(tracks: Track[]) { return tracks.map(t => ({ 歌曲名: t.name, 艺人: t.artists.join(', '), 专辑: t.album, 时长秒: t.seconds ?? '', 添加时间: t.added || '', 链接: t.url, 发行日期: t.release || '', 露骨内容: t.explicit ?? '', 热度: t.popularity ?? '' })); }

import type { RawRow } from './analytics';
// Synthetic example. These dates, durations and counts are not a user's listening history.
const artists = [['Laufey', 28, 'Bewitched'], ['陈绮贞', 23, '太阳'], ['藤井风', 20, 'LOVE ALL SERVE ALL'], ['Men I Trust', 18, 'Untourable Album'], ['落日飞车', 17, 'SOFT STORM'], ['Norah Jones', 16, 'Come Away With Me'], ['王菲', 15, '寓言'], ['Khruangbin', 13, 'Mordechai'], ['beabadoobee', 11, 'Beatopia'], ['宇多田光', 9, 'BAD MODE'], ['The Marías', 7, 'Submarine'], ['Nujabes', 5, 'Modal Soul'], ['Cleo Sol', 3, 'Mother'], ['Yussef Dayes', 2, 'Black Classical Music']] as const;
const titles = ['Velvet morning', '雨后的房间', 'Blue hour', 'Somewhere, slowly', '月光散步', 'A little closer', 'Sunday afternoon', '没有名字的风', 'Golden days', 'After the rain', 'Small things', '夜航'];
export const demoRows: RawRow[] = artists.flatMap(([artist, count, album], a) => Array.from({ length: count }, (_, j) => {
  const sec = 110 + ((a * 47 + j * 31) % 230); const date = new Date(Date.UTC(2024, (a * 3 + j * 7) % 30, 1 + (a * 11 + j * 3) % 27));
  return { 歌曲名: `${titles[(a + j) % titles.length]} ${String(j + 1).padStart(2, '0')}`, 艺人: j === 6 && a > 0 ? `${artist}, Laufey` : artist, 专辑: j % 4 === 0 ? `${album} · Sessions` : album, 时长: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`, 添加时间: date.toISOString().slice(0, 10), 链接: '', 发行日期: `${2014 + (a + j) % 12}-01-01`, 露骨内容: j % 17 === 0, 热度: 30 + (j * 7 + a * 3) % 65 };
}));

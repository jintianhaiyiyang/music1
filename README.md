# Soundfolio · 音乐收藏分析室

一个中文 Spotify 收藏分析网站：奶油白与深绿色仪表盘、响应式布局、浏览器本地文件解析，可直接部署到 Vercel。默认附带明确标注的模拟曲库。不会在网站中保存 Spotify 密钥，也不需要数据库、登录或 AI API。

## 本地运行

要求 Node.js 22.12+ 或 24+（Vite 7 支持的环境）。

```sh
npm ci
npm run dev
```

打开终端显示的本地地址。生产构建与验证：

```sh
npm test
npm run build
npm run preview
```

## 部署到 Vercel

1. 将此 **spotify-insights 目录里的项目内容** 上传到自己的 GitHub / GitLab / Bitbucket 仓库。
2. 在 Vercel 选择 Add New → Project，导入仓库。
3. Framework Preset：**Vite**；Build Command：`npm run build`；Output Directory：`dist`；Install Command：`npm ci`。
4. 若仓库中还包含其他项目，请把 Root Directory 设置为 `spotify-insights`；如果此项目本身就是仓库根目录则不填。
5. 点击 Deploy。**网站无需任何环境变量**。Vercel 配置已写入 `vercel.json`。

也可以先在本机安装、登录 Vercel CLI，然后从本目录运行 `vercel` 创建预览；正式上线运行 `vercel --prod`。操作前确认自己的团队与项目。

官方说明：[Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)、[Vite 静态部署](https://vite.dev/guide/static-deploy)。

## 已实现

- Excel、UTF-8 CSV / TSV、JSON 导入；拖放、大小与行数校验，错误不会覆盖当前数据。
- 总歌曲 / 艺人 / 专辑、总时长、平均与中位时长、数据质量检查。
- **≥3 首歌手**默认门槛；合作艺人 / 首位艺人口径；4 种排行指标，最多 6 人对比；气泡图、对比图和表格。
- 时长直方图、最长最短歌曲、合作比例、Top 3 署名集中度、专辑排行。
- 收藏月份趋势（补齐零月份）、星期分布、最密集收藏日、活跃日期；顶部年份筛选联动全部分析与曲库。
- 有字段时自动分析发行年份、explicit、热度；全部原始字段的数值 / 文本概览。
- 曲库搜索、歌手筛选、排序、分页、安全 Spotify 外链。
- 原始文件按原字节下载；报告 JSON、曲库 CSV、歌手 CSV、搜索结果 CSV 下载。CSV 导出对公式前缀做防护。
- 安全版 Python 导出脚本和使用说明可直接从网页下载。原始脚本中的凭证已移除；用户桌面原文件未修改。

导出脚本、输入格式、计算口径详见 [使用说明](public/downloads/使用说明.md)。

## 隐私与边界

导入文件只进入浏览器内存，刷新清除；没有上传接口、追踪或数据库。Google Fonts 仅加载字体，不发送曲库；字体不可访问时使用系统字体。网站部署到公开地址不会自动公开任何人的导入文件。

当前数据是收藏记录，并非播放历史；总时长是曲库时长，并非实际听歌时长。不会凭空生成流派、BPM、播放次数、情绪等不存在的字段。重复数据只提醒，不自动删除。公开下载的脚本为移除凭证并扩展字段后的安全版，绝不含桌面原脚本的密钥。

较大的 Excel 通过按需加载解析库处理，最多 20 MB / 50,000 行 / 200 列。限制用于降低浏览器资源占用；实际处理速度取决于设备。嵌套 JSON 附加列以文本摘要展示，不解释为音频特征。旧版 `.xls` 需转换为 `.xlsx`。

## 技术

React + TypeScript + Vite；Recharts 图表；ExcelJS 按需解析 xlsx；PapaParse 解析与导出 CSV。`src/analytics.ts` 实现纯数据计算，`src/files.ts` 处理文件，`src/demo.ts` 为模拟数据，`src/App.tsx` 与 `src/styles.css` 实现界面。

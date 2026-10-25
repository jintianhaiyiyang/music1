"""Spotify 收藏导出工具 · Soundfolio 安全版。

基于用户提供的 export_spotify_liked_songs.py 改造，凭证从环境变量读取。
依赖：pip install spotipy pandas openpyxl
配置与运行方法见同目录「使用说明.md」。不需要把密钥部署到网站。
"""

import argparse
import json
import os
from pathlib import Path

import pandas as pd
import spotipy
from openpyxl.utils import get_column_letter
from spotipy.oauth2 import SpotifyOAuth


def get_spotify_client() -> spotipy.Spotify:
    client_id = os.environ.get("SPOTIPY_CLIENT_ID", "")
    client_secret = os.environ.get("SPOTIPY_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        raise SystemExit("请先设置 SPOTIPY_CLIENT_ID 和 SPOTIPY_CLIENT_SECRET 环境变量，详见使用说明。")
    return spotipy.Spotify(auth_manager=SpotifyOAuth(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=os.environ.get("SPOTIPY_REDIRECT_URI", "http://127.0.0.1:8888/callback"),
        scope="user-library-read",
        cache_path=".spotify_cache",
    ))


def ms_to_min_sec(ms: int) -> str:
    minutes, seconds = divmod(max(0, int(ms)) // 1000, 60)
    return f"{minutes}:{seconds:02d}"


def fetch_liked_songs(sp: spotipy.Spotify) -> list[dict]:
    songs = []
    results = sp.current_user_saved_tracks(limit=50)
    while results:
        for item in results.get("items", []):
            track = item.get("track")
            if not track:
                continue
            album = track.get("album") or {}
            ms = track.get("duration_ms")
            row = {
                "歌曲名": track.get("name", ""),
                "艺人": ", ".join(a.get("name", "") for a in track.get("artists", [])),
                "专辑": album.get("name", ""),
                "时长": ms_to_min_sec(ms) if ms is not None else "",
                "添加时间": (item.get("added_at") or "")[:10],
                "链接": (track.get("external_urls") or {}).get("spotify", ""),
                "duration_ms": ms,
                "发行日期": album.get("release_date", ""),
                "explicit": track.get("explicit"),
                "专辑类型": album.get("album_type", ""),
                "曲目编号": track.get("track_number"),
                "唱片编号": track.get("disc_number"),
                "Spotify ID": track.get("id", ""),
                # JSON 额外保留数组，避免艺人名字含逗号时发生歧义。
                "artists": [a.get("name", "") for a in track.get("artists", [])],
            }
            # 部分账户/API 版本不再返回此字段，缺失时留空，不填造数据。
            if track.get("popularity") is not None:
                row["popularity"] = track["popularity"]
            songs.append(row)
        print(f"已抓取 {len(songs)} 首…")
        results = sp.next(results) if results.get("next") else None
    return songs


def spreadsheet_rows(songs: list[dict]) -> list[dict]:
    # 表格继续保留旧脚本的六列，同时附加可用元数据。
    rows = []
    for song in songs:
        row = {k: v for k, v in song.items() if k != "artists"}
        # 防止导出中的文本在电子表格中被当成公式。
        for key, value in row.items():
            if isinstance(value, str) and value.startswith(("=", "+", "-", "@", "\t", "\r")):
                row[key] = "'" + value
        rows.append(row)
    return rows


def export_to_excel(songs: list[dict], filename: str) -> None:
    df = pd.DataFrame(spreadsheet_rows(songs))
    with pd.ExcelWriter(filename, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="喜欢的音乐")
        ws = writer.sheets["喜欢的音乐"]
        ws.freeze_panes = "A2"
        ws.auto_filter.ref = ws.dimensions
        for i, col in enumerate(df.columns, 1):
            length = max(len(col), int(df[col].astype(str).map(len).max()) if not df.empty else 0)
            ws.column_dimensions[get_column_letter(i)].width = min(length + 4, 60)


def main() -> None:
    parser = argparse.ArgumentParser(description="导出 Spotify 喜欢的音乐供 Soundfolio 分析")
    parser.add_argument("--format", choices=["xlsx", "csv", "json"], default="xlsx")
    parser.add_argument("--output", help="输出文件路径，默认 spotify_liked_songs.<format>")
    args = parser.parse_args()
    output = Path(args.output or f"spotify_liked_songs.{args.format}")
    if output.exists():
        raise SystemExit(f"文件已存在：{output}。请更换 --output 路径，避免覆盖原始数据。")
    songs = fetch_liked_songs(get_spotify_client())
    if not songs:
        print("没有抓取到歌曲，请检查账户收藏与授权范围。")
        return
    if args.format == "json":
        output.write_text(json.dumps(songs, ensure_ascii=False, indent=2), encoding="utf-8")
    elif args.format == "csv":
        pd.DataFrame(spreadsheet_rows(songs)).to_csv(output, index=False, encoding="utf-8-sig")
    else:
        export_to_excel(songs, str(output))
    print(f"导出完成：{output}，共 {len(songs)} 首。把文件拖入 Soundfolio 即可分析。")


if __name__ == "__main__":
    main()

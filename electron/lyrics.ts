export interface LyricLine {
  timeMs: number;
  text: string;
  trans?: string;
}

const lyricCache = new Map<string, LyricLine[]>();

export function parseLrc(lrc: string): Array<{ timeMs: number; text: string }> {
  if (!lrc) return [];
  const lines: Array<{ timeMs: number; text: string }> = [];
  const timeRegex = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

  for (const rawLine of lrc.split(/\r?\n/)) {
    const matches = [...rawLine.matchAll(timeRegex)];
    if (matches.length === 0) continue;
    const text = rawLine.replace(timeRegex, '').trim();
    if (!text) continue;
    if (/^(?:作\s*词|作\s*曲|编\s*曲|词\s*曲|制作人|制作|监制|混音|母带|录音|和声|吉他|贝斯|键盘|鼓|出品|发行|OP|SP|词|曲|Lyrics?\s+by|Composed\s+by|Written\s+by|Arranged\s+by)\s*[:：/／]/i.test(text)) continue;

    for (const m of matches) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const fracStr = m[3] || '0';
      const ms =
        fracStr.length === 1
          ? parseInt(fracStr, 10) * 100
          : fracStr.length === 2
            ? parseInt(fracStr, 10) * 10
            : parseInt(fracStr.slice(0, 3), 10);
      lines.push({
        timeMs: min * 60000 + sec * 1000 + ms,
        text,
      });
    }
  }

  lines.sort((a, b) => a.timeMs - b.timeMs);
  return lines;
}

function mergeLyrics(mainRaw: string, transRaw?: string): LyricLine[] {
  const main = parseLrc(mainRaw);
  if (!transRaw) return main;
  const trans = parseLrc(transRaw);
  if (trans.length === 0) return main;

  return main.map((line) => {
    const match = trans.find((t) => Math.abs(t.timeMs - line.timeMs) <= 350);
    return match ? { ...line, trans: match.text } : line;
  });
}

async function fetchJsonWithTimeout(url: string, init?: RequestInit, timeoutMs = 4500): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromNetEase(title: string, artist: string): Promise<LyricLine[]> {
  const query = [title, artist].filter(Boolean).join(' ').trim();
  if (!query) return [];

  const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(query)}&type=1&offset=0&total=true&limit=5`;
  const searchData = await fetchJsonWithTimeout(searchUrl, {
    headers: { Referer: 'https://music.163.com/' },
  });

  const songs: any[] = searchData?.result?.songs || [];
  if (songs.length === 0) return [];

  const lowerTitle = title.toLowerCase();
  const lowerArtist = artist.toLowerCase();
  const best =
    songs.find((s) => {
      const sName = String(s.name || '').toLowerCase();
      const sArtists = (s.artists || []).map((a: any) => String(a.name || '').toLowerCase()).join(' ');
      return sName.includes(lowerTitle) && (!lowerArtist || sArtists.includes(lowerArtist.split(/[,/&、]/)[0].trim()));
    }) || songs[0];

  if (!best?.id) return [];

  const lyricUrl = `https://music.163.com/api/song/lyric?id=${best.id}&lv=1&kv=1&tv=-1`;
  const lyricData = await fetchJsonWithTimeout(lyricUrl, {
    headers: { Referer: 'https://music.163.com/' },
  });

  const mainLrc = lyricData?.lrc?.lyric || '';
  const transLrc = lyricData?.tlyric?.lyric || '';
  return mergeLyrics(mainLrc, transLrc);
}

async function fetchFromLrclib(title: string, artist: string): Promise<LyricLine[]> {
  if (!title) return [];
  const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}${artist ? `&artist_name=${encodeURIComponent(artist)}` : ''}`;
  const data = await fetchJsonWithTimeout(url);
  if (!Array.isArray(data) || data.length === 0) return [];
  const withSynced = data.find((d) => typeof d?.syncedLyrics === 'string' && d.syncedLyrics.trim().length > 0);
  if (!withSynced) return [];
  return parseLrc(withSynced.syncedLyrics);
}

export async function fetchSyncedLyrics(title: string, artist: string): Promise<LyricLine[]> {
  const cleanTitle = title.replace(/\s*[-–(（](?:feat\.?|ft\.?|live|remix|伴奏).*$/i, '').trim() || title.trim();
  const cleanArtist = artist.trim();
  if (!cleanTitle) return [];

  const cacheKey = `${cleanTitle}|${cleanArtist}`;
  const cached = lyricCache.get(cacheKey);
  if (cached) return cached;

  let lines = await fetchFromNetEase(cleanTitle, cleanArtist);
  if (lines.length === 0) {
    lines = await fetchFromLrclib(cleanTitle, cleanArtist);
  }

  if (lyricCache.size > 80) {
    const firstKey = lyricCache.keys().next().value;
    if (firstKey) lyricCache.delete(firstKey);
  }
  lyricCache.set(cacheKey, lines);
  return lines;
}

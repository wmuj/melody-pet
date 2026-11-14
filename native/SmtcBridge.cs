using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using Windows.Media.Control;
using Windows.Storage.Streams;

namespace MelodyPetNative
{
    internal static class NativeMethods
    {
        [StructLayout(LayoutKind.Sequential)]
        public struct POINT
        {
            public int X;
            public int Y;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
        public struct MONITORINFO
        {
            public int cbSize;
            public RECT rcMonitor;
            public RECT rcWork;
            public uint dwFlags;
        }

        public const uint MONITOR_DEFAULTTONEAREST = 0x00000002;
        public const int SW_RESTORE = 9;

        [DllImport("user32.dll")]
        public static extern bool GetCursorPos(out POINT lpPoint);

        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

        [DllImport("user32.dll")]
        public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

        [DllImport("user32.dll")]
        public static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint dwFlags);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        public static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO lpmi);

        [DllImport("user32.dll")]
        public static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool IsIconic(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);
    }

    internal class Program
    {
        private static readonly object WriteLock = new object();
        private static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 1024 * 1024 * 4 };
        private static GlobalSystemMediaTransportControlsSessionManager _manager;
        private static string _lastThumbKey = "";
        private static string _lastThumbData = null;
        private static int _parentPid = 0;

        private static void Emit(object obj)
        {
            string line = Json.Serialize(obj);
            lock (WriteLock)
            {
                Console.Out.WriteLine(line);
                Console.Out.Flush();
            }
        }

        private static T AwaitOp<T>(Windows.Foundation.IAsyncOperation<T> op)
        {
            if (op.Status == Windows.Foundation.AsyncStatus.Completed)
            {
                return op.GetResults();
            }
            using (var mre = new ManualResetEventSlim(false))
            {
                op.Completed = (info, status) => mre.Set();
                mre.Wait();
                if (op.Status == Windows.Foundation.AsyncStatus.Error && op.ErrorCode != null)
                {
                    throw op.ErrorCode;
                }
                return op.GetResults();
            }
        }

        private static T AwaitOpProg<T, P>(Windows.Foundation.IAsyncOperationWithProgress<T, P> op)
        {
            if (op.Status == Windows.Foundation.AsyncStatus.Completed)
            {
                return op.GetResults();
            }
            using (var mre = new ManualResetEventSlim(false))
            {
                op.Completed = (info, status) => mre.Set();
                mre.Wait();
                if (op.Status == Windows.Foundation.AsyncStatus.Error && op.ErrorCode != null)
                {
                    throw op.ErrorCode;
                }
                return op.GetResults();
            }
        }

        private static GlobalSystemMediaTransportControlsSession PickSession()
        {
            if (_manager == null) return null;
            var current = _manager.GetCurrentSession();
            var sessions = _manager.GetSessions();
            if (sessions != null && sessions.Count > 0)
            {
                // Prefer any session actively playing, with NetEase CloudMusic prioritized if playing
                GlobalSystemMediaTransportControlsSession playingAny = null;
                foreach (var s in sessions)
                {
                    if (s == null) continue;
                    var info = s.GetPlaybackInfo();
                    bool isPlaying = info != null && info.PlaybackStatus == GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing;
                    string appId = (s.SourceAppUserModelId ?? "").ToLowerInvariant();
                    if (isPlaying && appId.Contains("cloudmusic"))
                    {
                        return s;
                    }
                    if (isPlaying && playingAny == null)
                    {
                        playingAny = s;
                    }
                }
                if (playingAny != null) return playingAny;
            }
            return current;
        }

        private static string ReadThumbnailBase64(IRandomAccessStreamReference thumbRef)
        {
            if (thumbRef == null) return null;
            try
            {
                using (var stream = AwaitOp(thumbRef.OpenReadAsync()))
                {
                    if (stream == null || stream.Size == 0 || stream.Size > 1024 * 1024 * 2) return null;
                    uint size = (uint)stream.Size;
                    var reader = new DataReader(stream.GetInputStreamAt(0));
                    AwaitOp(reader.LoadAsync(size));
                    byte[] bytes = new byte[size];
                    reader.ReadBytes(bytes);
                    reader.Dispose();
                    return "data:image/png;base64," + Convert.ToBase64String(bytes);
                }
            }
            catch
            {
                return null;
            }
        }

        private static bool IsForegroundFullscreen()
        {
            try
            {
                IntPtr hwnd = NativeMethods.GetForegroundWindow();
                if (hwnd == IntPtr.Zero || !NativeMethods.IsWindowVisible(hwnd)) return false;

                uint pid;
                NativeMethods.GetWindowThreadProcessId(hwnd, out pid);
                if (_parentPid > 0 && (int)pid == _parentPid) return false;
                if ((int)pid == Process.GetCurrentProcess().Id) return false;

                var cls = new StringBuilder(128);
                NativeMethods.GetClassName(hwnd, cls, cls.Capacity);
                string clsName = cls.ToString();
                if (clsName == "Progman" || clsName == "WorkerW" || clsName == "Shell_TrayWnd" || clsName == "Shell_SecondaryTrayWnd")
                {
                    return false;
                }

                NativeMethods.RECT winRect;
                if (!NativeMethods.GetWindowRect(hwnd, out winRect)) return false;

                IntPtr hMon = NativeMethods.MonitorFromWindow(hwnd, NativeMethods.MONITOR_DEFAULTTONEAREST);
                if (hMon == IntPtr.Zero) return false;

                NativeMethods.MONITORINFO mi = new NativeMethods.MONITORINFO();
                mi.cbSize = Marshal.SizeOf(typeof(NativeMethods.MONITORINFO));
                if (!NativeMethods.GetMonitorInfo(hMon, ref mi)) return false;

                int winW = winRect.Right - winRect.Left;
                int winH = winRect.Bottom - winRect.Top;
                int monW = mi.rcMonitor.Right - mi.rcMonitor.Left;
                int monH = mi.rcMonitor.Bottom - mi.rcMonitor.Top;

                return winRect.Left <= mi.rcMonitor.Left + 2
                    && winRect.Top <= mi.rcMonitor.Top + 2
                    && winW >= monW - 4
                    && winH >= monH - 4;
            }
            catch
            {
                return false;
            }
        }

        private static Dictionary<string, object> BuildState()
        {
            var result = new Dictionary<string, object>();
            result["event"] = "state";

            NativeMethods.POINT pt;
            if (NativeMethods.GetCursorPos(out pt))
            {
                result["cursorX"] = pt.X;
                result["cursorY"] = pt.Y;
            }
            result["fullscreen"] = IsForegroundFullscreen();

            try
            {
                var session = PickSession();
                if (session == null)
                {
                    result["hasSession"] = false;
                    return result;
                }

                result["hasSession"] = true;
                string appId = session.SourceAppUserModelId ?? "";
                result["appId"] = appId;

                var playback = session.GetPlaybackInfo();
                string status = "Stopped";
                if (playback != null)
                {
                    status = playback.PlaybackStatus.ToString();
                }
                result["status"] = status;

                var timeline = session.GetTimelineProperties();
                if (timeline != null)
                {
                    double posMs = timeline.Position.TotalMilliseconds;
                    double durMs = timeline.EndTime.TotalMilliseconds;
                    if (status == "Playing" && timeline.LastUpdatedTime != DateTimeOffset.MinValue)
                    {
                        double elapsed = (DateTimeOffset.UtcNow - timeline.LastUpdatedTime.ToUniversalTime()).TotalMilliseconds;
                        if (elapsed > 0 && elapsed < 3600000)
                        {
                            posMs += elapsed * (playback != null && playback.PlaybackRate.HasValue ? playback.PlaybackRate.Value : 1.0);
                        }
                    }
                    if (durMs > 0 && posMs > durMs) posMs = durMs;
                    if (posMs < 0) posMs = 0;
                    result["positionMs"] = Math.Round(posMs);
                    result["durationMs"] = Math.Round(durMs);
                }

                var props = AwaitOp(session.TryGetMediaPropertiesAsync());
                if (props != null)
                {
                    string title = props.Title ?? "";
                    string artist = props.Artist ?? "";
                    string album = props.AlbumTitle ?? "";
                    result["title"] = title;
                    result["artist"] = artist;
                    result["album"] = album;

                    string thumbKey = title + "|" + artist + "|" + album;
                    if (thumbKey != _lastThumbKey)
                    {
                        _lastThumbKey = thumbKey;
                        _lastThumbData = ReadThumbnailBase64(props.Thumbnail);
                    }
                    result["thumbnail"] = _lastThumbData;
                }
            }
            catch (Exception ex)
            {
                result["error"] = ex.Message;
            }

            return result;
        }

        private static void HandleCommand(string line)
        {
            if (string.IsNullOrWhiteSpace(line)) return;
            try
            {
                var dict = Json.Deserialize<Dictionary<string, object>>(line);
                if (dict == null || !dict.ContainsKey("cmd")) return;
                string cmd = Convert.ToString(dict["cmd"]);

                if (cmd == "poll")
                {
                    Emit(BuildState());
                    return;
                }

                if (cmd == "activateApp")
                {
                    string target = dict.ContainsKey("appId") ? Convert.ToString(dict["appId"]) : "";
                    ActivateTargetApp(target);
                    return;
                }

                var session = PickSession();
                if (session == null) return;

                bool ok = false;
                if (cmd == "toggle") ok = AwaitOp(session.TryTogglePlayPauseAsync());
                else if (cmd == "play") ok = AwaitOp(session.TryPlayAsync());
                else if (cmd == "pause") ok = AwaitOp(session.TryPauseAsync());
                else if (cmd == "next") ok = AwaitOp(session.TrySkipNextAsync());
                else if (cmd == "prev") ok = AwaitOp(session.TrySkipPreviousAsync());
                else if (cmd == "seek" && dict.ContainsKey("positionMs"))
                {
                    long ticks = Convert.ToInt64(dict["positionMs"]) * 10000L;
                    ok = AwaitOp(session.TryChangePlaybackPositionAsync(ticks));
                }

                var ack = new Dictionary<string, object>();
                ack["event"] = "ack";
                ack["cmd"] = cmd;
                ack["ok"] = ok;
                Emit(ack);
                Emit(BuildState());
            }
            catch (Exception ex)
            {
                var err = new Dictionary<string, object>();
                err["event"] = "error";
                err["message"] = ex.Message;
                Emit(err);
            }
        }

        private static void ActivateTargetApp(string appId)
        {
            string[] candidates = new string[] { "cloudmusic", "QQMusic", "Spotify" };
            string lower = (appId ?? "").ToLowerInvariant();
            if (lower.Contains("cloudmusic")) candidates = new string[] { "cloudmusic" };
            else if (lower.Contains("qqmusic")) candidates = new string[] { "QQMusic" };
            else if (lower.Contains("spotify")) candidates = new string[] { "Spotify" };

            foreach (var name in candidates)
            {
                var procs = Process.GetProcessesByName(name);
                foreach (var p in procs)
                {
                    if (p.MainWindowHandle != IntPtr.Zero)
                    {
                        if (NativeMethods.IsIconic(p.MainWindowHandle))
                        {
                            NativeMethods.ShowWindow(p.MainWindowHandle, NativeMethods.SW_RESTORE);
                        }
                        NativeMethods.SetForegroundWindow(p.MainWindowHandle);
                        return;
                    }
                }
            }
        }

        public static int Main(string[] args)
        {
            Console.InputEncoding = Encoding.UTF8;
            Console.OutputEncoding = Encoding.UTF8;

            if (args != null && args.Length > 0)
            {
                int.TryParse(args[0], out _parentPid);
            }

            try
            {
                _manager = AwaitOp(GlobalSystemMediaTransportControlsSessionManager.RequestAsync());
            }
            catch
            {
                _manager = null;
            }

            bool running = true;

            Thread readerThread = new Thread(() =>
            {
                try
                {
                    string line;
                    while ((line = Console.In.ReadLine()) != null)
                    {
                        HandleCommand(line);
                    }
                }
                catch { }
                running = false;
            });
            readerThread.IsBackground = true;
            readerThread.Start();

            // Background emitter loop for fast cursor/fullscreen/SMTC updates
            while (running)
            {
                Emit(BuildState());
                Thread.Sleep(250);
            }

            return 0;
        }
    }
}

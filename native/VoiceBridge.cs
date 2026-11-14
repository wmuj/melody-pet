using System;
using System.Collections.Generic;
using System.Globalization;
using System.Speech.Synthesis;
using System.Text;
using System.Web.Script.Serialization;

namespace MelodyPetNative
{
    // Kept separate from the media bridge: a slow music provider cannot delay speech.
    internal static class VoiceBridge
    {
        private static readonly object Gate = new object();
        private static readonly Dictionary<Prompt, string> Prompts = new Dictionary<Prompt, string>();
        private static readonly JavaScriptSerializer Json = new JavaScriptSerializer();

        private static void Emit(object value)
        {
            lock (Gate)
            {
                Console.Out.WriteLine(Json.Serialize(value));
                Console.Out.Flush();
            }
        }

        private static string IdFor(Prompt prompt, bool remove)
        {
            lock (Gate)
            {
                string id;
                if (!Prompts.TryGetValue(prompt, out id)) return "";
                if (remove) Prompts.Remove(prompt);
                return id;
            }
        }

        [STAThread]
        public static int Main(string[] args)
        {
            Console.InputEncoding = new UTF8Encoding(false);
            Console.OutputEncoding = new UTF8Encoding(false);
            try
            {
                using (var synth = new SpeechSynthesizer())
                {
                    // Optional local WAV output is used by the non-audible verification script.
                    if (args.Length == 2 && args[0] == "--wave") synth.SetOutputToWaveFile(args[1]);
                    else synth.SetOutputToDefaultAudioDevice();

                    var voices = new List<object>();
                    foreach (var voice in synth.GetInstalledVoices())
                    {
                        if (!voice.Enabled) continue;
                        voices.Add(new { id = voice.VoiceInfo.Name, name = voice.VoiceInfo.Name,
                            lang = voice.VoiceInfo.Culture.Name, gender = voice.VoiceInfo.Gender.ToString() });
                    }
                    synth.SpeakStarted += (sender, e) => Emit(new { type = "start", id = IdFor(e.Prompt, false) });
                    synth.SpeakCompleted += (sender, e) => Emit(new { type = "end", id = IdFor(e.Prompt, true),
                        cancelled = e.Cancelled, error = e.Error == null ? null : e.Error.Message });
                    Emit(new { type = "ready", voices = voices });

                    string line;
                    while ((line = Console.In.ReadLine()) != null)
                    {
                        string id = "";
                        try
                        {
                            var input = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(line);
                            if (input == null || !input.ContainsKey("cmd")) continue;
                            string cmd = Convert.ToString(input["cmd"]);
                            if (cmd == "stop") { synth.SpeakAsyncCancelAll(); continue; }
                            if (cmd != "speak") continue;
                            id = Convert.ToString(input["id"]);
                            string text = Convert.ToString(input["text"]);
                            if (String.IsNullOrWhiteSpace(text) || text.Length > 300) continue;
                            synth.SpeakAsyncCancelAll();
                            if (input.ContainsKey("voiceId") && !String.IsNullOrEmpty(Convert.ToString(input["voiceId"])))
                                synth.SelectVoice(Convert.ToString(input["voiceId"]));
                            synth.Volume = Math.Max(0, Math.Min(100, Convert.ToInt32(input["volume"], CultureInfo.InvariantCulture)));
                            synth.Rate = Math.Max(-3, Math.Min(4, Convert.ToInt32(input["rate"], CultureInfo.InvariantCulture)));
                            var prompt = new Prompt(text);
                            lock (Gate) { Prompts[prompt] = id; }
                            synth.SpeakAsync(prompt);
                        }
                        catch (Exception ex) { Emit(new { type = "error", id = id, error = ex.Message }); }
                    }
                    synth.SpeakAsyncCancelAll();
                }
                return 0;
            }
            catch (Exception ex) { Emit(new { type = "error", id = "", error = ex.Message }); return 1; }
        }
    }
}

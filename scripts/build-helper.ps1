$ErrorActionPreference = "Stop"
$fw = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319"
$csc = "$fw\csc.exe"
$winFoundation = "C:\Windows\System32\WinMetadata\Windows.Foundation.winmd"
$winMedia = "C:\Windows\System32\WinMetadata\Windows.Media.winmd"
$winStorage = "C:\Windows\System32\WinMetadata\Windows.Storage.winmd"

New-Item -ItemType Directory -Force -Path "native\bin" | Out-Null

$mediaSource = Get-Item -LiteralPath "native\SmtcBridge.cs"
$mediaBinary = Get-Item -LiteralPath "native\bin\smtc-bridge.exe" -ErrorAction SilentlyContinue
if (-not $mediaBinary -or $mediaSource.LastWriteTimeUtc -gt $mediaBinary.LastWriteTimeUtc) {
& $csc /nologo /optimize+ /platform:x64 `
  /out:"native\bin\smtc-bridge.exe" `
  /r:"System.dll" `
  /r:"System.Core.dll" `
  /r:"System.Web.Extensions.dll" `
  /r:"$fw\System.Runtime.dll" `
  /r:"$fw\System.Threading.Tasks.dll" `
  /r:"$fw\System.Runtime.WindowsRuntime.dll" `
  /r:"$fw\System.Runtime.InteropServices.WindowsRuntime.dll" `
  /r:"$winFoundation" `
  /r:"$winMedia" `
  /r:"$winStorage" `
  "native\SmtcBridge.cs"

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Output "Compiled native\bin\smtc-bridge.exe successfully."
} else { Write-Output "Media helper is up to date." }

Add-Type -AssemblyName System.Speech
$speechAssembly = [System.Speech.Synthesis.SpeechSynthesizer].Assembly.Location
$voiceSource = Get-Item -LiteralPath "native\VoiceBridge.cs"
$voiceBinary = Get-Item -LiteralPath "native\bin\voice-bridge.exe" -ErrorAction SilentlyContinue
if (-not $voiceBinary -or $voiceSource.LastWriteTimeUtc -gt $voiceBinary.LastWriteTimeUtc) {
& $csc /nologo /optimize+ /platform:x64 `
  /out:"native\bin\voice-bridge.exe" `
  /r:"System.dll" /r:"System.Core.dll" /r:"System.Web.Extensions.dll" `
  /r:"$speechAssembly" "native\VoiceBridge.cs"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Output "Compiled native\bin\voice-bridge.exe successfully."
} else { Write-Output "Voice helper is up to date." }

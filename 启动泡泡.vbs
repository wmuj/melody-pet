Option Explicit
Dim shell, files, root, binary
Set shell = CreateObject("WScript.Shell")
Set files = CreateObject("Scripting.FileSystemObject")
root = files.GetParentFolderName(WScript.ScriptFullName)
binary = files.BuildPath(root, "node_modules\electron\dist\electron.exe")
shell.CurrentDirectory = root
shell.Environment("PROCESS").Remove "ELECTRON_RUN_AS_NODE"
If files.FileExists(binary) And files.FileExists(files.BuildPath(root, "dist\index.html")) Then
  shell.Run Chr(34) & binary & Chr(34) & " " & Chr(34) & root & Chr(34), 0, False
Else
  MsgBox "Please run the project setup first: npm install, npm run compile:helper, npm run build.", 48, "MelodyPet"
End If

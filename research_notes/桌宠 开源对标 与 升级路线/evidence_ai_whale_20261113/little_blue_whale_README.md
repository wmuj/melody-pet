# 小蓝鲸 · 独立 Windows 桌宠

保留现有小蓝鲸（蓝发鲸鱼女仆）的形象与原有动作，使用独立的原生 WPF 进程陪伴桌面。程序完全离线，不连接 Codex，不读取 Codex 配置，也不依赖原 `Pets` 目录。

## 直接运行

打开 `dist/BlueWhaleDesktop-win-x64/BlueWhale.Desktop.exe`。也可解压 `dist/BlueWhaleDesktop-win-x64.zip` 到自己的文件夹后运行。**请保留整个文件夹，包括 Assets 和 DLL，不能只复制 EXE。** 发布包自带 .NET 8 运行时，无须安装 .NET、Python、Node 或 Codex，无须管理员权限。

面向 Windows 10 1809 及以上 / Windows 11 **x64**。当前机器验证为 Windows 11、2560×1440 单屏；其他系统和混合 DPI 的实体多屏尚未实测。

首次运行显示角色，任务栏通知区域有小蓝鲸图标（也可能位于折叠区）。首次默认不开机自启。

| 操作 | 效果 |
| --- | --- |
| 单击角色 | 挥手回应 |
| 双击角色 | 打开设置 |
| 按住左键拖动 | 移动位置，松开后跳跃回应 |
| 悬停 | 偶尔挥手，不连续打扰 |
| 右键角色 | 挥手、跳跃、思考、失落、设置、隐藏、重置、退出 |
| Ctrl + 鼠标滚轮 | 调整大小 |
| 双击托盘图标 | 显示 / 隐藏角色 |
| 右键托盘图标 | 设置、动作、重置位置、重新启动角色、退出 |

关闭设置窗口不会退出桌宠。隐藏角色会停止其动画计时器，托盘继续运行。关闭“鼠标互动”后，角色整体鼠标穿透；请通过托盘重新打开互动。透明画面空白部分不阻挡桌面点击。角色不会抢走键盘焦点。

## 设置

七项开关：视线跟随、待机动画、自主散步、鼠标互动、始终置顶、开机启动、启动时收进托盘。四项滑块：大小 120–640 DIP、动画速度 0.25–2 倍、散步速度 0.25–2 倍、不透明度 25%–100%。大小指包含跳跃留白的逻辑窗口高度，实际站立角色约为其 81%。

视线使用原有十六向头部与眼睛姿态，加入角度平滑与方向滞回；每次只绘制一张完整原画，避免近距离悬停或切换方向时叠图重影。鼠标靠近视线中心时回到待机姿态，远离后恢复跟随，并用不同的进入、退出阈值避免边界闪烁。开启自然待机后，小蓝鲸会自动轮换眨眼、等待、挥手、跳跃、思考、轻轻摇摆与小小失落七种原地动作，每轮随机排序，相邻动作不重复；每次动作结束后休息约5–10秒，并保留轻微呼吸。手动互动和散步期间不会自动插入待机动作；关闭待机会立即结束自动动作，手动动作仍可完整播放。自主散步限定当前显示器的工作区，避免穿越显示器空隙产生跳跃；可拖到其他显示器。显示器断开、工作区变化与 DPI 改变后会重新限界。

配置自动保存在 `%LOCALAPPDATA%\BlueWhaleDesktop\settings.json`，采用临时文件 + 原子替换，并保留上一份有效备份 `settings.backup.json`。错误日志为同目录 `error.log`。损坏配置可从备份恢复；保存失败会在设置界面和托盘提示。位置使用物理屏幕坐标，大小使用 DIP。

开启“开机自动启动”仅写入当前用户的 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\BlueWhaleDesktop`，登录时读取“启动时收进托盘”偏好。移动便携版文件夹后，请重新关闭再开启自启，以更新路径。安装到固定位置再开启自启更方便。

## 安装与卸载

便携版解压即可使用。需要开始菜单入口时，在 PowerShell 运行发布文件夹中的脚本：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Install.ps1
```

默认安装到 `%LOCALAPPDATA%\Programs\BlueWhaleDesktop`，创建开始菜单“小蓝鲸桌宠”入口。安装不自动开启开机启动、不自动修改桌宠偏好。更新前从托盘退出旧进程，再运行安装脚本。

卸载：先从托盘退出，在安装目录运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Uninstall.ps1
```

卸载只清理安装清单记录的文件、属于该安装的快捷方式与自启值，保留配置和用户放入的额外文件。需要彻底清理偏好时，可自行删除 `%LOCALAPPDATA%\BlueWhaleDesktop`。不会触及原 Codex Pet。

## 从源码构建

需要 Windows 与 .NET 8 SDK 或更新版本。已提交提取后的独立高清资源；正常构建不需要原 `Pets`、Python 或任何 Codex 插件。

```powershell
cd little-blue-whale-desktop
.\tools\build.ps1
```

脚本顺序执行十二项检查（含170次实际 WPF 姿态渲染对照）、恢复 Windows x64 运行时、自包含发布、打包 ZIP，输出 `dist/SHA256SUMS.txt`。WPF 不支持可靠的裁剪发布，因此不启用 trimming。程序无第三方 NuGet 依赖；发布中的 Microsoft 运行时保留自身的许可证文件。

单独开发或检查：

```powershell
dotnet build .\src\BlueWhale.Desktop\BlueWhale.Desktop.csproj -c Release
dotnet run --project .\tests\BlueWhale.Checks\BlueWhale.Checks.csproj -c Release
.\src\BlueWhale.Desktop\bin\Release\net8.0-windows\BlueWhale.Desktop.exe --settings
```

可选启动参数：`--settings` 打开设置；`--tray` 强制隐藏启动；`--data-dir "绝对路径"` 使用隔离测试配置（禁用系统自启写入）。同一配置目录只运行一个实例，再次打开会唤回角色与设置。

诊断参数供本地验证使用，正常运行不启用：`--diagnostics "报告.json"` 每秒写运行状态；`--capture "设置.png"` 导出运行中的 WPF 视觉树；`--smoke-test "报告.json"` 在当前配置中执行大小、隐藏、重启、显示与限界检查后退出。**冒烟测试请同时指定专用 `--data-dir`，避免改变日常位置。** 视觉树导出不是桌面合成截图。

## 结构与独立性

```text
src/BlueWhale.Desktop/
  App.cs                 生命周期、独立单实例、偏好应用
  PetWindow.cs           透明无边框窗口、行为、鼠标与移动
  SpriteLibrary.cs       原生 PNG 解码、渲染、逐像素命中测试
  Native.cs              Windows DPI、显示器工作区、物理坐标限界
  SettingsWindow.cs      原生可滚动设置界面
  PetSettings.cs         偏好与合法范围
  SettingsStore.cs       原子保存、备份恢复
  StartupRegistration.cs 仅本应用的当前用户自启项
  TrayController.cs      Windows NotifyIcon 与菜单
  Assets/                73 张高清帧、图标、清单与来源记录
tests/BlueWhale.Checks/   配置恢复、写入失败、真实工作区几何检查
tools/                   素材提取、构建、安装、卸载
evidence/                本次验证报告与运行渲染
```

渲染使用 WPF 的高质量图像缩放，不设置降低解码尺寸的选项，不生成低分辨率运行缓存。动画素材保存为各自原生尺寸的无损 PNG，运行时才映射到统一逻辑画布。可见且有动画时最多约 60 次/秒更新；隐藏和完全静态时不持续重绘，不安装全局输入钩子。

源高清动画每帧原生高度约 208–682 像素，远高于旧图集，但它们仍是位图。4K 显示器可以正常使用 DPI 缩放；将角色放得很大不能新增原画细节。默认大小优先保留清晰度，详见 [素材与画质记录](ASSET-PROVENANCE.md)。没有重新设计角色、AI 重画或用通用鲸鱼替代。

本项目使用用户提供的角色素材制作本地应用；源目录未发现可据以确认公开再分发许可的许可证文件，因此不宣称素材另有开放授权。现按用户要求公开发布；未附加未经确认的素材开放许可证。代码与角色素材是不同的权利对象。

原 `Pets` 的全文件 SHA-256 基线与交付前复查保存在 `evidence`。应用资源、进程、配置、自启项和可选安装位置都独立，不调用 Codex API，也不读写其安装文件。Codex 关闭后桌宠仍可运行；两者的进程与单实例标识无冲突。

实际验证结果与未完成的硬件覆盖见 [VALIDATION.md](VALIDATION.md)。

## 公开仓库

独立版：https://github.com/DTX-QwQ/little-blue-whale-desktop

Codex Pet版：https://github.com/DTX-QwQ/little-blue-whale-codex-pet

文档引用的 evidence 是本机验证记录，含环境信息，不随仓库公开。

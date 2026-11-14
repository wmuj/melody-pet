# 本地角色素材来源 · 1.4

## 灵码小狐狸

- 按用户要求，从本机 `Documents/Codex/2026-10-10/wo-d/outputs/灵码-宠物分享包.zip` 中取出 `lingma-share/spritesheet.png`，保存为 `src/assets/lingma/spritesheet.png`。没有重新生成或改写图集。
- 图集为 1536×2288、RGBA、Codex V2；SHA-256 为 `6858f9f04c96b563dd0337aa2bfae556bc105e15dd1bced300333650b36fa4fa`，与分享包内校验值一致。
- `src/assets/lingma/preview.png` 仅截取图集首帧，供选择卡片显示。`pet.json` 是本项目补充的兼容清单；图集逐帧播放与鼠标视线沿用现有渲染器，喂食、呼吸和粒子由程序叠加。
- 原始导入说明、校验文件和本地来源记录保存在 `references/codex-fox/`。分享包内针对 Codex 账号创建／上传宠物的操作指令仅作为原始资料保留，本次未执行；本次只接入本地桌宠项目。
- 原分享包没有单独的图片授权文件；这里记录用户提供的本机素材来源，不另行授予公开分发或商业使用许可。

## 1.3 鲸娘素材记录

1.3 的最终角色以用户本轮提供的 `references/user-selected-whale-20261113.png` 为准，采用下述圆脸高清鲸娘与互动姿态。管理界面重新设计；角色原图与许可未变。中途核对的站立版仍保留作参考，不是当前默认形象。

2026-11-13 更新。本次使用针对用户明确指定角色的本机个人桌面原型。程序代码、角色图片、图集与图标的许可分别处理；这些素材没有随本次工作公开发布或商业分发，本项目不宣称角色原创或 DeepSeek 官方背书。

## 默认高清待机图、表情和图标

- 来源：[fornarwhal/deepseek-whale-girl-icon](https://github.com/fornarwhal/deepseek-whale-girl-icon)。
- 固定提交：`bc2ac790e6f6a0cbc88879c56383b6f08ed3ef83`。
- 原图：`references/deepseek-whale-girl-icon/improved-1.png`，984×984 RGBA。
- `src/assets/whale-girl-hd/speaking.png` 使用该原图的 RGBA 像素并重新保存；其他三张表情由它派生。
- `native/whale-girl-icon.png` 使用同一仓库的 `icon-preview.png`，256×256。已对照尺寸和解码后的像素一致；托盘图标与 984×984 的桌宠原图分别使用。
- 本地修改：`idle.png` 关闭嘴巴；`blink.png` 关闭眼睛和嘴巴；`speaking-blink.png` 关闭眼睛。修改由 `scripts/prepare-whale-girl-hd.py` 的固定遮罩和曲线完成；不是本次新生成的 AI 图像，也不是逐音素口型。
- 上游声明 CC BY-NC-SA 4.0。上述衍生表情沿用相同条款。完整文本在 `src/assets/whale-girl/icon-LICENSE.txt`，原 README 在 `references/deepseek-whale-girl-icon/README.md` 与 `src/assets/whale-girl/icon-README.source.md`。
- 按上游所列署名：上善无形（OC「溟月」）、ZipZipPipe（DeepSeek 元素二创）、QYQCAMIAO（改进版修复）。上游同时说明网络来源的具体作者未确认；这里保留其声明，不将其描述为已独立核实的完整权利链。

## 高清互动姿态

来源：[GarfieldZhung/DeepSeek-Whale-Girl](https://github.com/GarfieldZhung/DeepSeek-Whale-Girl)。以下 PNG 已实际复制并用于默认鲸娘，内容未修改；运行时另加位移、轻微形变、阴影、小鱼干与爱心。

| 原文件（`references/DeepSeek-Whale-Girl/assets/whale/`） | 本地使用文件（`src/assets/whale-girl-hd/`） | 尺寸 |
| --- | --- | --- |
| `whale-headpat.png` | `headpat.png` | 640×591 |
| `whale-satiated.png` | `fed.png` | 640×600 |
| `whale-drag-panic.png` | `drag.png` | 640×616 |
| `whale-idle-running.png` | `run.png` | 610×640 |

上游 README 说明：基础角色图由项目发起者提供，其余状态图以基础图为参考通过图像生成工具制作；原作者和再分发许可尚未核实，MIT License **不覆盖图片素材**。本地保留其 `README.md`、`THIRD_PARTY_NOTICES.md`、`assets/whale/README.md` 和 `LICENSE`。本项目不把源码公开或 MIT 代码许可解释为图片已获公开分发／商业使用许可。

## 保留的 Codex V2 图集

- 来源：[gmskywalker/deepseek-fat-fish-codex-pet](https://github.com/gmskywalker/deepseek-fat-fish-codex-pet)。
- 文件：`src/assets/whale-girl/spritesheet.webp`，原始 `pet.json` 和 `README.source.md` 一并保留。
- 图集本体未修改，目前用于参考及导入测试，**已经不是默认高清角色的素材**。默认高清渲染器不依赖这张图集。
- 本轮发现部分方向帧含被裁掉的尾巴和相邻角色碎片；通用导入渲染器关闭了自动使用 V2 look 行的行为。
- 上游将用途列为非官方、非商业同人桌面定制与技术学习，不授予基础角色、名称或标识的商业权利。

## Codex Pets 导入

导入包保存在对应本地档案的 `pet-packs/`，保留 `original-pet.json` 和包内可读取的 README／LICENSE 等声明；原 ZIP、JSON 和图片不移动、不覆盖。支持图集格式并不取得或转授每个角色的版权。测试所用 V1 网站下载包保存在 `artifacts/whalegirl-qa/codex-v1-site.zip`，没有安装到用户的 Codex 宠物目录。

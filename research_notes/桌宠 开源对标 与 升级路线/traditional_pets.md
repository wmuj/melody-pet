# 传统桌宠开源对标：VPet、BongoCat、PPet

研究日期：2026-11-13，Asia/Shanghai。GitHub 元数据首次抓取约 12:12；下文源码链接锁定本次抓取的默认分支提交。范围仅为公开仓库元数据、README、版本说明及关键源码静态核对；没有下载安装或运行竞品，没有实测其视觉观感、语音、资源占用或兼容性。小鲸鱼基线来自本地交付文档，本研究没有重新执行上一轮验证。

下载证据目录：[traditional_pets_sources](<E:/网易云桌宠/research_notes/桌宠 开源对标 与 升级路线/traditional_pets_sources>)。每仓库保留 `.repo.json`、`.commit.json`、`.releases.json`、`.tree.json`、README 及已取到的源码文件；文件名前缀分别为 `LorisYounger__VPet`、`ayangweb__BongoCat`、`zenghongtu__PPet`。

## 1. 哪些相似项目值得对标，它们已公开支持什么？

### Takeaway

建议以 VPet 对标养成与动作内容，以 BongoCat 对标即时输入反馈和模型生态，PPet 作为 Electron/Live2D 模型导入的历史技术参考。这里的“值得对标”是根据下列功能证据作出的选型判断，不是竞品体验排名。

### Cited Findings

- **LorisYounger/VPet：养成、动作与创作生态。** 仓库介绍为可嵌入 WPF 的开源桌宠。README 明示互动投喂，演示标题包括摸头、提起、爬墙；文案写作“32 种 × 4 状态 × 3 类型”，紧接着说明部分种类缺少生病或循环内容、实际数量更少。因此不应把乘积直接宣传成“384 个完整动作”。— [固定版本 README](https://github.com/LorisYounger/VPet/blob/c26be33d730ea5547711f6cc9781cf94e4d6ac7d/README.md#L5-L35)
- **VPet 的养成不只是好感计数。** `GameSave.cs` 存在金钱、经验、等级、体力、食物和饮水相关数值、心情、健康、好感；`EatFood` 同时更新多个数值，`CalMode` 依据健康、心情、好感计算状态。这里确认的是状态模型及相应逻辑，未验证玩家体验是否平衡。— [GameSave.cs](https://github.com/LorisYounger/VPet/blob/c26be33d730ea5547711f6cc9781cf94e4d6ac7d/VPet-Simulator.Core/Handle/GameSave.cs#L21-L285)
- **VPet 有可扩展内容的公开入口。** README 列出创意工坊支持桌宠动画、物品/食物/饮料、自定义工作、说话文本、主题及代码插件；代码插件可加动画逻辑、Live2D/Spine 显示方案或其他功能，并指向 ModMaker 和 Plugin.Demo。不能据此推定所有第三方插件均兼容。— [创意工坊与扩展说明](https://github.com/LorisYounger/VPet/blob/c26be33d730ea5547711f6cc9781cf94e4d6ac7d/README.md#L48-L65)
- **ayangweb/BongoCat：把日常操作变成即时表演。** 当前中文 README 写明 Windows/macOS、Live2D 小猫、眼神与爪子跟随鼠标、响应键盘/鼠标/手柄按键、导入自定义模型，并提供 Awesome-BongoCat 模型集合入口。这里确认的是当前项目自述功能；没有逐项实机验证。— [固定版本中文 README](https://github.com/ayangweb/BongoCat/blob/47a73ed1765b13fdd674ec356d51b5b16a6b5a5b/README.zh-CN.md#L49-L63)
- **BongoCat 当前也有自动动作调度与插件中心。** 源码的 `RandomBehaviorScheduler` 支持按间隔抽取动作或表情；v2.4.0 的发行说明列出“设置 → 插件中心”，官方首批插件为番茄时钟、按键音效、输入法状态。2026-10-27 发布的 `plugins-v1.0.0` 带有三类插件的 Windows/macOS 资产。因此不能把当前 BongoCat 简写成“只有敲键盘动画”。— [自动行为调度源码](https://github.com/ayangweb/BongoCat/blob/47a73ed1765b13fdd674ec356d51b5b16a6b5a5b/crates/bongocat-runtime/src/random_behavior.rs#L18-L153)；[v2.4.0](https://github.com/ayangweb/BongoCat/releases/tag/v2.4.0)；[首批插件发行](https://github.com/ayangweb/BongoCat/releases/tag/plugins-v1.0.0)
- **zenghongtu/PPet：轻量功能范围的 Live2D 容器参考。** 默认 `dev` 分支 README 明示支持 Live2D v2/v3、本地/在线模型导入、渲染大小、置顶、忽略点击、开机启动及拖动位置；导入既可填写模型 JSON，也可拖入本地模型目录。发行页 v3.3.0 提供 Windows、macOS、Linux 安装或打包资产。— [固定版本 README](https://github.com/zenghongtu/PPet/blob/2185c3f90600e3f809d55dbeedc7b82a341d06ca/README.md#L30-L59)；[v3.3.0](https://github.com/zenghongtu/PPet/releases/tag/v3.3.0)

### Inferences

- 对小鲸鱼最有价值的学习点是：VPet 的“状态会影响动作与互动”、BongoCat 的“每次输入都有贴合的反馈”、PPet 的“用户可用自己的模型”。可优先组合这些产品原则，不需要为了对标先迁移现有 Electron 技术栈。依据为本节三类能力及下一节的架构差异。
- “超越 GitHub”应转为有限、可观察的产品目标：更符合用户审美的原创鲸鱼、更连贯的动作、更合适的中文回应、更愿意长期放在桌面上。这里不是宣称已经领先，也不把功能数量或仓库热度等同于体验质量。

### Gaps

- 本轮没有横向安装体验，无法比较真实动作自然度、中文音色、响应时延、CPU/内存、耗电、崩溃率或屏幕遮挡程度；不能给出总体第一名。
- VPet 工作坊和 BongoCat 模型集合的内容质量、数量、兼容率没有盘点，不能据其入口存在就判断生态规模或单个素材可商用。
- PPet 历史 v1.2.0 发行说明曾写“插件中心”，但本次默认分支 README 和已读关键源码不足以确认它在 v3.3.0 的具体状态。报告不应将“PPet 没有插件”作为确定事实。— [历史发行说明](https://github.com/zenghongtu/PPet/releases/tag/v1.2.0)

## 2. 架构、授权与近期维护信号有什么差别？

### Takeaway

VPet 和 BongoCat 都有 2026 年 10—11 月的源码或发行活动；PPet 的默认分支及最近公开发行时间明显更早。维护判断应依据具体提交与发行时间，不能拿仓库 `updated_at` 或 `pushed_at` 单独充当“最近发布新版”的证明。

### Cited Findings

| 项目 | 固定版本架构与代码授权 | 本次核对的维护 / 发行信号 |
| --- | --- | --- |
| VPet | C# / WPF；Core 项目当前目标为 `net8.0-windows7.0`，启用 WPF、Windows Forms；仓库代码 LICENSE 为 Apache-2.0。— [项目文件](https://github.com/LorisYounger/VPet/blob/c26be33d730ea5547711f6cc9781cf94e4d6ac7d/VPet-Simulator.Core/VPet-Simulator.Core.csproj#L1-L16)；[LICENSE](https://github.com/LorisYounger/VPet/blob/c26be33d730ea5547711f6cc9781cf94e4d6ac7d/LICENSE) | 默认 `main` 的本次 HEAD 为 `c26be33d…`，提交时间 `2026-11-07T18:28:02Z`（北京时间 11 月 8 日），信息为“支持出售物品”；API `archived=false`。本次 GitHub releases 查询为空，但 README 指向 Steam 免费发行，不能由空列表推出没有维护或没有可用发行版。— [提交](https://github.com/LorisYounger/VPet/commit/c26be33d730ea5547711f6cc9781cf94e4d6ac7d)；[仓库 API](https://api.github.com/repos/LorisYounger/VPet)；[Releases API](https://api.github.com/repos/LorisYounger/VPet/releases?per_page=3)；[获取方式](https://github.com/LorisYounger/VPet/blob/c26be33d730ea5547711f6cc9781cf94e4d6ac7d/README.md#L9) |
| BongoCat | 当前已是 Rust 2024 Cargo workspace；GPUI 相关依赖、Live2D/Cubism 及平台适配构成桌面实现。不能沿用旧介绍直接写为 Tauri/Vue。代码 Apache-2.0。— [Cargo.toml](https://github.com/ayangweb/BongoCat/blob/47a73ed1765b13fdd674ec356d51b5b16a6b5a5b/Cargo.toml)；[已接受的架构决策](https://github.com/ayangweb/BongoCat/blob/47a73ed1765b13fdd674ec356d51b5b16a6b5a5b/docs/adr/0001-single-rust-application.md)；[LICENSE](https://github.com/ayangweb/BongoCat/blob/47a73ed1765b13fdd674ec356d51b5b16a6b5a5b/LICENSE) | 默认 `master` HEAD `47a73ed…` 为 `2026-10-28T00:12:57Z`，提交信息 `chore: release v2.4.1`。应用 v2.4.1 发布时间 `2026-10-28T00:38:02Z`，资产包含 Windows x64 exe 与 macOS dmg；API `archived=false`。— [提交](https://github.com/ayangweb/BongoCat/commit/47a73ed1765b13fdd674ec356d51b5b16a6b5a5b)；[v2.4.1](https://github.com/ayangweb/BongoCat/releases/tag/v2.4.1)；[仓库 API](https://api.github.com/repos/ayangweb/BongoCat) |
| PPet | Electron + React + TypeScript。所查 `package.json` 的 Electron 为 `16.0.6`，React 为 `^17.0.2`，版本 `3.3.0`；MIT 代码许可。— [package.json](https://github.com/zenghongtu/PPet/blob/2185c3f90600e3f809d55dbeedc7b82a341d06ca/package.json)；[Electron 窗口实现](https://github.com/zenghongtu/PPet/blob/2185c3f90600e3f809d55dbeedc7b82a341d06ca/src/main/window.ts)；[LICENSE.md](https://github.com/zenghongtu/PPet/blob/2185c3f90600e3f809d55dbeedc7b82a341d06ca/LICENSE.md) | 默认 `dev` HEAD `2185c3f…` 的提交日期 `2022-02-27T02:35:47Z`；最近一条公开 release 为 v3.3.0，发布 `2022-02-21T15:34:27Z`。API 仍为 `archived=false`，`pushed_at=2024-06-18T00:51:35Z`；这只能说明仓库曾有后续 push，不能冒充 2024 新版。— [提交](https://github.com/zenghongtu/PPet/commit/2185c3f90600e3f809d55dbeedc7b82a341d06ca)；[v3.3.0](https://github.com/zenghongtu/PPet/releases/tag/v3.3.0)；[仓库 API](https://api.github.com/repos/zenghongtu/PPet) |

- **VPet 自带动画另有授权条件。** README 将代码 Apache-2.0 与自带动画授权分开：非商用须告知来源并链接；商用另含首次醒目告知、可访问的来源说明、禁止出售动画牟利及联系作者等条款；分发动画也有说明要求。可学习玩法与架构，若要搬用其自带角色素材必须单独核查，不能只看代码许可证。— [动画版权声明与授权](https://github.com/LorisYounger/VPet/blob/c26be33d730ea5547711f6cc9781cf94e4d6ac7d/README.md#L134-L164)
- **BongoCat 的插件已经分开版本与发布。** 已接受的 ADR-0099 说明官方 SDK、三个插件和打包工具同属本仓库，插件为独立可执行程序，插件 tags 使用 `plugins-v*`，应用使用 `v*`；首个插件发行与实际 `plugins-v1.0.0` 相符。— [插件发布架构](https://github.com/ayangweb/BongoCat/blob/47a73ed1765b13fdd674ec356d51b5b16a6b5a5b/docs/adr/0099-single-repository-plugin-source.md)；[插件发行页](https://github.com/ayangweb/BongoCat/releases/tag/plugins-v1.0.0)
- **“支持离线”不等于整个软件永远不联网。** BongoCat README 宣称可离线运行；同时插件文档明确使用 HTTPS 下载目录和包。因此可把离线桌面互动作为项目自述，不应扩写为经审计确认“所有功能都不联网”“没有任何网络请求”。— [README](https://github.com/ayangweb/BongoCat/blob/47a73ed1765b13fdd674ec356d51b5b16a6b5a5b/README.zh-CN.md#L53-L63)；[插件目录与下载](https://github.com/ayangweb/BongoCat/blob/47a73ed1765b13fdd674ec356d51b5b16a6b5a5b/docs/adr/0099-single-repository-plugin-source.md)

### Inferences

- VPet、BongoCat 更适合用来确定当前产品上限和功能取舍；PPet 更适合参考模型导入及 Electron 组织方式。若考虑复用 PPet 代码，应以现代化适配成本为实际工作量，而非默认旧发布包即可满足今天的运行环境。
- 现有小鲸鱼已经使用 Electron/React/Canvas 和 Windows 原生桥接，短期没有证据证明重写 Rust 或 WPF 会比打磨动画、台词和可靠性更有产品收益。技术栈不能代替同机性能实测。— [小鲸鱼基线](<E:/网易云桌宠/README.md:5>)

### Gaps

- 没有核查全部分支、PR、社区、工作坊或作者后续计划；PPet 的上述时间不能扩写为“作者永久弃坑”。
- 代码许可证核对不覆盖全部第三方模型、Cubism SDK、插件资产及用户上传素材的权利链；本轮没有把任何竞品素材拷入小鲸鱼。
- GitHub 元数据会变化。以上 SHA 链接和本地 JSON 是本次判断的时间锚点；若准备实际依赖或集成，应重新核对目标版本。

## 3. 小鲸鱼最需要补齐的三处差距与可实现的升级是什么？

### Takeaway

优先把“原创鲸鱼动作、情境化中文声音、音乐陪伴”做成一个完整角色，再补可分享动作包与可安装交付。路线与用户当前“可爱、会说中文、会跑、先本地中文互动”的选择一致；下面是建议，不代表已经实现或已经战胜竞品。

### Cited Findings

- **现有动作和养成基线：** 当前说明已包含摸摸 +1 好感、喂食 +5、中文短句、跑一圈、拖拽惯性、睡眠；自由散步是在当前显示器工作区左右折返，保留拖放高度。已有日常可玩性，但交付文档展示的养成范围主要是好感与固定互动；VPet 的数值状态、动作条件和可配置内容明显提供了更深的设计参考。— [小鲸鱼玩法](<E:/网易云桌宠/README.md:9>)；[散步规则](<E:/网易云桌宠/README.md:28>)；[VPet 状态模型](https://github.com/LorisYounger/VPet/blob/c26be33d730ea5547711f6cc9781cf94e4d6ac7d/VPet-Simulator.Core/Handle/GameSave.cs#L21-L285)
- **现有声音和音乐基线：** 小鲸鱼用本机 Windows 语音引擎出声，可选声线、音量、语速，新互动替换旧句；README 明确“说句话”随机选中文短句，嘴巴按说话状态开合，并非逐音素对齐。音乐通过 SMTC 获取状态，实际有音频信号才分析频谱。— [中文短句](<E:/网易云桌宠/README.md:14>)；[声音实现和口型边界](<E:/网易云桌宠/README.md:24>)；[音乐与频谱](<E:/网易云桌宠/README.md:32>)
- **现有内容与交付基线：** 已支持 WebM/GIF/PNG/WebP 导入并保留原件；本轮交付验证只覆盖 PNG 导入，尚未验证完整透明视频动作包，也尚未制作独立安装包。真实网易云/QQ 音乐/Spotify 的播放、切歌、歌词同步在交付记录中仍待逐项实测；单显示器以外场景也有明确边界。— [导入能力](<E:/网易云桌宠/README.md:36>)；[验证边界](<E:/网易云桌宠/docs/验证记录.md:46>)；[安装包现状](<E:/网易云桌宠/README.md:66>)

### Inferences

1. **首先补动作连续性与角色表达。** 第一批可设计 12—18 个原创鲸鱼动作片段作为制作目标，例如慢游、起跑、刹车、落地回弹、追泡泡、接住小鱼、吃饱打嗝、害羞遮脸、开心翻滚、打哈欠、钻进小窝、听歌摆尾。每个动作都应有起势、主体、收尾，运行/拖拽/说话/睡眠之间由统一状态调度衔接。先做少量完成度高且能连贯接上的动作，再扩展数值养成。这是从 VPet 的多状态动作和 BongoCat 的即时反馈抽出的设计建议，不是说现有几何绘制已达到同等表现。建议验收：同一操作响应可辨认；起跑和停下没有突跳；拖拽、说话、睡觉不会互相抢状态；靠近即停的现有体验保留。
2. **把中文短句变成“认场合”的本地角色回应。** 在现有本地 TTS 上加情境选择与短期记录：首次见面、摸摸、投喂、连续打扰、空闲返回、开始听歌、切歌、准备睡觉各有专属话池；添加冷却、近期不复读、夜间安静时段，先把台词与对应表情/小动作绑定。音乐方面可围绕真实播放/暂停/节拍做摆尾、戴耳机、停下来听的连贯反馈。建议验收：同一场景连续互动不反复念同一句；静音立即生效；字幕、嘴巴和说话状态一致；真实播放器切歌有完整走查记录。**这里只规划本地发声与规则回应，不把现有 TTS 写成已经具备语音识别或自由对话。** 依据是当前声音/音乐实现，以及 BongoCat“操作—反馈”耦合原则。
3. **把素材导入升级为可分享的完整动作包，并补日常交付。** 可做动作映射、预览、缺失动作回退、素材尺寸/时长校验和来源说明，让原创鲸鱼包拥有完整待机/跑动/说话/睡眠状态，而不是只证明单 PNG 能显示。再制作可安装和卸载的 Windows 包，并验证透明 WebM、100%/150%/200% DPI、多屏、全屏避让、长时间驻留及真实音乐会话。建议先做数据驱动的动作与台词包，再评估可执行插件是否确有需求；VPet 的工作坊与 BongoCat 插件架构是后续参考。这些是明确的交付差距和建议，不能替代相应实测结果。

### Gaps

- “更可爱”须由用户看过实际动画和听过实际声音后评价。当前笔记不能把源代码审查转换成审美验收。
- 12—18 个动作是第一批建议规模，不是实测最优数量；制作难度受原画/骨骼或逐帧资源、目标画风和授权可用素材影响。
- 资源占用、输入到画面的延迟、长期稳定性没有竞品横向数据。若要对外表达某方面领先，应在同一机器、相同尺寸/帧率/场景下记录可复现指标；现阶段适合说“按这些维度追赶和做出特色”。
- 网易云官方桌宠来源与 AI/鲸鱼项目由其他研究任务核对，本笔记不对其归属、闭源/开源状态或优劣作结论。


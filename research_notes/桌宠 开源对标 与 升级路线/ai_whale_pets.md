# AI 陪伴项目与 DeepSeek／蓝鲸桌宠的公开来源核验

研究时间：2026-11-13（Asia/Shanghai）。本次使用公开 GitHub API、README、Release、许可证与少量功能代码；未安装、启动或实际试听这些项目。星数是抓取时快照，不是质量评分。原始证据保存在同目录 `evidence_ai_whale_20261113/`，其中 `*_snapshot.json` 记录抓取时间与主分支提交，`*_tree.json` 记录文件树，`*_code_*` 为按提交固定下载的源码。

## 1. AIRI 和 Open-LLM-VTuber 已经做到什么，哪些宣传需要区分？

### Takeaway

AIRI 和 Open-LLM-VTuber 都是比“随机台词＋动作”功能范围更广的 AI 陪伴参考，已经公开语音输入、语音输出、虚拟形象和桌面模式。AIRI 还存在音乐节拍驱动动作和持久化事实记忆实现；Open-LLM-VTuber 当前明确把长期记忆标为暂时移除，聊天历史保存不能等同于长期人格记忆。以上是公开文档与源码证据，不能直接写成我们已亲测其流畅度或中文音质。— [AIRI README](https://github.com/moeru-ai/airi/blob/1661fd814255258548adcac34ea5d5a1bb135260/README.md)；[AIRI v0.15.2](https://github.com/moeru-ai/airi/releases/tag/v0.15.2)；[Open-LLM-VTuber README](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/992309c0aa19845960228f880013d4685fde93b5/README.md)

### Cited Findings

- **AIRI 的当前快照**：`moeru-ai/airi`，51,345 星；主分支提交 `1661fd814255258548adcac34ea5d5a1bb135260`，抓取于 2026-11-13 04:13:48 UTC；Latest Release 为 `v0.15.2`，发布日期 2026-11-09。根许可证为 MIT。星数来自当日 API，之后可能变化。— [仓库元数据](https://api.github.com/repos/moeru-ai/airi)；[固定提交](https://github.com/moeru-ai/airi/commit/1661fd814255258548adcac34ea5d5a1bb135260)；[Release](https://github.com/moeru-ai/airi/releases/tag/v0.15.2)；[LICENSE](https://github.com/moeru-ai/airi/blob/1661fd814255258548adcac34ea5d5a1bb135260/LICENSE)
- **AIRI 的形象和运行形态**：README 列出浏览器版本 Stage Web、桌面版本 Stage Tamagotchi、移动版本 Stage Pocket；有 VRM（3D）与 Live2D（2D）支持，均列出眨眼、注视与闲置眼动。桌面实现已转向 Electron；不能把所有浏览器、移动与桌面能力视为在各平台完全一致。— [README 的 Body 和 Development](https://github.com/moeru-ai/airi/blob/1661fd814255258548adcac34ea5d5a1bb135260/README.md)；[桌面说明](https://github.com/moeru-ai/airi/blob/1661fd814255258548adcac34ea5d5a1bb135260/apps/stage-tamagotchi/README.md)
- **AIRI 的语音**：README 已列客户端语音识别、说话检测、浏览器与 Discord 音频输入；TTS 列出 ElevenLabs、Microsoft/Azure、OpenAI 兼容接口、阿里云以及本地 Kokoro。语音控制器有默认 30 秒转写超时、可中断当前回复的接口，默认中断淡出时间为 100 毫秒。这里的 100 毫秒是代码参数，不是本次实测端到端延迟。— [README：Ears / Mouth](https://github.com/moeru-ai/airi/blob/1661fd814255258548adcac34ea5d5a1bb135260/README.md)；[voice/controller.ts](https://github.com/moeru-ai/airi/blob/1661fd814255258548adcac34ea5d5a1bb135260/packages/core-agent/src/voice/controller.ts)
- **AIRI 已有音乐响应，不能把“跟着音乐动”宣称成独家**：v0.15.2 发布说明提到 Beat Sync，修复 Live2D 头部与 MAGIC 动作叠加的问题，并将逐拍跳变改为更平滑的运动。当前 `beat-sync.ts` 会平滑相邻节拍间隔，依据估算 BPM 选择 `swing-lr`、`balanced-v`、`punchy-v` 等头部运动样式。该证据支持“有节拍联动实现”，不支持“能理解歌曲情绪／歌词／副歌”的扩大表述。— [v0.15.2 发布说明](https://github.com/moeru-ai/airi/releases/tag/v0.15.2)；[Live2D beat-sync.ts](https://github.com/moeru-ai/airi/blob/1661fd814255258548adcac34ea5d5a1bb135260/packages/stage-ui-live2d/src/composables/live2d/beat-sync.ts)
- **AIRI 的记忆存在文档层次差异**：README 的总路线图仍将 Memory、Memory Alaya 和纯浏览器本地推理的一部分标为未完成；但 `v0.15.2` 标签下已能看到 `builtIn_readMemory`、`builtIn_writeMemory`、`builtIn_forgetMemory`，以及按条目保存事实的持久化仓库。主分支的 store 说明使用 IndexedDB，区分角色自己的事实和通用事实，默认记忆开关为开启。因此不能仅凭 README 的复选框说“AIRI 没有长期记忆”，也不能据此断言它已具备经过评测的完整语义记忆／Alaya 系统。— [README 路线图](https://github.com/moeru-ai/airi/blob/1661fd814255258548adcac34ea5d5a1bb135260/README.md)；[v0.15.2 记忆工具](https://github.com/moeru-ai/airi/blob/v0.15.2/packages/stage-ui/src/tools/memory.ts)；[v0.15.2 记忆仓库](https://github.com/moeru-ai/airi/blob/v0.15.2/packages/stage-ui/src/database/repos/memory.repo.ts)；[主分支记忆 store](https://github.com/moeru-ai/airi/blob/1661fd814255258548adcac34ea5d5a1bb135260/packages/stage-ui/src/stores/memory.ts)
- **Open-LLM-VTuber 的当前快照**：`Open-LLM-VTuber/Open-LLM-VTuber`，14,695 星；主分支提交 `992309c0aa19845960228f880013d4685fde93b5`，抓取于 2026-11-13 04:13:47 UTC；Latest Release 为 `v1.2.1`，发布日期 2025-08-26。GitHub 元数据把许可证识别为 Other／NOASSERTION，但实际根 LICENSE 明文是 MIT，并排除 Live2D 示例模型；应以文本为准。— [仓库元数据](https://api.github.com/repos/Open-LLM-VTuber/Open-LLM-VTuber)；[固定提交](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/commit/992309c0aa19845960228f880013d4685fde93b5)；[Release](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/releases/tag/v1.2.1)；[LICENSE](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/992309c0aa19845960228f880013d4685fde93b5/LICENSE)
- **Open-LLM-VTuber 的体验范围**：README 明列 Windows、macOS、Linux，Web 和桌面客户端；桌宠模式透明、置顶、点击穿透，可拖动角色；使用 Live2D 表情映射，支持点击／拖动反馈、主动说话、语音打断、摄像头与屏幕视觉输入。这里只核实到 Live2D，没有依据把它写成内建 VRM／3D 桌宠平台。— [README 功能列表](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/992309c0aa19845960228f880013d4685fde93b5/README.md)
- **Open-LLM-VTuber 的模型与语音**：README 的 LLM 后端包括 Ollama、OpenAI 兼容接口、DeepSeek 等，ASR 包括 sherpa-onnx、FunASR、Whisper 系列，TTS 包括 pyttsx3、MeloTTS、GPT-SoVITS、CosyVoice、Edge TTS 等。默认配置采用 `sherpa_onnx_asr` 与 `edge_tts`；Edge TTS 的上游明确为 Microsoft Edge 在线 TTS 服务。因此“支持完全离线”意味着选择和配置本地组件及模型，不能写成所有默认功能都断网可用或不需要安装模型。— [README 模型列表](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/992309c0aa19845960228f880013d4685fde93b5/README.md)；[默认配置](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/992309c0aa19845960228f880013d4685fde93b5/config_templates/conf.default.yaml)；[edge-tts 上游说明](https://github.com/rany2/edge-tts/blob/master/README.md)
- **Open-LLM-VTuber 的“记忆”边界**：README 第 51 行明确称长期记忆暂时移除，但聊天记录会持久保存；`basic_memory_agent.py` 的 `set_memory_from_history` 从聊天历史重建消息列表。其 `handle_interrupt` 会将最后回复改为用户实际听到的部分，并记录被打断，适合作为语音状态一致性的参考，而不是“无限记住用户”的证据。— [README](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/992309c0aa19845960228f880013d4685fde93b5/README.md#L51)；[basic_memory_agent.py](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/992309c0aa19845960228f880013d4685fde93b5/src/open_llm_vtuber/agent/agents/basic_memory_agent.py)
- **语音顺序的工程参考**：Open-LLM-VTuber 的 `TTSTaskManager` 为语音任务编号，允许并发生成、按原顺序发送；空文本或合成出错可以发送不含音频的显示载荷。它提示我们把气泡、声音、动作看作同一次反馈的协作，不能只让多个“播放”请求争抢输出。— [tts_manager.py](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/992309c0aa19845960228f880013d4685fde93b5/src/open_llm_vtuber/conversations/tts_manager.py)
- **资产许可不能由代码许可证代替**：Open-LLM-VTuber 明确将示例 Live2D 模型置于单独条款，角色可能各有约束；即使代码可按 MIT 学习复用，也不能把附带模型直接视为随便商用的美术包。— [LICENSE](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/992309c0aa19845960228f880013d4685fde93b5/LICENSE)；[LICENSE-Live2D.md](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/992309c0aa19845960228f880013d4685fde93b5/LICENSE-Live2D.md)

### Inferences

- 两者适合做 AI 陪伴能力上限的参考，不宜拿星数代替“比 MelodyPet 更可爱／更好听／更省资源”的结论。用户当前选择的是中文出声、摸摸、喂食和听歌反馈，没必要为了对标把输入法、模型下载、ASR、API 设置一并塞进首轮体验。此处是产品建议，不是已完成改动。
- AIRI 已有节拍动作，真正可争取的差异需要放在角色独有动作、音乐互动的分寸、语音听感和连续养成体验；只加一个“正在播放就摇摆”的开关不足以证明超越。

### Gaps

- 本次没有实际安装、播放语音、测量资源占用或在用户机器上运行这些项目；不能评价它们的中文发音质量、音频回声抑制效果、长时间稳定性、实际响应延迟。
- 未审计 AIRI 全部模型／SDK／素材许可证；MIT 根许可证不等于所有打包依赖与角色资产同一许可。
- 尚无同设备、同语音、同模型、同操作序列的横向试验，不能给出可验证的总体优劣排名。

## 2. 能否确认真正与 DeepSeek／蓝鲸形象有关的桌宠仓库？

### Takeaway

能确认相关公开仓库存在，且不只是“后端支持 DeepSeek”的项目：有明确自称 DeepSeek 同人桌宠的离线 Windows 应用，也有 Codex 动画素材包与独立 WPF 应用。检索到的几个重点样本主要是“大肥鱼／鲸鱼娘／蓝发女仆”，不能等同于用户当前程序绘制的原创小蓝鲸，更不能写成 DeepSeek 官方桌宠。— [ds-local-pet](https://github.com/QCYTSN/ds-local-pet)；[DeepSeek 大肥鱼 Codex Pet](https://github.com/gmskywalker/deepseek-fat-fish-codex-pet)；[小蓝鲸独立版](https://github.com/DTX-QwQ/little-blue-whale-desktop)

### Cited Findings

- **检索方式和范围**：使用 GitHub 仓库搜索，分别查询 `deepseek desktop pet`、`deepseek 桌宠`、`蓝鲸 桌宠`、`whale desktop pet`，按 stars 排序读取每组前 10 条，结果快照分别为 430、508、8、131 条。这些数量是 GitHub 搜索命中，不是经过核验的桌宠总量，也不是市场份额。结果保存为 `whale_search_0.json` 至 `whale_search_3.json`。— [查询 1](https://api.github.com/search/repositories?q=deepseek%20desktop%20pet&per_page=10&sort=stars)；[查询 2](https://api.github.com/search/repositories?q=deepseek%20%E6%A1%8C%E5%AE%A0&per_page=10&sort=stars)；[查询 3](https://api.github.com/search/repositories?q=%E8%93%9D%E9%B2%B8%20%E6%A1%8C%E5%AE%A0&per_page=10&sort=stars)；[查询 4](https://api.github.com/search/repositories?q=whale%20desktop%20pet&per_page=10&sort=stars)
- **QCYTSN/ds-local-pet：最贴近当前轻量互动目标的样本**。抓取时 47 星，主分支 `d78094b2cf04e1cc3be5d14a31cfedd8ed059579`；Latest Release `v0.2.0` 发布于 2026-08-09。README 定位 Windows 优先、离线优先的 PySide6 桌宠，列出分区触摸、投喂、物理拖拽／落地、窗口顶部落脚、分层动作、关系阶段与 470 条本地语料；它明确不加载常驻模型。470 是项目文档自述，本次没有独立清点。— [仓库元数据](https://api.github.com/repos/QCYTSN/ds-local-pet)；[README](https://github.com/QCYTSN/ds-local-pet/blob/d78094b2cf04e1cc3be5d14a31cfedd8ed059579/README.md)；[v0.2.0](https://github.com/QCYTSN/ds-local-pet/releases/tag/v0.2.0)
- **该项目有明确的同人声明与分开的资产许可**：ASSET_LICENSE 将代码、自创台词和 manifest 列为 MIT；角色图像不适用 MIT，也未额外授予图像权利；文件明示 unofficial fan-made、与 DeepSeek 无隶属或认可关系。可以研究行为算法；不能把 GitHub 上可下载的角色图像当作开放授权。— [ASSET_LICENSE.md](https://github.com/QCYTSN/ds-local-pet/blob/d78094b2cf04e1cc3be5d14a31cfedd8ed059579/ASSET_LICENSE.md)；[LICENSE](https://github.com/QCYTSN/ds-local-pet/blob/d78094b2cf04e1cc3be5d14a31cfedd8ed059579/LICENSE)
- **gmskywalker/deepseek-fat-fish-codex-pet：真实存在，但属于宿主的动画包**。抓取时 96 星；README 明示“DeepSeek 蓝色大肥鱼女仆主题的非官方 Codex 动画桌宠”，安装物是 `pet.json` 和 `spritesheet.webp`；包含工作、等候、成功、失败、左右跑动和 16 向注视等动作。它不是已经自带聊天／TTS／投喂系统的独立桌宠程序。最后一点是依据包结构和文档范围作出的类别判断。— [仓库元数据](https://api.github.com/repos/gmskywalker/deepseek-fat-fish-codex-pet)；[README](https://github.com/gmskywalker/deepseek-fat-fish-codex-pet/blob/main/README.md)
- **该 Codex 包没有可据本次确认的通用开源许可**：GitHub API 的 `license` 为 null，README 自称非官方、非商业同人，明确不授予底层知识产权商业权利。不能把它与 MIT 软件项目混写为“素材任意复用”。— [元数据](https://api.github.com/repos/gmskywalker/deepseek-fat-fish-codex-pet)；[Fan Work Notice](https://github.com/gmskywalker/deepseek-fat-fish-codex-pet/blob/main/README.md#fan-work-notice--%E5%90%8C%E4%BA%BA%E4%BD%9C%E5%93%81%E5%A3%B0%E6%98%8E)
- **DTX-QwQ/little-blue-whale-desktop：独立 Windows WPF 桌宠**。抓取时 0 星；README 定义角色为“蓝发鲸鱼女仆”，使用自包含 .NET 8 的离线 WPF 进程，列出自然待机、自主散步、16 向视线跟随、托盘、鼠标穿透、位置恢复等；明示不依赖 Codex。此处为源码仓库及其文档核验，没有运行其 exe，也没有认可它自述的硬件验证结果。— [元数据](https://api.github.com/repos/DTX-QwQ/little-blue-whale-desktop)；[README](https://github.com/DTX-QwQ/little-blue-whale-desktop/blob/main/README.md)
- **WPF 样本的图像授权有明确空白**：README 写明使用用户提供的素材，未发现可确认公开再分发许可的许可证，不宣称素材拥有开放授权。因此它可以证明“有人做了类似外形的独立桌宠”，不能作为现成合法美术包的推荐。— [README 素材说明](https://github.com/DTX-QwQ/little-blue-whale-desktop/blob/main/README.md)

### Inferences

- 对用户可以准确说：“GitHub 上确实有类似产品，也能找到 DeepSeek 同人形象的桌宠；它们有的是完整应用，有的只是动画包。”不要说“网易云桌宠就是这些仓库做的”，本分工没有核验网易云来源。
- 用户当前原创小蓝鲸可以继续发展独立角色。借鉴触摸反馈、动作过渡、台词防重复等机制，比换上来历和授权不清的“官方感”形象更直接。

### Gaps

- 本次没有发现能据以确认 DeepSeek 官方发布／授权某一鲸鱼桌宠的证据；这只是当前样本和有限查询范围内的结论，不是证明不存在。
- 本次没有做同人视觉图像的逐帧相似度检查，无法判断这些项目之间谁原创、谁复用；只报告作者自己的来源／授权表述。
- `ds-local-pet` 的 README 常把气泡台词称为“说话”，本次只核实了本地文本选择代码，未获得足够证据将其标为可听见的中文 TTS 功能。不要把文字气泡自动等同于语音。

## 3. 对 MelodyPet 当前版本，哪 2—3 件事最值得优先学习？

### Takeaway

建议先把“摸摸／喂食／听歌时会中文说话”做成有状态、节奏和连续反馈的体验，随后用真实音乐响应建立角色特色，再把可管理的本地偏好记忆与可选模型接口作为后续层。以下都是本次提出的路线建议，不代表这些改动已经实现或已获用户验收。

### Cited Findings

- **有生活节奏不一定需要 LLM**：`ds-local-pet` 的 `ActivityDirector` 根据体力、无聊、心情、亲密度和烦躁度给活动打分，维护最近 6 次活动记录；禁止紧接着重复同一活动，并对近期重复活动降权；微动作与完整活动分层。— [activity_director.py](https://github.com/QCYTSN/ds-local-pet/blob/d78094b2cf04e1cc3be5d14a31cfedd8ed059579/behavior/activity_director.py)
- **台词可以先靠本地规则变自然**：`LocalDialogue` 保存最近 12 条台词，优先从未出现的候选中选取；按 affinity 区分 new／familiar／close 三个关系层级，也根据互动和当前场景选取不同台词库。— [dialogue/local_rules.py](https://github.com/QCYTSN/ds-local-pet/blob/d78094b2cf04e1cc3be5d14a31cfedd8ed059579/dialogue/local_rules.py)
- **声音与动作需要共同管理开始、结束和打断**：Open-LLM-VTuber 为语音生成维护顺序；AIRI 为语音输出区分消音完成与中断记录完成，且有转写超时。这些机制可以缩小成当前本地 TTS 的播放队列、事件去重、失败回退和嘴型收尾，并不要求立即接入聊天模型。— [Open-LLM-VTuber TTS 管理](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber/blob/992309c0aa19845960228f880013d4685fde93b5/src/open_llm_vtuber/conversations/tts_manager.py)；[AIRI 语音控制器](https://github.com/moeru-ai/airi/blob/1661fd814255258548adcac34ea5d5a1bb135260/packages/core-agent/src/voice/controller.ts)
- **音乐动作已能做到节拍层面的平滑变化**：AIRI 的 Live2D 控制器包含多种节拍运动模式与 BPM 分档切换，可作为“节拍提取和角色演出分离”的具体参考。— [beat-sync.ts](https://github.com/moeru-ai/airi/blob/1661fd814255258548adcac34ea5d5a1bb135260/packages/stage-ui-live2d/src/composables/live2d/beat-sync.ts)
- **记忆可以先保持小而可编辑**：AIRI 的条目模型用短描述作为索引、正文保存事实，提供保存、读取、忘记；这比笼统承诺“无限记忆”更容易交付、解释和纠正。— [v0.15.2 记忆工具](https://github.com/moeru-ai/airi/blob/v0.15.2/packages/stage-ui/src/tools/memory.ts)

### Inferences

1. **第一优先：完整的中文互动回路。** 同一次摸摸或喂食，让眼神、姿态、气泡、中文短句和嘴型共同开始和收尾；区别轻点／连续摸、饿／饱、初识／熟悉；本地台词防重复，控制冷却与优先级，避免快速连点把声音堆成队列。可验收目标是“连续操作十次不重叠播放、不遗留张嘴、不过期补播”，而不是台词数量无限增加。保留现有离线中文语音路线，不需要 API key。
2. **第二优先：小蓝鲸自己的音乐表现。** 先明确播放、暂停、切歌对应的不同反馈；真正接到音频能量／节拍后，再让头、尾、鳍与身体分层响应，并对速度和幅度做平滑过渡；语音应短，减少盖过歌曲的频率。把真实踩点与仅依播放状态摇摆分开验收。AIRI 已有 Beat Sync，超越目标需要靠表现力和音乐相处的分寸落地。
3. **第三优先：连续陪伴和可选扩展。** 先保存名字、音色、互动偏好、熟悉度与最近行为，提供可查看／清空的本地记录；完整动画拥有起势、主体、收尾，人工互动能自然打断。以后再把自由聊天、ASR、局部模型／远端模型变成自愿开启的增强项；在用户当前范围内不索要凭证、不自动配置 API，也不把聊天模型设成使用桌宠的门槛。

### Gaps

- 此分工没有逐行审查 MelodyPet 当前源码；当前能力来自协调者给定的 v1.1 项目背景，具体差距和实现成本应由主任务结合本地源码决定。
- 尚未给出经过测试的性能、识别精度或情绪质量指标。上述验收点是建议，不能将其写成已经通过。

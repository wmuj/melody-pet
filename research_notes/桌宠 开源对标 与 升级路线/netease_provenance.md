# 网易云官方桌宠：开源出处与证据边界

核查时间：2026-11-13（Asia/Shanghai）。任务仅限公开资料与已安装文件的只读检查；未安装或执行第三方项目，未修改网易云客户端，未登录账号或发送外部消息。证据目录：`E:\网易云桌宠\research_notes\桌宠 开源对标 与 升级路线\evidence_netease`。

## 网易云官方桌宠是否已在 GitHub 开源？

### Takeaway

本次检查**没有找到网易云音乐官方公开发布的完整桌宠源代码仓库，也没有找到可核验的官方桌宠开源公告**。准确回答应为“目前未查到官方开源出处”，不能由此升级成“已证明永远闭源”，更不能仅因为它包含开源组件就断言“网易云桌宠是从 GitHub 拿来的”。

### Cited Findings

- GitHub 的 `NetEase` 组织资料将官网链接指向 `https://opensource.netease.com/home`；官方开源站此次可访问，页面标题为“网易开源”。这是本次采用的官方开源入口。— [GitHub 组织资料](https://api.github.com/orgs/NetEase)；[网易开源](https://opensource.netease.com/home)。本地原始证据：`evidence_netease/initial_1.txt`、`official_3.txt`。
- GitHub API 当前一次返回该组织全部 **94 个公开仓库**；本次检查了返回仓库的名称和简介，未发现对应网易云桌宠的项目。该检查没有逐个审计 94 个仓库的所有源文件，也不覆盖网易可能使用的所有其他组织。— [组织公开仓库清单](https://api.github.com/orgs/NetEase/repos?per_page=100&type=public)。证据：`official_1.txt`。
- 网易确实有可明确归属的开源项目，例如 `NetEase/tango` 的 README 将其描述为低代码构建器，并写有“Tested in the production environment of NetEase Cloud Music”。这一仓库是低代码开发项目，README 不将其描述成桌宠产品。— [NetEase/tango README](https://github.com/NetEase/tango/blob/main/README.md)。证据：`official_tango_readme.md`。
- GitHub 仓库元数据检索 `网易云 桌宠` 返回 2 个项目：`wocwang/cortico-world-netease-companion`、`FeiyangHong/Kiana-Desktop-Pet`；`netease desktop pet` 返回 `we-stronger/DeskPet`。它们的仓库拥有者均不同于 `NetEase`；前两者的简介分别写“网易云音乐陪听 World”和“琪亚娜（非官方）”。这些命中本身不能用作官方源码来源证明。— [“网易云 桌宠”搜索结果](https://api.github.com/search/repositories?q=%E7%BD%91%E6%98%93%E4%BA%91%20%E6%A1%8C%E5%AE%A0&per_page=50)；[“netease desktop pet”搜索结果](https://api.github.com/search/repositories?q=netease%20desktop%20pet&per_page=50)。证据：`search_1.json`、`search_2.json`。
- 扩大到 README 检索后，`"网易云" "桌宠" in:readme` 返回 238 个结果；本次读取了 API 返回的前 100 个元数据，并对最相关的项目另取 README。README 提到网易云、可打开网易云或使用网易云资源，不能自动证明项目是网易发布的。— [扩展仓库检索](https://api.github.com/search/repositories?q=%22%E7%BD%91%E6%98%93%E4%BA%91%22%20%22%E6%A1%8C%E5%AE%A0%22%20in%3Areadme&per_page=100)。证据：`search_extended_1.json`。

### Inferences

- 用户问“网易云那个是不是也是 GitHub 上的”时，应区分“网上有相似桌宠”“客户端使用开源组件”“官方完整产品源码在 GitHub”三个命题；前两者不能推出第三者。
- 目前没有依据说网易云桌宠抄自某个已找到的 GitHub 桌宠项目。共同使用透明窗口、浏览器渲染、WebM 或同类交互，只能说明技术方案相似，不能单独建立代码来源关系。

### Gaps

- 本次未获得网易针对桌宠的完整源码仓库、明确开源声明、官方源码下载入口或源代码许可证。
- GitHub 组织列表与仓库搜索不是全球穷尽证明：没有扫描私人仓库、全部其他网易组织或所有历史提交；没有使用需要登录的 GitHub 全文代码搜索。
- 多个 Bing 组合查询返回泛化结果，因此没有用“搜索不到”本身推导确定闭源；查询 HTML 保存在证据目录，仅用于复核查询局限。

## CEF、网易云 API 与第三方项目分别能证明什么？

### Takeaway

本机客户端**确实包含 CEF**，这是此次重新取得的直接文件证据；CEF 是通用开源浏览器嵌入框架。它不等于网易云桌宠的动作设计、业务代码和角色资源也已开源；公开 API 封装和独立兼容宿主同样属于不同项目。

### Cited Findings

- 本次只读读取 `D:\CloudMusic\cloudmusic.exe` 的版本资源，文件版本为 **3.1.43.205627**，产品名为 `NetEase Cloud Music`、公司为 `NetEase`；同目录 `libcef.dll` 产品名为 `Chromium Embedded Framework (CEF) Dynamic Link Library`，版本为 **91.2.3+g3268653+chromium-91.0.4472.169**；`cloudmusic.dll` 与 `package\orpheus.ntpk` 也确实存在。这只证实当前文件与版本，没有重新验证历史对话里的桌宠函数名、透明 WebM 或双解码器实现。— [本机文件版本证据](<E:/网易云桌宠/research_notes/桌宠 开源对标 与 升级路线/evidence_netease/local_installed_files.json>)。
- CEF 自己的 README 定义它为“a simple framework for embedding Chromium-based browsers in other applications”，并明确为“BSD-licensed open source project”；其用途包括原生应用中的浏览器控件以及离屏 Web 渲染。— [CEF README](https://github.com/chromiumembedded/cef/blob/master/README.md)；[CEF LICENSE](https://github.com/chromiumembedded/cef/blob/master/LICENSE.txt)。证据：`lineage_3.txt`、`followup_4.txt`。
- `Binaryify/NeteaseCloudMusicApi` 的仓库描述是“网易云音乐 Node.js API service”，API 当前标记 `archived: true`，README 现在只写“保护版权,此仓库不再维护”并列出新闻链接。其拥有者为 `Binaryify`，它是 API 服务项目，现有描述没有声称发布官方桌宠源码。— [仓库元数据](https://api.github.com/repos/Binaryify/NeteaseCloudMusicApi)；[原仓 README](https://github.com/Binaryify/NeteaseCloudMusicApi/blob/master/README.MD)。证据：`lineage_1.txt`、`repo_readme_1.md`。当前 GitHub 元数据没有返回许可证，不能凭记忆填写旧许可证。
- `YUCLing/open-orpheus` 将自己称为“一个对网易云音乐 Orpheus 浏览器宿主的开源实现”，并明确声明“与网易公司没有任何关联、授权或认可关系”；同时写“本项目不包含、不分发任何归网易所有的资产或代码”，提到运行资源如 `orpheus.ntpk` 归网易所有、由用户取得或从官方 CDN 下载。以上是项目维护者对其自身边界的声明，不是网易的背书。— [Open Orpheus README](https://github.com/YUCLing/open-orpheus/blob/main/README.md)。证据：`repo_readme_2.md`。GitHub 元数据将该项目代码许可识别为 MIT： [元数据](https://api.github.com/repos/YUCLing/open-orpheus)，证据 `followup_3.txt`。
- `MerZlin/dsh-pet-indesktop` 的“项目来源与素材声明”明确写“本项目改自、源于 PC2005-cloud/dsh-pet”；README 说可通过音乐菜单打开网易云音乐、QQ 音乐等播放器。其已声明的上游关系是 DSH 桌宠移植；网易云菜单联动没有构成“网易官方桌宠源码”的声明。— [MerZlin README](https://github.com/MerZlin/dsh-pet-indesktop/blob/main/README.md)。证据：`repo_readme_4.md`。
- `PC2005-cloud/dsh-pet` 的 README 将代码许可写为 MIT，同时单列形象为社区二创 DeepSeek“大肥鱼”、非 DeepSeek 官方形象，形象授权写 CC BY-NC-SA 4.0。若未来考虑采用这个项目，须将代码与角色/动画许可分开核查；本次没有把 GitHub 上的鲸鱼移入用户项目。— [DSH Pet README 的许可说明](https://github.com/PC2005-cloud/dsh-pet/blob/main/README.md)。证据：`repo_readme_3.md`。这里转述维护者声明，未独立追验其引用的 B 站原型授权全文。

### Inferences

- 可以对用户说：“你电脑上的网易云确实用了 GitHub 上能找到源码的 CEF；但 CEF 相当于渲染基础设施，不能因此说网易云整套桌宠来自 GitHub。”
- 现有证据建立了 `MerZlin/dsh-pet-indesktop → PC2005-cloud/dsh-pet` 这一维护者公开声明的上游关系，**没有**建立 `网易云官方桌宠 → 上述 GitHub 项目` 的关系。
- Open Orpheus 是特别容易混淆的一类：独立开源宿主可以加载另一方拥有的资源，而资源和完整产品的开源状态仍需单独查证。

### Gaps

- 没有在本次任务中重新做网易云二进制逆向，因此不能把先前用户粘贴的 `DesktopPetWindow`、`DesktopPetOsrWindow`、`DesktopPetClickThroughController` 与双视频解码器等说法升级为此次核实结果。
- 本次没有建立官方桌宠角色、动画文件和任何第三方 GitHub 素材的一对一来源关系。
- 第三方 README 中的性能、功能和许可表述属于作者声明；本次未运行这些项目，也没有测其真实资源占用。

## 官方功能资料的证据强度怎样，能给当前音乐桌宠什么启发？

### Takeaway

官方软件下载入口可以核验；桌宠详细功能目前主要获得二级材料与一条官方账号候选微博的搜索索引线索，后者原文访问受访客/登录机制限制。可以据此形成产品研究假设，但不要把付费规则、角色清单、生成次数或上线日期当成已经官方核实的事实。

### Cited Findings

- 网易云官方客户端下载页当前可访问，页面为客户端分发入口；本次取得的 HTML 未包含完整桌宠开发说明、UGC 素材规范或桌宠开源声明。— [官方下载页](https://music.163.com/download)。证据：`official_2.txt`。
- 一篇完整可读的什么值得买文章描述网易云 PC 桌宠会随播放状态切换跳舞/睡觉、点击回应、拖动，并显示歌词；文章同时将部分收费/自定义结论标为社区实测，而非官方公告。这是**二级材料中的产品描述**，不是本次亲测，也不是网易官方定价依据。— [文章全文](https://post.smzdm.com/p/avgpvx3p/)。证据：`context_1.txt`。
- 同一二级材料转述“缺少些过渡动画，有点生硬”和点击反馈动作库有限的评价，也谈到上传自家宠物照片的情感价值；这里可作为待验证的改进方向，不能把转述评价写成我们独立测得的产品缺陷。— [文章全文](https://post.smzdm.com/p/avgpvx3p/)。证据：`context_1.txt`。
- 第三方桌宠 MerZlin 项目的 README 对“隐藏后暂停动画解码与活动定时器”“素材懒加载、预热”等能力有明确介绍，说明桌宠作者也在把常驻开销和打扰程度当成产品设计问题。性能效果只按作者声明理解。— [MerZlin README](https://github.com/MerZlin/dsh-pet-indesktop/blob/main/README.md)。证据：`repo_readme_4.md`。

### Inferences

- **建议一：把音乐状态做成角色行为。** 播放时跟随节奏、暂停后放松、切歌时给一个短反应，会比普通悬浮动画更像音乐伴侣。是否接入歌词和曲目信息应由真实可用的数据源决定；建议不是已实现能力，也不需要因此立即改成大模型路线。
- **建议二：先把少量动作衔接做顺。** 对当前原创鲸鱼，可以优先统一呼吸、游动、拖拽、点击、说话的动作优先级和过渡，让中文本地语音与表情动作同步。以手感和一致性拉开差距，数量多的动画库不自动等于更好的陪伴体验。
- **建议三：让陪伴可控且安静。** 将一键静音/收起、全屏避让、低频主动发声、闲置降耗作为验收项；为角色保留原创外形和可辨认性。先体验验证，再宣称超过竞品，不能从功能表直接得出“全面超越”。

### Gaps

- 搜索结果找到候选官方微博 [网易云音乐“宠物模式”帖子](https://www.weibo.com/1721030997/RnRdFayR7)，摘要写“网易云音乐电脑端‘宠物模式’上线”。直接 GET 返回 `Sina Visitor System`，AJAX 返回 403，未获得完整正文或独立核验作者身份。另一个 [聚合详情链接](https://www.weibo.com/2/detail/5356861232517269) 提及昵称、性格和上传图片，但同样未完成正文验证。证据：`web_query_1.html`、`weibo_3.txt`、`weibo_4.txt`、`followup_1.txt`、`followup_2.txt`。这些只能作为后续人工打开的线索，不能当作已读全文。
- 未找到可访问、可独立验证的官方桌宠创作/UGC 素材标准、官方开源协议或官方开发者 SDK。官方主站里搜到的旧“怎么弄桌宠”专栏也可能是用户内容，不应用来替代当前官方产品说明。
- 本次没有评测网易云桌宠的真实动画流畅度、内存/CPU、声音体验或付费边界；不会把二级材料的会员描述和上市日期写成当前保证。

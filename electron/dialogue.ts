import type { CompanionMemory, PetSettings, PetTouchZone } from './shared';
import { todayCounts } from './companion-state';

export interface DialogueContext {
  name?: string; songTitle?: string; artist?: string; isPlaying: boolean; affection: number;
  customCorpus?: string[]; reason: 'idle' | 'tap' | 'feed' | 'song' | 'talk' | 'wake' | 'greet';
  zone?: PetTouchZone; full?: boolean; rapid?: boolean; memory?: CompanionMemory; now?: number;
  mascot?: 'lingma';
}

export function dialogueMascot(settings: Pick<PetSettings, 'theme' | 'activePackId'>): 'lingma' | undefined {
  return settings.activePackId === 'builtin' && settings.theme === 'lingma' ? 'lingma' : undefined;
}

// Exact stock-line substitutions keep user names, song titles and custom dialogue intact.
const LINGMA_LINES: Record<string, string> = {
  '头饰都要摸歪啦，让我扶一下。': '耳朵都要摸倒啦，让我竖起来。',
  '小鲸鱼今天的快乐，到账啦。': '小狐狸今天的快乐，到账啦。',
  '你碰到一只正在发呆的大肥鱼。': '你碰到一只正在发呆的小灵狐。',
  '小裙子整理好了，可以出发。': '绒毛梳理好了，可以出发。',
  '小鲸鱼的秘密方向盘，被你找到了。': '小狐狸的秘密方向盘，被你找到了。',
  '这不是裙摆，是一整条鲸鱼尾巴。': '毛茸茸的大尾巴，要轻轻摸哦。',
  '再这样摸，头饰要飞走啦。': '再这样摸，耳朵要躲起来啦。',
  '一只小鲸鱼，正在努力接住摸摸。': '一只小狐狸，正在努力接住摸摸。',
  '小鲸鱼满格啦，暂时不用充电。': '小狐狸满格啦，暂时不用充电。',
  '小鲸鱼重新上线。今天想玩什么？': '小狐狸重新上线。今天想玩什么？',
  '小鲸鱼到位。今天也慢慢来。': '小狐狸到位。今天也慢慢来。',
  '早呀，小鲸鱼也准备好迎接今天了。': '早呀，小狐狸也准备好迎接今天了。',
  '咕噜，小鲸鱼路过。': '一只小狐狸轻轻路过。',
  '整理好头饰，继续认真发呆。': '抖抖耳朵，继续认真发呆。',
};
const HEAD = [
  '嘿嘿，被你摸到啦。', '头饰都要摸歪啦，让我扶一下。', '再一下，就一下嘛。',
  '收到一个摸摸，回赠一个小小的开心。', '头顶暖暖的，心情也跟着亮起来了。',
  '别急，我把呆毛整理好再给你摸。', '这一摸，我可以开心好一会儿。',
  '你一伸手，我就知道啦。', '唔，这个位置刚刚好。', '尾巴已经替我说谢谢了。',
  '小鲸鱼今天的快乐，到账啦。', '在呢。抬头就能看见你。', '这边也要摸摸，公平一点嘛。',
  '好啦，我已经充好电了。',
];
const BODY = [
  '握握手，今天也请多关照。', '咦，是在叫我吗？', '小手借你一下，记得还我。',
  '接住你的招呼啦。', '我站稳啦，你想玩什么？', '嘿嘿，有一点点痒。',
  '我在这边。尾巴在那边。', '你碰到一只正在发呆的大肥鱼。',
  '小裙子整理好了，可以出发。', '给你一个轻轻的击掌。', '嗯？听到啦。',
  '靠近一点点，快乐也近一点点。', '手手暖好了，分你一点。',
];
const TAIL = [
  '呀，尾巴被发现了！', '这个不是充电线，是我的尾巴。', '尾巴说它也想被夸。',
  '轻一点，它有自己的小脾气。', '摆一下，再摆一下。看清楚了吗？',
  '摸到尾巴，要送我一个笑脸哦。', '别挠别挠，尾巴要打结啦。',
  '尾巴负责平衡，我负责可爱。', '被你碰到，它就停不下来啦。',
  '好吧，借你摸一下下。', '小鲸鱼的秘密方向盘，被你找到了。',
  '尾巴已经向你挥手啦。', '这不是裙摆，是一整条鲸鱼尾巴。',
];
const RAPID = [
  '慢一点啦，我的呆毛快数不过来啦。', '摸摸收到，先让我站稳。', '嘿嘿，开心得有点晕。',
  '手速好快！我申请喘一小口气。', '别挠啦，我已经笑出小浪花了。', '给呆毛留一秒钟休息嘛。',
  '再这样摸，头饰要飞走啦。', '好好好，我知道你喜欢我啦。', '一只小鲸鱼，正在努力接住摸摸。',
  '排队排队，快乐慢慢来。', '我没有逃跑，只是在找平衡。', '等一下，让尾巴先停下来。',
  '今天的摸摸好多呀。先给你回一个。',
];
const FEED = [
  '啊呜，小鱼干收到了。', '这口脆脆的，好吃！', '等我嚼完，再跟你说话。',
  '谢谢投喂，尾巴先开心一下。', '吃完这一口，就去散个步。', '小鱼干和好心情，一起收下了。',
  '慢慢嚼，快乐就能久一点。', '这一口，我认真吃掉啦。', '嘴角有没有小碎屑？',
  '收到今日补给，准备继续陪你。', '啊呜。小点心，大满足。', '别看我，先让我吃完这一小口。',
  '今天也有被好好投喂呢。',
];
const FULL = [
  '刚刚吃饱啦，这份先留着，好不好？', '小鱼干先收好，我去消消食。', '肚子说，要休息一下。',
  '啊呜暂停，散步开始。', '这会儿真的吃不下啦，等一小会儿。', '把这一口留到下一次吧。',
  '已经吃得暖乎乎了，陪我走两步。', '小鲸鱼满格啦，暂时不用充电。',
  '再吃就跑不快啦，先歇一歇。', '谢谢你惦记我，我刚刚吃过啦。',
  '先把点心放好，回来再吃。', '这一份晚点再给我吧。', '我记得刚才的投喂，还没消化完呢。',
];

/** Recent-history selection also rotates gracefully when a custom corpus is small. */
export class DialogueDeck {
  private recent: string[] = [];
  constructor(private random: () => number = Math.random) {}
  reset() { this.recent = []; }
  choose(lines: string[]) {
    const unique = [...new Set(lines.map(line => line.trim()).filter(Boolean))];
    if (!unique.length) return '';
    let pool = unique.filter(line => !this.recent.includes(line));
    if (!pool.length) {
      const oldest = Math.min(...unique.map(line => this.recent.lastIndexOf(line)));
      pool = unique.filter(line => this.recent.lastIndexOf(line) === oldest);
    }
    const line = pool[Math.min(pool.length - 1, Math.floor(Math.max(0, this.random()) * pool.length))];
    this.recent = [...this.recent, line].slice(-12);
    return line;
  }
  pick(opts: DialogueContext): string {
    const name = opts.name || '泡泡';
    const fox = opts.mascot === 'lingma';
    const choose = (lines: string[]) => this.choose(fox ? lines.map(line => LINGMA_LINES[line] ?? line) : lines);
    const now = opts.now ?? Date.now();
    const today = opts.memory ? todayCounts(opts.memory, now) : null;
    if (opts.reason === 'tap') return opts.customCorpus && opts.customCorpus.length >= 6 && !opts.rapid ? this.choose(opts.customCorpus) : choose(opts.rapid ? RAPID : opts.zone === 'tail' ? TAIL : opts.zone === 'body' ? BODY : HEAD);
    if (opts.reason === 'feed') return choose(opts.full ? FULL : FEED);
    if (opts.reason === 'song') {
      const title = (opts.songTitle || '这首歌').slice(0, 26);
      return choose([`在听《${title}》呀，我陪你。`, `《${title}》，${fox ? '小狐狸' : '小鲸鱼'}也就位啦。`,
        `换到《${title}》了，那我安静听一会儿。`, `收到，《${title}》。一起听吧。`,
        `给《${title}》留一点安静，我就在旁边。`, `《${title}》开始啦，尾巴也准备好了。`]);
    }
    if (opts.reason === 'wake') return choose(['醒啦！先伸个懒腰。', '唔，睡得软乎乎的。你在呀。', '小鲸鱼重新上线。今天想玩什么？', '等我把玩偶放好，就来陪你。']);
    if (opts.reason === 'greet') return opts.memory?.firstAt
      ? choose([`回来啦，${name}在这里。`, '又见面啦。我们的小记录还好好放着呢。', '小鲸鱼到位。今天也慢慢来。'])
      : `我是${name}。摸摸头，或者叫我跑一圈吧。`;
    if (opts.customCorpus?.length) return this.choose(opts.customCorpus);
    if (opts.reason === 'talk') {
      const lines = [
        `我是${name}，叫我${fox ? '小灵狐' : '大肥鱼'}也可以。`, '你忙你的，我就在旁边晃晃尾巴。',
        '想看我跑步吗？我已经准备好啦。', '今天的计划：认真发呆，偶尔可爱。',
        '有点累的话，我们一起歇一会儿。', '我刚刚在想，小鱼干会不会也做梦。',
        '一小口水，一小段休息。陪我试试？', '我有一条尾巴，所以转身要慢一点。',
        '你看，我的呆毛还挺有精神。', '想安静的时候，让我睡个小觉就好。',
        '小小的开心，也可以认真收藏。', '现在没有急事，我们慢慢来。',
        '我的尾巴摇来摇去，有没有挡到你？',
      ];
      if (today?.feed) lines.push('记得你今天喂过我，小鱼干很好吃。');
      if (today && today.tap >= 5) lines.push(`今天已经收到你 ${today.tap} 次摸摸啦。`);
      const song = opts.memory?.events.slice().reverse().find(e => e.kind === 'listen' && e.title);
      if (song) lines.push(`我们的记录里还有一起听过的《${song.title!.slice(0, 26)}》呢。`);
      return choose(lines);
    }
    const hour = new Date(now).getHours();
    return choose([
      hour < 11 ? '早呀，小鲸鱼也准备好迎接今天了。' : hour < 18 ? '有空的话，一起伸个懒腰吧。' : '夜晚慢下来，我在旁边陪着你。',
      '咕噜，小鲸鱼路过。', '喝口水吧，给自己放个小小的假。',
      opts.isPlaying ? '你听歌，我在旁边陪着。' : '我在这里，有事摸摸我的头。',
      '整理好头饰，继续认真发呆。', '今天也给快乐留一点位置。',
    ]);
  }
}

import React, { useState } from 'react';
import { Heart, Fish, Footprints, Music2, MessageCircle, Trash2, X } from 'lucide-react';
import { relationship, todayCounts } from '../../electron/companion-state';
import type { PetCareState } from '../pet/careSystem';
import type { CompanionEvent, CompanionEventKind, CompanionMemory } from '../types';

const ICONS = { tap: Heart, feed: Fish, talk: MessageCircle, run: Footprints, listen: Music2 };
function eventText(event: CompanionEvent) {
  if (event.kind === 'tap') return event.zone === 'tail' ? '碰了碰尾巴，发现一个小秘密。' : event.zone === 'body' ? '握握手，打了个小小的招呼。' : '摸摸头，收下这一点开心。';
  if (event.kind === 'feed') return '吃掉一份小鱼干。';
  if (event.kind === 'talk') return '叫她说了一句话。';
  if (event.kind === 'run') return '开始了一段桌面小跑。';
  return `一起听过《${event.title || '未命名歌曲'}》${event.artist ? ` · ${event.artist}` : ''}`;
}

export function CompanionJournal({ memory, name, care, affection = 30, packsCount = 0 }: { memory: CompanionMemory; name: string; care?: PetCareState; affection?: number; packsCount?: number }) {
  const [confirm, setConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const today = todayCounts(memory);
  const stats: { kind: CompanionEventKind; label: string; suffix: string }[] = [
    { kind: 'tap', label: '摸摸', suffix: '次' }, { kind: 'feed', label: '小鱼干', suffix: '份' },
    { kind: 'run', label: '小跑', suffix: '次' }, { kind: 'listen', label: '一起听', suffix: '次' },
  ];
  const badges = [
    { id: 'first', emoji: '🌱', title: '初次相遇', desc: '完成第一次桌面互动', done: Boolean(memory.firstAt) || (care?.totalFedCount || 0) > 0 },
    { id: 'foodie', emoji: '🍰', title: '甜品投喂官', desc: '累计投喂零食满 5 次', done: memory.totals.feed + (care?.totalFedCount || 0) >= 5 },
    { id: 'melody', emoji: '🎵', title: '音乐知己', desc: '一起听歌记录满 3 首', done: memory.totals.listen >= 3 },
    { id: 'stylist', emoji: '🎀', title: '时尚穿搭师', desc: '解锁 6 件以上衣橱配饰或小窝', done: (care?.unlockedIds.length || 0) >= 11 },
    { id: 'nest', emoji: '🛋️', title: '温馨筑巢师', desc: '摆放全部 4 件微缩房间家具', done: (care?.roomProps.length || 0) >= 4 },
    { id: 'collector', emoji: '🐾', title: '萌宠大家族', desc: '小屋收藏超过 12 位伙伴', done: packsCount >= 12 },
    { id: 'rich', emoji: '🪙', title: '糖币小富翁', desc: '持有超过 200 枚音符糖币', done: (care?.coins || 0) >= 200 },
    { id: 'soulmate', emoji: '💖', title: '灵魂伴侣', desc: '亲密度达到 100 点以上', done: affection >= 100 },
  ];
  return <div className="companion-journal">
    <div className="panel-heading"><h2>我们的相处日记。</h2><p>{name}记住的，是在这里发生过的小事。</p></div>
    <div className="journal-bond"><Heart size={15} /><strong>{relationship(memory)}</strong><span>{memory.firstAt ? `从 ${new Date(memory.firstAt).toLocaleDateString('zh-CN')} 开始记录` : '从下一次摸摸开始'}</span></div>
    <h3 className="journal-section-title">今天的点滴</h3>
    <div className="journal-stats">{stats.map(({ kind, label, suffix }) => {
      const Icon = ICONS[kind];
      return <div key={kind}><span><Icon size={14} />{label}</span><strong data-testid={`today-${kind}`}>{today[kind]}<small>{suffix}</small></strong><p>累计 {memory.totals[kind]} {suffix}</p></div>;
    })}</div>
    <h3 className="journal-section-title">🏅 陪伴纪念章手账墙（已点亮 {badges.filter(b => b.done).length} / {badges.length}）</h3>
    <div className="journal-badges-grid">
      {badges.map(b => (
        <div key={b.id} className={`journal-badge-card ${b.done ? 'is-unlocked' : 'is-locked'}`}>
          <span className="journal-badge-emoji">{b.emoji}</span>
          <div>
            <strong>{b.title}</strong>
            <small>{b.desc}</small>
          </div>
          <em>{b.done ? '已点亮' : '待解锁'}</em>
        </div>
      ))}
    </div>
    <div className="journal-list-heading"><h3 className="journal-section-title">最近的片段</h3>
      <button className="journal-clear" disabled={!memory.events.length || clearing} onClick={() => { setConfirm(true); setError(''); }}><Trash2 size={13} />清空记录</button>
    </div>
    {confirm && <div className="journal-confirm" role="alertdialog" aria-label="清空相处记录">
      <p>清空这些片段和互动次数？名字、亲密度和设置会保留。</p>
      <div><button className="button button-soft" disabled={clearing} onClick={() => {
        setClearing(true);
        void window.melodyPet.clearCompanionMemory().then(() => setConfirm(false)).catch(() => setError('没能清空记录，请再试一次。')).finally(() => setClearing(false));
      }}>{clearing ? '正在清空…' : '确认清空'}</button><button className="button button-text" disabled={clearing} onClick={() => setConfirm(false)}><X size={13} />先留着</button></div>
    </div>}
    {error && <p className="field-error" role="alert">{error}</p>}
    {memory.events.length ? <ol className="journal-events">{memory.events.slice(-40).reverse().map(event => {
      const Icon = ICONS[event.kind];
      return <li key={event.id}><span className={`journal-event-icon is-${event.kind}`}><Icon size={14} /></span>
        <div><p>{eventText(event)}</p><time dateTime={new Date(event.at).toISOString()}>{new Date(event.at).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</time></div></li>;
    })}</ol> : <div className="journal-empty"><Heart size={25} /><p>还没有留下相处片段。</p><span>摸摸她、喂一份小鱼干，或叫她跑一圈吧。</span></div>}
    <p className="journal-footnote">记录保存在这台电脑。保留最近 240 条片段，此处展示最近 40 条；累计次数继续保存。一起听歌需播放器连续报告播放 10 秒。</p>
  </div>;
}

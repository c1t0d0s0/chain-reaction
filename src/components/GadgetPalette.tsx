import React, { useState } from 'react';
import { GadgetType } from '../types';
import { useI18n } from '../i18n';
import {
  MousePointer2,
  CircleDot,
  Flag,
  Minus,
  BrickWall,
  Layers,
  Zap,
  Scale,
  CupSoda,
  Pipette,
  Activity,
  Wind,
  Compass,
  Radio,
  Filter,
  Bell,
  RotateCw,
  ArrowUpDown,
  CornerUpRight,
  Droplet
} from 'lucide-react';

interface PaletteItem {
  type: GadgetType;
  label: string;
  category: 'core' | 'ramp' | 'reaction' | 'bounce' | 'field';
  description: string;
  icon: React.ReactNode;
}

const PALETTE_ITEMS: PaletteItem[] = [
  // Core Start/Goal
  {
    type: 'start_gate',
    label: 'スタート台',
    category: 'core',
    description: 'ビー玉の出発点',
    icon: <Flag className="w-5 h-5 text-emerald-400" />
  },
  {
    type: 'goal',
    label: 'ゴール',
    category: 'core',
    description: 'ピタゴラ成功検知ゴール',
    icon: <Flag className="w-5 h-5 text-red-400" />
  },
  {
    type: 'marble',
    label: 'ビー玉',
    category: 'core',
    description: '転がるメインボール',
    icon: <CircleDot className="w-5 h-5 text-sky-400 fill-sky-400/30" />
  },

  // Ramps & Chutes
  {
    type: 'plank',
    label: '木の板',
    category: 'ramp',
    description: '角度をつけて坂道を作成',
    icon: <Minus className="w-5 h-5 text-amber-500 rotate-[-20deg]" />
  },
  {
    type: 'toilet_paper_tube',
    label: '芯 (トンネル)',
    category: 'ramp',
    description: '中を通り抜ける中空チューブ',
    icon: <Pipette className="w-5 h-5 text-amber-600 rotate-45" />
  },
  {
    type: 'brick',
    label: 'レンガ',
    category: 'ramp',
    description: '重みのある頑丈な赤レンガ',
    icon: <BrickWall className="w-5 h-5 text-rose-500" />
  },

  // Chain Reactions & Interactive Gimmicks
  {
    type: 'domino',
    label: 'ドミノ',
    category: 'reaction',
    description: '連鎖して次々倒れるピース',
    icon: <Layers className="w-5 h-5 text-slate-200" />
  },
  {
    type: 'bell',
    label: '卓上ベル・鉄琴',
    category: 'reaction',
    description: '澄んだ音色（ド〜高ド）を奏でる',
    icon: <Bell className="w-5 h-5 text-yellow-400" />
  },
  {
    type: 'funnel',
    label: 'すり鉢ロート',
    category: 'reaction',
    description: '渦を巻いて減速し下へ落とす',
    icon: <Filter className="w-5 h-5 text-cyan-400" />
  },
  {
    type: 'paddle_wheel',
    label: '回転パドル水車',
    category: 'reaction',
    description: '衝突や風・水で回る工作水車',
    icon: <RotateCw className="w-5 h-5 text-amber-500" />
  },
  {
    type: 'pulley',
    label: '滑車バケツ',
    category: 'reaction',
    description: '重みで片方が下がり反対側が上昇',
    icon: <ArrowUpDown className="w-5 h-5 text-emerald-400" />
  },
  {
    type: 'seesaw',
    label: 'シーソー',
    category: 'reaction',
    description: '重みで傾いてボールを飛ばす',
    icon: <Scale className="w-5 h-5 text-amber-400" />
  },
  {
    type: 'paper_cup',
    label: '紙コップ',
    category: 'reaction',
    description: 'ボールを受け止めて傾くカップ',
    icon: <CupSoda className="w-5 h-5 text-rose-300" />
  },
  {
    type: 'pendulum',
    label: '糸・振り子',
    category: 'reaction',
    description: '吊るされた重りでドミノを強打',
    icon: <Radio className="w-5 h-5 text-slate-400" />
  },

  // Bounce & Elastic
  {
    type: 'catapult',
    label: 'てこカタパルト',
    category: 'bounce',
    description: 'てこの原理でボールを高く跳ね上げ',
    icon: <CornerUpRight className="w-5 h-5 text-orange-400" />
  },
  {
    type: 'spring',
    label: 'バネ',
    category: 'bounce',
    description: '超高反発で高く跳ね返す',
    icon: <Zap className="w-5 h-5 text-amber-400" />
  },
  {
    type: 'rubber_band',
    label: '輪ゴム',
    category: 'bounce',
    description: 'しなって押し出す弾性コード',
    icon: <Activity className="w-5 h-5 text-yellow-400" />
  },

  // Environmental Fields
  {
    type: 'fan',
    label: '扇風機',
    category: 'field',
    description: '前方へ突風を吹き付ける',
    icon: <Wind className="w-5 h-5 text-sky-400" />
  },
  {
    type: 'magnet',
    label: '磁石',
    category: 'field',
    description: '金属・ボールを引き寄せる',
    icon: <Compass className="w-5 h-5 text-indigo-400" />
  },
  {
    type: 'faucet',
    label: '蛇口 (水滴)',
    category: 'field',
    description: '水滴を注いで水車を回す',
    icon: <Droplet className="w-5 h-5 text-sky-400 fill-sky-400/30" />
  },
];

interface GadgetPaletteProps {
  selectedTool: GadgetType | null;
  onSelectTool: (type: GadgetType | null) => void;
}

export const GadgetPalette: React.FC<GadgetPaletteProps> = ({
  selectedTool,
  onSelectTool,
}) => {
  const { t, getGadgetText, lang } = useI18n();
  const [activeTab, setActiveTab] = useState<'all' | 'ramp' | 'reaction' | 'bounce' | 'field'>('all');

  const filteredItems = activeTab === 'all'
    ? PALETTE_ITEMS
    : PALETTE_ITEMS.filter((item) => item.category === activeTab || item.category === 'core');

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col h-[calc(100vh-6.5rem)] select-none z-10">
      {/* Primary Selection / Edit Mode Button */}
      <div className="p-2.5 border-b border-slate-800 bg-slate-950/40">
        <button
          onClick={() => onSelectTool(null)}
          className={`w-full p-2.5 rounded-xl border flex items-center gap-2.5 transition select-none shadow-sm ${
            selectedTool === null
              ? 'bg-sky-600 border-sky-400 text-white shadow-md shadow-sky-600/30'
              : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
          }`}
        >
          <div
            className={`p-1.5 rounded-lg ${
              selectedTool === null
                ? 'bg-sky-700 text-white'
                : 'bg-slate-900 text-sky-400 border border-slate-700'
            }`}
          >
            <MousePointer2 className="w-4 h-4 fill-current" />
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">{t('selectMode')}</span>
              {selectedTool === null && (
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-semibold">
                  ON
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-300/80 block">
              {t('selectModeDesc')}
            </span>
          </div>
        </button>

        {/* If an item is currently being placed */}
        {selectedTool !== null && (
          <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between text-[11px]">
            <span className="text-amber-300 font-medium">
              {t('placingActive')}
            </span>
            <button
              onClick={() => onSelectTool(null)}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-600"
            >
              {t('placingDone')}
            </button>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="p-2 border-b border-slate-800 flex flex-wrap gap-1">
        {[
          { id: 'all', label: t('tabAll') },
          { id: 'ramp', label: t('tabRamp') },
          { id: 'reaction', label: t('tabReaction') },
          { id: 'bounce', label: t('tabBounce') },
          { id: 'field', label: t('tabField') },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-2 py-1 rounded text-[11px] font-medium transition ${
              activeTab === tab.id
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Item Grid */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
        {filteredItems.map((item) => {
          const isSelected = selectedTool === item.type;
          const { label, desc } = getGadgetText(item.type);

          return (
            <div
              key={item.type}
              onClick={() => onSelectTool(isSelected ? null : item.type)}
              className={`p-2 rounded-xl border flex items-center gap-3 cursor-pointer transition select-none ${
                isSelected
                  ? 'bg-sky-600/20 border-sky-500 shadow-md shadow-sky-500/10 text-white'
                  : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 text-slate-300 hover:border-slate-600'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  isSelected ? 'bg-sky-600 text-white' : 'bg-slate-900 border border-slate-700/80'
                }`}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold truncate">{label || item.label}</h4>
                  {isSelected && (
                    <span className="text-[10px] font-semibold text-sky-400 bg-sky-950 px-1.5 py-0.5 rounded">
                      {lang === 'ja' ? '配置中' : 'Placing'}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 truncate">{desc || item.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Helpful Hint */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 text-[11px] text-slate-400">
        <p className="font-semibold text-slate-300 mb-1">{lang === 'ja' ? '💡 ヒント' : '💡 Tip'}</p>
        <p>
          {lang === 'ja'
            ? 'アイテムを選んで画面をクリックすると配置できます。選択したアイテムは回転ハンドルで角度を変えられます。'
            : 'Select an item and click the canvas to place it. Drag the rotation ring to adjust its slope.'}
        </p>
      </div>
    </aside>
  );
};

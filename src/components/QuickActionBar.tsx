import React from 'react';
import { GadgetData, ViewportTransform } from '../types';
import { Copy, RotateCcw, RotateCw, FlipHorizontal2, Trash2, Sliders } from 'lucide-react';
import { useI18n } from '../i18n';

interface QuickActionBarProps {
  selectedGadget: GadgetData | null;
  transform: ViewportTransform;
  canvasWidth: number;
  canvasHeight: number;
  onDuplicate: (gadget: GadgetData) => void;
  onRotateStep: (deltaDeg: number) => void;
  onFlip: () => void;
  onDelete: (id: string) => void;
  onToggleInspector?: () => void;
  isInspectorOpen?: boolean;
  isPlayMode: boolean;
}

export const QuickActionBar: React.FC<QuickActionBarProps> = ({
  selectedGadget,
  transform,
  canvasWidth,
  canvasHeight,
  onDuplicate,
  onRotateStep,
  onFlip,
  onDelete,
  onToggleInspector,
  isInspectorOpen,
  isPlayMode,
}) => {
  const { t } = useI18n();

  if (!selectedGadget || isPlayMode) return null;

  // Compute screen coordinates of the selected gadget
  const screenX = selectedGadget.x * transform.scale + transform.x;
  const screenY = selectedGadget.y * transform.scale + transform.y;

  // Keep floating bar on screen
  const barWidth = 260;
  const clampedX = Math.max(barWidth / 2 + 16, Math.min(canvasWidth - barWidth / 2 - 16, screenX));

  // Determine whether to place above or below the gadget
  const placeAbove = screenY > 100;
  const topPos = placeAbove ? screenY - 64 : screenY + 54;

  return (
    <div
      className="absolute pointer-events-auto z-20 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl px-2 py-1.5 shadow-2xl shadow-black/50 select-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: `${clampedX}px`,
        top: `${topPos}px`,
        transform: 'translateX(-50%)',
      }}
    >
      {/* 複製 (Duplicate) */}
      <button
        type="button"
        onClick={() => onDuplicate(selectedGadget)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-sky-600 hover:text-white text-slate-200 text-xs font-medium border border-slate-700/60 transition active:scale-95"
        title={t('dupTip')}
      >
        <Copy className="w-3.5 h-3.5" />
        <span className="text-[11px]">{t('dup')}</span>
      </button>

      <div className="w-[1px] h-4 bg-slate-700/70 my-auto mx-0.5" />

      {/* ↺ -15° */}
      <button
        type="button"
        onClick={() => onRotateStep(-15)}
        className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 hover:text-sky-300 text-slate-300 border border-slate-700/60 transition active:scale-95"
        title={t('rotLeftTip')}
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* ↻ +15° */}
      <button
        type="button"
        onClick={() => onRotateStep(15)}
        className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 hover:text-sky-300 text-slate-300 border border-slate-700/60 transition active:scale-95"
        title={t('rotRightTip')}
      >
        <RotateCw className="w-3.5 h-3.5" />
      </button>

      {/* ↔ 反転 (Flip) */}
      <button
        type="button"
        onClick={onFlip}
        className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 hover:text-sky-300 text-slate-300 border border-slate-700/60 transition active:scale-95"
        title={t('flipTip')}
      >
        <FlipHorizontal2 className="w-3.5 h-3.5" />
      </button>

      {/* ⚙️ プロパティ詳細設定 (Inspector Toggle) */}
      {onToggleInspector && (
        <button
          type="button"
          onClick={onToggleInspector}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-xl border transition active:scale-95 ${
            isInspectorOpen
              ? 'bg-sky-600 text-white border-sky-400 font-bold shadow-md shadow-sky-600/30'
              : 'bg-slate-800/80 hover:bg-slate-700 hover:text-sky-300 text-slate-300 border border-slate-700/60'
          }`}
          title={t('settingsTip')}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="text-[11px] hidden sm:inline">{t('settings')}</span>
        </button>
      )}

      <div className="w-[1px] h-4 bg-slate-700/70 my-auto mx-0.5" />

      {/* 🗑️ 削除 (Delete) */}
      <button
        type="button"
        onClick={() => onDelete(selectedGadget.id)}
        className="p-1.5 rounded-xl bg-red-500/15 hover:bg-red-600 hover:text-white text-red-400 border border-red-500/30 transition active:scale-95"
        title={t('deleteTip')}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

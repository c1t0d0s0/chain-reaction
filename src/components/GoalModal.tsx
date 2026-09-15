import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, RotateCcw, ArrowRight, Edit3 } from 'lucide-react';
import { useI18n } from '../i18n';

interface GoalModalProps {
  isOpen: boolean;
  onReplay: () => void;
  onNextStage?: () => void;
  onClose: () => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onReplay,
  onNextStage,
  onClose,
}) => {
  const { t } = useI18n();

  useEffect(() => {
    if (isOpen) {
      // Fire vibrant confetti explosions
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        zIndex: 1000,
      };

      function fire(particleRatio: number, opts: confetti.Options) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      }

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      });
      fire(0.2, {
        spread: 60,
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-amber-500/20 text-center relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-500/20 rounded-full blur-3xl" />

        {/* Pitagora Switch-style Emblem */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-red-500 shadow-lg shadow-amber-500/30 mb-4 animate-bounce">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white mb-1 flex items-center justify-center gap-2">
          {t('goalSuccess')}
        </h2>
        <p className="text-sm font-bold text-amber-400 tracking-widest uppercase mb-4">
          {t('goalSubTitle')}
        </p>

        <p className="text-xs text-slate-300 mb-6 leading-relaxed whitespace-pre-line">
          {t('goalMessage')}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onReplay}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md shadow-emerald-900/40 transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('goalReplay')}</span>
          </button>

          {onNextStage && (
            <button
              onClick={onNextStage}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-sky-900/40 transition active:scale-95"
            >
              <span>{t('goalNext')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t('goalEdit')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

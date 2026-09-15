import React from 'react';
import { X, Play, RotateCw, Move, Volume2, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm select-none p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 text-white">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t('helpTitle')}</h2>
            <p className="text-xs text-slate-400">{t('helpSubtitle')}</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          {/* Section 1 */}
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
            <h3 className="font-bold text-sky-300 flex items-center gap-1.5">
              <Play className="w-4 h-4" /> {t('helpSec1Title')}
            </h3>
            <p className="leading-relaxed">
              {t('helpSec1Desc')}
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
            <h3 className="font-bold text-amber-300 flex items-center gap-1.5">
              <RotateCw className="w-4 h-4" /> {t('helpSec2Title')}
            </h3>
            <p className="leading-relaxed">
              {t('helpSec2Desc1')}
            </p>
            <p className="leading-relaxed">
              {t('helpSec2Desc2')}
            </p>
          </div>

          {/* Section 3 */}
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
            <h3 className="font-bold text-emerald-300 flex items-center gap-1.5">
              <Move className="w-4 h-4" /> {t('helpSec3Title')}
            </h3>
            <p className="leading-relaxed whitespace-pre-line">
              {t('helpSec3Desc')}
            </p>
          </div>

          {/* Section 4 */}
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
            <h3 className="font-bold text-purple-300 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" /> {t('helpSec4Title')}
            </h3>
            <p className="leading-relaxed">
              {t('helpSec4Desc')}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition"
          >
            {t('helpClose')}
          </button>
        </div>
      </div>
    </div>
  );
};

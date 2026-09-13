import React from 'react';
import { X, Play, RotateCw, Move, Volume2, Sparkles } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
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
            <h2 className="text-lg font-bold text-white">遊び方ガイド</h2>
            <p className="text-xs text-slate-400">ピタゴラスイッチのように様々な物理現象の連鎖を楽しもう！</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          {/* Section 1 */}
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
            <h3 className="font-bold text-sky-300 flex items-center gap-1.5">
              <Play className="w-4 h-4" /> 1. コースの再生とリセット
            </h3>
            <p className="leading-relaxed">
              上部の「スタート (再生)」ボタンを押すと、スタート地点から赤いビー玉が転がり出します。
              物理シミュレーションを初期状態に戻したいときは「リセット」を押すと、すべての道具とビー玉が一瞬で元の位置に戻ります。
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
            <h3 className="font-bold text-amber-300 flex items-center gap-1.5">
              <RotateCw className="w-4 h-4" /> 2. 道具の配置と坂道の作成
            </h3>
            <p className="leading-relaxed">
              左側のパレットから好きな道具（板、本、ドミノ、バネ、シーソー、芯、紙コップ、扇風機、磁石、水など）をクリックし、画面上の置きたい場所をクリックして配置します。
            </p>
            <p className="leading-relaxed">
              配置した道具をクリックして選択すると、<strong>回転ハンドル（円形のつまみ）</strong>が現れます。これをドラッグするか、右側のプロパティパネルで角度を自由に変えて、様々な傾きの坂道を作ることができます。
            </p>
          </div>

          {/* Section 3 */}
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
            <h3 className="font-bold text-emerald-300 flex items-center gap-1.5">
              <Move className="w-4 h-4" /> 3. 画面の移動と拡大
            </h3>
            <p className="leading-relaxed">
              <strong>画面のスクロール/パン:</strong> 中ボタンドラッグ、または「スペースキー」を押しながらドラッグ<br />
              <strong>拡大・縮小:</strong> マウスホイール、または上部ツールバーのズームボタン
            </p>
          </div>

          {/* Section 4 */}
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-2">
            <h3 className="font-bold text-purple-300 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" /> 4. リアルな効果音
            </h3>
            <p className="leading-relaxed">
              ビー玉が板を転がる摩擦音、ドミノが倒れるカチャカチャ音、バネで高く跳ねる「ビヨヨ〜ン」、水に落ちたときの「ポチャッ」など、Web Audio APIによるリアルタイム物理合成音響が鳴ります。ぜひ音を出してお楽しみください！
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

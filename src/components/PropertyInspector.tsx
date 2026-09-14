import React, { useState, useEffect } from 'react';
import { GadgetData } from '../types';
import { Trash2, Copy, X, RotateCw, Sliders, ChevronDown, ChevronUp } from 'lucide-react';

interface PropertyInspectorProps {
  gadget: GadgetData | null;
  dockSide?: 'left' | 'right';
  onUpdate: (updated: GadgetData) => void;
  onDuplicate: (gadget: GadgetData) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  gadget,
  dockSide = 'right',
  onUpdate,
  onDuplicate,
  onDelete,
  onClose,
}) => {
  if (!gadget) return null;

  // Local synchronized state to prevent stale closures when changing multiple properties
  const [currentGadget, setCurrentGadget] = useState<GadgetData>(gadget);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    setCurrentGadget(gadget);
  }, [gadget]);

  const deg = Math.round(((currentGadget.angle * 180) / Math.PI) % 360);

  const updateGadget = (patch: Partial<GadgetData>) => {
    setCurrentGadget((prev) => {
      const updated: GadgetData = {
        ...prev,
        ...patch,
        options: {
          ...(prev.options || {}),
          ...(patch.options || {}),
        },
      };
      onUpdate(updated);
      return updated;
    });
  };

  const handleAngleChange = (newDeg: number) => {
    const rad = (newDeg * Math.PI) / 180;
    updateGadget({ angle: rad });
  };

  const handleWidthChange = (w: number) => {
    updateGadget({
      options: { width: w }
    });
  };

  const handlePowerChange = (p: number) => {
    updateGadget({
      options: { power: p }
    });
  };

  const handleRestitutionChange = (r: number) => {
    updateGadget({
      options: { restitution: r }
    });
  };

  const handlePolarityChange = (polarity: 'attract' | 'repel') => {
    updateGadget({
      options: { polarity }
    });
  };

  const positionClass = dockSide === 'left' ? 'left-4' : 'right-4';

  // Minimized Compact Chip View
  if (isMinimized) {
    return (
      <aside
        className={`absolute top-4 ${positionClass} z-30 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-2 shadow-2xl shadow-black/70 select-none flex items-center gap-2.5 animate-in fade-in duration-150`}
      >
        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
          <Sliders className="w-3.5 h-3.5" />
          <span className="uppercase text-slate-200">{currentGadget.type}</span>
        </div>
        <div className="w-[1px] h-3.5 bg-slate-700" />
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700/60 transition"
          title="設定パネルを展開"
        >
          <span>設定</span>
          <ChevronUp className="w-3 h-3 text-sky-400" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="閉じる"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className={`absolute top-3 bottom-3 ${positionClass} w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl flex flex-col z-30 p-4 shadow-2xl shadow-black/70 select-none animate-in fade-in duration-150 max-h-[calc(100vh-7.5rem)]`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            プロパティ設定
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="最小化"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body Properties */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
        {/* Type & ID */}
        <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
          <span className="text-[10px] text-slate-400 font-semibold block mb-0.5">種別</span>
          <span className="font-bold text-slate-200 uppercase">{currentGadget.type}</span>
          <span className="text-[10px] text-slate-500 block font-mono mt-0.5">{currentGadget.id}</span>
        </div>

        {/* Angle / Rotation Control */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-slate-300 font-medium flex items-center gap-1">
              <RotateCw className="w-3 h-3 text-sky-400" /> 角度 (傾き)
            </span>
            <span className="font-mono text-sky-300 font-bold bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-800">
              {deg}°
            </span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={deg}
            onChange={(e) => handleAngleChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />

          {/* Quick angle presets */}
          {currentGadget.type === 'fan' ? (
            <div className="space-y-1.5 mt-2">
              <span className="text-[11px] text-sky-300 font-medium block">風の向き (プリセット):</span>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: '➡ 右 (0°)', angle: 0 },
                  { label: '⬇ 下 (90°)', angle: 90 },
                  { label: '⬅ 左 (180°)', angle: 180 },
                  { label: '⬆ 上 (-90°)', angle: -90 },
                  { label: '↗ 右上', angle: -45 },
                  { label: '↘ 右下', angle: 45 },
                  { label: '↖ 左上', angle: -135 },
                  { label: '↙ 左下', angle: 135 },
                ].map((item) => (
                  <button
                    key={item.angle}
                    onClick={() => handleAngleChange(item.angle)}
                    className={`py-1 px-0.5 rounded text-[10px] font-medium transition border text-center truncate ${
                      deg === item.angle
                        ? 'bg-sky-600 text-white border-sky-400 font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex justify-between gap-1 mt-2">
              {[-45, -30, -15, 0, 15, 30, 45].map((d) => (
                <button
                  key={d}
                  onClick={() => handleAngleChange(d)}
                  className={`flex-1 py-1 rounded text-[10px] font-mono transition border ${
                    deg === d
                      ? 'bg-sky-600 text-white border-sky-500 font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {d}°
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Width / Length Slider for Planks, Tubes, Water */}
        {['plank', 'toilet_paper_tube', 'water', 'rubber_band', 'seesaw'].includes(currentGadget.type) && (
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-300 font-medium">長さ / 幅</span>
              <span className="font-mono text-amber-300 font-bold">
                {currentGadget.options?.width || (currentGadget.type === 'seesaw' ? 220 : 180)}px
              </span>
            </div>
            <input
              type="range"
              min="60"
              max="400"
              step="10"
              value={currentGadget.options?.width || (currentGadget.type === 'seesaw' ? 220 : 180)}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        )}

        {/* Spring Bounce (Restitution) */}
        {currentGadget.type === 'spring' && (
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-300 font-medium">反発力 (バネ強度)</span>
              <span className="font-mono text-amber-300 font-bold">
                {(currentGadget.options?.restitution ?? 1.5).toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.8"
              max="2.2"
              step="0.1"
              value={currentGadget.options?.restitution ?? 1.5}
              onChange={(e) => handleRestitutionChange(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        )}

        {/* Fan Wind Power */}
        {currentGadget.type === 'fan' && (
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-slate-300 font-medium">風力強度</span>
              <span className="font-mono text-sky-300 font-bold">
                {(currentGadget.options?.power ?? 1.0).toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={currentGadget.options?.power ?? 1.0}
              onChange={(e) => handlePowerChange(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>
        )}

        {/* Magnet Polarity & Force */}
        {currentGadget.type === 'magnet' && (
          <div className="space-y-3">
            <div>
              <span className="text-slate-300 font-medium block mb-1">極性モード</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePolarityChange('attract')}
                  className={`flex-1 py-1.5 rounded border text-center transition ${
                    (currentGadget.options?.polarity ?? 'attract') === 'attract'
                      ? 'bg-rose-600/30 border-rose-500 text-rose-300 font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  引力 (引き寄せる)
                </button>
                <button
                  onClick={() => handlePolarityChange('repel')}
                  className={`flex-1 py-1.5 rounded border text-center transition ${
                    currentGadget.options?.polarity === 'repel'
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  斥力 (反発)
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-slate-300 font-medium">磁力強度</span>
                <span className="font-mono text-indigo-300 font-bold">
                  {(currentGadget.options?.power ?? 1.0).toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={currentGadget.options?.power ?? 1.0}
                onChange={(e) => handlePowerChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons: Duplicate & Delete */}
      <div className="pt-3 border-t border-slate-800 flex gap-2">
        <button
          onClick={() => onDuplicate(currentGadget)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>複製</span>
        </button>

        <button
          onClick={() => onDelete(currentGadget.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-medium transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>削除</span>
        </button>
      </div>
    </aside>
  );
};

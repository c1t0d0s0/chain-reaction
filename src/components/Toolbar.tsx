import React from 'react';
import { Play, Pause, RotateCcw, Grid, ZoomIn, ZoomOut, Maximize2, Video, Edit3, Magnet, Pin, Droplet } from 'lucide-react';
import { SimulationSpeed } from '../types';

interface ToolbarProps {
  mode: 'edit' | 'play';
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onEnterEditMode: () => void;
  speed: SimulationSpeed;
  onSpeedChange: (speed: SimulationSpeed) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  continuousPlacement: boolean;
  onToggleContinuousPlacement: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  followMarble: boolean;
  onToggleFollowMarble: () => void;
  onDrainWater?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  mode,
  isRunning,
  onStart,
  onPause,
  onReset,
  onEnterEditMode,
  speed,
  onSpeedChange,
  showGrid,
  onToggleGrid,
  snapEnabled,
  onToggleSnap,
  continuousPlacement,
  onToggleContinuousPlacement,
  onZoomIn,
  onZoomOut,
  onResetView,
  followMarble,
  onToggleFollowMarble,
  onDrainWater,
}) => {
  return (
    <div className="h-12 bg-slate-800/90 backdrop-blur border-b border-slate-700/60 px-4 flex items-center justify-between z-20 shadow-sm select-none">
      {/* Simulation Play / Edit Controls */}
      <div className="flex items-center gap-2">
        {mode === 'edit' ? (
          <>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-300 text-xs font-bold">
              <Edit3 className="w-3.5 h-3.5" />
              <span>編集</span>
            </div>

            <button
              onClick={onStart}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-900/30 transition active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>スタート</span>
            </button>

            {/* Snap Toggle Button */}
            <button
              onClick={onToggleSnap}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition active:scale-95 ${
                snapEnabled
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-700/60 border-slate-600 text-slate-400 hover:text-slate-200'
              }`}
              title="15°角度＆20pxグリッドスナップ切替"
            >
              <Magnet className="w-3.5 h-3.5" />
              <span className="hidden md:inline">スナップ {snapEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Continuous Placement Button */}
            <button
              onClick={onToggleContinuousPlacement}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition active:scale-95 ${
                continuousPlacement
                  ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-500/10'
                  : 'bg-slate-700/60 border-slate-600 text-slate-400 hover:text-slate-200'
              }`}
              title="連続スタンプ配置モード切替（同じパーツをタップで連続配置）"
            >
              <Pin className="w-3.5 h-3.5" />
              <span className="hidden md:inline">連続配置 {continuousPlacement ? 'ON' : 'OFF'}</span>
            </button>

            {onDrainWater && (
              <button
                onClick={onDrainWater}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600 text-slate-300 font-medium text-xs border border-slate-600 transition active:scale-95"
                title="床に溜まった水を排水する"
              >
                <Droplet className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden md:inline">排水</span>
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={onEnterEditMode}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-md shadow-sky-900/40 transition active:scale-95"
              title="初期状態に戻して編集モードにする"
            >
              <Edit3 className="w-4 h-4" />
              <span>✏️ 編集モードに戻る</span>
            </button>

            {isRunning ? (
              <button
                onClick={onPause}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md shadow-amber-900/30 transition active:scale-95"
              >
                <Pause className="w-4 h-4 fill-white" />
                <span>一時停止</span>
              </button>
            ) : (
              <button
                onClick={onStart}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-900/30 transition active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>再開</span>
              </button>
            )}

            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs border border-slate-600 transition active:scale-95"
              title="最初から再生し直す"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>やり直す</span>
            </button>

            {onDrainWater && (
              <button
                onClick={onDrainWater}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 font-medium text-xs border border-sky-600/40 transition active:scale-95"
                title="床に溜まった水を排水する"
              >
                <Droplet className="w-3.5 h-3.5 text-sky-400" />
                <span>排水</span>
              </button>
            )}
          </>
        )}

        {/* Speed Controls */}
        <div className="flex items-center bg-slate-900/70 p-0.5 rounded-lg border border-slate-700/60 ml-2">
          {([0.5, 1.0, 2.0] as SimulationSpeed[]).map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-1 rounded text-[11px] font-mono font-medium transition ${
                speed === s
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Viewport & View Controls */}
      <div className="flex items-center gap-2">
        {/* Camera Follow Marble */}
        <button
          onClick={onToggleFollowMarble}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
            followMarble
              ? 'bg-sky-600/20 border-sky-500/50 text-sky-300'
              : 'bg-slate-700/60 border-slate-600 text-slate-400 hover:text-slate-200'
          }`}
          title="ボール自動追従カメラ"
        >
          <Video className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">追従カメラ</span>
        </button>

        {/* Toggle Grid */}
        <button
          onClick={onToggleGrid}
          className={`p-1.5 rounded-lg border transition ${
            showGrid
              ? 'bg-sky-600/20 border-sky-500/50 text-sky-300'
              : 'bg-slate-700/60 border-slate-600 text-slate-400 hover:text-slate-200'
          }`}
          title="グリッド表示切替"
        >
          <Grid className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-700 mx-0.5" />

        {/* Zoom Controls */}
        <button
          onClick={onZoomIn}
          className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600 border border-slate-600 text-slate-300 transition"
          title="ズームイン"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={onZoomOut}
          className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600 border border-slate-600 text-slate-300 transition"
          title="ズームアウト"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={onResetView}
          className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600 border border-slate-600 text-slate-300 transition"
          title="表示位置リセット (100%)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

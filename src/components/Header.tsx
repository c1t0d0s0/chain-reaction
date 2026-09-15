import React, { useRef } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Save, FolderOpen, HelpCircle, Sparkles } from 'lucide-react';
import { CourseData } from '../types';
import { DEFAULT_COURSES } from '../presets/defaultCourses';
import { soundEngine } from '../audio/SoundEngine';

interface HeaderProps {
  currentCourseId: string;
  onSelectCourse: (course: CourseData) => void;
  onNewCourse: () => void;
  onExportCourse: () => void;
  onImportCourse: (course: CourseData) => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCourseId,
  onSelectCourse,
  onNewCourse,
  onExportCourse,
  onImportCourse,
  onOpenHelp,
}) => {
  const [isMuted, setIsMuted] = React.useState(soundEngine.getMuted());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleMute = () => {
    const next = !isMuted;
    soundEngine.setMuted(next);
    setIsMuted(next);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (json.gadgets && Array.isArray(json.gadgets)) {
          onImportCourse(json);
        } else {
          alert('無効なコースファイル形式です。');
        }
      } catch {
        alert('ファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-700/80 px-4 flex items-center justify-between select-none z-30 shadow-md">
      {/* App Branding */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 shadow-md shadow-red-500/20">
          <span className="text-xl font-black text-white">ピ</span>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
            ピタゴラ・チェインリアクション
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
              Physics Studio
            </span>
          </h1>
          <p className="text-[11px] text-slate-400">物理連鎖シミュレーター</p>
        </div>
      </div>

      {/* Course Presets Dropdown */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-slate-400 font-medium hidden sm:inline">ステージ:</label>
        <select
          value={currentCourseId}
          onChange={(e) => {
            const found = DEFAULT_COURSES.find((c) => c.id === e.target.value);
            if (found) onSelectCourse(found);
          }}
          className="bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium cursor-pointer"
        >
          {DEFAULT_COURSES.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>

        <button
          onClick={onNewCourse}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition flex items-center gap-1.5"
          title="新規ステージ作成"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">新規作成</span>
        </button>
      </div>

      {/* Actions: Save/Load, Sound, Help */}
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          className="hidden"
        />

        {/* Save button with clear floppy disk icon & label */}
        <button
          onClick={onExportCourse}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60 transition flex items-center gap-1.5 shadow-sm active:scale-95"
          title="作成したコースをファイルに保存 (JSONダウンロード)"
        >
          <Save className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium">保存</span>
        </button>

        {/* Load / Open button with clear folder open icon & label */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60 transition flex items-center gap-1.5 shadow-sm active:scale-95"
          title="保存したコースファイル (JSON) を開く・読み込む"
        >
          <FolderOpen className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-medium">開く</span>
        </button>

        <div className="w-[1px] h-6 bg-slate-700 mx-1" />

        <button
          onClick={toggleMute}
          className={`p-2 rounded-lg border transition ${
            isMuted
              ? 'bg-red-500/20 border-red-500/40 text-red-400'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700/60 text-slate-300 hover:text-white'
          }`}
          title={isMuted ? 'ミュート解除' : 'ミュート'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenHelp}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition"
          title="遊び方ガイド"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

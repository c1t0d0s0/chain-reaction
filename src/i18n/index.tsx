import React, { createContext, useContext, useState, useEffect } from 'react';
import { CourseData, GadgetType } from '../types';

export type Language = 'ja' | 'en';

export function detectBrowserLanguage(): Language {
  if (typeof window === 'undefined') return 'en';

  // Clean up any legacy localStorage entry from previous builds
  try {
    localStorage.removeItem('chain-reaction-lang');
  } catch (e) {
    // localStorage might be unavailable
  }

  // 1. Check user's manual preference in this session
  try {
    const saved = sessionStorage.getItem('chain-reaction-lang');
    if (saved === 'ja' || saved === 'en') {
      return saved;
    }
  } catch (e) {
    // sessionStorage might be unavailable
  }

  // 2. Check browser's top-priority language (最優先言語)
  // In modern browsers, navigator.languages lists user language preferences in priority order.
  // The first element (index 0) or navigator.language represents the user's top-priority language.
  const primaryLang =
    (typeof navigator !== 'undefined' &&
      ((navigator.languages && navigator.languages.length > 0 && navigator.languages[0]) ||
        navigator.language)) ||
    '';

  const lower = primaryLang.toLowerCase().trim();
  // Only if the TOP-PRIORITY language starts with 'ja' (e.g. 'ja', 'ja-JP'), display Japanese.
  if (lower.startsWith('ja')) {
    return 'ja';
  }

  // If top-priority language is English ('en', 'en-US', 'en-GB') or any other language, display English.
  return 'en';
}

export function saveLanguagePreference(lang: Language) {
  try {
    sessionStorage.setItem('chain-reaction-lang', lang);
  } catch (e) {
    // ignore
  }
}

export const TRANSLATIONS = {
  ja: {
    // App Branding
    appTitle: 'ピタゴラ・チェインリアクション',
    appSubtitle: '物理連鎖シミュレーター',
    appBadge: 'Physics Studio',

    // Header
    stageLabel: 'ステージ:',
    newCourse: '新規作成',
    newCourseTip: '新規ステージ作成',
    save: '保存',
    saveTip: '作成したコースをファイルに保存 (JSONダウンロード)',
    open: '開く',
    openTip: '保存したコースファイル (JSON) を開く・読み込む',
    mute: 'ミュート',
    unmute: 'ミュート解除',
    helpTip: '遊び方ガイド',
    invalidCourseFile: '無効なコースファイル形式です。',
    readFileFailed: 'ファイルの読み込みに失敗しました。',
    switchLang: 'English',

    // Toolbar
    editModeBadge: '編集',
    start: 'スタート',
    resume: '再開',
    pause: '一時停止',
    reset: 'やり直す',
    resetTip: '最初から再生し直す',
    backToEdit: '✏️ 編集モードに戻る',
    backToEditTip: '初期状態に戻して編集モードにする',
    snap: 'スナップ',
    snapTip: '15°角度＆20pxグリッドスナップ切替',
    continuous: '連続配置',
    continuousTip: '連続スタンプ配置モード切替（同じパーツをタップで連続配置）',
    drain: '排水',
    drainTip: '床に溜まった水を排水する',
    followCam: '追従カメラ',
    followCamTip: 'ボール自動追従カメラ',
    gridTip: 'グリッド表示切替',
    zoomIn: 'ズームイン',
    zoomOut: 'ズームアウト',
    resetView: '表示位置リセット (100%)',

    // Palette
    selectMode: '選択・編集モード',
    selectModeDesc: '道具を選択・移動・角度調整',
    placingActive: '画面クリックで配置中',
    placingDone: '完了 (Esc)',
    tabAll: 'すべて',
    tabRamp: '坂・道',
    tabReaction: 'からくり',
    tabBounce: 'バネ・弾性',
    tabField: '風・磁石・水',

    // Quick Action Bar
    dup: '複製',
    dupTip: '複製して隣に配置',
    rotLeftTip: '左に15°回転',
    rotRightTip: '右に15°回転',
    flip: '反転',
    flipTip: '傾き・向きを左右反転',
    settings: '設定',
    settingsTip: '詳細プロパティ設定パネルの表示/非表示',
    deleteTip: '削除',

    // Property Inspector
    inspectorTitle: 'プロパティ設定',
    minimize: '最小化',
    close: '閉じる',
    typeLabel: '種別',
    angleLabel: '角度 (傾き)',
    windPresets: '風の向き (プリセット):',
    widthLabel: '幅 (長さ)',
    heightLabel: '高さ',
    radiusLabel: '半径 (サイズ)',
    densityLabel: '重さ (密度)',
    densityLight: '軽量',
    densityNormal: '標準',
    densityHeavy: '重い',
    densityUltra: '極重',
    restitutionLabel: '反発力 (弾み)',
    restitutionAbsorb: '吸収',
    restitutionNormal: '標準',
    restitutionSuper: '高反発',
    frictionLabel: '表面摩擦 (滑りやすさ)',
    frictionSlick: 'ツルツル',
    frictionNormal: '標準',
    frictionRough: '高摩擦',
    fanPowerLabel: '風の強さ (パワー)',
    fanPowerPresets: '風力プリセット:',
    fanWeak: '弱風',
    fanMedium: '中風',
    fanStrong: '強風',
    magnetPolarityLabel: '磁石の極性:',
    magnetAttract: '引き寄せ (引力)',
    magnetRepel: '反発 (斥力)',
    magnetPowerLabel: '磁力の強さ (パワー)',
    bellNoteLabel: 'ベルの音階 (音程):',
    bellNotePrompt: '音階を選択（ド〜高ド）:',
    faucetWaterLevel: '初期水量 (0%〜100%):',
    pulleyLeftWater: '左バケツの初期水量:',
    pulleyRightWater: '右バケツの初期水量:',
    waterEmpty: '空 (0%)',
    waterHalf: '半分 (50%)',
    waterFull: '満杯 (100%)',
    faucetAutoFlow: '自動放水:',
    faucetAutoFlowDesc: 'シミュレーション開始と同時に水を出す',
    duplicateBtn: '複製する',
    deleteBtn: '削除する',

    // Goal Modal
    goalSuccess: 'ピタゴラ成功！',
    goalSubTitle: 'GOAL REACHED!',
    goalMessage: 'ビー玉が見事にゴールへ到達しました！\n様々な物理現象の美しい連鎖反応が完成しました。',
    goalReplay: 'もう一度再生する',
    goalNext: '次のステージへ',
    goalEdit: 'コースをさらに改造する',

    // Help Modal
    helpTitle: '遊び方ガイド',
    helpSubtitle: 'ピタゴラスイッチのように様々な物理現象の連鎖を楽しもう！',
    helpSec1Title: '1. コースの再生とリセット',
    helpSec1Desc: '上部の「スタート (再生)」ボタンを押すと、スタート地点からビー玉が転がり出します。物理シミュレーションを初期状態に戻したいときは「やり直す」を押すと、すべての道具とビー玉が一瞬で元の位置に戻ります。',
    helpSec2Title: '2. 道具の配置と坂道の作成',
    helpSec2Desc1: '左側のパレットから好きな道具（板、レンガ、ドミノ、バネ、シーソー、芯、紙コップ、扇風機、磁石、水など）をクリックし、画面上の置きたい場所をクリックして配置します。',
    helpSec2Desc2: '配置した道具をクリックして選択すると、回転ハンドル（円形のつまみ）が現れます。これをドラッグするか、設定パネルで角度を自由に変えて、様々な傾きの坂道を作ることができます。',
    helpSec3Title: '3. 画面の移動と拡大 (タブレット操作対応)',
    helpSec3Desc: '画面のスクロール/パン: 右ボタンドラッグ、スペース+ドラッグ、または2本指スワイプ\n拡大・縮小: マウスホイール、ピンチイン/ピンチアウト、または上部のズームボタン',
    helpSec4Title: '4. リアルな効果音 (Web Audio API)',
    helpSec4Desc: 'ビー玉が板を転がる摩擦音、ドミノが倒れる音、バネで高く跳ねる音、水が滴り溜まる音など、Web Audio APIによるリアルタイム物理合成音響が鳴ります。ぜひ音を出してお楽しみください！',
    helpClose: '閉じる',

    // Gadget Types
    gadgets: {
      start_gate: { label: 'スタート台', desc: 'ビー玉の出発点' },
      goal: { label: 'ゴール', desc: 'ピタゴラ成功検知ゴール' },
      marble: { label: 'ビー玉', desc: '転がるメインボール' },
      plank: { label: '木の板', desc: '角度をつけて坂道を作成' },
      toilet_paper_tube: { label: '芯 (トンネル)', desc: '中を通り抜ける中空チューブ' },
      brick: { label: 'レンガ', desc: '重みのある頑丈な赤レンガ' },
      domino: { label: 'ドミノ', desc: '連鎖して次々倒れるピース' },
      bell: { label: '卓上ベル・鉄琴', desc: '澄んだ音色（ド〜高ド）を奏でる' },
      funnel: { label: 'すり鉢ロート', desc: '渦を巻いて減速し下へ落とす' },
      paddle_wheel: { label: '回転パドル水車', desc: '衝突や風・水で回る工作水車' },
      pulley: { label: '滑車バケツ', desc: '重みで片方が下がり反対側が上昇' },
      seesaw: { label: 'シーソー', desc: '重みで傾いてボールを飛ばす' },
      paper_cup: { label: '紙コップ', desc: 'ボールを受け止めて傾くカップ' },
      pendulum: { label: '糸・振り子', desc: '吊るされた重りでドミノを強打' },
      catapult: { label: 'てこカタパルト', desc: 'てこの原理でボールを高く跳ね上げ' },
      spring: { label: 'バネ', desc: '超高反発で高く跳ね返す' },
      rubber_band: { label: '輪ゴム', desc: 'しなって押し出す弾性コード' },
      fan: { label: '扇風機', desc: '前方へ突風を吹き付ける' },
      magnet: { label: '磁石', desc: '金属・ボールを引き寄せる' },
      faucet: { label: '蛇口 (水滴)', desc: '水滴を注いで水車を回す' },
      book: { label: 'レンガ', desc: '重みのある頑丈な赤レンガ' }
    }
  },

  en: {
    // App Branding
    appTitle: 'Chain Reaction Studio',
    appSubtitle: 'Physics Sandbox & Rube Goldberg Studio',
    appBadge: 'Physics Studio',

    // Header
    stageLabel: 'Stage:',
    newCourse: 'New Course',
    newCourseTip: 'Create a new blank course',
    save: 'Save',
    saveTip: 'Save custom course to file (Download JSON)',
    open: 'Open',
    openTip: 'Open / load a saved course file (.json)',
    mute: 'Mute',
    unmute: 'Unmute',
    helpTip: 'How to play guide',
    invalidCourseFile: 'Invalid course file format.',
    readFileFailed: 'Failed to read course file.',
    switchLang: '日本語',

    // Toolbar
    editModeBadge: 'Edit',
    start: 'Start',
    resume: 'Resume',
    pause: 'Pause',
    reset: 'Reset',
    resetTip: 'Reset simulation and replay from start',
    backToEdit: '✏️ Back to Edit Mode',
    backToEditTip: 'Reset to initial state and enter edit mode',
    snap: 'Snap',
    snapTip: 'Toggle 15° rotation & 20px grid snap',
    continuous: 'Stamp',
    continuousTip: 'Toggle continuous stamp placement (tap to place continuously)',
    drain: 'Drain',
    drainTip: 'Drain water accumulated on the floor',
    followCam: 'Follow Cam',
    followCamTip: 'Camera follows active marble automatically',
    gridTip: 'Toggle grid lines',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    resetView: 'Reset View (100%)',

    // Palette
    selectMode: 'Select & Move Mode',
    selectModeDesc: 'Select, move, and rotate gadgets',
    placingActive: 'Click canvas to place',
    placingDone: 'Done (Esc)',
    tabAll: 'All',
    tabRamp: 'Ramps',
    tabReaction: 'Gimmicks',
    tabBounce: 'Bounce',
    tabField: 'Water & Wind',

    // Quick Action Bar
    dup: 'Duplicate',
    dupTip: 'Duplicate gadget and place adjacent',
    rotLeftTip: 'Rotate -15° counter-clockwise',
    rotRightTip: 'Rotate +15° clockwise',
    flip: 'Flip',
    flipTip: 'Flip angle / orientation horizontally',
    settings: 'Settings',
    settingsTip: 'Toggle detailed properties inspector',
    deleteTip: 'Delete gadget',

    // Property Inspector
    inspectorTitle: 'Properties',
    minimize: 'Minimize',
    close: 'Close',
    typeLabel: 'Type',
    angleLabel: 'Angle (Tilt)',
    windPresets: 'Wind Direction (Presets):',
    widthLabel: 'Width (Length)',
    heightLabel: 'Height',
    radiusLabel: 'Radius (Size)',
    densityLabel: 'Weight (Density)',
    densityLight: 'Light',
    densityNormal: 'Normal',
    densityHeavy: 'Heavy',
    densityUltra: 'Ultra Heavy',
    restitutionLabel: 'Bounciness (Restitution)',
    restitutionAbsorb: 'Absorb',
    restitutionNormal: 'Normal',
    restitutionSuper: 'Super Bouncy',
    frictionLabel: 'Surface Friction',
    frictionSlick: 'Slick',
    frictionNormal: 'Normal',
    frictionRough: 'Rough',
    fanPowerLabel: 'Wind Force (Power)',
    fanPowerPresets: 'Wind Presets:',
    fanWeak: 'Breeze',
    fanMedium: 'Medium',
    fanStrong: 'Storm',
    magnetPolarityLabel: 'Magnetic Polarity:',
    magnetAttract: 'Attract (Pull)',
    magnetRepel: 'Repel (Push)',
    magnetPowerLabel: 'Magnetic Strength',
    bellNoteLabel: 'Musical Pitch:',
    bellNotePrompt: 'Select musical note (C to High C):',
    faucetWaterLevel: 'Initial Water Level (0% - 100%):',
    pulleyLeftWater: 'Left Bucket Initial Water:',
    pulleyRightWater: 'Right Bucket Initial Water:',
    waterEmpty: 'Empty (0%)',
    waterHalf: 'Half (50%)',
    waterFull: 'Full (100%)',
    faucetAutoFlow: 'Auto Pour:',
    faucetAutoFlowDesc: 'Pour water automatically on simulation start',
    duplicateBtn: 'Duplicate',
    deleteBtn: 'Delete',

    // Goal Modal
    goalSuccess: 'Goal Reached!',
    goalSubTitle: 'CHAIN REACTION COMPLETE!',
    goalMessage: 'The marble successfully reached the goal!\nThe physical chain reaction played out beautifully.',
    goalReplay: 'Play Again',
    goalNext: 'Next Stage',
    goalEdit: 'Edit Course',

    // Help Modal
    helpTitle: 'How to Play',
    helpSubtitle: 'Build and enjoy exciting physical chain reactions like PitagoraSwitch!',
    helpSec1Title: '1. Play and Reset Courses',
    helpSec1Desc: 'Click the "Start" button on the toolbar to roll the marble. To reset the simulation to its initial setup, click "Reset" to return all gadgets and marbles to their starting positions instantly.',
    helpSec2Title: '2. Placing Gadgets and Building Slopes',
    helpSec2Desc1: 'Click any gadget in the left palette (planks, bricks, dominoes, springs, seesaws, paper tubes, cups, fans, magnets, faucets) and click on the canvas to place it.',
    helpSec2Desc2: 'Click on a placed gadget to select it and reveal the circular rotation ring. Drag the ring or use the properties panel to adjust its angle and create slopes.',
    helpSec3Title: '3. Pan & Zoom (Tablet & Touch Supported)',
    helpSec3Desc: 'Pan / Scroll: Right-click drag, Space + drag, or two-finger swipe\nZoom: Mouse wheel, pinch-to-zoom, or toolbar zoom buttons',
    helpSec4Title: '4. Realistic Sound Effects (Web Audio API)',
    helpSec4Desc: 'Hear procedural real-time sound effects for marble rolling, domino clicking, spring bouncing, and water splashes synthesized in your browser. Turn on your sound for the best experience!',
    helpClose: 'Close',

    // Gadget Types
    gadgets: {
      start_gate: { label: 'Start Gate', desc: 'Starting point for marbles' },
      goal: { label: 'Goal Flag', desc: 'Detects goal completion' },
      marble: { label: 'Marble', desc: 'Main rolling glass marble' },
      plank: { label: 'Wooden Plank', desc: 'Slopes and track rails' },
      toilet_paper_tube: { label: 'Paper Tube', desc: 'Hollow tunnel for balls' },
      brick: { label: 'Heavy Brick', desc: 'Solid heavy counterweight block' },
      domino: { label: 'Domino', desc: 'Cascading domino pieces' },
      bell: { label: 'Desk Bell', desc: 'Resonant tuned chimes (C to High C)' },
      funnel: { label: 'Swirl Funnel', desc: 'Centrifugal deceleration bowl' },
      paddle_wheel: { label: 'Paddle Wheel', desc: 'Rotary wheel spun by balls or water' },
      pulley: { label: 'Pulley Buckets', desc: 'Dual-bucket elevator on string' },
      seesaw: { label: 'Seesaw', desc: 'Tilts with unbalanced weights' },
      paper_cup: { label: 'Paper Cup', desc: 'Light cup catching water & balls' },
      pendulum: { label: 'Pendulum', desc: 'Swinging weight to strike items' },
      catapult: { label: 'Catapult', desc: 'Lever spoon launching balls high' },
      spring: { label: 'Spring Bouncer', desc: 'Super high restitution bounce' },
      rubber_band: { label: 'Rubber Band', desc: 'Elastic trampoline band' },
      fan: { label: 'Electric Fan', desc: 'Directional aerodynamic wind stream' },
      magnet: { label: 'Magnet', desc: 'Attracts or repels metal items' },
      faucet: { label: 'Water Faucet', desc: 'Pours real-time water droplets' },
      book: { label: 'Heavy Brick', desc: 'Solid heavy counterweight block' }
    }
  }
};

export type TranslationKey = keyof typeof TRANSLATIONS.ja;

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  getGadgetText: (type: GadgetType | string) => { label: string; desc: string };
  getCourseText: (course: CourseData) => { title: string; description: string };
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(detectBrowserLanguage);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    saveLanguagePreference(newLang);
  };

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.title = lang === 'ja'
        ? 'ピタゴラ・チェインリアクション (Chain Reaction Studio)'
        : 'Chain Reaction Studio - 2D Physics Sandbox';
    }
  }, [lang]);

  const t = (key: TranslationKey): string => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    const val = (dict as any)[key];
    if (typeof val === 'string') return val;
    return (TRANSLATIONS.en as any)[key] || String(key);
  };

  const getGadgetText = (type: GadgetType | string): { label: string; desc: string } => {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    const item = (dict.gadgets as any)[type] || (TRANSLATIONS.en.gadgets as any)[type];
    if (item) return item;
    return { label: type, desc: '' };
  };

  const getCourseText = (course: CourseData): { title: string; description: string } => {
    if (lang === 'en') {
      return {
        title: course.titleEn || course.title,
        description: course.descriptionEn || course.description
      };
    }
    return {
      title: course.title,
      description: course.description
    };
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, getGadgetText, getCourseText }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
};

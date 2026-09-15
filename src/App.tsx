import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CourseData, GadgetData, GadgetType, SimulationSpeed, ViewportTransform } from './types';
import { PhysicsEngine } from './physics/PhysicsEngine';
import { DEFAULT_COURSES } from './presets/defaultCourses';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { GadgetPalette } from './components/GadgetPalette';
import { PhysicsCanvas } from './components/PhysicsCanvas';
import { GoalModal } from './components/GoalModal';
import { HelpModal } from './components/HelpModal';
import { getOptimalViewport, zoomCentered } from './utils/viewport';

export const App: React.FC = () => {
  const physics = useMemo(() => new PhysicsEngine(), []);

  const [currentCourse, setCurrentCourse] = useState<CourseData>(DEFAULT_COURSES[0]);
  const [mode, setMode] = useState<'edit' | 'play'>('edit');
  const [selectedTool, setSelectedTool] = useState<GadgetType | null>(null);
  const [selectedGadgetId, setSelectedGadgetId] = useState<string | null>(null);
  const [gadgetVersion, setGadgetVersion] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speed, setSpeed] = useState<SimulationSpeed>(1.0);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [continuousPlacement, setContinuousPlacement] = useState<boolean>(false);
  const [followMarble, setFollowMarble] = useState<boolean>(false);
  const [isGoalReached, setIsGoalReached] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth - 80 : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight - 100 : 800,
  });

  const [hasInitializedViewport, setHasInitializedViewport] = useState<boolean>(false);

  const [transform, setTransform] = useState<ViewportTransform>(() => {
    const initW = typeof window !== 'undefined' ? window.innerWidth - 80 : 1200;
    const initH = typeof window !== 'undefined' ? window.innerHeight - 100 : 800;
    return getOptimalViewport(DEFAULT_COURSES[0].gadgets, initW, initH);
  });

  const handleCanvasResize = (size: { width: number; height: number }) => {
    setCanvasSize(size);
    if (!hasInitializedViewport && size.width > 0 && size.height > 0) {
      setHasInitializedViewport(true);
      const optimal = getOptimalViewport(
        currentCourse.gadgets || [],
        size.width,
        size.height,
        currentCourse.viewport
      );
      setTransform(optimal);
    }
  };

  // Selected Gadget Data for Inspector
  const selectedGadget = useMemo(() => {
    if (!selectedGadgetId) return null;
    const bundle = physics.bundles.get(selectedGadgetId);
    if (!bundle) return null;
    const g = bundle.mainBody.plugin?.gadget as GadgetData | undefined;
    return g ? JSON.parse(JSON.stringify(g)) : null;
  }, [selectedGadgetId, physics, gadgetVersion, currentCourse]);

  // Initialize Course on load
  useEffect(() => {
    physics.loadCourse(currentCourse.gadgets);

    physics.onGoalReached = () => {
      setIsGoalReached(true);
    };

    physics.onStateChange = () => {
      setIsRunning(physics.isRunning);
    };

    return () => {
      physics.pause();
    };
  }, [physics, currentCourse]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if inside an input or slider
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (mode === 'edit') {
          setMode('play');
          setSelectedTool(null);
          physics.start();
        } else {
          if (physics.isRunning) {
            physics.pause();
          } else {
            physics.start();
          }
        }
      } else if (e.key === 'r' || e.key === 'R') {
        setMode('edit');
        setIsGoalReached(false);
        physics.resetCourse();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedGadgetId && !physics.isRunning) {
          physics.removeGadget(selectedGadgetId);
          setSelectedGadgetId(null);
        }
      } else if (e.key === 'Escape' || e.key === 'v' || e.key === 'V') {
        setSelectedTool(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [physics, selectedGadgetId, mode]);

  // Start Simulation
  const handleStart = () => {
    setMode('play');
    setSelectedTool(null);
    physics.start();
  };

  // Pause Simulation
  const handlePause = () => {
    physics.pause();
  };

  // Reset Simulation (restarts in play mode, stays in setup in edit mode)
  const handleReset = () => {
    setIsGoalReached(false);
    physics.resetCourse();
    if (mode === 'play') {
      physics.start();
    }
  };

  // Replay from Goal Modal or Replay button
  const handleReplay = () => {
    setIsGoalReached(false);
    physics.resetCourse();
    setMode('play');
    physics.start();
  };

  // Explicit Return to Edit Mode (restores setup positions so everything can be edited)
  const handleEnterEditMode = () => {
    setMode('edit');
    setIsGoalReached(false);
    setSelectedTool(null);
    physics.resetCourse();
  };

  // Speed Change
  const handleSpeedChange = (newSpeed: SimulationSpeed) => {
    setSpeed(newSpeed);
    physics.simulationSpeed = newSpeed;
  };

  // Select Preset Course
  const handleSelectCourse = (course: CourseData) => {
    setCurrentCourse(course);
    setMode('edit');
    setSelectedGadgetId(null);
    setSelectedTool(null);
    setIsGoalReached(false);
    const optimal = getOptimalViewport(
      course.gadgets || [],
      canvasSize.width,
      canvasSize.height,
      course.viewport
    );
    setTransform(optimal);
  };

  // Create New Empty Course
  const handleNewCourse = () => {
    const emptyCourse: CourseData = {
      id: `custom-${Date.now()}`,
      title: 'オリジナルコース',
      description: '自由に道具を配置して作成したコース',
      gadgets: [
        {
          id: 'start-new',
          type: 'start_gate',
          x: 120,
          y: 120,
          angle: 0,
        },
        {
          id: 'marble-new',
          type: 'marble',
          x: 120,
          y: 100,
          angle: 0,
          options: { isPlayerBall: true, color: '#ef4444', radius: 14 },
        },
        {
          id: 'goal-new',
          type: 'goal',
          x: 750,
          y: 500,
          angle: 0,
        },
      ],
    };
    setCurrentCourse(emptyCourse);
    setMode('edit');
    setSelectedGadgetId(null);
    setSelectedTool(null);
    setIsGoalReached(false);
    setTransform(getOptimalViewport(emptyCourse.gadgets, canvasSize.width, canvasSize.height));
  };

  // Export Course JSON (includes current camera viewport)
  const handleExportCourse = () => {
    const snapshot = physics.getSnapshot();
    const exportData: CourseData = {
      ...currentCourse,
      gadgets: snapshot,
      viewport: transform,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentCourse.title.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Course JSON (guarantees all objects, especially top-most ones, are fully visible)
  const handleImportCourse = (course: CourseData) => {
    setCurrentCourse(course);
    setSelectedGadgetId(null);
    setIsGoalReached(false);
    const optimal = getOptimalViewport(
      course.gadgets || [],
      canvasSize.width,
      canvasSize.height,
      course.viewport
    );
    setTransform(optimal);
  };

  // Gadget Lifecycle
  const handleGadgetCreated = (newGadget: GadgetData) => {
    physics.addGadget(newGadget);
    physics.updateGadgetSnapshot(newGadget);
    setGadgetVersion((v) => v + 1);
  };

  const handleGadgetUpdated = (updated: GadgetData) => {
    physics.removeGadget(updated.id);
    physics.addGadget(updated);
    physics.updateGadgetSnapshot(updated);
    setGadgetVersion((v) => v + 1);
  };

  const handleGadgetDelete = (id: string) => {
    physics.removeGadget(id);
    setSelectedGadgetId(null);
    setGadgetVersion((v) => v + 1);
  };

  const handleGadgetDuplicate = (gadget: GadgetData) => {
    const newId = `${gadget.type}-${Date.now()}`;
    const duplicated: GadgetData = {
      ...gadget,
      id: newId,
      x: gadget.x + 30,
      y: gadget.y + 30,
    };
    physics.addGadget(duplicated);
    physics.updateGadgetSnapshot(duplicated);
    setSelectedGadgetId(newId);
    setGadgetVersion((v) => v + 1);
  };

  // Next Stage Handler
  const handleNextStage = () => {
    setIsGoalReached(false);
    const currentIndex = DEFAULT_COURSES.findIndex((c) => c.id === currentCourse.id);
    if (currentIndex !== -1 && currentIndex < DEFAULT_COURSES.length - 1) {
      handleSelectCourse(DEFAULT_COURSES[currentIndex + 1]);
    } else {
      handleSelectCourse(DEFAULT_COURSES[0]);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 text-slate-100 font-sans">
      {/* Top Header */}
      <Header
        currentCourseId={currentCourse.id}
        onSelectCourse={handleSelectCourse}
        onNewCourse={handleNewCourse}
        onExportCourse={handleExportCourse}
        onImportCourse={handleImportCourse}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Sub Toolbar */}
      <Toolbar
        mode={mode}
        isRunning={isRunning}
        onStart={handleStart}
        onPause={handlePause}
        onReset={handleReset}
        onEnterEditMode={handleEnterEditMode}
        speed={speed}
        onSpeedChange={handleSpeedChange}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        snapEnabled={snapEnabled}
        onToggleSnap={() => setSnapEnabled(!snapEnabled)}
        continuousPlacement={continuousPlacement}
        onToggleContinuousPlacement={() => setContinuousPlacement(!continuousPlacement)}
        onZoomIn={() =>
          setTransform((t) =>
            zoomCentered(t, 1.15, {
              x: canvasSize.width / 2,
              y: canvasSize.height / 2,
            })
          )
        }
        onZoomOut={() =>
          setTransform((t) =>
            zoomCentered(t, 0.85, {
              x: canvasSize.width / 2,
              y: canvasSize.height / 2,
            })
          )
        }
        onResetView={() => {
          const optimal = getOptimalViewport(
            physics.getSnapshot(),
            canvasSize.width,
            canvasSize.height
          );
          setTransform(optimal);
        }}
        followMarble={followMarble}
        onToggleFollowMarble={() => setFollowMarble(!followMarble)}
        onDrainWater={() => physics.drainFloorWater()}
      />

      {/* Main Workspace: Left Palette + Center Canvas + Right Property Inspector */}
      <div className="flex flex-1 relative overflow-hidden">
        <GadgetPalette
          selectedTool={selectedTool}
          onSelectTool={(type) => {
            setSelectedTool(type);
            if (type) setSelectedGadgetId(null);
          }}
        />

        <PhysicsCanvas
          physics={physics}
          selectedTool={selectedTool}
          onClearTool={() => setSelectedTool(null)}
          selectedGadgetId={selectedGadgetId}
          onSelectGadget={setSelectedGadgetId}
          onGadgetCreated={handleGadgetCreated}
          onGadgetUpdated={handleGadgetUpdated}
          showGrid={showGrid}
          snapEnabled={snapEnabled}
          continuousPlacement={continuousPlacement}
          transform={transform}
          onTransformChange={setTransform}
          followMarble={followMarble}
          onCanvasResize={handleCanvasResize}
        />
      </div>

      {/* Goal Celebration Modal */}
      <GoalModal
        isOpen={isGoalReached}
        onReplay={handleReplay}
        onNextStage={handleNextStage}
        onClose={handleEnterEditMode}
      />

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};

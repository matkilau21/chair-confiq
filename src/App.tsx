import { useEffect, useRef, useState, useCallback } from 'react';
import {
  initChairScene,
  ChairSceneManager,
  CameraPreset,
  ARPlacementStatus,
} from './three/sceneManager';
import { FabricColorKey, LegMaterialKey } from './three/chairBuilder';
import { ConfiguratorUI } from './components/ConfiguratorUI';
import { DimensionsModal } from './components/DimensionsModal';
import { XRModal } from './components/XRModal';
import { AROverlayHUD } from './components/AROverlayHUD';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const overlayRootRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<ChairSceneManager | null>(null);

  // Configurator state
  const [fabricKey, setFabricKey] = useState<FabricColorKey>('terracotta');
  const [legKey, setLegKey] = useState<LegMaterialKey>('wood');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('studio');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [explodedFactor, setExplodedFactor] = useState<number>(0);
  const [isBrightLighting, setIsBrightLighting] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(true);

  // AR & WebXR state
  const [inXRSession, setInXRSession] = useState<boolean>(false);
  const [xrMode, setXrMode] = useState<'immersive-ar' | 'immersive-vr' | null>(null);
  const [arStatus, setArStatus] = useState<ARPlacementStatus>('scanning');
  const [isCameraARActive, setIsCameraARActive] = useState<boolean>(false);
  const [isSimulatingAR, setIsSimulatingAR] = useState<boolean>(false);

  // Modals
  const [isSpecsOpen, setIsSpecsOpen] = useState<boolean>(false);
  const [isXRModalOpen, setIsXRModalOpen] = useState<boolean>(false);
  const [xrErrorMessage, setXRErrorMessage] = useState<string | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    const manager = initChairScene(mountRef.current, {
      onXRSessionStart: (mode) => {
        setInXRSession(true);
        setXrMode(mode);
      },
      onXRSessionEnd: () => {
        setInXRSession(false);
        setXrMode(null);
        setIsSimulatingAR(false);
      },
      onCameraARStart: () => {
        setIsCameraARActive(true);
      },
      onCameraAREnd: () => {
        setIsCameraARActive(false);
      },
      onARStatusChange: (status) => {
        setArStatus(status);
      },
    });

    sceneManagerRef.current = manager;

    // Window resize handler
    const handleResize = () => {
      if (!mountRef.current) return;
      manager.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Keyboard shortcuts for convenience
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '1') {
        handleFabricChange('terracotta');
      } else if (e.key === '2') {
        handleFabricChange('sage');
      } else if (e.key === '3') {
        handleFabricChange('slate');
      } else if (e.key.toLowerCase() === 'w') {
        handleLegChange('wood');
      } else if (e.key.toLowerCase() === 'm') {
        handleLegChange('metal');
      } else if (e.key.toLowerCase() === 'l') {
        handleToggleLabels();
      } else if (e.key.toLowerCase() === 'r') {
        setAutoRotate(prev => {
          const next = !prev;
          manager.toggleAutoRotate(next);
          return next;
        });
      } else if (e.key === 'Escape') {
        if (isSimulatingAR) {
          manager.stopSimulationMode();
          setIsSimulatingAR(false);
        }
        if (isCameraARActive) {
          manager.stopCameraARMode();
          setIsCameraARActive(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      manager.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  // Handlers for state updates with direct Three.js scene binding
  const handleFabricChange = useCallback((key: FabricColorKey) => {
    setFabricKey(key);
    sceneManagerRef.current?.chair.setFabricColor(key);
    sceneManagerRef.current?.labels.updateSpecs(key, legKey);
  }, [legKey]);

  const handleLegChange = useCallback((key: LegMaterialKey) => {
    setLegKey(key);
    sceneManagerRef.current?.chair.setLegMaterial(key);
    sceneManagerRef.current?.labels.updateSpecs(fabricKey, key);
  }, [fabricKey]);

  const handleToggleLabels = useCallback(() => {
    const next = sceneManagerRef.current?.toggleLabels();
    setShowLabels(!!next);
  }, []);

  const handleCameraPresetChange = useCallback((preset: CameraPreset) => {
    setCameraPreset(preset);
    sceneManagerRef.current?.setCameraPreset(preset);
  }, []);

  const handleToggleAutoRotate = useCallback(() => {
    setAutoRotate(prev => {
      const next = !prev;
      sceneManagerRef.current?.toggleAutoRotate(next);
      return next;
    });
  }, []);

  const handleExplodedChange = useCallback((val: number) => {
    setExplodedFactor(val);
    sceneManagerRef.current?.chair.setExplodedFactor(val);
  }, []);

  const handleToggleLighting = useCallback(() => {
    setIsBrightLighting(prev => {
      const next = !prev;
      sceneManagerRef.current?.setExposure(next ? 1.45 : 1.15);
      return next;
    });
  }, []);

  // High-Resolution Snapshot Export
  const handleTakeScreenshot = useCallback(() => {
    if (!sceneManagerRef.current) return;
    try {
      const dataUrl = sceneManagerRef.current.takeScreenshot();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `oslo-lounge-chair-${fabricKey}-${legKey}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to capture snapshot', err);
    }
  }, [fabricKey, legKey]);

  // Universal AR Launch Handler (Supports Android Chrome ARCore & iOS iPhone/iPad Safari)
  const handleLaunchAR = useCallback(async () => {
    setXRErrorMessage(null);
    if (!sceneManagerRef.current) return;

    try {
      const modeUsed = await sceneManagerRef.current.launchUniversalAR(
        overlayRootRef.current ?? undefined
      );

      if (modeUsed === 'simulation') {
        setIsSimulatingAR(true);
      } else if (modeUsed === 'camera') {
        setIsCameraARActive(true);
      }
    } catch (err: any) {
      console.warn('AR launch issue', err);
      // Open guidance modal with mobile QR code & manual trigger options
      setXRErrorMessage(
        err?.message || 'Unable to start camera or WebXR session. Please grant camera permissions.'
      );
      setIsXRModalOpen(true);
    }
  }, []);

  const handleLaunchVR = useCallback(async () => {
    setXRErrorMessage(null);
    if (!sceneManagerRef.current) return;

    const isSupported = await sceneManagerRef.current.isXRSupported('immersive-vr');
    if (!isSupported) {
      setXRErrorMessage(
        'Immersive VR requires a connected WebXR headset (Meta Quest 2/3/Pro, HTC Vive, Pico, or Vision Pro).'
      );
      setIsXRModalOpen(true);
      return;
    }

    try {
      await sceneManagerRef.current.startXRSession('immersive-vr');
    } catch (err: any) {
      setXRErrorMessage(
        err?.message || 'Unable to launch VR session. Please ensure your VR headset is connected.'
      );
      setIsXRModalOpen(true);
    }
  }, []);

  // Simulation mode for testing flat surface scan and tap-to-spawn in desktop browser
  const handleStartSimulation = useCallback(() => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.startSimulationMode();
    setIsSimulatingAR(true);
    setArStatus('scanning');
  }, []);

  const handleExitAR = useCallback(() => {
    if (inXRSession) {
      sceneManagerRef.current?.endXRSession();
    }
    if (isCameraARActive) {
      sceneManagerRef.current?.stopCameraARMode();
      setIsCameraARActive(false);
    }
    if (isSimulatingAR) {
      sceneManagerRef.current?.stopSimulationMode();
      setIsSimulatingAR(false);
    }
  }, [inXRSession, isCameraARActive, isSimulatingAR]);

  const handleSpawnClick = useCallback(() => {
    sceneManagerRef.current?.spawnChairAtReticle();
  }, []);

  const handleResetPlacement = useCallback(() => {
    sceneManagerRef.current?.resetARPlacement();
  }, []);

  const handleRotateChairInAR = useCallback((deltaAngle: number) => {
    sceneManagerRef.current?.rotateChairInAR(deltaAngle);
  }, []);

  const isARActive = (inXRSession && xrMode === 'immersive-ar') || isCameraARActive || isSimulatingAR;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#E4E7EB]">
      {/* Isolated Three.js WebGL canvas mount container */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
      />

      {/* WebXR / Camera AR DOM Overlay container */}
      <div ref={overlayRootRef} className="absolute inset-0 pointer-events-none">
        {/* If in AR (Android WebXR, iOS Camera AR, or Simulation), show surface scan HUD with tap-to-spawn prompt */}
        {isARActive && (
          <AROverlayHUD
            status={arStatus}
            isSimulation={isSimulatingAR}
            onSpawnClick={handleSpawnClick}
            onResetPlacement={handleResetPlacement}
            onExit={handleExitAR}
            fabricKey={fabricKey}
            onFabricChange={handleFabricChange}
            showLabels={showLabels}
            onToggleLabels={handleToggleLabels}
            onRotateChair={handleRotateChairInAR}
          />
        )}

        {/* If in VR session, show minimal floating exit button */}
        {inXRSession && xrMode === 'immersive-vr' && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            <button
              onClick={() => sceneManagerRef.current?.endXRSession()}
              className="px-5 py-2.5 rounded-full bg-red-600/90 hover:bg-red-500 text-white font-medium text-xs shadow-lg backdrop-blur-sm transition-all"
            >
              Exit VR Studio
            </button>
          </div>
        )}
      </div>

      {/* Standard Studio Configurator HUD (collapsible bottom dock) */}
      {!isARActive && !(inXRSession && xrMode === 'immersive-vr') && (
        <ConfiguratorUI
          fabricKey={fabricKey}
          onFabricChange={handleFabricChange}
          legKey={legKey}
          onLegChange={handleLegChange}
          cameraPreset={cameraPreset}
          onCameraPresetChange={handleCameraPresetChange}
          autoRotate={autoRotate}
          onToggleAutoRotate={handleToggleAutoRotate}
          explodedFactor={explodedFactor}
          onExplodedChange={handleExplodedChange}
          isBrightLighting={isBrightLighting}
          onToggleLighting={handleToggleLighting}
          onTakeScreenshot={handleTakeScreenshot}
          onLaunchAR={handleLaunchAR}
          onLaunchVR={handleLaunchVR}
          onStartSimulation={handleStartSimulation}
          showLabels={showLabels}
          onToggleLabels={handleToggleLabels}
          onOpenSpecs={() => setIsSpecsOpen(true)}
          onOpenXRGuide={() => {
            setXRErrorMessage(null);
            setIsXRModalOpen(true);
          }}
        />
      )}

      {/* Technical Specifications Modal */}
      <DimensionsModal
        isOpen={isSpecsOpen}
        onClose={() => setIsSpecsOpen(false)}
        fabricKey={fabricKey}
        legKey={legKey}
      />

      {/* WebXR Guidance & Mobile Scan Modal */}
      <XRModal
        isOpen={isXRModalOpen}
        onClose={() => setIsXRModalOpen(false)}
        errorMessage={xrErrorMessage}
        onRetryAR={handleLaunchAR}
        onRetryVR={handleLaunchVR}
        onStartSimulation={handleStartSimulation}
        appUrl={window.location.href}
      />
    </div>
  );
}

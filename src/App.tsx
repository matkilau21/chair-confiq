import { useEffect, useRef, useState, useCallback } from 'react';
import {
  initChairScene,
  ChairSceneManager,
  CameraPreset,
} from './three/sceneManager';
import { FabricColorKey, LegMaterialKey } from './three/chairBuilder';
import { ConfiguratorUI } from './components/ConfiguratorUI';
import { DimensionsModal } from './components/DimensionsModal';
import { XRModal } from './components/XRModal';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<ChairSceneManager | null>(null);

  // Configurator state
  const [fabricKey, setFabricKey] = useState<FabricColorKey>('terracotta');
  const [legKey, setLegKey] = useState<LegMaterialKey>('wood');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('studio');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [explodedFactor, setExplodedFactor] = useState<number>(0);
  const [isBrightLighting, setIsBrightLighting] = useState<boolean>(false);

  // Modals & XR feedback
  const [isSpecsOpen, setIsSpecsOpen] = useState<boolean>(false);
  const [isXRModalOpen, setIsXRModalOpen] = useState<boolean>(false);
  const [xrErrorMessage, setXRErrorMessage] = useState<string | null>(null);
  const [inXRSession, setInXRSession] = useState<boolean>(false);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    const manager = initChairScene(mountRef.current, {
      onXRSessionStart: (mode) => {
        setInXRSession(true);
      },
      onXRSessionEnd: () => {
        setInXRSession(false);
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
      // Don't trigger if user is typing in an input
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
      } else if (e.key.toLowerCase() === 'r') {
        setAutoRotate(prev => {
          const next = !prev;
          manager.toggleAutoRotate(next);
          return next;
        });
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
  }, []);

  const handleLegChange = useCallback((key: LegMaterialKey) => {
    setLegKey(key);
    sceneManagerRef.current?.chair.setLegMaterial(key);
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

  // WebXR Launching (AR & VR)
  const handleLaunchAR = useCallback(async () => {
    setXRErrorMessage(null);
    if (!sceneManagerRef.current) return;

    const isSupported = await sceneManagerRef.current.isXRSupported('immersive-ar');
    if (!isSupported) {
      setXRErrorMessage(
        'Immersive AR is not supported by your current browser or hardware setup. You can scan the QR code to open directly on your mobile device (Android Chrome / iOS AR) or Meta Quest.'
      );
      setIsXRModalOpen(true);
      return;
    }

    try {
      await sceneManagerRef.current.startXRSession('immersive-ar');
    } catch (err: any) {
      setXRErrorMessage(
        err?.message || 'Unable to launch AR session. Please check camera and WebXR permissions.'
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
        'Immersive VR requires a connected WebXR headset (such as Meta Quest 2/3/Pro, HTC Vive, Pico, or Vision Pro) or a WebXR Emulator extension.'
      );
      setIsXRModalOpen(true);
      return;
    }

    try {
      await sceneManagerRef.current.startXRSession('immersive-vr');
    } catch (err: any) {
      setXRErrorMessage(
        err?.message || 'Unable to launch VR session. Please ensure your VR headset is connected and awake.'
      );
      setIsXRModalOpen(true);
    }
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#E4E7EB]">
      {/* Isolated Three.js WebGL canvas mount container */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* When inside an active WebXR session, show minimal floating exit overlay */}
      {inXRSession && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <button
            onClick={() => sceneManagerRef.current?.endXRSession()}
            className="px-5 py-2.5 rounded-full bg-red-600/90 hover:bg-red-500 text-white font-medium text-xs shadow-lg backdrop-blur-sm transition-all"
          >
            Exit WebXR Experience
          </button>
        </div>
      )}

      {/* Interactive HUD / Collapsible Bottom Dock */}
      {!inXRSession && (
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
        appUrl={window.location.href}
      />
    </div>
  );
}

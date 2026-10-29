import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createLoungeChair,
  ChairController,
  FabricColorKey,
  LegMaterialKey,
} from './chairBuilder';
import { createContactShadowTexture } from './proceduralTextures';
import { createARReticle, ARReticle } from './reticle';
import { createChairLabels, ChairLabelsController } from './chairLabels';
import { startDeviceCameraAR, CameraARSession, isIOSDevice, isAndroidDevice } from './cameraARManager';

export type CameraPreset = 'studio' | 'front' | 'side' | 'top' | 'detail';
export type ARPlacementStatus = 'scanning' | 'ready' | 'placed';
export type ARModeType = 'webxr' | 'camera' | 'simulation';

export interface SceneCallbacks {
  onXRSessionStart?: (mode: 'immersive-ar' | 'immersive-vr') => void;
  onXRSessionEnd?: () => void;
  onARStatusChange?: (status: ARPlacementStatus) => void;
  onCameraARStart?: () => void;
  onCameraAREnd?: () => void;
}

export interface ChairSceneManager {
  domElement: HTMLCanvasElement;
  chair: ChairController;
  labels: ChairLabelsController;
  setCameraPreset: (preset: CameraPreset) => void;
  toggleAutoRotate: (enabled: boolean) => void;
  setExposure: (val: number) => void;
  toggleLabels: (visible?: boolean) => boolean;
  areLabelsVisible: () => boolean;
  startXRSession: (mode: 'immersive-ar' | 'immersive-vr', overlayElement?: HTMLElement) => Promise<void>;
  endXRSession: () => Promise<void>;
  startCameraARMode: () => Promise<void>;
  stopCameraARMode: () => void;
  launchUniversalAR: (overlayElement?: HTMLElement) => Promise<ARModeType>;
  isXRSupported: (mode: 'immersive-ar' | 'immersive-vr') => Promise<boolean>;
  isSessionActive: () => boolean;
  isCameraARActive: () => boolean;
  spawnChairAtReticle: () => boolean;
  resetARPlacement: () => void;
  rotateChairInAR: (deltaAngle: number) => void;
  setChairRotationY: (angleRad: number) => void;
  getChairRotationY: () => number;
  startSimulationMode: () => void;
  stopSimulationMode: () => void;
  isSimulationActive: () => boolean;
  takeScreenshot: () => string;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

export function initChairScene(
  container: HTMLElement,
  callbacks?: SceneCallbacks
): ChairSceneManager {
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  // 1. Detect Software WebGL
  const isSoftwareGl = (() => {
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return false;
    }
  })();

  // 2. Renderer Setup with WebXR enabled
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
    alpha: true,
    preserveDrawingBuffer: true,
  });

  renderer.setSize(width, height);
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Enable WebXR
  renderer.xr.enabled = true;

  container.appendChild(renderer.domElement);

  // 3. Scene and Studio Fog
  const scene = new THREE.Scene();
  const floorBgColor = new THREE.Color(0xE4E7EB);
  scene.background = floorBgColor;
  scene.fog = new THREE.Fog(0xE4E7EB, 4.5, 16);

  // 4. Procedural Studio Reflection Environment
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const roomEnv = new RoomEnvironment();
  const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
  scene.environment = envTexture;
  pmremGenerator.dispose();

  // 5. Camera Setup (responsive FOV: 48° on mobile portrait to fit chair & labels comfortably, 38° on desktop)
  const initialAspect = width / height;
  const initialFov = initialAspect < 1 ? 48 : 38;
  const camera = new THREE.PerspectiveCamera(initialFov, initialAspect, 0.1, 50);
  camera.position.set(1.9, 1.3, 2.3);

  // 6. Camera Controls (OrbitControls)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0.55, 0);
  controls.minDistance = 0.7;
  controls.maxDistance = 6.0;
  controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going underneath floor
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  };
  controls.update();

  // 7. Studio 3-Point Lighting Rig
  const keyLight = new THREE.DirectionalLight(0xFFF6EE, 1.8);
  keyLight.position.set(2.4, 3.5, 2.0);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 8;
  keyLight.shadow.camera.left = -1.2;
  keyLight.shadow.camera.right = 1.2;
  keyLight.shadow.camera.top = 1.6;
  keyLight.shadow.camera.bottom = -0.5;
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const hemiLight = new THREE.HemisphereLight(0xF2F7FF, 0xD4D8DF, 0.95);
  hemiLight.position.set(0, 4, 0);
  scene.add(hemiLight);

  const rimLight = new THREE.DirectionalLight(0xEAF0F8, 0.85);
  rimLight.position.set(-2.5, 2.2, -2.5);
  scene.add(rimLight);

  const frontFill = new THREE.DirectionalLight(0xFFFFFF, 0.35);
  frontFill.position.set(0, 1.5, 3.0);
  scene.add(frontFill);

  // Dedicated AR & ambient illumination so chair is vibrant in any room/camera view
  const arAmbientLight = new THREE.AmbientLight(0xFFFFFF, 1.4);
  scene.add(arAmbientLight);

  const cameraFillLight = new THREE.DirectionalLight(0xFFFFFF, 1.2);
  cameraFillLight.position.set(0, 1.2, 0.8);
  camera.add(cameraFillLight);
  scene.add(camera);

  // 8. Ground Floor & Grounding Contact Shadows
  const floorGroup = new THREE.Group();
  floorGroup.name = 'FloorGroup';
  scene.add(floorGroup);

  const floorGeo = new THREE.PlaneGeometry(30, 30);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xE4E7EB,
    roughness: 0.95,
    metalness: 0.02,
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0;
  floorMesh.receiveShadow = !isSoftwareGl;
  floorGroup.add(floorMesh);

  const contactShadowTex = createContactShadowTexture();
  const shadowGeo = new THREE.PlaneGeometry(1.8, 1.8);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.set(0, 0.002, 0.03);
  floorGroup.add(shadowMesh);

  // 9. Create the Lounge Chair & Camera-Following Labels
  const chair = createLoungeChair();
  scene.add(chair.group);

  let activeFabricKey: FabricColorKey = 'terracotta';
  let activeLegKey: LegMaterialKey = 'wood';
  const chairLabels = createChairLabels(activeFabricKey, activeLegKey);
  chair.group.add(chairLabels.group);

  // 10. WebXR AR Circle Indicator (Reticle) & Placement State
  const reticle = createARReticle();
  scene.add(reticle.group);

  let currentXRSession: XRSession | null = null;
  let activeXRMode: 'immersive-ar' | 'immersive-vr' | null = null;
  let hitTestSource: XRHitTestSource | null = null;
  let hitTestSourceRequested = false;

  // Placement state
  let chairSpawned = false;
  let arStatus: ARPlacementStatus = 'scanning';
  let targetChairScale = 1.0;
  let currentChairScale = 1.0;

  // Camera AR Passthrough State (for 100% Android & iOS Safari support)
  let cameraARSession: CameraARSession | null = null;
  let cameraVideoTexture: THREE.VideoTexture | null = null;
  let isCameraARActive = false;
  let cameraARScanTimer = 0;

  // Desktop Simulation mode state
  let isSimulatingAR = false;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function updateARStatus(newStatus: ARPlacementStatus) {
    if (arStatus !== newStatus) {
      arStatus = newStatus;
      callbacks?.onARStatusChange?.(newStatus);
    }
  }

  // Rotate chair in AR mode
  function rotateChairInAR(deltaAngle: number) {
    if (chair.group) {
      chair.group.rotation.y += deltaAngle;
    }
  }

  function setChairRotationY(angle: number) {
    if (chair.group) {
      chair.group.rotation.y = angle;
    }
  }

  function getChairRotationY(): number {
    return chair.group ? chair.group.rotation.y : 0;
  }

  // Spawn chair ONLY when a flat surface is detected (reticle is visible) or forcedPos is provided
  function spawnChairAtReticle(forcedPos?: THREE.Vector3): boolean {
    // Constraint: chair only spawns when a flat surface is detected
    if (!reticle.group.visible && !forcedPos) {
      return false;
    }

    const xrCam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera;
    const camPos = new THREE.Vector3();
    xrCam.getWorldPosition(camPos);

    const spawnPos = forcedPos
      ? forcedPos.clone()
      : new THREE.Vector3().setFromMatrixPosition(reticle.group.matrix);

    // Set position & ensure proper Y ground elevation
    chair.group.position.set(spawnPos.x, 0.04, spawnPos.z);

    // Make chair initially face user/camera
    const dx = camPos.x - chair.group.position.x;
    const dz = camPos.z - chair.group.position.z;
    if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
      chair.group.rotation.y = Math.atan2(dx, dz);
    }

    // Ground contact shadow under chair in AR
    shadowMesh.position.set(chair.group.position.x, 0.002, chair.group.position.z + 0.03);
    shadowMesh.visible = true;

    // Visual spawn & full scale
    chair.group.visible = true;
    chairSpawned = true;
    chair.group.scale.set(1.0, 1.0, 1.0);
    currentChairScale = 1.0;

    // Play reticle ripple shockwave
    reticle.triggerSpawnEffect(chair.group.position);

    updateARStatus('placed');
    return true;
  }

  function resetARPlacement() {
    chairSpawned = false;
    chair.group.visible = false;
    shadowMesh.visible = false;
    reticle.group.visible = false;
    cameraARScanTimer = 0;
    updateARStatus('scanning');
  }

  // WebXR Controller Event Handler
  function onXRSelect() {
    if (activeXRMode === 'immersive-ar') {
      spawnChairAtReticle();
    }
  }

  const controller1 = renderer.xr.getController(0);
  controller1.addEventListener('select', onXRSelect);
  scene.add(controller1);

  const controller2 = renderer.xr.getController(1);
  controller2.addEventListener('select', onXRSelect);
  scene.add(controller2);

  // Screen click/touch handler for WebXR DOM overlay, Camera AR, or canvas touch
  function handleCanvasClick(e: MouseEvent | TouchEvent) {
    if (activeXRMode === 'immersive-ar' || isCameraARActive || isSimulatingAR) {
      spawnChairAtReticle();
    }
  }

  renderer.domElement.addEventListener('click', handleCanvasClick);

  // Pointer move handler for desktop AR simulation
  function handlePointerMove(e: MouseEvent) {
    if (!isSimulatingAR) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(floorMesh);
    if (intersects.length > 0) {
      const hit = intersects[0];
      reticle.group.visible = true;
      reticle.group.matrix.makeTranslation(hit.point.x, hit.point.y + 0.002, hit.point.z);
      if (!chairSpawned) {
        updateARStatus('ready');
      }
    } else {
      reticle.group.visible = false;
      if (!chairSpawned) {
        updateARStatus('scanning');
      }
    }
  }
  window.addEventListener('pointermove', handlePointerMove);

  // 11. Camera Presets & Smooth Interpolation
  const PRESET_CONFIGS: Record<CameraPreset, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
    studio: {
      pos: new THREE.Vector3(1.8, 1.25, 2.2),
      target: new THREE.Vector3(0, 0.55, 0),
    },
    front: {
      pos: new THREE.Vector3(0, 0.68, 2.4),
      target: new THREE.Vector3(0, 0.58, 0),
    },
    side: {
      pos: new THREE.Vector3(2.4, 0.65, 0),
      target: new THREE.Vector3(0, 0.58, 0),
    },
    top: {
      pos: new THREE.Vector3(0.01, 2.7, 0.5),
      target: new THREE.Vector3(0, 0.45, 0),
    },
    detail: {
      pos: new THREE.Vector3(0.48, 0.78, 0.65),
      target: new THREE.Vector3(0.12, 0.60, 0.05),
    },
  };

  let targetCamPos: THREE.Vector3 | null = null;
  let targetCamLook: THREE.Vector3 | null = null;
  let isTransitioningCamera = false;

  controls.addEventListener('start', () => {
    isTransitioningCamera = false;
  });

  function setCameraPreset(preset: CameraPreset) {
    const config = PRESET_CONFIGS[preset];
    if (!config) return;
    targetCamPos = config.pos.clone();
    targetCamLook = config.target.clone();
    isTransitioningCamera = true;
  }

  // 12. Clock & Render Loop
  const clock = new THREE.Clock();
  let autoRotateSpeed = 0;

  function renderLoop(timestamp: number, frame?: XRFrame) {
    const delta = Math.min(clock.getDelta(), 0.1);

    // Update chair sub-assemblies (exploded view)
    chair.updateAnimation(delta);

    // Make sure chair labels ALWAYS follow the camera view
    chairLabels.update(camera);

    // Update AR circle indicator animation
    reticle.update(delta);

    // Smooth spawn pop scale animation
    if (chairSpawned && currentChairScale < targetChairScale - 0.005) {
      currentChairScale = THREE.MathUtils.damp(currentChairScale, targetChairScale, 12, delta);
      chair.group.scale.set(currentChairScale, currentChairScale, currentChairScale);
    }

    // Camera AR Mode Flat Surface Detection (Android & iOS)
    if (isCameraARActive) {
      if (!chairSpawned) {
        cameraARScanTimer += delta;
        // Require scanning sweep before detecting flat ground plane
        if (cameraARScanTimer > 0.8) {
          const dir = new THREE.Vector3(0, 0, -1.5).applyQuaternion(camera.quaternion);
          reticle.group.visible = true;
          reticle.group.matrix.makeTranslation(
            camera.position.x + dir.x,
            0.002,
            camera.position.z + dir.z
          );
          updateARStatus('ready');
        } else {
          reticle.group.visible = false;
          updateARStatus('scanning');
        }
      } else {
        reticle.group.visible = false;
      }
    }

    // WebXR Hit-Testing in AR mode
    if (frame && activeXRMode === 'immersive-ar') {
      const session = frame.session;
      const referenceSpace = renderer.xr.getReferenceSpace();

      if (!hitTestSourceRequested && referenceSpace) {
        session.requestReferenceSpace('viewer').then(viewerSpace => {
          session.requestHitTestSource?.({ space: viewerSpace })?.then(source => {
            hitTestSource = source;
          }).catch(() => {});
        }).catch(() => {});
        hitTestSourceRequested = true;
      }

      if (hitTestSource && referenceSpace) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0) {
          const hit = hitTestResults[0];
          const pose = hit.getPose(referenceSpace);
          if (pose) {
            reticle.group.visible = true;
            reticle.group.matrix.fromArray(pose.transform.matrix);
            if (!chairSpawned) {
              updateARStatus('ready');
            }
          }
        } else {
          reticle.group.visible = false;
          if (!chairSpawned) {
            updateARStatus('scanning');
          }
        }
      }
    }

    // Turntable auto rotation when in regular studio mode
    if (!renderer.xr.isPresenting && !isCameraARActive && !isSimulatingAR && autoRotateSpeed > 0 && !isTransitioningCamera) {
      chair.group.rotation.y += autoRotateSpeed * delta;
    }

    // Smooth camera transition damping
    if (isTransitioningCamera && targetCamPos && targetCamLook) {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.x, 4.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.y, 4.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.z, 4.5, delta);

      controls.target.x = THREE.MathUtils.damp(controls.target.x, targetCamLook.x, 4.5, delta);
      controls.target.y = THREE.MathUtils.damp(controls.target.y, targetCamLook.y, 4.5, delta);
      controls.target.z = THREE.MathUtils.damp(controls.target.z, targetCamLook.z, 4.5, delta);
      controls.update();

      if (camera.position.distanceTo(targetCamPos) < 0.01 && controls.target.distanceTo(targetCamLook) < 0.01) {
        isTransitioningCamera = false;
      }
    } else if (!renderer.xr.isPresenting) {
      controls.update();
    }

    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(renderLoop);

  function handleResize(newWidth: number, newHeight: number) {
    const aspect = newWidth / newHeight;
    camera.aspect = aspect;
    camera.fov = aspect < 1 ? 48 : 38;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
  }

  // Camera AR Passthrough implementation for iOS & Android
  async function startCameraARMode(): Promise<void> {
    try {
      const session = await startDeviceCameraAR();
      cameraARSession = session;

      cameraVideoTexture = new THREE.VideoTexture(session.video);
      cameraVideoTexture.colorSpace = THREE.SRGBColorSpace;
      scene.background = cameraVideoTexture;
      scene.fog = null; // disable fog so video is crisp

      floorMesh.visible = false;
      shadowMesh.visible = false;

      // Chair only spawns when flat surface is detected
      chair.group.visible = false;
      chairSpawned = false;
      reticle.group.visible = false;
      cameraARScanTimer = 0;
      isCameraARActive = true;

      // Camera preset for AR eye-level looking at ground ahead
      camera.position.set(0, 0.9, 0.5);
      controls.target.set(0, 0.1, -1.4);
      controls.update();

      updateARStatus('scanning');
      callbacks?.onCameraARStart?.();
    } catch (err) {
      console.error('Failed to start camera AR', err);
      throw err;
    }
  }

  function stopCameraARMode(): void {
    if (cameraARSession) {
      cameraARSession.stop();
      cameraARSession = null;
    }
    if (cameraVideoTexture) {
      cameraVideoTexture.dispose();
      cameraVideoTexture = null;
    }
    isCameraARActive = false;
    chairSpawned = true;

    // Restore normal studio scene
    scene.background = floorBgColor;
    scene.fog = new THREE.Fog(0xE4E7EB, 4.5, 16);
    floorMesh.visible = true;
    shadowMesh.visible = true;
    shadowMesh.position.set(0, 0.002, 0.03);

    chair.group.visible = true;
    chair.group.position.set(0, 0, 0);
    chair.group.rotation.set(0, 0, 0);
    chair.group.scale.set(1, 1, 1);
    reticle.group.visible = false;

    // Reset camera to standard studio preset
    setCameraPreset('studio');
    callbacks?.onCameraAREnd?.();
  }

  return {
    domElement: renderer.domElement,
    chair,
    labels: chairLabels,

    setCameraPreset,

    toggleAutoRotate: (enabled: boolean) => {
      autoRotateSpeed = enabled ? 0.45 : 0;
    },

    setExposure: (val: number) => {
      renderer.toneMappingExposure = val;
    },

    toggleLabels: (visible?: boolean) => {
      const next = visible !== undefined ? visible : !chairLabels.isVisible();
      chairLabels.setVisible(next);
      return next;
    },

    areLabelsVisible: () => chairLabels.isVisible(),

    spawnChairAtReticle,
    resetARPlacement,
    rotateChairInAR,
    setChairRotationY,
    getChairRotationY,

    startSimulationMode: () => {
      isSimulatingAR = true;
      chairSpawned = false;
      chair.group.visible = false;
      shadowMesh.visible = false;
      reticle.group.visible = false;
      updateARStatus('scanning');
    },

    stopSimulationMode: () => {
      isSimulatingAR = false;
      chairSpawned = true;
      chair.group.visible = true;
      chair.group.position.set(0, 0, 0);
      chair.group.rotation.set(0, 0, 0);
      chair.group.scale.set(1, 1, 1);
      reticle.group.visible = false;
      shadowMesh.position.set(0, 0.002, 0.03);
      shadowMesh.visible = true;
    },

    isSimulationActive: () => isSimulatingAR,

    startCameraARMode,
    stopCameraARMode,
    isCameraARActive: () => isCameraARActive,

    // Universal AR Launcher (Selects WebXR on Android Chrome / Quest, or Camera AR on iOS Safari & fallback)
    launchUniversalAR: async (overlayElement?: HTMLElement): Promise<ARModeType> => {
      // 1. Try WebXR immersive-ar first (supported by Android Chrome ARCore, Quest, Vision Pro)
      if ('xr' in navigator && navigator.xr) {
        try {
          const supported = await navigator.xr.isSessionSupported('immersive-ar');
          if (supported) {
            const sessionOptions: XRSessionInit = {
              requiredFeatures: ['local-floor'],
              optionalFeatures: ['hit-test', 'dom-overlay', 'bounded-floor'],
            };
            if (overlayElement) {
              sessionOptions.domOverlay = { root: overlayElement };
            }
            const session = await navigator.xr.requestSession('immersive-ar', sessionOptions);
            currentXRSession = session;
            activeXRMode = 'immersive-ar';

            session.addEventListener('end', () => {
              currentXRSession = null;
              activeXRMode = null;
              hitTestSource = null;
              hitTestSourceRequested = false;
              reticle.group.visible = false;

              scene.background = floorBgColor;
              floorGroup.visible = true;
              floorMesh.visible = true;
              shadowMesh.visible = true;
              shadowMesh.position.set(0, 0.002, 0.03);
              chair.group.visible = true;
              chair.group.position.set(0, 0, 0);
              chair.group.rotation.set(0, 0, 0);
              chair.group.scale.set(1, 1, 1);
              chairSpawned = true;

              callbacks?.onXRSessionEnd?.();
            });

            await renderer.xr.setSession(session);
            scene.background = null;
            floorMesh.visible = false;
            shadowMesh.visible = false;

            // Chair only spawns when flat surface is detected
            chair.group.visible = false;
            chairSpawned = false;
            reticle.group.visible = false;

            updateARStatus('scanning');
            callbacks?.onXRSessionStart?.('immersive-ar');
            return 'webxr';
          }
        } catch {
          // Fall through to camera AR
        }
      }

      // 2. Fall back to Camera AR Passthrough (works on 100% of iOS Safari & Android mobile browsers)
      if (typeof navigator.mediaDevices?.getUserMedia === 'function') {
        try {
          await startCameraARMode();
          return 'camera';
        } catch (err) {
          // If camera permission denied or unavailable on desktop, launch simulation mode
          console.warn('Camera AR unavailable, falling back to simulation', err);
        }
      }

      // 3. Fallback to interactive simulation
      isSimulatingAR = true;
      chairSpawned = false;
      chair.group.visible = false;
      updateARStatus('scanning');
      return 'simulation';
    },

    isXRSupported: async (mode: 'immersive-ar' | 'immersive-vr'): Promise<boolean> => {
      if (!('xr' in navigator) || !navigator.xr) return false;
      try {
        return await navigator.xr.isSessionSupported(mode);
      } catch {
        return false;
      }
    },

    isSessionActive: () => !!currentXRSession,

    startXRSession: async (mode: 'immersive-ar' | 'immersive-vr', overlayElement?: HTMLElement) => {
      if (!navigator.xr) {
        throw new Error('WebXR is not supported on this browser or device.');
      }

      if (currentXRSession) {
        await currentXRSession.end();
      }

      const sessionOptions: XRSessionInit = {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['hit-test', 'dom-overlay', 'bounded-floor'],
      };

      if (overlayElement) {
        sessionOptions.domOverlay = { root: overlayElement };
      }

      try {
        const session = await navigator.xr.requestSession(mode, sessionOptions);
        currentXRSession = session;
        activeXRMode = mode;

        session.addEventListener('end', () => {
          currentXRSession = null;
          activeXRMode = null;
          hitTestSource = null;
          hitTestSourceRequested = false;
          reticle.group.visible = false;

          scene.background = floorBgColor;
          floorGroup.visible = true;
          floorMesh.visible = true;
          shadowMesh.visible = true;
          shadowMesh.position.set(0, 0.002, 0.03);
          chair.group.visible = true;
          chair.group.position.set(0, 0, 0);
          chair.group.rotation.set(0, 0, 0);
          chair.group.scale.set(1, 1, 1);
          chairSpawned = true;

          callbacks?.onXRSessionEnd?.();
        });

        await renderer.xr.setSession(session);

        if (mode === 'immersive-ar') {
          scene.background = null;
          floorMesh.visible = false;
          shadowMesh.visible = false;

          // Chair only spawns when flat surface is detected
          chair.group.visible = false;
          chairSpawned = false;
          reticle.group.visible = false;

          updateARStatus('scanning');
        } else {
          scene.background = floorBgColor;
          floorGroup.visible = true;
          floorMesh.visible = true;
          chair.group.visible = true;
          chair.group.position.set(0, 0, -1.5);
          chairSpawned = true;
        }

        callbacks?.onXRSessionStart?.(activeXRMode);
      } catch (err: any) {
        currentXRSession = null;
        activeXRMode = null;
        throw err;
      }
    },

    endXRSession: async () => {
      if (currentXRSession) {
        await currentXRSession.end();
      }
    },

    takeScreenshot: (): string => {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    },

    resize: handleResize,

    dispose: () => {
      renderer.setAnimationLoop(null);
      if (currentXRSession) {
        currentXRSession.end().catch(() => {});
      }
      if (cameraARSession) {
        cameraARSession.stop();
      }
      if (cameraVideoTexture) {
        cameraVideoTexture.dispose();
      }
      window.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      controls.dispose();
      chair.dispose();
      chairLabels.dispose();
      reticle.dispose();
      contactShadowTex.dispose();
      floorMat.dispose();
      floorGeo.dispose();
      shadowMat.dispose();
      shadowGeo.dispose();
      envTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    },
  };
}

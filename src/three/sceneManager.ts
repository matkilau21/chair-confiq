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

export type CameraPreset = 'studio' | 'front' | 'side' | 'top' | 'detail';
export type ARPlacementStatus = 'scanning' | 'ready' | 'placed';

export interface SceneCallbacks {
  onXRSessionStart?: (mode: 'immersive-ar' | 'immersive-vr') => void;
  onXRSessionEnd?: () => void;
  onARStatusChange?: (status: ARPlacementStatus) => void;
}

export interface ChairSceneManager {
  domElement: HTMLCanvasElement;
  chair: ChairController;
  setCameraPreset: (preset: CameraPreset) => void;
  toggleAutoRotate: (enabled: boolean) => void;
  setExposure: (val: number) => void;
  startXRSession: (mode: 'immersive-ar' | 'immersive-vr', overlayElement?: HTMLElement) => Promise<void>;
  endXRSession: () => Promise<void>;
  isXRSupported: (mode: 'immersive-ar' | 'immersive-vr') => Promise<boolean>;
  isSessionActive: () => boolean;
  spawnChairAtReticle: () => boolean;
  resetARPlacement: () => void;
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

  // 5. Camera Setup
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
  camera.position.set(1.9, 1.3, 2.3);

  // 6. Camera Controls (OrbitControls)
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0.55, 0);
  controls.minDistance = 0.7;
  controls.maxDistance = 6.0;
  controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going underneath floor
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

  // 9. Create the Lounge Chair
  const chair = createLoungeChair();
  scene.add(chair.group);

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

  // Simulation mode (allows previewing floor scanning and tap-to-spawn on desktop)
  let isSimulatingAR = false;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function updateARStatus(newStatus: ARPlacementStatus) {
    if (arStatus !== newStatus) {
      arStatus = newStatus;
      callbacks?.onARStatusChange?.(newStatus);
    }
  }

  // Spawn chair at reticle position
  function spawnChairAtReticle(): boolean {
    if (!reticle.group.visible) return false;

    // Set position from reticle matrix
    chair.group.position.setFromMatrixPosition(reticle.group.matrix);

    // Make chair face camera
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    const dx = camPos.x - chair.group.position.x;
    const dz = camPos.z - chair.group.position.z;
    if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
      chair.group.rotation.y = Math.atan2(dx, dz);
    }

    // Ground contact shadow under chair in AR
    shadowMesh.position.x = chair.group.position.x;
    shadowMesh.position.z = chair.group.position.z + 0.03;
    shadowMesh.visible = true;

    // Visual spawn pop animation
    chair.group.visible = true;
    chairSpawned = true;
    currentChairScale = 0.15;
    chair.group.scale.set(0.15, 0.15, 0.15);

    // Play reticle ripple shockwave
    reticle.triggerSpawnEffect(chair.group.position);

    updateARStatus('placed');
    return true;
  }

  function resetARPlacement() {
    chairSpawned = false;
    chair.group.visible = false;
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

  // Screen click/touch handler for WebXR DOM overlay or canvas touch
  function handleCanvasClick(e: MouseEvent | TouchEvent) {
    if (activeXRMode === 'immersive-ar' || isSimulatingAR) {
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

    // Update AR circle indicator animation
    reticle.update(delta);

    // Smooth spawn pop scale animation
    if (chairSpawned && currentChairScale < targetChairScale - 0.005) {
      currentChairScale = THREE.MathUtils.damp(currentChairScale, targetChairScale, 12, delta);
      chair.group.scale.set(currentChairScale, currentChairScale, currentChairScale);
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
    if (!renderer.xr.isPresenting && !isSimulatingAR && autoRotateSpeed > 0 && !isTransitioningCamera) {
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
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
  }

  return {
    domElement: renderer.domElement,
    chair,

    setCameraPreset,

    toggleAutoRotate: (enabled: boolean) => {
      autoRotateSpeed = enabled ? 0.45 : 0;
    },

    setExposure: (val: number) => {
      renderer.toneMappingExposure = val;
    },

    spawnChairAtReticle,
    resetARPlacement,

    startSimulationMode: () => {
      isSimulatingAR = true;
      chairSpawned = false;
      chair.group.visible = false;
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

          // Restore normal studio scene
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
          // Transparent background so camera passthrough is visible
          scene.background = null;
          floorMesh.visible = false;
          shadowMesh.visible = false; // will show once chair is placed

          // Chair starts hidden until user scans floor and clicks to spawn!
          chair.group.visible = false;
          chairSpawned = false;
          updateARStatus('scanning');
        } else {
          // Immersive VR showroom
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
      window.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      controls.dispose();
      chair.dispose();
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

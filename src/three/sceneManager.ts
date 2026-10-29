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

export type CameraPreset = 'studio' | 'front' | 'side' | 'top' | 'detail';

export interface SceneCallbacks {
  onXRSessionStart?: (mode: 'immersive-ar' | 'immersive-vr') => void;
  onXRSessionEnd?: () => void;
}

export interface ChairSceneManager {
  domElement: HTMLCanvasElement;
  chair: ChairController;
  setCameraPreset: (preset: CameraPreset) => void;
  toggleAutoRotate: (enabled: boolean) => void;
  setExposure: (val: number) => void;
  startXRSession: (mode: 'immersive-ar' | 'immersive-vr') => Promise<void>;
  endXRSession: () => Promise<void>;
  isXRSupported: (mode: 'immersive-ar' | 'immersive-vr') => Promise<boolean>;
  isSessionActive: () => boolean;
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
  controls.minDistance = 0.9;
  controls.maxDistance = 6.0;
  controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going underneath floor
  controls.update();

  // 7. Studio 3-Point Lighting Rig
  // Key Light (Warm, casts soft PCF shadows)
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

  // Fill Light (Cool sky / warm ground contrast)
  const hemiLight = new THREE.HemisphereLight(0xF2F7FF, 0xD4D8DF, 0.95);
  hemiLight.position.set(0, 4, 0);
  scene.add(hemiLight);

  // Soft Rim / Edge Light (Accents curves and silhouette)
  const rimLight = new THREE.DirectionalLight(0xEAF0F8, 0.85);
  rimLight.position.set(-2.5, 2.2, -2.5);
  scene.add(rimLight);

  // Subtle frontal fill
  const frontFill = new THREE.DirectionalLight(0xFFFFFF, 0.35);
  frontFill.position.set(0, 1.5, 3.0);
  scene.add(frontFill);

  // 8. Ground Floor & Grounding Contact Shadows
  const floorGroup = new THREE.Group();
  floorGroup.name = 'FloorGroup';
  scene.add(floorGroup);

  // Wide studio floor plane with soft matte material
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

  // Soft Contact Shadow Plane (Multi-stop smooth radial falloff)
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
  shadowMesh.position.set(0, 0.002, 0.03); // Just above floor to avoid Z-fighting
  floorGroup.add(shadowMesh);

  // 9. Create the Lounge Chair
  const chair = createLoungeChair();
  scene.add(chair.group);

  // 10. WebXR Support & Session Management
  let currentXRSession: XRSession | null = null;
  let activeXRMode: 'immersive-ar' | 'immersive-vr' | null = null;

  // AR Reticle (indicator for real-world placement)
  const reticleGeo = new THREE.RingGeometry(0.15, 0.18, 32).rotateX(-Math.PI / 2);
  const reticleMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide });
  const reticle = new THREE.Mesh(reticleGeo, reticleMat);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // XR Controller Setup
  const controller1 = renderer.xr.getController(0);
  controller1.addEventListener('select', onXRSelect);
  scene.add(controller1);

  const controller2 = renderer.xr.getController(1);
  controller2.addEventListener('select', onXRSelect);
  scene.add(controller2);

  // Controller Rays for VR/AR
  const rayGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const rayMat = new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.6 });
  const rayLine1 = new THREE.Line(rayGeo, rayMat);
  rayLine1.scale.z = 2;
  controller1.add(rayLine1);

  const rayLine2 = new THREE.Line(rayGeo, rayMat);
  rayLine2.scale.z = 2;
  controller2.add(rayLine2);

  let hitTestSource: XRHitTestSource | null = null;
  let hitTestSourceRequested = false;

  function onXRSelect() {
    if (activeXRMode === 'immersive-ar' && reticle.visible) {
      // Place / reposition chair at reticle location
      chair.group.position.setFromMatrixPosition(reticle.matrix);
      // Face towards user
      chair.group.rotation.y = camera.rotation.y;
    }
  }

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
    // Stop camera animation if user grabs controls
    isTransitioningCamera = false;
  });

  function setCameraPreset(preset: CameraPreset) {
    const config = PRESET_CONFIGS[preset];
    if (!config) return;
    targetCamPos = config.pos.clone();
    targetCamLook = config.target.clone();
    isTransitioningCamera = true;
  }

  // 12. Clock & Animation Loop
  const clock = new THREE.Clock();
  let autoRotateSpeed = 0;

  function renderLoop(timestamp: number, frame?: XRFrame) {
    const delta = Math.min(clock.getDelta(), 0.1);

    // Update chair sub-assemblies (exploded view interpolation)
    chair.updateAnimation(delta);

    // Handle WebXR AR frame logic
    if (frame && activeXRMode === 'immersive-ar') {
      const session = frame.session;
      const referenceSpace = renderer.xr.getReferenceSpace();

      if (!hitTestSourceRequested && referenceSpace) {
        session.requestReferenceSpace('viewer').then(viewerSpace => {
          session.requestHitTestSource?.({ space: viewerSpace })?.then(source => {
            hitTestSource = source;
          });
        }).catch(() => {});
        hitTestSourceRequested = true;
      }

      if (hitTestSource && referenceSpace) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0) {
          const hit = hitTestResults[0];
          const pose = hit.getPose(referenceSpace);
          if (pose) {
            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);
          }
        } else {
          reticle.visible = false;
        }
      }
    }

    // Auto rotate when not in XR
    if (!renderer.xr.isPresenting && autoRotateSpeed > 0 && !isTransitioningCamera) {
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

  // Start the universal Three.js animation loop (handles both desktop & WebXR)
  renderer.setAnimationLoop(renderLoop);

  // Resize handler
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

    isXRSupported: async (mode: 'immersive-ar' | 'immersive-vr'): Promise<boolean> => {
      if (!('xr' in navigator) || !navigator.xr) return false;
      try {
        return await navigator.xr.isSessionSupported(mode);
      } catch {
        return false;
      }
    },

    isSessionActive: () => !!currentXRSession,

    startXRSession: async (mode: 'immersive-ar' | 'immersive-vr') => {
      if (!navigator.xr) {
        throw new Error('WebXR is not supported on this browser or device.');
      }

      if (currentXRSession) {
        await currentXRSession.end();
      }

      const sessionOptions: XRSessionInit = {
        requiredFeatures: ['local-floor'],
        optionalFeatures: mode === 'immersive-ar' ? ['hit-test', 'dom-overlay'] : ['bounded-floor'],
      };

      try {
        const session = await navigator.xr.requestSession(mode, sessionOptions);
        currentXRSession = session;
        activeXRMode = mode;

        session.addEventListener('end', () => {
          currentXRSession = null;
          activeXRMode = null;
          hitTestSource = null;
          hitTestSourceRequested = false;
          reticle.visible = false;
          // Restore regular studio scene
          scene.background = floorBgColor;
          floorGroup.visible = true;
          chair.group.position.set(0, 0, 0);
          chair.group.rotation.set(0, 0, 0);
          callbacks?.onXRSessionEnd?.();
        });

        await renderer.xr.setSession(session);

        if (mode === 'immersive-ar') {
          // Transparent background so real world is visible
          scene.background = null;
          // Hide artificial floor plane so chair sits on real-world floor
          floorMesh.visible = false;
          // Keep contact shadow visible to ground chair on physical floor
          shadowMesh.visible = true;
          // Position chair 1.4m ahead in front of user initially
          chair.group.position.set(0, 0, -1.4);
        } else {
          // Immersive VR showroom mode
          scene.background = floorBgColor;
          floorGroup.visible = true;
          floorMesh.visible = true;
          chair.group.position.set(0, 0, -1.5);
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
      // Direct render right before grabbing canvas data
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    },

    resize: handleResize,

    dispose: () => {
      renderer.setAnimationLoop(null);
      if (currentXRSession) {
        currentXRSession.end().catch(() => {});
      }
      controls.dispose();
      chair.dispose();
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

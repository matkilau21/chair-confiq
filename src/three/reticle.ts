import * as THREE from 'three';

export interface ARReticle {
  group: THREE.Group;
  update: (delta: number) => void;
  triggerSpawnEffect: (pos: THREE.Vector3) => void;
  showIndicator: (visible: boolean) => void;
  dispose: () => void;
}

/**
 * Creates a high-fidelity animated circle indicator for AR surface scanning
 * Includes outer glow ring, cardinal tick marks, center dot, and spawn ripple.
 */
export function createARReticle(): ARReticle {
  const group = new THREE.Group();
  group.name = 'ARReticle';
  group.matrixAutoUpdate = false;
  group.visible = false;

  // Dedicated container for scanning indicator rings and dots (hidden once placed)
  const indicatorGroup = new THREE.Group();
  group.add(indicatorGroup);

  // 1. Outer Ring
  const outerRingGeo = new THREE.RingGeometry(0.20, 0.22, 64);
  outerRingGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38E8AC, // Mint / Emerald glow
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const outerRing = new THREE.Mesh(outerRingGeo, ringMat);
  indicatorGroup.add(outerRing);

  // 2. Inner Concentric Accent Ring
  const innerRingGeo = new THREE.RingGeometry(0.13, 0.14, 48);
  innerRingGeo.rotateX(-Math.PI / 2);
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: 0xFFFFFF,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  indicatorGroup.add(innerRing);

  // 3. Center Target Dot
  const centerDotGeo = new THREE.CircleGeometry(0.02, 32);
  centerDotGeo.rotateX(-Math.PI / 2);
  const centerDotMat = new THREE.MeshBasicMaterial({
    color: 0xFFFFFF,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const centerDot = new THREE.Mesh(centerDotGeo, centerDotMat);
  indicatorGroup.add(centerDot);

  // 4. Four Cardinal Alignment Ticks
  const tickGeo = new THREE.PlaneGeometry(0.015, 0.05);
  tickGeo.rotateX(-Math.PI / 2);
  const tickMat = new THREE.MeshBasicMaterial({
    color: 0x38E8AC,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  const tickPositions = [
    { x: 0, z: -0.22, rot: 0 },
    { x: 0, z: 0.22, rot: 0 },
    { x: -0.22, z: 0, rot: Math.PI / 2 },
    { x: 0.22, z: 0, rot: Math.PI / 2 },
  ];

  tickPositions.forEach(t => {
    const tick = new THREE.Mesh(tickGeo, tickMat);
    tick.position.set(t.x, 0.001, t.z);
    tick.rotation.y = t.rot;
    indicatorGroup.add(tick);
  });

  // 5. Spawn Ripple Wave Mesh (added to root group, persists through spawn)
  const rippleGeo = new THREE.RingGeometry(0.05, 0.08, 64);
  rippleGeo.rotateX(-Math.PI / 2);
  const rippleMat = new THREE.MeshBasicMaterial({
    color: 0xFFFFFF,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const rippleMesh = new THREE.Mesh(rippleGeo, rippleMat);
  rippleMesh.visible = false;
  group.add(rippleMesh);

  let rippleActive = false;
  let rippleTime = 0;
  const rippleDuration = 0.55;

  let animTime = 0;

  return {
    group,

    showIndicator: (visible: boolean) => {
      indicatorGroup.visible = visible;
    },

    update: (delta: number) => {
      animTime += delta;

      // Gentle breathing pulse animation for the reticle
      const pulse = 1 + Math.sin(animTime * 4.5) * 0.04;
      outerRing.scale.set(pulse, 1, pulse);
      innerRing.scale.set(1 / pulse, 1, 1 / pulse);

      // Subtle rotation of inner accent ticks
      innerRing.rotation.y = animTime * 0.4;

      // Handle spawn ripple animation
      if (rippleActive) {
        rippleTime += delta;
        const progress = rippleTime / rippleDuration;
        if (progress >= 1) {
          rippleActive = false;
          rippleMesh.visible = false;
          // If indicator is also hidden, hide whole group
          if (!indicatorGroup.visible) {
            group.visible = false;
          }
        } else {
          const scale = 1 + progress * 5.0; // expand outward
          rippleMesh.scale.set(scale, 1, scale);
          rippleMat.opacity = (1 - progress) * 0.85;
        }
      }
    },

    triggerSpawnEffect: (pos: THREE.Vector3) => {
      rippleActive = true;
      rippleTime = 0;
      indicatorGroup.visible = false;
      group.visible = true;
      rippleMesh.visible = true;
      rippleMesh.position.set(0, 0.002, 0);
      rippleMesh.scale.set(1, 1, 1);
      rippleMat.opacity = 0.9;
    },

    dispose: () => {
      outerRingGeo.dispose();
      ringMat.dispose();
      innerRingGeo.dispose();
      innerRingMat.dispose();
      centerDotGeo.dispose();
      centerDotMat.dispose();
      tickGeo.dispose();
      tickMat.dispose();
      rippleGeo.dispose();
      rippleMat.dispose();
    },
  };
}

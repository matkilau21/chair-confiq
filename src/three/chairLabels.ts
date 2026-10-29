import * as THREE from 'three';
import {
  FabricColorKey,
  LegMaterialKey,
  FABRIC_OPTIONS,
  LEG_OPTIONS,
} from './chairBuilder';

export interface ChairLabelsController {
  group: THREE.Group;
  update: (camera: THREE.Camera) => void;
  updateSpecs: (fabricKey: FabricColorKey, legKey: LegMaterialKey) => void;
  setVisible: (visible: boolean) => void;
  isVisible: () => boolean;
  dispose: () => void;
}

/**
 * Creates floating billboard labels and hotspot callouts on the chair
 * Guaranteed to follow the camera view at all times.
 */
export function createChairLabels(
  fabricKey: FabricColorKey,
  legKey: LegMaterialKey
): ChairLabelsController {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'ChairLabels';

  let currentFabricKey = fabricKey;
  let currentLegKey = legKey;
  let isLabelsVisible = true;

  // Canvas for Main Spec Hero Badge
  const badgeCanvas = document.createElement('canvas');
  badgeCanvas.width = 512;
  badgeCanvas.height = 256;
  const ctx = badgeCanvas.getContext('2d')!;

  const badgeTexture = new THREE.CanvasTexture(badgeCanvas);
  badgeTexture.colorSpace = THREE.SRGBColorSpace;
  badgeTexture.anisotropy = 4;

  function redrawBadge() {
    const f = FABRIC_OPTIONS[currentFabricKey];
    const l = LEG_OPTIONS[currentLegKey];
    const totalPrice = 1290 + (currentLegKey === 'wood' ? 140 : 190);

    ctx.clearRect(0, 0, 512, 256);

    // Rounded rectangle card background with dark glass aesthetic
    ctx.fillStyle = 'rgba(22, 26, 32, 0.92)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 4;

    const x = 16, y = 16, w = 480, h = 224, r = 24;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Fabric Color Accent Indicator Pill
    ctx.fillStyle = f.hex;
    ctx.beginPath();
    ctx.arc(52, 64, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Model Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 30px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('Oslo Lounge Chair', 84, 72);

    // Subtitle / Specs
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '500 22px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${f.name} • ${l.name}`, 44, 122);

    // Specs Row
    ctx.fillStyle = '#D1D5DB';
    ctx.font = '400 19px system-ui, -apple-system, sans-serif';
    ctx.fillText('Ergonomic Recline • Martindale 45k', 44, 160);

    // Price Badge & Dimensions
    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.fillText(`$${totalPrice} USD`, 44, 202);

    ctx.fillStyle = '#6B7280';
    ctx.font = '500 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('W78 × D82 × H86 cm', 260, 202);

    badgeTexture.needsUpdate = true;
  }

  redrawBadge();

  // 1. Hero Spec Billboard
  const badgePlaneGeo = new THREE.PlaneGeometry(0.55, 0.28);
  const badgeMat = new THREE.MeshBasicMaterial({
    map: badgeTexture,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const heroBadgeMesh = new THREE.Mesh(badgePlaneGeo, badgeMat);
  heroBadgeMesh.position.set(0.42, 1.10, 0.05);
  rootGroup.add(heroBadgeMesh);

  // Leader line connecting hero badge to the chair
  const leaderCurve = new THREE.LineCurve3(
    new THREE.Vector3(0.42, 0.96, 0.05),
    new THREE.Vector3(0.18, 0.68, 0.02)
  );
  const leaderGeo = new THREE.BufferGeometry().setFromPoints(leaderCurve.getPoints(10));
  const leaderMat = new THREE.LineBasicMaterial({
    color: 0xFFFFFF,
    transparent: true,
    opacity: 0.6,
  });
  const leaderLine = new THREE.Line(leaderGeo, leaderMat);
  rootGroup.add(leaderLine);

  // Leader anchor dot on the chair
  const anchorDotGeo = new THREE.SphereGeometry(0.012, 16, 16);
  const anchorDotMat = new THREE.MeshBasicMaterial({ color: 0x10B981 });
  const anchorDot = new THREE.Mesh(anchorDotGeo, anchorDotMat);
  anchorDot.position.set(0.18, 0.68, 0.02);
  rootGroup.add(anchorDot);

  // 2. Hotspot Feature Pills (Each anchored to part of chair, facing camera)
  interface Hotspot {
    text: string;
    pos: THREE.Vector3;
    sprite: THREE.Sprite;
  }

  function createHotspotSprite(text: string): THREE.Sprite {
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 256;
    sCanvas.height = 64;
    const sCtx = sCanvas.getContext('2d')!;

    // Pill background
    sCtx.fillStyle = 'rgba(18, 22, 28, 0.88)';
    sCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    sCtx.lineWidth = 2;

    const sx = 4, sy = 4, sw = 248, sh = 56, sr = 24;
    sCtx.beginPath();
    sCtx.moveTo(sx + sr, sy);
    sCtx.lineTo(sx + sw - sr, sy);
    sCtx.quadraticCurveTo(sx + sw, sy, sx + sw, sy + sr);
    sCtx.lineTo(sx + sw, sy + sh - sr);
    sCtx.quadraticCurveTo(sx + sw, sy + sh, sx + sw - sr, sy + sh);
    sCtx.lineTo(sx + sr, sy + sh);
    sCtx.quadraticCurveTo(sx, sy + sh, sx, sy + sh - sr);
    sCtx.lineTo(sx, sy + sr);
    sCtx.quadraticCurveTo(sx, sy, sx + sr, sy);
    sCtx.closePath();
    sCtx.fill();
    sCtx.stroke();

    // Pulse dot
    sCtx.fillStyle = '#10B981';
    sCtx.beginPath();
    sCtx.arc(28, 32, 7, 0, Math.PI * 2);
    sCtx.fill();

    // Text
    sCtx.fillStyle = '#FFFFFF';
    sCtx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    sCtx.fillText(text, 46, 38);

    const sTex = new THREE.CanvasTexture(sCanvas);
    sTex.colorSpace = THREE.SRGBColorSpace;
    const sMat = new THREE.SpriteMaterial({
      map: sTex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(sMat);
    sprite.scale.set(0.32, 0.08, 1);
    return sprite;
  }

  const cushionHotspot = createHotspotSprite('Dual-Density Foam');
  cushionHotspot.position.set(-0.35, 0.52, 0.15);
  rootGroup.add(cushionHotspot);

  const legsHotspot = createHotspotSprite('Solid Tapered Legs');
  legsHotspot.position.set(-0.32, 0.18, 0.22);
  rootGroup.add(legsHotspot);

  return {
    group: rootGroup,

    update: (camera: THREE.Camera) => {
      if (!isLabelsVisible) return;

      // Ensure the hero billboard always directly faces the camera view in world coordinates
      const camWorldQuat = new THREE.Quaternion();
      camera.getWorldQuaternion(camWorldQuat);

      if (heroBadgeMesh.parent) {
        const parentWorldQuat = new THREE.Quaternion();
        heroBadgeMesh.parent.getWorldQuaternion(parentWorldQuat);
        heroBadgeMesh.quaternion.copy(parentWorldQuat.invert().multiply(camWorldQuat));
      } else {
        heroBadgeMesh.quaternion.copy(camWorldQuat);
      }
    },

    updateSpecs: (newFabric: FabricColorKey, newLeg: LegMaterialKey) => {
      currentFabricKey = newFabric;
      currentLegKey = newLeg;
      redrawBadge();
    },

    setVisible: (visible: boolean) => {
      isLabelsVisible = visible;
      rootGroup.visible = visible;
    },

    isVisible: () => isLabelsVisible,

    dispose: () => {
      badgePlaneGeo.dispose();
      badgeMat.dispose();
      badgeTexture.dispose();
      leaderGeo.dispose();
      leaderMat.dispose();
      anchorDotGeo.dispose();
      anchorDotMat.dispose();
    },
  };
}

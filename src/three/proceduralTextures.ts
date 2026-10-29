import * as THREE from 'three';

/**
 * Procedural texture generator for physical PBR materials
 * Zero external asset dependencies (no 404s, offline & instant).
 */

// Generate a rich, tactile woven bouclé fabric bump & roughness map
export function createFabricTexture(): {
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base neutral tone
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  // Intertwined herringbone / twill woven fabric pattern
  const threadCount = 32;
  const step = size / threadCount;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      const cellX = (x / step) % 2;
      const cellY = (y / step) % 2;
      const isWarp = (Math.floor(x / step) + Math.floor(y / step)) % 2 === 0;

      // Micro thread thread curves
      const threadPhase = isWarp ? Math.sin((x % step) / step * Math.PI) : Math.sin((y % step) / step * Math.PI);
      const crossPhase = isWarp ? Math.cos((y % step) / step * Math.PI * 2) * 0.2 : Math.cos((x % step) / step * Math.PI * 2) * 0.2;

      // Noise variation for organic yarn fibers
      const noise = (Math.random() - 0.5) * 35;
      const intensity = Math.min(255, Math.max(0, 128 + (threadPhase + crossPhase) * 60 + noise));

      data[idx] = intensity;
      data[idx + 1] = intensity;
      data[idx + 2] = intensity;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const bumpMap = new THREE.CanvasTexture(canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(16, 16);

  // Roughness variation map
  const rCanvas = document.createElement('canvas');
  rCanvas.width = 256;
  rCanvas.height = 256;
  const rCtx = rCanvas.getContext('2d')!;
  rCtx.fillStyle = '#C0C0C0'; // High roughness for matte fabric
  rCtx.fillRect(0, 0, 256, 256);

  // Add subtle soft patches
  for (let i = 0; i < 400; i++) {
    const rx = Math.random() * 256;
    const ry = Math.random() * 256;
    const rad = 2 + Math.random() * 6;
    rCtx.fillStyle = Math.random() > 0.5 ? 'rgba(230, 230, 230, 0.2)' : 'rgba(160, 160, 160, 0.2)';
    rCtx.beginPath();
    rCtx.arc(rx, ry, rad, 0, Math.PI * 2);
    rCtx.fill();
  }

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(16, 16);

  return { bumpMap, roughnessMap };
}

// Generate warm natural wood grain diffuse and bump textures
export function createWoodTexture(): {
  colorMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const width = 512;
  const height = 512;

  // Color canvas (Walnut tone)
  const cCanvas = document.createElement('canvas');
  cCanvas.width = width;
  cCanvas.height = height;
  const cCtx = cCanvas.getContext('2d')!;

  // Base warm walnut gradient
  const grad = cCtx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, '#5A3825');
  grad.addColorStop(0.3, '#6C432D');
  grad.addColorStop(0.7, '#4B2E1E');
  grad.addColorStop(1, '#5C3926');
  cCtx.fillStyle = grad;
  cCtx.fillRect(0, 0, width, height);

  // Wood grain lines
  for (let y = 0; y < height; y += 3) {
    cCtx.strokeStyle = Math.random() > 0.5 ? 'rgba(38, 22, 14, 0.22)' : 'rgba(130, 85, 58, 0.18)';
    cCtx.lineWidth = 1 + Math.random() * 2.5;
    cCtx.beginPath();
    let currentX = 0;
    cCtx.moveTo(0, y);
    while (currentX < width) {
      currentX += 20 + Math.random() * 30;
      const wobbleY = y + Math.sin(currentX * 0.02) * 5 + (Math.random() - 0.5) * 2;
      cCtx.lineTo(currentX, wobbleY);
    }
    cCtx.stroke();
  }

  // Subtle natural knots/swirls
  for (let k = 0; k < 3; k++) {
    const kx = 100 + Math.random() * (width - 200);
    const ky = 50 + Math.random() * (height - 100);
    const kGrad = cCtx.createRadialGradient(kx, ky, 2, kx, ky, 35);
    kGrad.addColorStop(0, 'rgba(30, 16, 10, 0.35)');
    kGrad.addColorStop(0.4, 'rgba(45, 25, 15, 0.2)');
    kGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    cCtx.fillStyle = kGrad;
    cCtx.beginPath();
    cCtx.ellipse(kx, ky, 15, 40, Math.PI / 12, 0, Math.PI * 2);
    cCtx.fill();
  }

  const colorMap = new THREE.CanvasTexture(cCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.repeat.set(1, 3);

  // Bump canvas for wood pore roughness
  const bCanvas = document.createElement('canvas');
  bCanvas.width = width;
  bCanvas.height = height;
  const bCtx = bCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += 2) {
    bCtx.strokeStyle = Math.random() > 0.5 ? 'rgba(40, 40, 40, 0.25)' : 'rgba(210, 210, 210, 0.2)';
    bCtx.lineWidth = 1 + Math.random() * 1.5;
    bCtx.beginPath();
    bCtx.moveTo(0, y);
    bCtx.lineTo(width, y + (Math.random() - 0.5) * 4);
    bCtx.stroke();
  }

  const bumpMap = new THREE.CanvasTexture(bCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(1, 3);

  return { colorMap, bumpMap };
}

// Generate brushed metal micro-texture for legs
export function createBrushedMetalTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#A0A0A0';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const v = 140 + Math.floor(Math.random() * 60);
    ctx.fillStyle = `rgb(${v}, ${v}, ${v})`;
    ctx.fillRect(0, y, size, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4);
  return texture;
}

// Generate soft radial contact shadow texture
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2, size / 2, 10,
    size / 2, size / 2, size / 2
  );
  grad.addColorStop(0, 'rgba(25, 28, 35, 0.65)');
  grad.addColorStop(0.25, 'rgba(25, 28, 35, 0.45)');
  grad.addColorStop(0.55, 'rgba(30, 34, 42, 0.20)');
  grad.addColorStop(0.8, 'rgba(40, 45, 55, 0.05)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  // Slightly elliptical for chair foot-print
  ctx.ellipse(size / 2, size / 2, size * 0.44, size * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

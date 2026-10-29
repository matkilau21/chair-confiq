import * as THREE from 'three';
import {
  createFabricTexture,
  createWoodTexture,
  createBrushedMetalTexture,
} from './proceduralTextures';

export type FabricColorKey = 'terracotta' | 'sage' | 'slate';
export type LegMaterialKey = 'wood' | 'metal';

export interface FabricOption {
  id: FabricColorKey;
  name: string;
  hex: string;
  description: string;
  sheenColor: string;
}

export interface LegOption {
  id: LegMaterialKey;
  name: string;
  description: string;
  finish: string;
}

export const FABRIC_OPTIONS: Record<FabricColorKey, FabricOption> = {
  terracotta: {
    id: 'terracotta',
    name: 'Terracotta Rust',
    hex: '#B85836',
    description: 'Warm earthy Mediterranean bouclé with amber undertones',
    sheenColor: '#DF8A6A',
  },
  sage: {
    id: 'sage',
    name: 'Nordic Sage',
    hex: '#4A6856',
    description: 'Muted Scandinavian botanical wool blend with calm depth',
    sheenColor: '#7AA189',
  },
  slate: {
    id: 'slate',
    name: 'Midnight Slate',
    hex: '#263342',
    description: 'Deep architectural indigo-charcoal textured weave',
    sheenColor: '#4F6178',
  },
};

export const LEG_OPTIONS: Record<LegMaterialKey, LegOption> = {
  wood: {
    id: 'wood',
    name: 'Natural Walnut',
    description: 'Solid oiled American walnut with rich organic wood grain',
    finish: 'Satin Hand-Rubbed Oil',
  },
  metal: {
    id: 'metal',
    name: 'Brushed Dark Metal',
    description: 'Precision machined anodized carbon steel with fine linear brush',
    finish: 'Matte Industrial PVD',
  },
};

export interface ChairController {
  group: THREE.Group;
  setFabricColor: (colorKey: FabricColorKey) => void;
  setLegMaterial: (materialKey: LegMaterialKey) => void;
  setExplodedFactor: (factor: number) => void;
  updateAnimation: (delta: number) => void;
  dispose: () => void;
  getDimensions: () => { width: number; height: number; depth: number };
}

/**
 * Creates the complete architectural lounge chair model
 * Composed of multiple articulated sub-components in THREE.Group
 */
export function createLoungeChair(): ChairController {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'LoungeChair';

  // Sub-groups for exploded view kinematics
  const seatGroup = new THREE.Group();
  const backrestGroup = new THREE.Group();
  const armrestLeftGroup = new THREE.Group();
  const armrestRightGroup = new THREE.Group();
  const baseGroup = new THREE.Group();

  rootGroup.add(baseGroup);
  rootGroup.add(seatGroup);
  rootGroup.add(backrestGroup);
  rootGroup.add(armrestLeftGroup);
  rootGroup.add(armrestRightGroup);

  // Generate textures
  const fabricTextures = createFabricTexture();
  const woodTextures = createWoodTexture();
  const metalTexture = createBrushedMetalTexture();

  // Reusable materials
  let currentFabricKey: FabricColorKey = 'terracotta';
  let currentLegKey: LegMaterialKey = 'wood';

  // 1. Fabric Material for Cushions
  const fabricMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(FABRIC_OPTIONS[currentFabricKey].hex),
    roughness: 0.88,
    metalness: 0.04,
    bumpMap: fabricTextures.bumpMap,
    bumpScale: 0.0035,
    roughnessMap: fabricTextures.roughnessMap,
    sheen: 0.65,
    sheenColor: new THREE.Color(FABRIC_OPTIONS[currentFabricKey].sheenColor),
    sheenRoughness: 0.6,
  });

  // Piping seam material (subtle accent shade)
  const pipingMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(FABRIC_OPTIONS[currentFabricKey].hex).multiplyScalar(0.85),
    roughness: 0.75,
    metalness: 0.05,
  });

  // 2. Shell Material (Satin matte molded outer casing)
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0x1A1D20,
    roughness: 0.42,
    metalness: 0.15,
  });

  // 3. Wood Leg Material
  const woodLegMaterial = new THREE.MeshStandardMaterial({
    color: 0x6E4631,
    map: woodTextures.colorMap,
    bumpMap: woodTextures.bumpMap,
    bumpScale: 0.004,
    roughness: 0.38,
    metalness: 0.03,
  });

  // 4. Metal Leg Material
  const metalLegMaterial = new THREE.MeshStandardMaterial({
    color: 0x22252A,
    roughness: 0.28,
    metalness: 0.88,
    bumpMap: metalTexture,
    bumpScale: 0.002,
  });

  // 5. Foot glide / hardware material (Brushed Champagne Brass)
  const brassHardwareMaterial = new THREE.MeshStandardMaterial({
    color: 0xD4AF37,
    roughness: 0.25,
    metalness: 0.85,
  });

  // 6. Base mount hub material
  const hubMaterial = new THREE.MeshStandardMaterial({
    color: 0x1D2024,
    roughness: 0.35,
    metalness: 0.75,
  });

  // Reference lists for quick material switching
  const fabricMeshes: THREE.Mesh[] = [];
  const legMeshes: THREE.Mesh[] = [];

  // ==========================================
  // GEOMETRY GENERATION
  // ==========================================

  // --- A. BASE & LEGS ---
  // Central mounting plate & hub
  const hubGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.06, 24);
  const hubMesh = new THREE.Mesh(hubGeo, hubMaterial);
  hubMesh.position.set(0, 0.36, 0);
  hubMesh.castShadow = true;
  hubMesh.receiveShadow = true;
  baseGroup.add(hubMesh);

  // Cross connector braces under seat
  const braceGeo = new THREE.BoxGeometry(0.38, 0.025, 0.04);
  const brace1 = new THREE.Mesh(braceGeo, hubMaterial);
  brace1.position.set(0, 0.385, 0);
  brace1.castShadow = true;
  baseGroup.add(brace1);

  const brace2 = new THREE.Mesh(braceGeo, hubMaterial);
  brace2.position.set(0, 0.385, 0);
  brace2.rotation.y = Math.PI / 2;
  brace2.castShadow = true;
  baseGroup.add(brace2);

  // 4 Tapered Splayed Legs
  const legLength = 0.42;
  const legTopRadius = 0.024;
  const legBottomRadius = 0.013;
  const splayAngle = 0.32; // ~18.3 degrees outward
  const legRadiusFromCenter = 0.07;

  const legPositions = [
    { angle: Math.PI * 0.25, rotY: 0 },
    { angle: Math.PI * 0.75, rotY: 0 },
    { angle: Math.PI * 1.25, rotY: 0 },
    { angle: Math.PI * 1.75, rotY: 0 },
  ];

  legPositions.forEach((pos, idx) => {
    const legContainer = new THREE.Group();
    legContainer.position.set(0, 0.36, 0);
    legContainer.rotation.y = pos.angle;

    // Tapered Leg Cylinder
    const legGeo = new THREE.CylinderGeometry(legTopRadius, legBottomRadius, legLength, 20);
    // Move pivot to top
    legGeo.translate(0, -legLength / 2, 0);

    const legMesh = new THREE.Mesh(legGeo, woodLegMaterial);
    legMesh.castShadow = true;
    legMesh.receiveShadow = true;
    legMeshes.push(legMesh);

    // Tilt outward
    legMesh.rotation.z = splayAngle;
    legMesh.position.x = legRadiusFromCenter;

    // Foot glide / brass tip
    const glideGeo = new THREE.CylinderGeometry(legBottomRadius * 1.15, legBottomRadius * 1.05, 0.025, 16);
    glideGeo.translate(0, -0.0125, 0);
    const glideMesh = new THREE.Mesh(glideGeo, brassHardwareMaterial);
    glideMesh.position.y = -legLength + 0.012;
    glideMesh.castShadow = true;
    legMesh.add(glideMesh);

    // Small felt pad floor contact
    const padGeo = new THREE.CylinderGeometry(legBottomRadius * 0.95, legBottomRadius * 0.95, 0.005, 12);
    padGeo.translate(0, -0.0025, 0);
    const padMesh = new THREE.Mesh(padGeo, hubMaterial);
    padMesh.position.y = -legLength;
    legMesh.add(padMesh);

    legContainer.add(legMesh);
    baseGroup.add(legContainer);
  });

  // --- B. SEAT ---
  // Molded outer seat shell
  const seatWidth = 0.64;
  const seatDepth = 0.62;
  const seatHeight = 0.11;

  // Custom curved shell using Lathe/Extrude or Box with soft bevel
  const seatShellGeo = new THREE.BoxGeometry(seatWidth, 0.045, seatDepth, 16, 2, 16);
  // Curve down slightly towards the back for ergonomic bucket tilt
  const seatShellPos = seatShellGeo.attributes.position;
  for (let i = 0; i < seatShellPos.count; i++) {
    const x = seatShellPos.getX(i);
    const z = seatShellPos.getZ(i);
    // Subtle bucket curve
    const dip = Math.pow(x / (seatWidth * 0.5), 2) * 0.035 - (z / seatDepth) * 0.025;
    seatShellPos.setY(i, seatShellPos.getY(i) + dip);
  }
  seatShellGeo.computeVertexNormals();

  const seatShellMesh = new THREE.Mesh(seatShellGeo, shellMaterial);
  seatShellMesh.position.set(0, 0.41, 0.02);
  seatShellMesh.rotation.x = -0.06; // slight back tilt
  seatShellMesh.castShadow = true;
  seatShellMesh.receiveShadow = true;
  seatGroup.add(seatShellMesh);

  // Plush ergonomic seat cushion
  const cushionWidth = 0.58;
  const cushionDepth = 0.56;
  const cushionHeight = 0.095;
  const cushionGeo = new THREE.BoxGeometry(cushionWidth, cushionHeight, cushionDepth, 24, 8, 24);

  // Shape the cushion with soft organic crown & slight center indent
  const cushionPos = cushionGeo.attributes.position;
  for (let i = 0; i < cushionPos.count; i++) {
    const x = cushionPos.getX(i);
    const y = cushionPos.getY(i);
    const z = cushionPos.getZ(i);

    const normX = x / (cushionWidth * 0.5);
    const normZ = z / (cushionDepth * 0.5);
    const distSq = normX * normX + normZ * normZ;

    // Crown curve on top surface
    if (y > 0) {
      const crown = Math.cos(Math.min(1.4, Math.sqrt(distSq))) * 0.022;
      // Ergonomic thigh support contour
      const thighRise = Math.exp(-Math.pow((normZ - 0.6) * 2, 2)) * 0.015;
      // Center depression
      const indent = -Math.exp(-distSq * 2.5) * 0.012;
      cushionPos.setY(i, y + crown + thighRise + indent);
    }

    // Soft bulging sides
    const bulge = Math.sin((y / cushionHeight + 0.5) * Math.PI) * 0.012;
    cushionPos.setX(i, x * (1 + bulge));
    cushionPos.setZ(i, z * (1 + bulge));
  }
  cushionGeo.computeVertexNormals();

  const seatCushionMesh = new THREE.Mesh(cushionGeo, fabricMaterial);
  seatCushionMesh.position.set(0, 0.46, 0.02);
  seatCushionMesh.rotation.x = -0.06;
  seatCushionMesh.castShadow = true;
  seatCushionMesh.receiveShadow = true;
  seatGroup.add(seatCushionMesh);
  fabricMeshes.push(seatCushionMesh);

  // Seat cushion perimeter piping cord
  const pipingShape = new THREE.CurvePath<THREE.Vector3>();
  const hw = cushionWidth * 0.505;
  const hd = cushionDepth * 0.505;
  const pipingPoints = [
    new THREE.Vector3(-hw, 0, -hd),
    new THREE.Vector3(hw, 0, -hd),
    new THREE.Vector3(hw, 0, hd),
    new THREE.Vector3(-hw, 0, hd),
    new THREE.Vector3(-hw, 0, -hd),
  ];
  const pipingCurve = new THREE.CatmullRomCurve3(pipingPoints, true, 'catmullrom', 0.2);
  const pipingGeo = new THREE.TubeGeometry(pipingCurve, 64, 0.005, 8, true);
  const seatPipingMesh = new THREE.Mesh(pipingGeo, pipingMaterial);
  seatPipingMesh.position.set(0, 0.46, 0.02);
  seatPipingMesh.rotation.x = -0.06;
  seatPipingMesh.castShadow = true;
  seatGroup.add(seatPipingMesh);

  // --- C. BACKREST & HEADREST ---
  // Molded outer back shell
  const backWidth = 0.58;
  const backHeight = 0.56;
  const backTilt = -0.26; // ~15 deg recline

  const backShellGeo = new THREE.BoxGeometry(backWidth, backHeight, 0.04, 16, 16, 2);
  const backShellPos = backShellGeo.attributes.position;
  for (let i = 0; i < backShellPos.count; i++) {
    const x = backShellPos.getX(i);
    const y = backShellPos.getY(i);
    // Hugging curvature at sides
    const curve = Math.pow(x / (backWidth * 0.5), 2) * 0.04;
    // Lumbar curve along Y
    const lumbar = Math.sin((y / backHeight + 0.5) * Math.PI) * 0.02;
    backShellPos.setZ(i, backShellPos.getZ(i) - curve + lumbar);
  }
  backShellGeo.computeVertexNormals();

  const backShellMesh = new THREE.Mesh(backShellGeo, shellMaterial);
  backShellMesh.position.set(0, 0.72, -0.22);
  backShellMesh.rotation.x = backTilt;
  backShellMesh.castShadow = true;
  backShellMesh.receiveShadow = true;
  backrestGroup.add(backShellMesh);

  // Molded heavy-duty cast aluminum back connector bracket
  const bracketGeo = new THREE.BoxGeometry(0.12, 0.22, 0.035);
  const bracketMesh = new THREE.Mesh(bracketGeo, hubMaterial);
  bracketMesh.position.set(0, 0.52, -0.19);
  bracketMesh.rotation.x = -0.4;
  bracketMesh.castShadow = true;
  backrestGroup.add(bracketMesh);

  // Plush contoured backrest cushion
  const backCushionGeo = new THREE.BoxGeometry(backWidth * 0.94, backHeight * 0.92, 0.08, 20, 24, 8);
  const bPos = backCushionGeo.attributes.position;
  for (let i = 0; i < bPos.count; i++) {
    const x = bPos.getX(i);
    const y = bPos.getY(i);
    const z = bPos.getZ(i);

    const normX = x / (backWidth * 0.47);
    const normY = y / (backHeight * 0.46);

    // Front cushion contour & lumbar volume
    if (z > 0) {
      const lumbarSupport = Math.cos(normY * 1.8) * 0.025;
      const wingCurve = -Math.pow(normX, 2) * 0.02;
      bPos.setZ(i, z + lumbarSupport + wingCurve);
    }
  }
  backCushionGeo.computeVertexNormals();

  const backCushionMesh = new THREE.Mesh(backCushionGeo, fabricMaterial);
  backCushionMesh.position.set(0, 0.73, -0.19);
  backCushionMesh.rotation.x = backTilt;
  backCushionMesh.castShadow = true;
  backCushionMesh.receiveShadow = true;
  backrestGroup.add(backCushionMesh);
  fabricMeshes.push(backCushionMesh);

  // Tufting stitch accents on back cushion (subtle button indentation indent)
  const buttonGeo = new THREE.SphereGeometry(0.012, 12, 12);
  buttonGeo.scale(1, 1, 0.4);
  const buttonPositions = [
    { x: -0.12, y: 0.12 },
    { x: 0.12, y: 0.12 },
    { x: -0.12, y: -0.08 },
    { x: 0.12, y: -0.08 },
  ];
  buttonPositions.forEach(b => {
    const bMesh = new THREE.Mesh(buttonGeo, pipingMaterial);
    bMesh.position.set(b.x, b.y, 0.045);
    backCushionMesh.add(bMesh);
  });

  // Pillow Headrest cushion
  const headrestWidth = 0.42;
  const headrestHeight = 0.18;
  const headrestGeo = new THREE.BoxGeometry(headrestWidth, headrestHeight, 0.075, 16, 12, 8);
  const hPos = headrestGeo.attributes.position;
  for (let i = 0; i < hPos.count; i++) {
    const x = hPos.getX(i);
    const y = hPos.getY(i);
    const z = hPos.getZ(i);
    const r = Math.sqrt((x / (headrestWidth * 0.5)) ** 2 + (y / (headrestHeight * 0.5)) ** 2);
    if (z > 0) {
      hPos.setZ(i, z + Math.cos(Math.min(1.4, r)) * 0.018);
    }
  }
  headrestGeo.computeVertexNormals();

  const headrestMesh = new THREE.Mesh(headrestGeo, fabricMaterial);
  headrestMesh.position.set(0, 1.05, -0.31);
  headrestMesh.rotation.x = backTilt - 0.08;
  headrestMesh.castShadow = true;
  headrestMesh.receiveShadow = true;
  backrestGroup.add(headrestMesh);
  fabricMeshes.push(headrestMesh);

  // --- D. ARMRESTS ---
  [-1, 1].forEach(side => {
    const armGroup = side === -1 ? armrestLeftGroup : armrestRightGroup;
    const xOffset = side * 0.35;

    // Curved structural cantilever support rod
    const rodCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(xOffset * 0.7, 0.42, 0.0),
      new THREE.Vector3(xOffset * 0.95, 0.46, 0.05),
      new THREE.Vector3(xOffset, 0.58, 0.05),
      new THREE.Vector3(xOffset, 0.59, -0.08),
    ]);
    const rodGeo = new THREE.TubeGeometry(rodCurve, 20, 0.014, 12);
    const rodMesh = new THREE.Mesh(rodGeo, hubMaterial);
    rodMesh.castShadow = true;
    armGroup.add(rodMesh);

    // Sculpted padded armrest pad
    const padArmGeo = new THREE.BoxGeometry(0.09, 0.045, 0.34, 12, 6, 16);
    const paPos = padArmGeo.attributes.position;
    for (let i = 0; i < paPos.count; i++) {
      const x = paPos.getX(i);
      const y = paPos.getY(i);
      const z = paPos.getZ(i);
      if (y > 0) {
        // Soft rounded top for resting arm
        const arch = Math.cos((x / 0.045) * 1.2) * 0.01;
        paPos.setY(i, y + arch);
      }
    }
    padArmGeo.computeVertexNormals();

    const armPadMesh = new THREE.Mesh(padArmGeo, fabricMaterial);
    armPadMesh.position.set(xOffset, 0.61, -0.02);
    armPadMesh.rotation.x = -0.05;
    armPadMesh.rotation.z = side * -0.04;
    armPadMesh.castShadow = true;
    armPadMesh.receiveShadow = true;
    armGroup.add(armPadMesh);
    fabricMeshes.push(armPadMesh);
  });

  // Calculate bounding box for real dimensions
  const bbox = new THREE.Box3().setFromObject(rootGroup);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  // Position entire chair so bottom of feet touches floor at Y = 0
  const minY = bbox.min.y;
  rootGroup.position.y = -minY;

  // --- Exploded view state ---
  let targetExploded = 0;
  let currentExploded = 0;

  // Default positions for exploded transitions
  const origSeatY = seatGroup.position.y;
  const origBackZ = backrestGroup.position.z;
  const origBackY = backrestGroup.position.y;
  const origArmLY = armrestLeftGroup.position.y;
  const origArmLX = armrestLeftGroup.position.x;
  const origArmRY = armrestRightGroup.position.y;
  const origArmRX = armrestRightGroup.position.x;
  const origBaseY = baseGroup.position.y;

  return {
    group: rootGroup,

    setFabricColor: (colorKey: FabricColorKey) => {
      currentFabricKey = colorKey;
      const opt = FABRIC_OPTIONS[colorKey];
      fabricMaterial.color.set(opt.hex);
      fabricMaterial.sheenColor.set(opt.sheenColor);
      pipingMaterial.color.set(opt.hex).multiplyScalar(0.85);
    },

    setLegMaterial: (materialKey: LegMaterialKey) => {
      currentLegKey = materialKey;
      const targetMat = materialKey === 'wood' ? woodLegMaterial : metalLegMaterial;
      legMeshes.forEach(mesh => {
        mesh.material = targetMat;
      });
    },

    setExplodedFactor: (factor: number) => {
      targetExploded = THREE.MathUtils.clamp(factor, 0, 1);
    },

    updateAnimation: (delta: number) => {
      // Smooth exponential damping for exploded view
      if (Math.abs(targetExploded - currentExploded) > 0.001) {
        currentExploded = THREE.MathUtils.damp(currentExploded, targetExploded, 8, delta);

        // Displace sub-assemblies along mechanical separation axes
        seatGroup.position.y = origSeatY + currentExploded * 0.15;
        backrestGroup.position.y = origBackY + currentExploded * 0.22;
        backrestGroup.position.z = origBackZ - currentExploded * 0.18;

        armrestLeftGroup.position.x = origArmLX - currentExploded * 0.16;
        armrestLeftGroup.position.y = origArmLY + currentExploded * 0.10;

        armrestRightGroup.position.x = origArmRX + currentExploded * 0.16;
        armrestRightGroup.position.y = origArmRY + currentExploded * 0.10;

        baseGroup.position.y = origBaseY - currentExploded * 0.12;
      }
    },

    dispose: () => {
      // Clean up GPU geometries and materials
      rootGroup.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material?.dispose();
          }
        }
      });
      fabricTextures.bumpMap.dispose();
      fabricTextures.roughnessMap.dispose();
      woodTextures.colorMap.dispose();
      woodTextures.bumpMap.dispose();
      metalTexture.dispose();
    },

    getDimensions: () => ({
      width: Math.round(size.x * 100), // in cm
      height: Math.round(size.y * 100),
      depth: Math.round(size.z * 100),
    }),
  };
}

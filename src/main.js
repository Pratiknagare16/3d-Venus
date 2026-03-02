// ─────────────────────────────────────────────────────────────
//  NASA-Grade Interactive 3D Venus Visualization — ULTRA
//  Three.js r0.161 · ES Modules · PBR + Custom Shaders
//  Dense Cloud Layers · Volcanic Surface · CO₂ Atmosphere
//  Lightning · Atmospheric Pulsing · Warm Cinematic Glow
// ─────────────────────────────────────────────────────────────

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ── Constants ──────────────────────────────────────────────
const VENUS_RADIUS = 4.8;
const VENUS_TILT = THREE.MathUtils.degToRad(177.4); // retrograde rotation

// ── Renderer ───────────────────────────────────────────────
const container = document.getElementById("app");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// ── Scene ──────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030201);
scene.fog = new THREE.FogExp2(0x050302, 0.0015);

// ── Camera ─────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 6, 20);

// ── Controls ───────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.04;
controls.minDistance = 8;
controls.maxDistance = 60;
controls.enablePan = false;
controls.rotateSpeed = 0.5;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.3;

// ── Texture Loader ─────────────────────────────────────────
const loader = new THREE.TextureLoader();

// ── Venus Group (tilted) ──────────────────────────────────
const venusGroup = new THREE.Group();
venusGroup.rotation.z = VENUS_TILT;
scene.add(venusGroup);

// ── Global State ───────────────────────────────────────────
const state = {
  showClouds: true,
  rotationSpeed: 1.0,
};

// ═════════════════════════════════════════════════════════
//  PROCEDURAL TEXTURE GENERATORS
// ═════════════════════════════════════════════════════════

function generateVenusSurfaceTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // Base rocky surface — muted browns and grays
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;

      // Multi-frequency noise approximation
      const n1 = Math.sin(nx * 30 + ny * 20) * 0.3;
      const n2 = Math.sin(nx * 60 + ny * 45 + 2.7) * 0.15;
      const n3 = Math.sin(nx * 120 + ny * 90 + 5.1) * 0.08;
      const noise = 0.5 + n1 + n2 + n3;

      // Lava flow patterns
      const lava = Math.pow(Math.sin(nx * 8 + ny * 12 + noise * 3) * 0.5 + 0.5, 3) * 0.15;

      const base = noise * 0.4 + 0.3;
      const r = Math.floor((base * 0.8 + lava * 1.2) * 180);
      const g = Math.floor((base * 0.6 + lava * 0.5) * 140);
      const b = Math.floor((base * 0.45) * 100);

      ctx.fillStyle = `rgb(${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Add some highland features
  for (let i = 0; i < 40; i++) {
    const cx = Math.random() * canvas.width;
    const cy = Math.random() * canvas.height;
    const r = 20 + Math.random() * 80;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(160,120,80,0.15)`);
    grad.addColorStop(1, `rgba(100,70,40,0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function generateVenusCloudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // Build layered cloud bands
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;
      const lat = ny - 0.5;

      // Band structure — Venus has visible cloud bands
      const band1 = Math.sin(ny * Math.PI * 6) * 0.12;
      const band2 = Math.sin(ny * Math.PI * 14 + nx * 2) * 0.06;
      const band3 = Math.sin(ny * Math.PI * 28 + nx * 5) * 0.03;

      // Swirl patterns
      const swirl = Math.sin(nx * 12 + Math.sin(ny * 8) * 3) * 0.08;
      const swirl2 = Math.sin(nx * 25 + Math.cos(ny * 15) * 2) * 0.04;

      // Super-rotation streaks (horizontal)
      const streak = Math.sin(nx * 40 + ny * 3) * 0.02;

      const base = 0.75 + band1 + band2 + band3 + swirl + swirl2 + streak;

      // Polar vortex darkening
      const polarDark = Math.pow(Math.abs(lat) * 2, 2) * 0.15;

      const brightness = Math.max(0, Math.min(1, base - polarDark));

      // Pale yellow / cream / light orange palette
      const r = Math.floor(brightness * 245);
      const g = Math.floor(brightness * 220);
      const b = Math.floor(brightness * 160);

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

// ═════════════════════════════════════════════════════════
//  1. VENUS SURFACE — Rocky, mostly hidden by clouds
// ═════════════════════════════════════════════════════════
function createVenus() {
  const geometry = new THREE.SphereGeometry(VENUS_RADIUS, 128, 128);

  const surfaceMap = generateVenusSurfaceTexture();

  const material = new THREE.MeshPhysicalMaterial({
    map: surfaceMap,
    roughness: 1.0,
    metalness: 0.0,
    emissive: new THREE.Color(0x3f2a0a),
    emissiveIntensity: 0.25,
    clearcoat: 0.02,
    clearcoatRoughness: 0.95,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // ── Subtle surface shader — no storms, just slow tectonic glow ──
  material.onBeforeCompile = (shader) => {
    shader.uniforms.time = { value: 0 };
    shader.uniforms.lightningFlash = { value: 0.0 };

    shader.fragmentShader =
      `
      uniform float time;
      uniform float lightningFlash;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289v2(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m * m;
        m = m * m;
        vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x_) - 0.5;
        vec3 ox = floor(x_ + 0.5);
        vec3 a0 = x_ - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }
      ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
      #ifdef USE_MAP
        vec2 distortedUv = vMapUv;

        // --- Seam protection mask ---
        float seam = smoothstep(0.0, 0.02, distortedUv.x) *
                     smoothstep(1.0, 0.98, distortedUv.x);
        float seamMask = min(seam, 1.0);

        // --- Very slow surface drift (Venus rotates extremely slowly) ---
        float lat = distortedUv.y - 0.5;
        distortedUv.x += sin(distortedUv.y * 8.0 + time * 0.02) * 0.0005 * seamMask;
        distortedUv.y += sin(distortedUv.x * 6.0 + time * 0.01) * 0.0003;

        distortedUv.x = fract(distortedUv.x);

        vec4 sampledDiffuseColor = texture2D(map, distortedUv);

        // --- Volcanic hotspots (subtle warm glow) ---
        float volc1 = snoise(vec2(distortedUv.x * 4.0 + time * 0.005, distortedUv.y * 4.0));
        float volcMask = smoothstep(0.6, 0.8, volc1) * 0.08;
        sampledDiffuseColor.rgb += volcMask * vec3(0.8, 0.3, 0.05);

        // Lightning flash illumination on surface
        sampledDiffuseColor.rgb += lightningFlash * vec3(0.6, 0.5, 0.3) * 0.3;

        // Safety clamp
        sampledDiffuseColor.rgb = max(sampledDiffuseColor.rgb, vec3(0.06));

        #ifdef DECODE_VIDEO_TEXTURE
          sampledDiffuseColor = vec4(mix(pow(sampledDiffuseColor.rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4)), sampledDiffuseColor.rgb * 0.0773993808, vec3(lessThanEqual(sampledDiffuseColor.rgb, vec3(0.04045)))), sampledDiffuseColor.w);
        #endif
        diffuseColor *= sampledDiffuseColor;
      #endif
      `
    );

    mesh.userData.shader = shader;
  };

  return mesh;
}

// ═════════════════════════════════════════════════════════
//  2. VENUS CLOUD LAYER — Dense, dominant visual layer
// ═════════════════════════════════════════════════════════
function createCloudLayer() {
  const cloudGeo = new THREE.SphereGeometry(VENUS_RADIUS + 0.35, 128, 128);
  const cloudMap = generateVenusCloudTexture();

  const cloudMat = new THREE.MeshPhysicalMaterial({
    map: cloudMap,
    roughness: 1.0,
    metalness: 0.0,
    transparent: true,
    opacity: 0.92,
    emissive: new THREE.Color(0x4a3510),
    emissiveIntensity: 0.2,
    depthWrite: true,
  });

  const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);

  // ── Cloud motion shader — slow swirling, multi-layer drift ──
  cloudMat.onBeforeCompile = (shader) => {
    shader.uniforms.time = { value: 0 };
    shader.uniforms.lightningFlash = { value: 0.0 };

    shader.fragmentShader =
      `
      uniform float time;
      uniform float lightningFlash;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                           -0.577350269189626, 0.024390243902439);
        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289v2(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m * m;
        m = m * m;
        vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x_) - 0.5;
        vec3 ox = floor(x_ + 0.5);
        vec3 a0 = x_ - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }
      ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
      #ifdef USE_MAP
        vec2 cloudUv = vMapUv;

        // --- Seam protection ---
        float seam = smoothstep(0.0, 0.02, cloudUv.x) *
                     smoothstep(1.0, 0.98, cloudUv.x);
        float seamMask = min(seam, 1.0);

        // --- Multi-layer slow cloud drift ---
        // Venus super-rotation: clouds move faster than surface
        float lat = cloudUv.y - 0.5;

        // Global slow rotation flow
        cloudUv.x += time * 0.008;

        // Band-following drift
        float bandFlow = sin(cloudUv.y * 12.0 + time * 0.05) * 0.003;
        cloudUv.x += bandFlow * seamMask;

        // Smooth swirling turbulence (no harsh contrast)
        float swirl1 = snoise(vec2(cloudUv.x * 4.0 + time * 0.02, cloudUv.y * 4.0)) * 0.008;
        float swirl2 = snoise(vec2(cloudUv.x * 8.0 + time * 0.03, cloudUv.y * 8.0)) * 0.004;
        float swirl3 = snoise(vec2(cloudUv.x * 16.0 + time * 0.04, cloudUv.y * 16.0)) * 0.002;

        cloudUv.x += (swirl1 + swirl2) * seamMask;
        cloudUv.y += swirl3 * 0.5;

        // Polar vortex swirling
        float polarDist = abs(lat) * 2.0;
        if (polarDist > 0.7) {
          float vortex = snoise(vec2(cloudUv.x * 6.0 + time * 0.06, cloudUv.y * 20.0));
          cloudUv.x += vortex * 0.005 * smoothstep(0.7, 1.0, polarDist) * seamMask;
        }

        cloudUv.x = fract(cloudUv.x);

        vec4 sampledDiffuseColor = texture2D(map, cloudUv);

        // --- Warm cloud tinting ---
        // Add slight variation in cloud color (cream, pale yellow, light orange)
        float colorVar = snoise(vec2(cloudUv.x * 3.0 + time * 0.01, cloudUv.y * 3.0));
        sampledDiffuseColor.rgb += colorVar * vec3(0.04, 0.02, -0.02);

        // Lightning flash — bright spots within clouds
        sampledDiffuseColor.rgb += lightningFlash * vec3(0.8, 0.7, 0.4) * 0.5;

        // Atmospheric pulsing — very subtle brightness modulation
        float pulse = sin(time * 0.3) * 0.02 + sin(time * 0.7) * 0.01;
        sampledDiffuseColor.rgb *= (1.0 + pulse);

        // Safety clamp — keep warm
        sampledDiffuseColor.rgb = max(sampledDiffuseColor.rgb, vec3(0.15, 0.12, 0.06));

        #ifdef DECODE_VIDEO_TEXTURE
          sampledDiffuseColor = vec4(mix(pow(sampledDiffuseColor.rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4)), sampledDiffuseColor.rgb * 0.0773993808, vec3(lessThanEqual(sampledDiffuseColor.rgb, vec3(0.04045)))), sampledDiffuseColor.w);
        #endif
        diffuseColor *= sampledDiffuseColor;
      #endif
      `
    );

    cloudMesh.userData.shader = shader;
  };

  return cloudMesh;
}

// ═════════════════════════════════════════════════════════
//  3. ATMOSPHERE — Dense CO₂ haze, warm yellow/orange glow
// ═════════════════════════════════════════════════════════
function createAtmosphere() {
  // --- Inner glow (thick limb haze — Venus has a VERY dense atmosphere) ---
  const innerGeo = new THREE.SphereGeometry(VENUS_RADIUS + 0.5, 128, 128);
  const innerMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        float fresnel = 1.0 - dot(vNormal, vViewDir);
        // Broader, softer glow — dense atmosphere
        float glow = pow(fresnel, 3.0);

        // Warm amber/orange CO₂ haze
        vec3 atmColor = mix(
          vec3(0.95, 0.65, 0.2),  // warm amber
          vec3(1.0, 0.8, 0.35),   // pale yellow
          fresnel
        );

        // Atmospheric pulsing
        float pulse = 1.0 + sin(time * 0.4) * 0.05;
        float alpha = glow * 0.35 * pulse;
        gl_FragColor = vec4(atmColor, alpha);
      }
    `,
    uniforms: {
      time: { value: 0 },
    },
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });

  const innerMesh = new THREE.Mesh(innerGeo, innerMat);

  // --- Outer haze (strong edge glow — suffocating thick atmosphere) ---
  const outerGeo = new THREE.SphereGeometry(VENUS_RADIUS + 1.2, 64, 64);
  const outerMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float fresnel = 1.0 - dot(vNormal, vViewDir);
        float haze = pow(fresnel, 4.0);

        // Hot orange glow at edges
        vec3 hazeColor = vec3(1.0, 0.6, 0.15);

        float pulse = 1.0 + sin(time * 0.25) * 0.08;
        gl_FragColor = vec4(hazeColor, haze * 0.3 * pulse);
      }
    `,
    uniforms: {
      time: { value: 0 },
    },
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });

  const outerMesh = new THREE.Mesh(outerGeo, outerMat);

  // --- Heat distortion glow (third layer — hellish feel) ---
  const heatGeo = new THREE.SphereGeometry(VENUS_RADIUS + 1.8, 48, 48);
  const heatMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float fresnel = 1.0 - dot(vNormal, vViewDir);
        float glow = pow(fresnel, 6.0);

        // Very faint reddish-orange heat shimmer
        vec3 heatColor = vec3(1.0, 0.4, 0.08);
        float flicker = 1.0 + sin(time * 1.5) * 0.1 + sin(time * 3.7) * 0.05;
        gl_FragColor = vec4(heatColor, glow * 0.12 * flicker);
      }
    `,
    uniforms: {
      time: { value: 0 },
    },
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });

  const heatMesh = new THREE.Mesh(heatGeo, heatMat);

  const group = new THREE.Group();
  group.add(innerMesh, outerMesh, heatMesh);
  return group;
}

// ═════════════════════════════════════════════════════════
//  4. STARFIELD — Multi-layer parallax + twinkling
// ═════════════════════════════════════════════════════════
function createStarfield() {
  const layers = [];
  const configs = [
    { count: 3000, minR: 150, maxR: 200, size: 0.6, speed: 0.0005, opacity: 0.7 },
    { count: 4000, minR: 200, maxR: 300, size: 0.4, speed: 0.0003, opacity: 0.5 },
    { count: 5000, minR: 300, maxR: 450, size: 0.25, speed: 0.0001, opacity: 0.35 },
  ];

  for (const cfg of configs) {
    const positions = new Float32Array(cfg.count * 3);
    const colors = new Float32Array(cfg.count * 3);
    const sizes = new Float32Array(cfg.count);

    for (let i = 0; i < cfg.count; i++) {
      const r = cfg.minR + Math.random() * (cfg.maxR - cfg.minR);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = cfg.size * (0.5 + Math.random());

      const temp = Math.random();
      if (temp < 0.1) {
        colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 1.0;
      } else if (temp < 0.2) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.92; colors[i * 3 + 2] = 0.7;
      } else if (temp < 0.25) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.7; colors[i * 3 + 2] = 0.5;
      } else {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        baseOpacity: { value: cfg.opacity },
        pointSize: { value: cfg.size },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float time;
        uniform float pointSize;

        float hash(float n) { return fract(sin(n) * 43758.5453123); }

        void main() {
          vColor = color;
          float starId = position.x * 73.0 + position.y * 127.0 + position.z * 311.0;
          vTwinkle = 0.7 + 0.3 * sin(time * (1.0 + hash(starId) * 3.0) + hash(starId * 2.0) * 6.28);

          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = pointSize * size * (300.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float baseOpacity;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float softness = 1.0 - smoothstep(0.2, 0.5, dist);

          gl_FragColor = vec4(vColor, softness * baseOpacity * vTwinkle);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    points.userData.rotSpeed = cfg.speed;
    points.userData.material = material;
    layers.push(points);
  }

  return layers;
}

// ═════════════════════════════════════════════════════════
//  5. NEBULA DUST — Warm-toned volumetric space dust
// ═════════════════════════════════════════════════════════
function createNebulaDust() {
  const count = 800;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const palette = [
    [0.5, 0.25, 0.1],    // Warm amber
    [0.4, 0.2, 0.15],    // Rust
    [0.45, 0.3, 0.12],   // Golden brown
    [0.35, 0.15, 0.2],   // Deep rose
  ];

  for (let i = 0; i < count; i++) {
    const r = 80 + Math.random() * 120;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.06,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

// ═════════════════════════════════════════════════════════
//  6. LIGHTING — Warm cinematic HDR (Venus is closer to Sun)
// ═════════════════════════════════════════════════════════
function createLighting() {
  // Warm sunlight — Venus gets ~1.9× Earth's solar intensity
  const sunLight = new THREE.DirectionalLight(0xfff0c0, 2.8);
  sunLight.position.set(25, 5, 20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 60;
  sunLight.shadow.camera.left = -15;
  sunLight.shadow.camera.right = 15;
  sunLight.shadow.camera.top = 15;
  sunLight.shadow.camera.bottom = -15;
  sunLight.shadow.bias = -0.0005;

  // Warm ambient — hellish glow
  const ambientLight = new THREE.AmbientLight(0x664422, 0.18);

  // Warm orange rim — Venus's hot signature
  const rimLight = new THREE.DirectionalLight(0xcc6622, 0.35);
  rimLight.position.set(-15, 5, -15);

  // Subtle warm fill from below
  const fillLight = new THREE.DirectionalLight(0x553322, 0.15);
  fillLight.position.set(0, -10, 5);

  return { sunLight, ambientLight, rimLight, fillLight };
}

// ═════════════════════════════════════════════════════════
//  7. SUN LENS FLARE (sprite — warmer/brighter for Venus)
// ═════════════════════════════════════════════════════════
function createSunSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,230,1)");
  grad.addColorStop(0.1, "rgba(255,245,200,0.85)");
  grad.addColorStop(0.3, "rgba(255,200,80,0.35)");
  grad.addColorStop(1, "rgba(255,140,30,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(25, 5, 20);
  sprite.scale.set(5, 5, 1);
  return sprite;
}

// ═════════════════════════════════════════════════════════
//  ASSEMBLE SCENE
// ═════════════════════════════════════════════════════════

// Venus surface
const venus = createVenus();
venusGroup.add(venus);

// Cloud layer (dominant visual)
const cloudLayer = createCloudLayer();
venusGroup.add(cloudLayer);

// Atmosphere glow
const atmosphere = createAtmosphere();
venusGroup.add(atmosphere);

// Starfield layers
const starLayers = createStarfield();
starLayers.forEach((l) => scene.add(l));

// Nebula dust
const nebula = createNebulaDust();
scene.add(nebula);

// Lighting
const { sunLight, ambientLight, rimLight, fillLight } = createLighting();
scene.add(sunLight, ambientLight, rimLight, fillLight);

// Sun sprite
const sunSprite = createSunSprite();
scene.add(sunSprite);

// ═════════════════════════════════════════════════════════
//  LIGHTNING SYSTEM — Subtle flickers inside clouds
// ═════════════════════════════════════════════════════════
let lightningTimer = 0;
let lightningIntensity = 0;
let nextLightningTime = 3 + Math.random() * 8;

function updateLightning(delta) {
  lightningTimer += delta;

  if (lightningTimer >= nextLightningTime) {
    // Trigger a lightning flash
    lightningIntensity = 0.6 + Math.random() * 0.4;
    lightningTimer = 0;
    nextLightningTime = 2 + Math.random() * 10; // Random interval
  }

  // Rapid decay
  lightningIntensity *= Math.pow(0.05, delta * 3);
  if (lightningIntensity < 0.01) lightningIntensity = 0;

  // Apply to shaders
  if (venus.userData.shader) {
    venus.userData.shader.uniforms.lightningFlash.value = lightningIntensity;
  }
  if (cloudLayer.userData.shader) {
    cloudLayer.userData.shader.uniforms.lightningFlash.value = lightningIntensity;
  }
}

// ═════════════════════════════════════════════════════════
//  ANIMATION LOOP
// ═════════════════════════════════════════════════════════

const clockEl = document.getElementById("utc-clock");
let previousTime = performance.now() / 1000;
let elapsedTime = 0;

function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now() / 1000;
  const delta = Math.min(currentTime - previousTime, 0.1);
  previousTime = currentTime;
  elapsedTime += delta;

  const speed = state.rotationSpeed;

  // ── Venus rotation (retrograde — negative direction, VERY slow) ──
  venus.rotation.y -= delta * 0.015 * speed;

  // ── Cloud layer rotation (super-rotation — faster than surface, same retrograde dir) ──
  cloudLayer.visible = state.showClouds;
  if (state.showClouds) {
    cloudLayer.rotation.y -= delta * 0.04 * speed;
  }

  // ── Surface shader time ──
  if (venus.userData.shader) {
    venus.userData.shader.uniforms.time.value += delta * speed;
  }

  // ── Cloud shader time ──
  if (cloudLayer.userData.shader) {
    cloudLayer.userData.shader.uniforms.time.value += delta * speed;
  }

  // ── Atmosphere shader time ──
  atmosphere.children.forEach((child) => {
    if (child.material.uniforms && child.material.uniforms.time) {
      child.material.uniforms.time.value = elapsedTime * speed;
    }
  });

  // ── Lightning system ──
  updateLightning(delta * speed);

  // ── Starfield parallax rotation + twinkling ──
  for (const layer of starLayers) {
    layer.rotation.y += delta * layer.userData.rotSpeed;
    if (layer.userData.material) {
      layer.userData.material.uniforms.time.value = elapsedTime;
    }
  }

  // ── Nebula slow drift ──
  nebula.rotation.y += delta * 0.0002;
  nebula.rotation.x += delta * 0.0001;

  // ── UTC clock ──
  if (clockEl) {
    const now = new Date();
    clockEl.textContent =
      "UTC " +
      String(now.getUTCHours()).padStart(2, "0") +
      ":" +
      String(now.getUTCMinutes()).padStart(2, "0") +
      ":" +
      String(now.getUTCSeconds()).padStart(2, "0");
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ═════════════════════════════════════════════════════════
//  RESIZE HANDLER
// ═════════════════════════════════════════════════════════

function onWindowResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

window.addEventListener("resize", onWindowResize);

// ═════════════════════════════════════════════════════════
//  UI INTERACTIONS
// ═════════════════════════════════════════════════════════

// ── Venus Info Panel ──
const venusBtn = document.getElementById("venusBtn");
const venusPanel = document.getElementById("venusPanel");
const closePanel = document.getElementById("closePanel");

venusBtn.addEventListener("click", () => {
  venusPanel.classList.add("visible");
});

closePanel.addEventListener("click", () => {
  venusPanel.classList.remove("visible");
});

venusPanel.addEventListener("click", (e) => {
  if (e.target === venusPanel) {
    venusPanel.classList.remove("visible");
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    venusPanel.classList.remove("visible");
  }
});

// ── Control Bar Interactions ──
const toggleCloudsBtn = document.getElementById("toggleClouds");
const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");

if (toggleCloudsBtn) {
  toggleCloudsBtn.addEventListener("click", () => {
    state.showClouds = !state.showClouds;
    toggleCloudsBtn.classList.toggle("active", state.showClouds);
    toggleCloudsBtn.textContent = state.showClouds ? "◉ Clouds" : "○ Clouds";
  });
}

if (speedSlider) {
  speedSlider.addEventListener("input", () => {
    state.rotationSpeed = parseFloat(speedSlider.value);
    if (speedValue) speedValue.textContent = state.rotationSpeed.toFixed(1) + "×";
  });
}

// ── Camera Presets ──
const presetBtns = document.querySelectorAll("[data-preset]");
presetBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const preset = btn.dataset.preset;
    let target;
    switch (preset) {
      case "front":
        target = new THREE.Vector3(0, 0, 20);
        break;
      case "top":
        target = new THREE.Vector3(0, 22, 0.1);
        break;
      case "atmosphere":
        target = new THREE.Vector3(12, 6, 12);
        break;
      case "close":
        target = new THREE.Vector3(5, 2, 9);
        break;
      default:
        target = new THREE.Vector3(0, 6, 20);
    }
    animateCameraTo(target);
  });
});

function animateCameraTo(targetPos) {
  const start = camera.position.clone();
  const dur = 1500;
  const startTime = Date.now();

  function step() {
    const t = Math.min((Date.now() - startTime) / dur, 1);
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    camera.position.lerpVectors(start, targetPos, ease);
    controls.update();
    if (t < 1) requestAnimationFrame(step);
  }
  step();
}

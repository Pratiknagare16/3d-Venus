// ─────────────────────────────────────────────────────────────
//  NASA-Grade Interactive 3D Neptune Visualization
//  Three.js r0.161 · ES Modules · PBR Pipeline
// ─────────────────────────────────────────────────────────────

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ── Constants ──────────────────────────────────────────────
const NEPTUNE_RADIUS = 5;
const NEPTUNE_TILT = THREE.MathUtils.degToRad(28.32);

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
scene.background = new THREE.Color(0x000005);

// ── Camera ─────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(0, 8, 20);

// ── Controls ───────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.04;
controls.minDistance = 8;
controls.maxDistance = 40;
controls.enablePan = false;
controls.rotateSpeed = 0.5;

// ── Texture Loader ─────────────────────────────────────────
const loader = new THREE.TextureLoader();

function loadTex(path, encoding) {
  const tex = loader.load(path);
  if (encoding === "srgb") tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

// ── Neptune Group (tilted) ─────────────────────────────────
const neptuneGroup = new THREE.Group();
neptuneGroup.rotation.z = NEPTUNE_TILT;
scene.add(neptuneGroup);

// ─────────────────────────────────────────────────────────
//  1. NEPTUNE SURFACE (PBR Ice Giant)
// ─────────────────────────────────────────────────────────
function createNeptune() {
  const geometry = new THREE.SphereGeometry(NEPTUNE_RADIUS, 128, 128);

  const albedoMap = loadTex("textures/neptune_albedo.png", "srgb");
  // Enable horizontal wrapping for animated atmospheric drift
  albedoMap.wrapS = THREE.RepeatWrapping;

  const material = new THREE.MeshPhysicalMaterial({
    map: albedoMap,
    roughness: 1.0,
    metalness: 0.0,
    // Subtle blue emissive tint for depth
    emissive: new THREE.Color(0x0a1a3f),
    emissiveIntensity: 0.4,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // ── Gentle atmospheric flow shader (smooth UV distortion) ──
  material.onBeforeCompile = (shader) => {
    shader.uniforms.time = { value: 0 };

    // Inject time uniform declaration
    shader.fragmentShader =
      "uniform float time;\n" + shader.fragmentShader;

    // Replace map sampling with distorted UV for smooth atmospheric flow
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `
      #ifdef USE_MAP
        vec2 distortedUv = vMapUv;
        // Slow horizontal band flow — gentle speed per latitude
        distortedUv.x += sin(distortedUv.y * 12.0 + time * 0.2) * 0.004;
        // Very subtle turbulence ripples
        distortedUv.x += sin(distortedUv.y * 30.0 + time * 0.5) * 0.0015;
        vec4 sampledDiffuseColor = texture2D(map, distortedUv);
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

// ─────────────────────────────────────────────────────────
//  2. ATMOSPHERE (Cool Blue Fresnel Glow)
// ─────────────────────────────────────────────────────────
function createAtmosphere() {
  const geometry = new THREE.SphereGeometry(NEPTUNE_RADIUS + 0.3, 128, 128);

  const material = new THREE.ShaderMaterial({
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
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float fresnel = 1.0 - dot(vNormal, vViewDir);
        fresnel = pow(fresnel, 4.0);
        // Soft cool blue glow — characteristic of Neptune's methane atmosphere
        vec3 atmosphereColor = vec3(0.3, 0.5, 1.0);
        gl_FragColor = vec4(atmosphereColor, fresnel * 0.3);
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });

  return new THREE.Mesh(geometry, material);
}

// ─────────────────────────────────────────────────────────
//  3. STARFIELD
// ─────────────────────────────────────────────────────────
function createStarfield() {
  const starCount = 6000;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  const colors = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    // Uniform sphere distribution
    const r = 200 + Math.random() * 100;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    // Vary size for depth
    sizes[i] = 0.3 + Math.random() * 0.7;

    // Slight warm/cool color variation
    const temp = Math.random();
    if (temp < 0.15) {
      // warm orange-ish
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.85;
      colors[i * 3 + 2] = 0.7;
    } else if (temp < 0.3) {
      // cool blue
      colors[i * 3] = 0.7;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 1.0;
    } else {
      // white
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 1.0;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.55,
    vertexColors: true,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  return points;
}

// ─────────────────────────────────────────────────────────
//  4. LIGHTING (Cinematic, soft for ice giant)
// ─────────────────────────────────────────────────────────
function createLighting() {
  // Directional sunlight — soft and distant
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
  sunLight.position.set(20, 5, 20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 60;
  sunLight.shadow.camera.left = -15;
  sunLight.shadow.camera.right = 15;
  sunLight.shadow.camera.top = 15;
  sunLight.shadow.camera.bottom = -15;
  sunLight.shadow.bias = -0.0005;

  // Subtle ambient — cool blue for deep space feel
  const ambientLight = new THREE.AmbientLight(0x8888aa, 0.15);

  // Subtle back-rim light — blue-tinted for Neptune's cold atmosphere
  const rimLight = new THREE.DirectionalLight(0x3355cc, 0.35);
  rimLight.position.set(-15, 5, -15);

  return { sunLight, ambientLight, rimLight };
}

// ═════════════════════════════════════════════════════════
//  ASSEMBLE SCENE
// ═════════════════════════════════════════════════════════

// Neptune surface
const neptune = createNeptune();
neptuneGroup.add(neptune);

// Atmosphere glow
const atmosphere = createAtmosphere();
neptuneGroup.add(atmosphere);

// Starfield
const starfield = createStarfield();
scene.add(starfield);

// Lighting
const { sunLight, ambientLight, rimLight } = createLighting();
scene.add(sunLight, ambientLight, rimLight);

// ═════════════════════════════════════════════════════════
//  ANIMATION LOOP
// ═════════════════════════════════════════════════════════

const clockEl = document.getElementById("utc-clock");
let previousTime = performance.now() / 1000;

function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now() / 1000;
  const delta = Math.min(currentTime - previousTime, 0.1); // clamp
  previousTime = currentTime;

  // ── Neptune slower rotation (~16h period) ──
  neptune.rotation.y += delta * 0.12;

  // ── Gentle atmospheric drift ──
  if (neptune.material.map) {
    neptune.material.map.offset.x += delta * 0.004;
  }

  // ── Atmospheric flow shader time update ──
  if (neptune.userData.shader) {
    neptune.userData.shader.uniforms.time.value += delta;
  }

  // ── Starfield slow rotation ──
  starfield.rotation.y += delta * 0.001;

  // ── UTC clock display ──
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

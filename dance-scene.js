import * as THREE from "./vendor/three.module.min.js";
import { GLTFLoader } from "./vendor/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "./vendor/libs/meshopt_decoder.module.js";

const overlay = document.querySelector("#danceScreen");
const mount = document.querySelector("#danceStage");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let sceneApi;
let loading;

if (overlay && mount) {
  overlay.addEventListener("dance:start", () => {
    ensureScene().then((api) => api?.play());
  });

  overlay.addEventListener("dance:stop", () => {
    sceneApi?.pause();
  });

  const visibilityObserver = new MutationObserver(() => {
    if (overlay.hidden) {
      sceneApi?.pause();
      return;
    }
    ensureScene().then((api) => api?.play());
  });
  visibilityObserver.observe(overlay, { attributes: true, attributeFilter: ["hidden", "class"] });

  if (!overlay.hidden) {
    ensureScene().then((api) => api?.play());
  }
}

async function ensureScene() {
  if (sceneApi) return sceneApi;
  if (!loading) {
    loading = initDanceScene()
      .then((api) => {
        sceneApi = api;
        return api;
      })
      .catch((error) => {
        console.warn("Não consegui carregar o gato 3D.", error);
        mount.classList.add("dance-stage-fallback");
        mount.textContent = "🐈‍⬛💃";
        return null;
      });
  }
  return loading;
}

async function initDanceScene() {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  mount.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xfff6df, 0x142632, 3.2));

  const keyLight = new THREE.DirectionalLight(0xffffff, 4.4);
  keyLight.position.set(4, 6, 8);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xee4795, 3.2);
  rimLight.position.set(-4, 3, -5);
  scene.add(rimLight);

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const [catTexture, baseModel, samba] = await Promise.all([
    loadTexture("assets/gato.jpg", renderer),
    loader.loadAsync("vendor/motions/mousey-snake-hip-hop.glb"),
    loader.loadAsync("vendor/motions/mousey-samba-dancing.glb"),
  ]);

  const dancer = createSambaCat(baseModel, samba, catTexture);
  scene.add(dancer.group);

  let frameId = 0;
  let previousTime = 0;
  let elapsed = 0;

  function resize() {
    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    const aspect = width / height;
    const requiredHeight = Math.max(6.7, 5.2 / aspect);
    const distance = requiredHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

    renderer.setSize(width, height, false);
    camera.aspect = aspect;
    camera.position.set(0, 0.05, distance);
    camera.lookAt(0, -0.35, 0);
    camera.updateProjectionMatrix();
  }

  function update(delta) {
    elapsed += delta;
    dancer.group.rotation.y = Math.sin(elapsed * 0.7) * 0.22 + 0.08;
    dancer.group.position.x = Math.sin(elapsed * 1.1) * 0.16;
    dancer.mixer.update(delta);
  }

  function renderFrame(now) {
    const delta = previousTime ? Math.min((now - previousTime) / 1000, 0.05) : 0;
    previousTime = now;
    update(delta);
    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(renderFrame);
  }

  function play() {
    resize();
    renderer.render(scene, camera);
    if (reduceMotion.matches || frameId) return;
    previousTime = 0;
    frameId = window.requestAnimationFrame(renderFrame);
  }

  function pause() {
    if (!frameId) return;
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);
  resize();
  renderer.render(scene, camera);

  return { play, pause };
}

async function loadTexture(path, renderer) {
  try {
    const texture = await new THREE.TextureLoader().loadAsync(path);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  } catch {
    return null;
  }
}

function createSambaCat(baseModel, sambaMotion, catTexture) {
  const group = new THREE.Group();
  const model = baseModel.scene;
  const rigNodes = new Set();
  const fabric = createFabricMaterial();
  const headTexture = createCatHeadTexture(catTexture);

  model.traverse((node) => {
    rigNodes.add(node.name);
    if (!node.isSkinnedMesh) return;
    removeNativeHead(node);
    node.material = fabric;
    node.frustumCulled = false;
  });

  const headBone = model.getObjectByName("mixamorigHead");
  if (headBone) headBone.add(createRiggedCatHead(headTexture));

  model.scale.setScalar(0.031);
  model.position.y = -1.32;
  group.add(model);

  const mixer = new THREE.AnimationMixer(model);
  const sourceClip = sambaMotion.animations.find((animation) => animation.tracks.length > 0);
  const clip = sourceClip.clone();
  clip.tracks = clip.tracks.filter((track) => rigNodes.has(track.name.split(".")[0]));
  const action = mixer.clipAction(clip);
  action.reset();
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.play();

  return { group, mixer };
}

function createFabricMaterial() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ee4795";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#cde39e";

  for (let y = -80; y < canvas.height + 80; y += 76) {
    context.save();
    context.translate(canvas.width / 2, y);
    context.rotate(-0.38);
    context.fillRect(-canvas.width, -8, canvas.width * 2, 16);
    context.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.8, 1.8);

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.86,
    metalness: 0.03,
  });
}

function createRiggedCatHead(headTexture) {
  const group = new THREE.Group();
  group.position.set(0, 8.5, 3);
  group.scale.setScalar(0.5);

  const fur = new THREE.MeshStandardMaterial({
    map: headTexture,
    color: headTexture ? 0xffffff : 0x9b806b,
    roughness: 0.9,
  });

  const head = new THREE.Mesh(new THREE.SphereGeometry(26, 32, 22), fur);
  head.scale.set(1, 0.92, 0.82);
  group.add(head);

  const earGeometry = new THREE.ConeGeometry(9, 22, 3);
  const leftEar = new THREE.Mesh(earGeometry, fur);
  leftEar.position.set(-14, 23, 1);
  leftEar.rotation.z = 0.13;

  const rightEar = leftEar.clone();
  rightEar.position.x = 9;
  rightEar.rotation.z = -0.13;

  group.add(leftEar, rightEar);
  return group;
}

function createCatHeadTexture(sourceTexture) {
  const image = sourceTexture?.image;
  if (!image) return null;

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  context.fillStyle = "#8d7462";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = 512;
  faceCanvas.height = 512;
  const faceContext = faceCanvas.getContext("2d");
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  faceContext.drawImage(image, 0, 0, sourceWidth, sourceHeight * 0.82, 0, 0, 512, 512);
  faceContext.globalCompositeOperation = "destination-in";

  const feather = faceContext.createLinearGradient(0, 0, 512, 0);
  feather.addColorStop(0, "rgba(255,255,255,0)");
  feather.addColorStop(0.14, "rgba(255,255,255,1)");
  feather.addColorStop(0.86, "rgba(255,255,255,1)");
  feather.addColorStop(1, "rgba(255,255,255,0)");
  faceContext.fillStyle = feather;
  faceContext.fillRect(0, 0, 512, 512);
  context.drawImage(faceCanvas, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function removeNativeHead(mesh) {
  const geometry = mesh.geometry;
  const skinIndex = geometry.getAttribute("skinIndex");
  const skinWeight = geometry.getAttribute("skinWeight");
  const index = geometry.index;
  const headBone = mesh.skeleton?.bones.find((bone) => bone.name === "mixamorigHead");
  if (!skinIndex || !skinWeight || !index || !headBone) return;

  const headBones = new Set();
  headBone.traverse((bone) => {
    if (bone.isBone) headBones.add(bone);
  });

  const headIndices = new Set(
    mesh.skeleton.bones.map((bone, boneIndex) => (headBones.has(bone) ? boneIndex : -1)).filter((boneIndex) => boneIndex >= 0),
  );

  function headWeight(vertexIndex) {
    let weight = 0;
    for (let channel = 0; channel < 4; channel += 1) {
      const offset = vertexIndex * 4 + channel;
      if (headIndices.has(skinIndex.array[offset])) weight += skinWeight.array[offset];
    }
    return weight;
  }

  const kept = [];
  for (let position = 0; position < index.count; position += 3) {
    const a = index.getX(position);
    const b = index.getX(position + 1);
    const c = index.getX(position + 2);
    const averageHeadWeight = (headWeight(a) + headWeight(b) + headWeight(c)) / 3;
    if (averageHeadWeight < 0.5) kept.push(a, b, c);
  }

  const trimmed = geometry.clone();
  trimmed.setIndex(kept);
  mesh.geometry = trimmed;
}

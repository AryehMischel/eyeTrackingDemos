import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { UltraHDRLoader } from "three/addons/loaders/UltraHDRLoader.js";

let path = "./Assets/3D Models/headwithbones2.glb";
let neckBone = null;
let eyeBoneRight = null;
let eyeBoneLeft = null;
let model = null;
let mixer = null;
let eyesLocked = true;
let controls;
let ultraHDRLoader;
let debugArrowHelper = [];
let pitchLimit = 0.33;
let yawLimit = 0.69;

// Mirrors the eyes rotation and position, used for checking valid rotations
const checkRightEye = new THREE.Object3D();
const checkLeftEye = new THREE.Object3D();

// Arrow helpers for debugging
let arrowHelperX = new THREE.ArrowHelper(
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 0, 0),
  30,
  0xff0000
);
let arrowHelperY = new THREE.ArrowHelper(
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 0),
  30,
  0xffff00
);
let arrowHelperZ = new THREE.ArrowHelper(
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, 0),
  30,
  0x00ff00
);

debugArrowHelper.push(arrowHelperX, arrowHelperY, arrowHelperZ);
debugArrowHelper.forEach((helper) => (helper.visible = false));

//GUI parameters
const params = {
  debug: false,
  orbitControls: false,
  yawLimit: 25,
  pitchLimit: 25,
};

// Utility function
const degreesToRadians = (degrees) => degrees * (Math.PI / 180);

// Create a scene
const scene = new THREE.Scene();

// Create a camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0.0, 1.6, 0.5);

// Create a renderer
const canvas = document.getElementById("viewer");
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

ultraHDRLoader = new UltraHDRLoader();
ultraHDRLoader.setDataType(THREE.FloatType);
const loadEnvironment = function (resolution = "2k", type = "HalfFloatType") {
  ultraHDRLoader.setDataType(THREE[type]);
  ultraHDRLoader.load(
    `./Assets/Textures/Equirectangular/spruit_sunrise_${resolution}.hdr.jpg`,
    function (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.needsUpdate = true;

      scene.background = texture;
      scene.environment = texture;
    }
  );
};
loadEnvironment();

// Create a GLTF loader
const loader = new GLTFLoader();

// Load in Head model
loader.load(path, function (gltf) {
  model = gltf.scene;
  model.traverse((object) => {
    if (object.isSkinnedMesh) {
      if (neckBone === null) {
        neckBone = object.skeleton.bones.find(
          (bone) => bone.name === "neck_01"
        );
      }
      if (eyeBoneRight === null) {
        eyeBoneRight = object.skeleton.bones.find(
          (bone) => bone.name === "FACIAL_R_EyeParallel"
        );
      }

      if (eyeBoneLeft === null) {
        eyeBoneLeft = object.skeleton.bones.find(
          (bone) => bone.name === "FACIAL_L_EyeParallel"
        );
      }
    }
  });

  model.scale.set(1.5, 1.5, 1.5);
  model.position.set(0, -0.4, -1.2);
  scene.add(model);

  //we copy the orientation of the eyes to empty objects to help with debugging.
  eyeBoneLeft.parent.add(checkLeftEye);
  eyeBoneRight.parent.add(checkRightEye);

  checkRightEye.position.copy(eyeBoneRight.position);
  checkLeftEye.position.copy(eyeBoneLeft.position);

  checkRightEye.rotation.copy(eyeBoneRight.rotation);
  checkLeftEye.rotation.copy(eyeBoneLeft.rotation);

  //add debugging arrow to left eye
  eyeBoneLeft.add(arrowHelperX, arrowHelperY, arrowHelperZ);
});

// Visual representation of the target position
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshBasicMaterial({
  color: "#d8e2a9",
  transparent: true,
  opacity: 0.75,
});

const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.set(0, 1.3, 2);
cube.scale.set(0.1, 0.1, 0.1);
scene.add(cube);
window.cube = cube;

// Visual representation of the eye target point. Mouse will raycast and the hitpoint on the sphere will be the target position
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = createFresnelShaderMaterial();
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(0, 1, -1.2); //0, 1.6, -1
sphere.scale.set(7.75, 5, 1); //1.5, 1.5, 0.5
scene.add(sphere);
window.sphere = sphere;

//rotate the eyes to look at the target position
function rotateEyes(leftEye = eyeBoneLeft, rightEye = eyeBoneRight) {
  const targetPosition = new THREE.Vector3();
  cube.getWorldPosition(targetPosition);
  let targetPositionRight = targetPosition.clone();
  let targetPositionLeft = targetPosition.clone();

  //check if the rotations are valid
  checkLeftEye.lookAt(targetPositionLeft);
  checkRightEye.lookAt(targetPositionRight);

  const checkLeftEyeWorldRotation = new THREE.Euler().setFromQuaternion(
    checkLeftEye.getWorldQuaternion(new THREE.Quaternion())
  );
  const checkRightEyeWorldRotation = new THREE.Euler().setFromQuaternion(
    checkRightEye.getWorldQuaternion(new THREE.Quaternion())
  );

  const isWithinConstraints = (rotation) => {
    return (
      Math.abs(rotation.x) <= pitchLimit && Math.abs(rotation.y) <= yawLimit
    );
  };

  // Apply the rotation only if it is within the constraints
  if (
    isWithinConstraints(checkLeftEyeWorldRotation) &&
    isWithinConstraints(checkRightEyeWorldRotation)
  ) {
    if (eyesLocked) {
      eyesLocked = false;
      cubeMaterial.color = new THREE.Color("#d8e2a9");
    }
    leftEye.lookAt(targetPositionLeft);
    rightEye.lookAt(targetPositionRight);
  } else {
    if (!eyesLocked) {
      eyesLocked = true;
      cubeMaterial.color = new THREE.Color(0xff0000);
    }
  }
}

window.rotateEye = rotateEyes;

function rotateBone(bones, x = 0, y = 0, z = 0) {
  for (let bone of bones) {
    bone.rotation.x += x;
    bone.rotation.y += y;
    bone.rotation.z += z;
  }
}

window.rotateBone = rotateBone;

// Raycaster and mouse vector
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Function to handle mouse move event
function onMouseMove(event) {
  // Calculate mouse position in normalized device coordinates (-1 to +1) for both components
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Update the raycaster with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the ray
  const intersects = raycaster.intersectObjects(scene.children, true);
  // Check if the sphere is intersected
  for (let i = 0; i < intersects.length; i++) {
    if (intersects[i].object === sphere) {
      // Get the global position of the hit point
      const hitPoint = intersects[i].point;

      // Move the cube to the hit point position
      cube.position.copy(hitPoint);
    }
  }

  if (camera && eyeBoneRight && eyeBoneLeft) {
    rotateEyes();
  }
}

// Add event listener for mouse move
window.addEventListener("mousemove", onMouseMove, false);

const gui = new GUI();
configureGUI();

// Render the scene
function animate() {
  if (mixer) {
    mixer.update(0.01);
  }
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

function configureGUI() {
  const sceneSettings = gui.addFolder("Scene Setup");
  const eyeRotationLimits = gui.addFolder("Limit Eye Rotation");
  sceneSettings
    .add(params, "debug")
    .name("Debug")
    .onChange((value) => {
      if (value) {
        debugArrowHelper.forEach((helper) => (helper.visible = true));
      } else {
        debugArrowHelper.forEach((helper) => (helper.visible = false));
      }
    });

  sceneSettings
    .add(params, "orbitControls")
    .name("Orbit Controls")
    .onChange((value) => {
      if (value) {
        addOrbitControls();
        camera.position.set(0.0, 1.6, 0);
        camera.rotation.set(0, 0, 0);
      } else {
        removeOrbitControls();
        camera.position.set(0.0, 1.6, 0.5);
        camera.rotation.set(0, 0, 0);
      }
    });

  eyeRotationLimits
    .add(params, "yawLimit", 0, 180)
    .name("Yaw Limit")
    .onChange((value) => {
      let yawLimitRadians = degreesToRadians(value);
      yawLimit = yawLimitRadians;
    });
  eyeRotationLimits
    .add(params, "pitchLimit", 0, 180)
    .name("Pitch Limit")
    .onChange((value) => {
      let pitchLimitRadians = degreesToRadians(value);
      pitchLimit = pitchLimitRadians;
    });

  gui.open();
}

function addOrbitControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, -2);
  controls.listenToKeyEvents(window); // optional
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enableZoom = true;
  controls.screenSpacePanning = false;
  controls.minDistance = 0;
  controls.maxDistance = 500;
  controls.maxPolarAngle = Math.PI / 2;
  controls.keys = {
    LEFT: "KeyA", // Use 'A' key to rotate left
    UP: "KeyW", // Use 'W' key to rotate up
    RIGHT: "KeyD", // Use 'D' key to rotate right
    BOTTOM: "KeyS", // Use 'S' key to rotate down
  };
  controls.update();
}

function removeOrbitControls() {
  controls.dispose();
}

// Adjust canvas size on window resize
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

function createFresnelShaderMaterial() {
  // Vertex Shader
  const vertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

  // Fragment Shader
  const fragmentShader = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);
    float edge = dot(normal, viewDir);
    float edgeFactor = smoothstep(0.0, 0.2, edge);
    vec3 color = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0), edgeFactor);
    float alpha = 1.0 - edgeFactor;
    gl_FragColor = vec4(color, alpha);
}
`;

  // Create Shader Material
  const fresnelShaderMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true, // Enable transparency
  });

    return fresnelShaderMaterial;
}

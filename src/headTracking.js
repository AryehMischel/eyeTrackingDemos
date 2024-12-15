import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { UltraHDRLoader } from "three/addons/loaders/UltraHDRLoader.js";



let avatarHeadPath = "./Assets/3D Models/headwithbonescentered.glb";
let avatarFacePath = "./Assets/3D Models/face.glb";

let neckBone = null;
let eyeBoneRight = null;
let eyeBoneLeft = null;
let model = null;
let mixer = null;
let box = null;
let head = null;
let ultraHDRLoader;
let debugArrowHelper = [];
let neckForward = null;
let headForward = null;
let orbitControls = null;
// let arrowHelperNeck = null;
let arrowHelperHead = null;
//GUI parameters
const params = {
    debug: true,
    orbitControls: false,
    use_Neck_As_Root_Motion: false,
  };

// Create a scene
const scene = new THREE.Scene();

// Create a camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0.0, 1.6, 0.5);

// Create a renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);





// Add lighting and background to the scene
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



// Mirrors the eyes rotation and position, used for checking valid rotations
const checkRightEye = new THREE.Object3D();
const checkLeftEye = new THREE.Object3D();

// Create a GLTF loader
const loader = new GLTFLoader();




// Load face model GLTF 
loader.load(avatarFacePath, function (gltf) {
    head = gltf.scene;
    window.head = head;
    head.scale.set(1.5, 1.5, 1.5);
    // head.position.set(0, 2.24, 0.05);
    head.position.set(0, 1.8, -1.2);
    head.traverse((child) => {
        // if (child.isMesh) {
        //     child.material.transparent = true; // Enable transparency
        //     child.material.opacity = 0.5;      // Set opacity (0.0 to 1.0)
        //     child.material.alphaTest = 0;    // Optional: For alpha testing
        //     child.material.color = '#FF0000';
        // }
    });
    headForward = new THREE.Vector3(0, 0, 1).applyQuaternion(head.quaternion).normalize();

    // Create a helper arrow to show the forward direction
    arrowHelperHead = new THREE.ArrowHelper(headForward, head.position, 5, 0xff0000);
    debugArrowHelper.push(arrowHelperHead);
    scene.add(arrowHelperHead);
    head.visible = true;
    scene.add(head);
    window.head = head;

});




loader.load(avatarHeadPath, function (gltf) {
    model = gltf.scene;
    console.log(gltf);
    window.model = model;

    model.traverse((object) => {
        // if (object.isMesh) {
        //     object.material.transparent = true; // Enable transparency
        //     object.material.opacity = 0.;      // Set opacity (0.0 to 1.0)
        //     object.material.alphaTest = 0.5;    // Optional: For alpha testing
        // }
        if (object.isSkinnedMesh) {
            if (neckBone === null) {
                neckBone = object.skeleton.bones.find(bone => bone.name === 'neck_01');
                // Find the forward direction of the neckBone
                neckForward = new THREE.Vector3(0, 0, 1).applyQuaternion(neckBone.quaternion).normalize();

                // Create a helper arrow to show the forward direction
                const neckBoneWorldPosition = new THREE.Vector3();
                neckBone.getWorldPosition(neckBoneWorldPosition);
                // arrowHelperNeck = new THREE.ArrowHelper(neckForward, neckBoneWorldPosition, 5, 0xff0000);
                // debugArrowHelper.push(arrowHelperNeck);
                // scene.add(arrowHelperNeck);
                window.neckBone = neckBone;
                console.log(neckBone);
            }
            if (eyeBoneRight === null) {
                eyeBoneRight = object.skeleton.bones.find(bone => bone.name === 'FACIAL_R_EyeParallel');
                window.eyeBoneRight = eyeBoneRight;
                console.log(eyeBoneRight);
            }

            if (eyeBoneLeft === null) {
                eyeBoneLeft = object.skeleton.bones.find(bone => bone.name === 'FACIAL_L_EyeParallel');
                window.eyeBoneLeft = eyeBoneLeft;
                console.log(eyeBoneLeft);
            }


        }
    });

    model.scale.set(1.5, 1.5, 1.5);
    model.position.set(0, -0.4, -1.2);

    // model.position.set(0, 0, 0);
    model.visible = false;
    scene.add(model);
    eyeBoneLeft.parent.add(checkLeftEye); //helps determine the target rotation of the eyes before rotating them
    eyeBoneRight.parent.add(checkRightEye);

    checkRightEye.position.copy(eyeBoneRight.position);
    checkLeftEye.position.copy(eyeBoneLeft.position);

    checkRightEye.rotation.copy(eyeBoneRight.rotation);
    checkLeftEye.rotation.copy(eyeBoneLeft.rotation);


});



// Visual representation of the target position
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshBasicMaterial({
    color: 0x0000ff,
    transparent: true,
    opacity: 0.5
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


function log() {
    const quaternion = new THREE.Quaternion();
    head.getWorldQuaternion(quaternion);
    neckBone.getWorldQuaternion(quaternion);
}
window.log = log;

//rotate the eyes to look at the target position
function rotateEyes(leftEye = eyeBoneLeft, rightEye = eyeBoneRight) {

    const targetPosition = new THREE.Vector3();
    cube.getWorldPosition(targetPosition);
    head.lookAt(targetPosition);
    neckBone.lookAt(targetPosition);
    neckBone.rotation.y += 1.16; //16 

}

function rotateBone(bones, x = 0, y = 0, z = 0) {
    for (let bone of bones) {
        bone.rotation.x += x;
        bone.rotation.y += y;
        bone.rotation.z += z;
    }

}

function setBoneRotation(bones, x = 0, y = 0, z = 0) {
    for (let bone of bones) {
        bone.rotation.x = x;
        bone.rotation.y = y;
        bone.rotation.z = z;
    }

}

window.setBoneRotation = setBoneRotation;
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
            console.log('Hit sphere');
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
window.addEventListener('mousemove', onMouseMove, false);
const gui = new GUI();
configureGUI()
// Render the scene
function animate() {
    if (mixer) {
        mixer.update(0.01);
    }
    if (neckBone && head) {
        // Find the forward direction of the neckBone
        let neckForward = new THREE.Vector3(-1, 0, 0).applyQuaternion(neckBone.quaternion).normalize();
        let headForward = new THREE.Vector3(0, 0, 1).applyQuaternion(head.quaternion).normalize();
        // arrowHelperNeck.setDirection(neckForward);
        arrowHelperHead.setDirection(headForward);

    }
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

function addOrbitControls() {
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.target.set(0, 1, -2);
  orbitControls.listenToKeyEvents(window); // optional
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.25;
  orbitControls.enableZoom = true;
  orbitControls.screenSpacePanning = false;
  orbitControls.minDistance = 0;
  orbitControls.maxDistance = 500;
  orbitControls.maxPolarAngle = Math.PI / 2;
  orbitControls.keys = {
    LEFT: "KeyA", // Use 'A' key to rotate left
    UP: "KeyW", // Use 'W' key to rotate up
    RIGHT: "KeyD", // Use 'D' key to rotate right
    BOTTOM: "KeyS", // Use 'S' key to rotate down
  };
  orbitControls.update();
}

function removeOrbitControls() {
  orbitControls.dispose();
}

function hideHead(){
    head.visible = false;
}

function hideModel(){
    model.visible = false;
}

window.hideHead = hideHead;
window.hideModel = hideModel;

function configureGUI() {
      gui.add(params, "debug")
      .name("Debug")
      .onChange((value) => {
        if (value) {
          debugArrowHelper.forEach((helper) => (helper.visible = true));
        } else {
          debugArrowHelper.forEach((helper) => (helper.visible = false));
        }
      });
  
      gui
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
  
      gui.add(params, "use_Neck_As_Root_Motion").onChange((value) => {
         if(value){
            model.visible = true;
            head.visible = false;
         }else{
            model.visible = false;
            head.visible = true;
         }
      });
  
    gui.open();
  }
// Adjust canvas size on window resize
window.addEventListener('resize', () => {
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

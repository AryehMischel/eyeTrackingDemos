let path = "./Assets/3D Models/headwithbones2.glb";
let neckBone = null;
let eyeBoneRight = null;
let eyeBoneLeft = null;
let model = null;
let mixer = null;
let eyesLocked = true;

let debugArrowHelper = [];
let pitchLimit = 0.33;
let yawLimit =  0.69;
const degreesToRadians = (degrees) => {
    return degrees * (Math.PI / 180);
  };

import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {GUI} from "three/examples/jsm/libs/lil-gui.module.min.js";

//GUI parameters
const params = {
    debug: false,
    orbitControls: false,
    showRayCastCollider: false,
    yawLimit: 90,
    pitchLimit: 90,

  };


// Create a scene
const scene = new THREE.Scene();

// Create a camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0.0, 1.6, 0.5);


// Create a renderer
const canvas = document.getElementById("viewer")
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Adjust canvas size on window resize
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

// let controls = new OrbitControls(camera, renderer.domElement);
//  controls.target.set(0, 0, -2);
// controls = new OrbitControls(camera, renderer.domElement);
// controls.listenToKeyEvents(window); // optional
// controls.enableDamping = true;
// controls.dampingFactor = 0.25;
// controls.enableZoom = true;
// controls.screenSpacePanning = false;
// controls.minDistance = 0;
// controls.maxDistance = 500;
// controls.maxPolarAngle = Math.PI / 2;

// controls.keys = {
//     LEFT: 'KeyA',  // Use 'A' key to rotate left
//     UP: 'KeyW',    // Use 'W' key to rotate up
//     RIGHT: 'KeyD', // Use 'D' key to rotate right
//     BOTTOM: 'KeyS' // Use 'S' key to rotate down
// };
// controls.update();
let controls;
function addOrbitControls(){
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
        LEFT: 'KeyA',  // Use 'A' key to rotate left
        UP: 'KeyW',    // Use 'W' key to rotate up
        RIGHT: 'KeyD', // Use 'D' key to rotate right
        BOTTOM: 'KeyS' // Use 'S' key to rotate down
    };
    controls.update();

}

function removeOrbitControls(){
    controls.dispose();
}

window.addOrbitControls = addOrbitControls;
window.removeOrbitControls = removeOrbitControls;

console.log("it's updating")


// Add lighting and background to the scene
const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
const ambientLight = new THREE.AmbientLight(0x404040, 100); // Soft white light
scene.add(ambientLight);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

const textureLoader = new THREE.TextureLoader();
const backgroundTexture = textureLoader.load('./castle2.jpg');
backgroundTexture.mapping = THREE.EquirectangularReflectionMapping;
scene.background = backgroundTexture;

// Mirrors the eyes rotation and position, used for checking valid rotations
const checkRightEye = new THREE.Object3D();
const checkLeftEye = new THREE.Object3D();

// Create a GLTF loader
const loader = new GLTFLoader();

// Load the GLTF model
loader.load(path, function (gltf) {
    model = gltf.scene;
    console.log(gltf);
    window.model = model;

    model.traverse((object) => {
        if (object.isSkinnedMesh) {
            if (neckBone === null) {
                neckBone = object.skeleton.bones.find(bone => bone.name === 'neck_01');
                console.log(neckBone);
                window.neckBone = neckBone;
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
    model.position.set(0, -0.40, -2);
    scene.add(model);
    eyeBoneLeft.parent.add(checkLeftEye); //helps determine the target rotation of the eyes before rotating them
    eyeBoneRight.parent.add(checkRightEye);

    checkRightEye.position.copy(eyeBoneRight.position);
    checkLeftEye.position.copy(eyeBoneLeft.position);

    checkRightEye.rotation.copy(eyeBoneRight.rotation);
    checkLeftEye.rotation.copy(eyeBoneLeft.rotation);

    let eyeFoward = new THREE.Vector3(0, 0, 1).applyQuaternion(eyeBoneLeft.quaternion).normalize();
    let eyeFoward2 = new THREE.Vector3(0, 0, 1);




        let arrowHelperX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 30, 0xff0000);
        let arrowHelperY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 30, 0xFFFF00);
        let arrowHelperZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 30, 0x00ff00);
        eyeBoneLeft.add(arrowHelperX, arrowHelperY, arrowHelperZ);
        debugArrowHelper.push(arrowHelperX, arrowHelperY, arrowHelperZ);
    // scene.add(arrowHelperHead);

});


// Visual representation of the target position
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const cubeMaterial = new THREE.MeshBasicMaterial({
    color: "#d8e2a9",
    transparent: true,
    opacity: 0.75
});

const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.set(0, 1.3, 2);
cube.scale.set(0.1, 0.1, 0.1);
scene.add(cube);
window.cube = cube;

// Visual representation of the eye target point. Mouse will raycast and the hitpoint on the sphere will be the target position
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = new THREE.MeshBasicMaterial({
    color: "#E9DCC9",
    transparent: true,
    opacity: 0.2
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(0, 1, -1.2); //0, 1.6, -1
sphere.scale.set(7.75, 5, 1); //1.5, 1.5, 0.5
scene.add(sphere);
window.sphere = sphere;


//rotate the eyes to look at the target position
function rotateEyes(leftEye = eyeBoneLeft, rightEye = eyeBoneRight) {
    const targetPosition = new THREE.Vector3();
    cube.getWorldPosition(targetPosition);
    console.log(targetPosition);
    let targetPositionRight = targetPosition.clone();
    let targetPositionLeft = targetPosition.clone();

    //check if the rotations are valid
    checkLeftEye.lookAt(targetPositionLeft);
    checkRightEye.lookAt(targetPositionRight);



    const checkLeftEyeWorldRotation = new THREE.Euler().setFromQuaternion(checkLeftEye.getWorldQuaternion(new THREE.Quaternion()));
    const checkRightEyeWorldRotation = new THREE.Euler().setFromQuaternion(checkRightEye.getWorldQuaternion(new THREE.Quaternion()));


    const maxRotationX = Math.PI / 8; // 22.5 degrees
    const maxRotationY = Math.PI / 6; // 30 degrees4
    const maxRotationZ = Math.PI / 6; // 30 degrees

    const isWithinConstraints = (rotation) => {
        return (
            Math.abs(rotation.x) <= pitchLimit &&
            Math.abs(rotation.y) <= yawLimit  &&
            Math.abs(rotation.z) <= maxRotationZ
        );
    };

    // Apply the rotation only if it is within the constraints
    if (isWithinConstraints(checkLeftEyeWorldRotation) && isWithinConstraints(checkRightEyeWorldRotation)) {
        if(eyesLocked){
            eyesLocked = false;
            cubeMaterial.color = new THREE.Color("#d8e2a9");
        }
        leftEye.lookAt(targetPositionLeft);
        rightEye.lookAt(targetPositionRight);
    } else {
        if(!eyesLocked){
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
    sceneSettings.add(params, 'debug').name('Debug').onChange((value) => {
        if (value) {
            debugArrowHelper.forEach(helper => helper.visible = true);
        } else {
            debugArrowHelper.forEach(helper => helper.visible = false);
        }

    });
    
    sceneSettings.add(params, 'orbitControls').name('Orbit Controls').onChange((value) => {
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


    eyeRotationLimits.add(params, 'yawLimit', 0, 180).name('Yaw Limit').onChange((value) => {
        let yawLimitRadians = degreesToRadians(value);
        yawLimit = yawLimitRadians;
        //console.log(value);
    });
    eyeRotationLimits.add(params, 'pitchLimit', 0, 180).name('Pitch Limit').onChange((value) => {
        let pitchLimitRadians = degreesToRadians(value);
        pitchLimit = pitchLimitRadians;
        //console.log(value);
    });

    gui.open();
  
}

window.camera = camera;
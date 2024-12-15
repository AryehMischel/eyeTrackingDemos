import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { UltraHDRLoader } from "three/addons/loaders/UltraHDRLoader.js";



let ultraHDRLoader;
let helpers = []
let path = "./Assets/3D Models/AryehAvatarFullBody.glb"; //"AryehAvatarFullBodyWorking.glb"
let gui;
let orbitControls;

const params = {
    debug: false,
    orbitControls: false,
    exposure: 0.8,
  };
//visual helpers

let neckBone = null;
let headBone = null;

let neckBoneHelper = new THREE.Object3D();
let neckBoneOriginHelper = new THREE.Object3D();

let headBoneHelper = new THREE.Object3D();
let headBoneOriginHelper = new THREE.Object3D();


let eyeBoneRight = null;
let eyeBoneLeft = null;

let model = null;
let mixer = null;

let debug = false;

const morphTargetsDict = {};


// Create a scene
const scene = new THREE.Scene();

// Create a camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0.005, 1.6, 0); // Adjust the camera position


// Create a renderer
const renderer = createRenderer()//new THREE.WebGLRenderer({ antialias: true });
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
// loadEnvironment();
 // create background cubemap env
 const cubeloader = new THREE.CubeTextureLoader();
 const texture = cubeloader.load([
     './Assets/Textures/CubeMaps/Mountain/posx.jpg', './Assets/Textures/CubeMaps/Mountain/negx.jpg',
     './Assets/Textures/CubeMaps/Mountain/posy.jpg', './Assets/Textures/CubeMaps/Mountain/negy.jpg',
     './Assets/Textures/CubeMaps/Mountain/posz.jpg', './Assets/Textures/CubeMaps/Mountain/negz.jpg'
 ]);
 scene.background = texture;
 scene.environment = texture;

createSceneLighting()
//create orbit controls "a", "w", "d", "s" to move camera
// let controls = createControls();
// controls.update();

// Add lighting to scene
// createSceneLighting();

// Mirrors the eyes rotation and position, used for checking valid rotations
const checkRightEye = new THREE.Object3D();
const checkLeftEye = new THREE.Object3D();

// Create a GLTF loader
const loader = new GLTFLoader();

//for blend shape animation (aka morph targets, blend keys, shape keys, etc)
let targetInfluences;
let morphTargetDictionary;


// Load the GLTF model
loader.load(path, function (gltf) {
    model = gltf.scenes[0];
    log(model);
    // let face = model.children[0]
    // let faceMesh = face.children[2];
    // if (faceMesh.morphTargetInfluences && faceMesh.morphTargetDictionary) {
    //     log(faceMesh.morphTargetInfluences);
    //     targetInfluences = faceMesh.morphTargetInfluences;
    //     morphTargetDictionary = faceMesh.morphTargetDictionary;
    //     window.targetInfluences = targetInfluences;
    //     window.morphTargetDictionary = morphTargetDictionary;
    // }

    model.traverse((object) => {
        if(object.morphTargetInfluences){
            log("truuuuue")
        }

        if (object.isBone) {
            //per bone operation
        }
        if (object.isSkinnedMesh) {

            if (eyeBoneRight === null) {
                eyeBoneRight = object.skeleton.bones.find(bone => bone.name === 'DEF_eyeR'); //DEF_eyeR
                window.eyeBoneRight = eyeBoneRight;
            }

            if (eyeBoneLeft === null) {
                eyeBoneLeft = object.skeleton.bones.find(bone => bone.name === 'MCH-eyeL'); //DEF_eyeL
                window.eyeBoneLeft = eyeBoneLeft;
                log(eyeBoneLeft);
            }

            if (neckBone === null) {
                neckBone = object.skeleton.bones.find(bone => bone.name === 'Neck');
                window.neckBone = neckBone;
                log(neckBone);
            }
            if (headBone === null) {
                headBone = object.skeleton.bones.find(bone => bone.name === 'Head');
                window.headBone = headBone;
                log(headBone);
            }


        }
    });

    model.scale.set(1, 1, 1);
    model.position.set(0, 0, -2);


    addArrowHelpers(headBoneHelper)
    headBone.parent.add(headBoneHelper);
    headBoneHelper.position.copy(headBone.position);


    addArrowHelpers(headBoneOriginHelper)
    headBone.parent.add(headBoneOriginHelper);
    headBoneOriginHelper.position.copy(headBone.position);
    headBoneOriginHelper.rotation.copy(headBone.rotation);

    neckBone.parent.add(neckBoneOriginHelper);
    neckBoneOriginHelper.position.copy(neckBone.position);
    neckBoneOriginHelper.rotation.copy(neckBone.rotation);


    scene.add(model);
    startCombinedTracking();

});


// cube is the target. meaning the character should always look at the cube
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

// sphere represents target zone. if our mouse is over the sphere the cube will move to the intersection point of a raycast from our mouse screenspace position and the sphere
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = new THREE.MeshBasicMaterial({
    color: 0x0000ff,
    transparent: true,
    opacity: 0
});

const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(0, 1.6, -1.5);
sphere.scale.set(0.5, 0.5, 0.5);
scene.add(sphere);
window.sphere = sphere;

let targetPosition = new THREE.Vector3();

//rotate the eyes to look at the target position

function rotateEyes(leftEye = eyeBoneLeft, rightEye = eyeBoneRight) {

    //must be simplified to improve performance
    // const targetPosition = new THREE.Vector3();
    cube.getWorldPosition(targetPosition)
    eyeBoneLeft.lookAt(targetPosition);
    eyeBoneRight.lookAt(targetPosition);

    //imported eyebones foward direction is set to the y axis and therefor need rotated 
    eyeBoneLeft.rotateOnAxis(new THREE.Vector3(-1, 0, 0), Math.PI * -0.5);
    eyeBoneRight.rotateOnAxis(new THREE.Vector3(-1, 0, 0), Math.PI * -0.5);

}

window.rotateEye = rotateEyes;

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
            const hitPoint = intersects[i].point;
            cube.position.copy(hitPoint);
        }
    }

    if (camera && neckBone) {
        rotateEyes();
    }
    // sceneReady = true;

}

// Add event listener for mouse move
window.addEventListener('mousemove', onMouseMove, false);


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
const edgeHighlightMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true // Enable transparency
});

// Apply the shader material to the sphere
sphere.material = edgeHighlightMaterial;

let animateHead = true;
let sceneReady = false;

function startCombinedTracking() {
    sceneReady = !sceneReady;
}

function calculateTargetQuaternion(object, targetPosition, centerdness) {
    const targetQuaternion = new THREE.Quaternion();
    const direction = new THREE.Vector3().subVectors(targetPosition, object.getWorldPosition(new THREE.Vector3())).normalize();
    const up = new THREE.Vector3(0, 1, 0); // Assuming the up direction is along the Y-axis
    const matrix = new THREE.Matrix4().lookAt(object.getWorldPosition(new THREE.Vector3()), targetPosition, up);
    targetQuaternion.setFromRotationMatrix(matrix);


    const correctionQuaternion = new THREE.Quaternion();
    correctionQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); // Rotate 180 degrees around the Y-axis
    const correctedTargetQuaternion = targetQuaternion.clone().multiply(correctionQuaternion);

    // const correctionQuaternion = new THREE.Quaternion();
    // correctionQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); // Rotate 180 degrees around the Y-axis
    // const correctedTargetQuaternion = targetQuaternion.clone().multiply(correctionQuaternion);

    const currentQuaternion = headBone.quaternion.clone();
    const dotProduct = currentQuaternion.dot(correctedTargetQuaternion);
    const clampedDotProduct = Math.max(-1, Math.min(1, dotProduct));
    const angle = 2 * Math.acos(clampedDotProduct);
    // log('Angle between quaternions (degrees):', angle);
    // log('Angle between quaternions (degrees):', THREE.MathUtils.radToDeg(angle));
    let threshold = 6.28;

    if (!animateHead) {
        threshold = 6.1
    }

    if (centerdness) {
        threshold = 6.1;
    }




    if (angle <= threshold) {
        animateHead = true;
        // log('animating head');
        return targetQuaternion;
    } else {
        animateHead = false;
        log('not animating head');
    }
    return targetQuaternion;


    // else {
    //     animateHead = false;
    //     log('not animating head');
    //     return null
    // }


}

function calculateHeadTargetQuaternion() {

}

function calculateNeckTargetQuaternion() {

}

function calculateYawAndPitchDifference(euler1, euler2) {
    const yawDifference = euler2.y - euler1.y;
    const pitchDifference = euler2.x - euler1.x;

    return [yawDifference, pitchDifference];
}

gui = new GUI();
configureGUI()
// Render the scene
function animate() {
    if (mixer) {
        mixer.update(0.01);
    }

    if (sceneReady) {

        headBoneHelper.lookAt(targetPosition);



        let [yaw, pitch] = calculateYawAndPitchDifference(headBoneOriginHelper.rotation, headBoneHelper.rotation);
        // log('Yaw difference:', THREE.MathUtils.radToDeg(yaw));
        // log('Pitch difference:', THREE.MathUtils.radToDeg(pitch));
        // log(THREE.MathUtils.radToDeg(yaw), THREE.MathUtils.radToDeg(pitch));
        let centerdness = false

        if (Math.abs(pitch) <= 0.03 && Math.abs(yaw) <= 0.04) {
            centerdness = true;
            log('centered');
        }

        const targetQuaternion = calculateTargetQuaternion(neckBone, cube.position, centerdness);

        if (!animateHead) {
            if (centerdness) {
                const time = Date.now() * 0.001;
                neckBone.quaternion.slerp(neckBoneOriginHelper.quaternion, 0.02);


                // Apply an additional rotation to correct the orientation if needed
                const headBoneQuaternion = new THREE.Quaternion().copy(headBoneOriginHelper.quaternion);
                const offsetQuaternion = new THREE.Quaternion();
                offsetQuaternion.setFromAxisAngle(new THREE.Vector3(-1, 0, 0), Math.PI * -0.05); // Adjust the axis and angle as needed
                const finalTargetQuaternion = headBoneQuaternion.clone().multiply(offsetQuaternion); // Clone before multiplying
                headBone.quaternion.slerp(finalTargetQuaternion, 0.04);
                 rotateEyes();

            }


        } else {
            if (targetQuaternion) {

                if (Math.abs(THREE.MathUtils.radToDeg(yaw)) > 4 || Math.abs(THREE.MathUtils.radToDeg(pitch)) > 2) {
                    //animate neck

                    if (targetQuaternion) {
                        const time = Date.now() * 0.001;
                        // Apply an additional rotation to correct the orientation if needed
                        const correctionQuaternion = new THREE.Quaternion();
                        correctionQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); // Rotate 180 degrees around the Y-axis
                        const correctedTargetQuaternion = targetQuaternion.clone().multiply(correctionQuaternion);

                        headBone.quaternion.slerp(correctedTargetQuaternion, 0.02);


                        const offsetQuaternion = new THREE.Quaternion();
                        offsetQuaternion.setFromAxisAngle(new THREE.Vector3(-1, 0, 0), Math.PI * -0.19); // Adjust the axis and angle as needed

                        const finalTargetQuaternion = correctedTargetQuaternion.multiply(offsetQuaternion);

                        const halfwayQuaternion = new THREE.Quaternion().copy(neckBoneOriginHelper.quaternion).slerp(finalTargetQuaternion, 0.35);
                        // const headBoneOriginQuaternion = headBoneOriginHelper.quaternion.clone();

                        // headBoneOriginQuaternion.slerp(headBoneOriginHelper.quaternion, finalTargetQuaternion, 0.5);
                        // neckBoneHelper.quaternion.slerp(correctedTargetQuaternion, 0.02);
                        // neckBone.quaternion.slerp(finalTargetQuaternion, 0.02); // Adjust deltaTime for smoothness 
                        neckBone.quaternion.slerp(halfwayQuaternion, 0.01);
                    }

                } else {
                    const time = Date.now() * 0.001;
                    neckBone.quaternion.slerp(neckBoneOriginHelper.quaternion, 0.02);

                    // Apply an additional rotation to correct the orientation if needed
                    const correctionQuaternion = new THREE.Quaternion();
                    correctionQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); // Rotate 180 degrees around the Y-axis
                    const correctedTargetQuaternion = targetQuaternion.clone().multiply(correctionQuaternion);

                    headBone.quaternion.slerp(correctedTargetQuaternion, 0.02);


                    const offsetQuaternion = new THREE.Quaternion();
                    offsetQuaternion.setFromAxisAngle(new THREE.Vector3(-1, 0, 0), Math.PI * -0.19); // Adjust the axis and angle as needed

                    const finalTargetQuaternion = correctedTargetQuaternion.multiply(offsetQuaternion);
                    rotateEyes();

                    // const headBoneOriginQuaternion = headBoneOriginHelper.quaternion.clone();

                    // headBoneOriginQuaternion.slerp(headBoneOriginHelper.quaternion, finalTargetQuaternion, 0.5);
                    // neckBoneHelper.quaternion.slerp(correctedTargetQuaternion, 0.02);
                    // neckBone.quaternion.slerp(finalTargetQuaternion, 0.02); // Adjust deltaTime for smoothness 
                    // log("not animating neck");
                    // const correctionQuaternion = new THREE.Quaternion();
                    // correctionQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); // Rotate 180 degrees around the Y-axis
                    // const correctedTargetQuaternion = targetQuaternion.clone().multiply(correctionQuaternion);

                    // offsetQuaternion.setFromAxisAngle(new THREE.Vector3(-1, 0, 0), Math.PI * -0.19); // Adjust the axis and angle as needed
                    // const finalTargetQuaternion = correctedTargetQuaternion.multiply(offsetQuaternion);



                    // headBone.quaternion.slerp(correctedTargetQuaternion, 0.02);

                }
            }

        }



        //    if( Math.abs(THREE.MathUtils.radToDeg(pitch)) > 15){
        //          log('pitch is greater than 15 degrees');
        //    }



        // if animating

        //get angle between current head rotation and target head rotation  
        //rotate head towards target head rotation

        // get angle between target head rotation and original head rotation
        // if angle is greater than 15 degrees engage neckBone rotation



        //animate neck
        // const targetQuaternion = calculateTargetQuaternion(neckBone, cube.position);
        // if (targetQuaternion  ) {
        // const time = Date.now() * 0.001;
        // // Apply an additional rotation to correct the orientation if needed
        // const correctionQuaternion = new THREE.Quaternion();
        // correctionQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); // Rotate 180 degrees around the Y-axis


        // const correctedTargetQuaternion = targetQuaternion.clone().multiply(correctionQuaternion);
        // headBone.quaternion.slerp(correctedTargetQuaternion, 0.02);


        // const offsetQuaternion = new THREE.Quaternion();
        // offsetQuaternion.setFromAxisAngle(new THREE.Vector3(-1, 0, 0), Math.PI * -0.19); // Adjust the axis and angle as needed
        // const finalTargetQuaternion = correctedTargetQuaternion.multiply(offsetQuaternion);
        // // neckBoneHelper.quaternion.slerp(correctedTargetQuaternion, 0.02);
        // neckBone.quaternion.slerp(finalTargetQuaternion, 0.02); // Adjust deltaTime for smoothness


    }




    requestAnimationFrame(animate);

    renderer.render(scene, camera);
}
animate();


function addArrowHelpers(object) {
    const arrowHelperX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 30, 0xff0000);
    const arrowHelperY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 30, 0xFFFF00);
    const arrowHelperZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 30, 0x00ff00);
    arrowHelperX.visible = false;
    arrowHelperY.visible = false;
    arrowHelperZ.visible = false;

    try {
        object.add(arrowHelperZ);
        helpers.push( arrowHelperZ);
    } catch {
        log("error adding arrow helpers")
    }


}



// our main scene settings

// Adjust canvas size on window resize
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

//create return renderer
function createRenderer() {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    renderer.setSize(window.innerWidth, window.innerHeight);
    return renderer;
}

//create return controller
function createControls() {
    let controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2.3, 0);
    controls = new OrbitControls(camera, renderer.domElement);
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
    return controls;
}



function createSceneLighting() {
    // Add lighting and background to the scene
    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);
    // Add an ambient light for soft global illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 1); // Soft white light
    scene.add(ambientLight);

    // Add a hemisphere light for sky and ground lighting
    const hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x444444, 1);
    hemisphereLight.position.set(0, 20, 0);
    scene.add(hemisphereLight);

    // Add a point light for localized lighting
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(2, 3, 2);
    pointLight.castShadow = true;
    scene.add(pointLight);

    // Add a spotlight for focused lighting
    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(0, 5, 5);
    spotLight.castShadow = true;
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.1;
    spotLight.decay = 2;
    spotLight.distance = 50;
    scene.add(spotLight);
}

function configureGUI() {
    gui.add(params, "debug")
    .name("Debug")
    .onChange((value) => {
        debug = value;
      if (debug) {
        helpers.forEach((helper) => (helper.visible = true));
      } else {
        helpers.forEach((helper) => (helper.visible = false));
      }
    });

    gui.add(params, "exposure", 0, 2, 0.01).onChange((value) => {renderer.toneMappingExposure = value;});
    gui
    .add(params, "orbitControls")
    .name("Orbit Controls")
    .onChange((value) => {
      if (value) {
        addOrbitControls();
        camera.position.set(0.005, 1.6, 0); // Adjust the camera position
        camera.rotation.set(0, 0, 0);
      } else {
        removeOrbitControls();
        camera.position.set(0.005, 1.6, 0); // Adjust the camera position
        camera.rotation.set(0, 0, 0);
      }
    });

}

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

function log(message){
    if(debug){
        console.log(message)    
    }
}
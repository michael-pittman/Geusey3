import * as THREE from 'three';
import { CSS3DRenderer, CSS3DSprite } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import TWEEN from 'three/addons/libs/tween.module.js';
import './styles/chat.css';

let camera, scene, renderer;
let controls;
let chat = null;

// Store original camera settings for chat state management
let originalCameraPosition = { x: 600, y: 400, z: 1500 };
let originalMinDistance = 500;
let originalMaxDistance = 6000;

const particlesTotal = 512;
const positions = [];
const objects = [];
let current = 0;
const sceneNames = ['plane', 'cube', 'sphere', 'random', 'spiral', 'fibonacci'];
let currentScene = 'plane';
let isTransitioning = false;

// Lazy load chat component
async function loadChat() {
    if (!chat) {
        const Chat = (await import('./chat.js')).default;
        chat = new Chat();
        // Set up callback for camera adjustment
        chat.onVisibilityChange = adjustCameraForChat;
    }
    return chat;
}

// Function to adjust camera distance based on chat visibility
function adjustCameraForChat(isChatActive) {
    if (!camera || !controls) return;
    
    if (isChatActive) {
        // Move camera further away when chat is active
        const newPosition = {
            x: originalCameraPosition.x * 1.5,
            y: originalCameraPosition.y * 1.2,
            z: originalCameraPosition.z * 1.8
        };
        
        // Smoothly animate camera to new position
        new TWEEN.Tween(camera.position)
            .to(newPosition, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        // Adjust controls to allow closer/further zoom
        controls.minDistance = originalMinDistance * 0.8;
        controls.maxDistance = originalMaxDistance * 1.5;
    } else {
        // Return camera to original position when chat is closed
        new TWEEN.Tween(camera.position)
            .to(originalCameraPosition, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        // Restore original control settings
        controls.minDistance = originalMinDistance;
        controls.maxDistance = originalMaxDistance;
    }
}

function createChatIconSprite() {
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.bottom = '20px';
    div.style.left = '20px';
    div.style.width = '60px';
    div.style.height = '60px';
    div.style.cursor = 'pointer';
    div.style.zIndex = '1000';
    div.setAttribute('aria-label', 'Open chat');
    div.setAttribute('tabindex', '0');

    const img = document.createElement('img');
    img.src = 'https://www.geuse.io/media/glitch.gif';
    img.style.width = '100%';
    img.style.height = '100%';
    img.loading = 'eager'; // Since this is above the fold
    div.appendChild(img);

    div.addEventListener('click', async () => {
        const chatInstance = await loadChat();
        const isVisible = chatInstance.toggle();
        img.src = isVisible ? 'https://www.geuse.io/media/fire.gif' : 'https://www.geuse.io/media/glitch.gif';
    });

    document.body.appendChild(div);
    return div;
}

function generatePositions() {
    positions.length = 0;
    // Plane Scene
    const amountX = 16;
    const amountZ = 32;
    const separationPlane = 150;
    const offsetX = ((amountX - 1) * separationPlane) / 2;
    const offsetZ = ((amountZ - 1) * separationPlane) / 2;
    for (let i = 0; i < particlesTotal; i++) {
        const x = (i % amountX) * separationPlane;
        const z = Math.floor(i / amountX) * separationPlane;
        const y = (Math.sin(x * 0.5) + Math.sin(z * 0.5)) * 200;
        positions.push(x - offsetX, y, z - offsetZ);
    }
    // Cube Scene
    const amount = 8;
    const separationCube = 150;
    const offset = ((amount - 1) * separationCube) / 2;
    for (let i = 0; i < particlesTotal; i++) {
        const x = (i % amount) * separationCube;
        const y = Math.floor((i / amount) % amount) * separationCube;
        const z = Math.floor(i / (amount * amount)) * separationCube;
        positions.push(x - offset, y - offset, z - offset);
    }
    // Sphere Scene
    const sphereRadius = 1750;
    for (let i = 0; i < particlesTotal; i++) {
        const phi = Math.acos(-1 + (2 * i) / particlesTotal);
        const theta = Math.sqrt(particlesTotal * Math.PI) * phi;
        positions.push(
            sphereRadius * Math.cos(theta) * Math.sin(phi),
            sphereRadius * Math.sin(theta) * Math.sin(phi),
            sphereRadius * Math.cos(phi)
        );
    }
    // Random Scene
    for (let i = 0; i < particlesTotal; i++) {
        positions.push(
            Math.random() * 4000 - 2000,
            Math.random() * 4000 - 2000,
            Math.random() * 4000 - 2000
        );
    }
    // Spiral Scene
    const separationSpiral = separationPlane;
    const spiralTurns = 15;
    const maxRadius = separationSpiral * 8;
    for (let i = 0; i < particlesTotal; i++) {
        const fraction = i / (particlesTotal - 1);
        const angle = fraction * spiralTurns * Math.PI * 4;
        const radius = fraction * maxRadius;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        const y = radius * Math.sin(angle);
        positions.push(x, y, z);
    }
    // Fibonacci Scene (no baked-in rotation)
    const fiboRadius = separationPlane * 4;
    const offsetFibo = 2 / particlesTotal;
    const increment = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < particlesTotal; i++) {
        const y = i * offsetFibo - 1 + offsetFibo / 2;
        const r = Math.sqrt(1 - y * y);
        const angle = i * increment;
        const x = Math.cos(angle) * r * fiboRadius;
        const z = Math.sin(angle) * r * fiboRadius;
        positions.push(x, y * fiboRadius, z);
    }
     
    
}

function setScene(sceneName) {
    currentScene = sceneName;
    // Set target positions for all objects
    const offset = sceneNames.indexOf(sceneName) * particlesTotal * 3;
    for (let i = 0, j = offset; i < particlesTotal; i++, j += 3) {
        objects[i].userData.target = {
            x: positions[j],
            y: positions[j + 1],
            z: positions[j + 2]
        };
    }
}

function init() {
    try {
        // Initialize with lower resolution for better initial load
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        
        // Get the actual viewport dimensions accounting for notches and safe areas
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        camera = new THREE.PerspectiveCamera(75, viewportWidth / viewportHeight, 1, 5000);
        camera.position.set(600, 400, 1500);
        camera.lookAt(0, 0, 0);
        
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xedcfcf);
        
        createChatIconSprite();
        generatePositions();
        
        const image = document.createElement('img');
        image.loading = 'eager'; // Critical asset
        image.addEventListener('load', function () {
            // Create objects in chunks to prevent UI blocking
            const chunkSize = 50;
            let currentChunk = 0;
            
            function createChunk() {
                const start = currentChunk * chunkSize;
                const end = Math.min(start + chunkSize, particlesTotal);
                
                for (let i = start; i < end; i++) {
                    const object = new CSS3DSprite(image.cloneNode());
                    object.position.x = Math.random() * 4000 - 2000;
                    object.position.y = Math.random() * 4000 - 2000;
                    object.position.z = Math.random() * 4000 - 2000;
                    object.userData.target = { x: 0, y: 0, z: 0 };
                    scene.add(object);
                    objects.push(object);
                }
                
                currentChunk++;
                if (currentChunk * chunkSize < particlesTotal) {
                    requestAnimationFrame(createChunk);
                } else {
                    setScene(currentScene);
                    transition();
                }
            }
            
            createChunk();
        });
        
        image.src = 'https://www.geuse.io/media/sprite.png';
        
        // Create a dedicated container for the renderer
        const rendererContainer = document.createElement('div');
        rendererContainer.id = 'renderer-container';
        rendererContainer.style.position = 'fixed';
        rendererContainer.style.top = '0';
        rendererContainer.style.left = '0';
        rendererContainer.style.width = '100vw';
        rendererContainer.style.height = '100vh';
        rendererContainer.style.zIndex = '1';
        rendererContainer.style.padding = 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
        document.body.appendChild(rendererContainer);
        
        renderer = new CSS3DRenderer();
        renderer.setSize(viewportWidth, viewportHeight);
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        rendererContainer.appendChild(renderer.domElement);
        
        controls = new TrackballControls(camera, renderer.domElement);
        controls.minDistance = 500;
        controls.maxDistance = 6000;
        
        // Optimize resize handling
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(onWindowResize, 100);
        });

        // Start animation loop
        animate();
    } catch (error) {
        console.error('Error initializing Three.js:', error);
    }
}

function onWindowResize() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    camera.aspect = viewportWidth / viewportHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewportWidth, viewportHeight);
}

function transition() {
    isTransitioning = true;
    // Pick a new scene
    let nextIdx = sceneNames.indexOf(currentScene);
    while (nextIdx === sceneNames.indexOf(currentScene)) {
        nextIdx = Math.floor(Math.random() * sceneNames.length);
    }
    const nextScene = sceneNames[nextIdx];
    setScene(nextScene);
    const duration = 4000;
    let tweensCompleted = 0;
    for (let i = 0; i < particlesTotal; i++) {
        const object = objects[i];
        new TWEEN.Tween(object.position)
            .to({
                x: object.userData.target.x,
                y: object.userData.target.y,
                z: object.userData.target.z,
            }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .onComplete(() => {
                tweensCompleted++;
                if (tweensCompleted === particlesTotal) {
                    isTransitioning = false;
                }
            })
            .start();
    }
    new TWEEN.Tween({})
        .to({}, duration * 6)
        .onComplete(() => {
            transition();
        })
        .start();
}

function animate() {
    try {
        requestAnimationFrame(animate);
        
        // Only update TWEEN if there are active tweens
        if (TWEEN.getAll().length > 0) {
            TWEEN.update();
        }
        
        if (controls) {
            controls.update();
        }
        
        const time = performance.now();
        // Optimize animation by only updating visible objects
        const cameraPosition = camera.position;
        for (let i = 0, l = objects.length; i < l; i++) {
            const object = objects[i];
            // Only animate objects within a certain distance from the camera
            if (object.position.distanceTo(cameraPosition) < 3000) {
                const scale = Math.sin((Math.floor(object.position.x) + time) * 0.002) * 0.3 + 1;
                object.scale.set(scale, scale, scale);
            }
        }
        
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    } catch (error) {
        console.error('Error in animation loop:', error);
    }
}

// Initialize the scene
init(); 
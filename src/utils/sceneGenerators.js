/**
 * Scene Generators Utility
 *
 * Modular Three.js scene position generators for particle system visualizations.
 * Each generator creates position arrays for different geometric patterns.
 */

/**
 * Generates positions for a plane scene with sinusoidal wave patterns
 * @param {number} particlesTotal - Total number of particles to position
 * @returns {number[]} Array of x,y,z positions [x1,y1,z1,x2,y2,z2,...]
 */
export function generatePlanePositions(particlesTotal) {
    const positions = [];
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

    return positions;
}

/**
 * Generates positions for a 3D cube grid scene
 * @param {number} particlesTotal - Total number of particles to position
 * @returns {number[]} Array of x,y,z positions [x1,y1,z1,x2,y2,z2,...]
 */
export function generateCubePositions(particlesTotal) {
    const positions = [];
    const amount = 8;
    const separationCube = 150;
    const offset = ((amount - 1) * separationCube) / 2;

    for (let i = 0; i < particlesTotal; i++) {
        const x = (i % amount) * separationCube;
        const y = Math.floor((i / amount) % amount) * separationCube;
        const z = Math.floor(i / (amount * amount)) * separationCube;
        positions.push(x - offset, y - offset, z - offset);
    }

    return positions;
}

/**
 * Generates positions for a sphere scene using spherical coordinates
 * @param {number} particlesTotal - Total number of particles to position
 * @returns {number[]} Array of x,y,z positions [x1,y1,z1,x2,y2,z2,...]
 */
export function generateSpherePositions(particlesTotal) {
    const positions = [];
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

    return positions;
}

/**
 * Generates random positions within a 4000x4000x4000 unit cube
 * @param {number} particlesTotal - Total number of particles to position
 * @returns {number[]} Array of x,y,z positions [x1,y1,z1,x2,y2,z2,...]
 */
export function generateRandomPositions(particlesTotal) {
    const positions = [];

    for (let i = 0; i < particlesTotal; i++) {
        positions.push(
            Math.random() * 4000 - 2000,
            Math.random() * 4000 - 2000,
            Math.random() * 4000 - 2000
        );
    }

    return positions;
}

/**
 * Generates positions for a 3D spiral scene
 * @param {number} particlesTotal - Total number of particles to position
 * @returns {number[]} Array of x,y,z positions [x1,y1,z1,x2,y2,z2,...]
 */
export function generateSpiralPositions(particlesTotal) {
    const positions = [];
    const separationSpiral = 150; // Using same separation as plane
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

    return positions;
}

/**
 * Generates positions for a Fibonacci sphere scene with no baked-in rotation
 * @param {number} particlesTotal - Total number of particles to position
 * @returns {number[]} Array of x,y,z positions [x1,y1,z1,x2,y2,z2,...]
 */
export function generateFibonacciPositions(particlesTotal) {
    const positions = [];
    const fiboRadius = 150 * 4; // Using same separation base as plane * 4
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

    return positions;
}

/**
 * Generates all scene positions by calling all individual generators
 * @param {number} particlesTotal - Total number of particles to position
 * @returns {number[]} Combined array of all scene positions in order: plane, cube, sphere, random, spiral, fibonacci
 */
export function generateAllScenes(particlesTotal) {
    const allPositions = [];

    // Generate positions for all scenes in the correct order
    allPositions.push(...generatePlanePositions(particlesTotal));
    allPositions.push(...generateCubePositions(particlesTotal));
    allPositions.push(...generateSpherePositions(particlesTotal));
    allPositions.push(...generateRandomPositions(particlesTotal));
    allPositions.push(...generateSpiralPositions(particlesTotal));
    allPositions.push(...generateFibonacciPositions(particlesTotal));

    return allPositions;
}

/**
 * Scene generator function mapping for dynamic access
 */
export const sceneGenerators = {
    plane: generatePlanePositions,
    cube: generateCubePositions,
    sphere: generateSpherePositions,
    random: generateRandomPositions,
    spiral: generateSpiralPositions,
    fibonacci: generateFibonacciPositions
};
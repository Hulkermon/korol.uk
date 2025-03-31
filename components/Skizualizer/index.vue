<template>
  <div class="ski-canvas-container">
    <canvas ref="skiCanvas" class="ski-canvas"></canvas>
  </div>
    <div class="controls">
      <button @click="startRotation" class="control-button bg-gray-300 p-2 m-2 hover:bg-gray-400">Rotate 360°</button>
      <button @click="resetRotation" class="control-button bg-gray-300 p-2 m-2 hover:bg-gray-400">Reset</button>
    </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { useTrickParser } from '~/composables/skizualizer/useTrickParser';

  // Canvas reference
  const skiCanvas = ref<HTMLCanvasElement | null>(null);

  // Three.js objects
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let skiMesh: THREE.Group;
  let animationFrameId: number;

  // Rotation control variables
  const isRotating = ref(false);
  /** radians per frame */
  const rotationSpeed = 0.05;
  const targetRotation = ref(0);
  const currentRotation = ref(0);

  // Initialize Three.js scene
  const initThree = () => {
    if (!skiCanvas.value) return;

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    // Camera setup
    const aspect = skiCanvas.value.clientWidth / skiCanvas.value.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(-5, 2, 0);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({
      canvas: skiCanvas.value,
      antialias: true,
    });
    renderer.setSize(skiCanvas.value.clientWidth, skiCanvas.value.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Create skis
    createSkis();

    // Add lighting
    addLights();

    // Add a simple ground plane
    addGround();

    // Start animation loop
    animate();
  };

  // Create a pair of skis using box geometry as placeholder
  const createSkis = () => {
    // Create a group to hold both skis
    skiMesh = new THREE.Group();

    // Dimensions for a single ski
    const skiLength = 1.8;
    const skiWidth = 0.1;
    const skiHeight = 0.02;

    // Materials
    const skiMaterial = new THREE.MeshStandardMaterial({
      color: 0x3366cc, // Blue-ish color for skis
      roughness: 0.3,
      metalness: 0.7,
    });

    // Create left ski
    const leftSkiGeometry = new THREE.BoxGeometry(
      skiLength,
      skiHeight,
      skiWidth
    );
    const leftSki = new THREE.Mesh(leftSkiGeometry, skiMaterial);
    leftSki.position.z = -skiWidth; // Offset to the left
    leftSki.castShadow = true;

    // Create right ski
    const rightSkiGeometry = new THREE.BoxGeometry(
      skiLength,
      skiHeight,
      skiWidth
    );
    const rightSki = new THREE.Mesh(rightSkiGeometry, skiMaterial);
    rightSki.position.z = skiWidth; // Offset to the right
    rightSki.castShadow = true;

    // Add both skis to the group
    skiMesh.add(leftSki);
    skiMesh.add(rightSki);

    // Position the group in the scene
    skiMesh.position.y = 0.1; // Slightly above the ground
    scene.add(skiMesh);
  };

  // Start a 360-degree rotation
  const startRotation = () => {
    if (isRotating.value) return;

    isRotating.value = true;
    targetRotation.value = currentRotation.value + Math.PI * 2; // 360 degrees in radians
  };

  // Reset the rotation to original position
  const resetRotation = () => {
    isRotating.value = true;
    targetRotation.value = 0;
  };

  // Add lights to the scene
  const addLights = () => {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Directional light (sun-like)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;

    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;

    scene.add(directionalLight);
  };

  const addGround = () => {
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Make it horizontal
    ground.receiveShadow = true;
    scene.add(ground);
  };

  // Animation loop
  const animate = () => {
    animationFrameId = requestAnimationFrame(animate);

    // Handle rotation animation
    if (isRotating.value) {
      // Determine rotation direction
      const rotationDirection =
        targetRotation.value > currentRotation.value ? 1 : -1;

      // Apply rotation around Y axis (vertical axis)
      skiMesh.rotation.y += rotationSpeed * rotationDirection;
      currentRotation.value = skiMesh.rotation.y;

      // Check if we've reached the target rotation
      if (
        Math.abs(currentRotation.value - targetRotation.value) < rotationSpeed
      ) {
        skiMesh.rotation.y = targetRotation.value;
        currentRotation.value = targetRotation.value;
        isRotating.value = false;
      }
    }

    // Update controls
    controls.update();

    // Render
    renderer.render(scene, camera);
  };

  // Handle window resize
  const handleResize = () => {
    if (!skiCanvas.value) return;

    const width = skiCanvas.value.clientWidth;
    const height = skiCanvas.value.clientHeight;

    // Update camera
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(width, height);
  };

  // Lifecycle hooks
  onMounted(() => {
    initThree();
    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);

    // Stop animation loop
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    // Cleanup resources
    if (skiMesh) {
      skiMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      scene.remove(skiMesh);
    }

    // Dispose renderer
    if (renderer) {
      renderer.dispose();
    }
  });
</script>

<style scoped>
  .ski-canvas-container {
    width: 100%;
    height: 70vh;
    max-width: 1200px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }

  .ski-canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>

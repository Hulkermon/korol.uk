<template>
  <client-only>
    <div class="cia-container">
      <div class="cia-header">
        <h1>TOP SECRET: CIA HEADQUARTERS</h1>
        <p class="classified">CLASSIFIED INFORMATION</p>
      </div>
      
      <div class="scene-container" ref="sceneContainer"></div>
      
      <div class="control-panel">
        <div class="control-item">
          <span class="label">STATUS:</span>
          <span class="value">OPERATIONAL</span>
        </div>
        <div class="control-item">
          <span class="label">SECURITY LEVEL:</span>
          <span class="value">MAXIMUM</span>
        </div>
        <div class="control-item">
          <span class="label">SYSTEM:</span>
          <span class="value">THREE.JS INITIALIZED</span>
        </div>
      </div>
    </div>
  </client-only>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';

const sceneContainer = ref<HTMLElement | null>(null);
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let cube: THREE.Mesh;
let animationFrameId: number;

// Initialize the Three.js scene
const initScene = () => {
  // Create a scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  
  // Create a camera
  const container = sceneContainer.value as HTMLElement;
  const width = container.clientWidth;
  const height = container.clientHeight;
  const aspect = width / height;
  
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  camera.position.z = 5;
  
  // Create a renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);
  
  // Add a cube to the scene
  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const material = new THREE.MeshBasicMaterial({ 
    color: 0x00ff00,
    wireframe: true
  });
  
  cube = new THREE.Mesh(geometry, material);
  scene.add(cube);
  
  // Start the animation loop
  animate();
};

// Animation loop
const animate = () => {
  animationFrameId = requestAnimationFrame(animate);
  
  // Rotate the cube
  if (cube) {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
  }
  
  renderer.render(scene, camera);
};

// Handle window resize
const handleResize = () => {
  if (!sceneContainer.value || !camera || !renderer) return;
  
  const container = sceneContainer.value;
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

// Lifecycle hooks
onMounted(() => {
  if (sceneContainer.value) {
    initScene();
    window.addEventListener('resize', handleResize);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  cancelAnimationFrame(animationFrameId);
  
  // Dispose of Three.js objects to prevent memory leaks
  if (scene && cube) {
    scene.remove(cube);
    (cube.geometry as THREE.BufferGeometry).dispose();
    (cube.material as THREE.Material).dispose();
  }
  
  if (renderer) {
    renderer.dispose();
    const container = sceneContainer.value;
    if (container && renderer.domElement) {
      container.removeChild(renderer.domElement);
    }
  }
});
</script>

<style scoped>
.cia-container {
  min-height: 100vh;
  background-color: #111;
  color: #33ff33;
  font-family: 'Courier New', monospace;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.cia-header {
  text-align: center;
  margin-bottom: 20px;
  border-bottom: 2px solid #33ff33;
  padding-bottom: 10px;
}

.cia-header h1 {
  font-size: 32px;
  letter-spacing: 2px;
  margin-bottom: 10px;
  text-shadow: 0 0 5px #33ff33;
}

.classified {
  background-color: #ff0000;
  color: white;
  padding: 5px 10px;
  font-weight: bold;
  display: inline-block;
  animation: blink 2s infinite;
}

.scene-container {
  flex: 1;
  min-height: 500px;
  border: 2px solid #33ff33;
  background-color: #000;
  box-shadow: 0 0 15px rgba(51, 255, 51, 0.5);
  margin-bottom: 20px;
}

.control-panel {
  display: flex;
  justify-content: space-around;
  padding: 15px;
  border: 2px solid #33ff33;
  background-color: #111;
}

.control-item {
  text-align: center;
}

.label {
  font-weight: bold;
  margin-right: 5px;
}

.value {
  color: #ff3333;
}

@keyframes blink {
  0%, 49% {
    background-color: #ff0000;
  }
  50%, 100% {
    background-color: #990000;
  }
}
</style>
<template>
  <client-only>
    <div class="threejs-container">
      <canvas ref="threeCanvas" class="threejs-canvas"></canvas>
      
      <!-- Control panel -->
      <div class="control-panel" :class="{ 'control-panel-hidden': !showControls }">
        <div class="control-panel-header">
          <h3>SYSTEM CONTROLS</h3>
          <button @click="toggleControlPanel" class="control-toggle">
            {{ showControls ? 'HIDE' : 'SHOW' }}
          </button>
        </div>
        
        <div v-if="showControls" class="control-panel-content">
          <!-- Shape Controls -->
          <div class="control-section">
            <h4>SHAPES</h4>
            <div class="control-row">
              <label>CUBE</label>
              <input type="checkbox" v-model="controls.shapes.cube" />
            </div>
            <div class="control-row">
              <label>SPHERE</label>
              <input type="checkbox" v-model="controls.shapes.sphere" />
            </div>
            <div class="control-row">
              <label>SHAPE TYPE</label>
              <select v-model="controls.shapes.type">
                <option value="cube">CUBE</option>
                <option value="sphere">SPHERE</option>
                <option value="torus">TORUS</option>
                <option value="octahedron">OCTAHEDRON</option>
                <option value="tetrahedron">TETRAHEDRON</option>
              </select>
            </div>
          </div>
          
          <!-- Color Controls -->
          <div class="control-section">
            <h4>COLORS</h4>
            <div class="control-row">
              <label>CUBE</label>
              <input type="color" v-model="controls.colors.cube" />
            </div>
            <div class="control-row">
              <label>SPHERE</label>
              <input type="color" v-model="controls.colors.sphere" />
            </div>
            <div class="control-row">
              <label>PARTICLES</label>
              <input type="color" v-model="controls.colors.particles" />
            </div>
            <div class="control-row">
              <label>GRID</label>
              <input type="color" v-model="controls.colors.grid" />
            </div>
          </div>
          
          <!-- Size Controls -->
          <div class="control-section">
            <h4>SIZES</h4>
            <div class="control-row">
              <label>CUBE: {{ controls.sizes.cube.toFixed(1) }}</label>
              <input type="range" min="0.1" max="3" step="0.1" v-model.number="controls.sizes.cube" />
            </div>
            <div class="control-row">
              <label>SPHERE: {{ controls.sizes.sphere.toFixed(1) }}</label>
              <input type="range" min="0.5" max="5" step="0.1" v-model.number="controls.sizes.sphere" />
            </div>
            <div class="control-row">
              <label>PARTICLE SIZE: {{ controls.sizes.particles.toFixed(2) }}</label>
              <input type="range" min="0.01" max="0.2" step="0.01" v-model.number="controls.sizes.particles" />
            </div>
          </div>
          
          <!-- Animation Controls -->
          <div class="control-section">
            <h4>ANIMATION</h4>
            <div class="control-row">
              <label>ROTATION SPEED: {{ controls.animation.rotationSpeed.toFixed(2) }}</label>
              <input type="range" min="0" max="0.1" step="0.001" v-model.number="controls.animation.rotationSpeed" />
            </div>
            <div class="control-row">
              <label>CAMERA SPEED: {{ controls.animation.cameraSpeed.toFixed(2) }}</label>
              <input type="range" min="0" max="0.2" step="0.01" v-model.number="controls.animation.cameraSpeed" />
            </div>
            <div class="control-row">
              <label>PARTICLE SPEED: {{ controls.animation.particleSpeed.toFixed(2) }}</label>
              <input type="range" min="0" max="0.1" step="0.01" v-model.number="controls.animation.particleSpeed" />
            </div>
          </div>
          
          <!-- Effects Controls -->
          <div class="control-section">
            <h4>EFFECTS</h4>
            <div class="control-row">
              <label>WIREFRAME</label>
              <input type="checkbox" v-model="controls.effects.wireframe" />
            </div>
            <div class="control-row">
              <label>SCANLINES</label>
              <input type="checkbox" v-model="controls.effects.scanlines" />
            </div>
            <div class="control-row">
              <label>GRID</label>
              <input type="checkbox" v-model="controls.effects.grid" />
            </div>
            <div class="control-row">
              <label>PARTICLES</label>
              <input type="checkbox" v-model="controls.effects.particles" />
            </div>
          </div>
          
          <div class="control-buttons">
            <button @click="resetControls" class="reset-button">RESET DEFAULTS</button>
            <button @click="randomizeControls" class="random-button">RANDOMIZE</button>
          </div>
        </div>
      </div>
      
      <div class="hacker-overlay">
        <div class="console-text">
          <div class="console-header">
            TOP SECRET - CLASSIFIED NEURAL NETWORK v4.20
          </div>
          <div class="console-content" ref="consoleContent">
            [ Initialization sequence complete ]<br>
            [ Accessing secured files... ]<br>
            [ Neural network rendering in progress... ]<br>
          </div>
        </div>
        <div class="status-bar">
          <div class="status-item">STATUS: ONLINE</div>
          <div class="status-item blink">SECURE CONNECTION</div>
          <div class="status-item">NODE COUNT: {{ nodeCount }}</div>
        </div>
      </div>
    </div>
  </client-only>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, nextTick, watch, reactive } from 'vue';
import * as THREE from 'three';

// Canvas reference
const threeCanvas = ref<HTMLCanvasElement | null>(null);
const consoleContent = ref<HTMLDivElement | null>(null);

// Control panel visibility
const showControls = ref(false);
const toggleControlPanel = () => {
  showControls.value = !showControls.value;
};

// Controls state
const controls = reactive({
  shapes: {
    cube: true,
    sphere: true,
    type: 'cube'
  },
  colors: {
    cube: '#00ff00',
    sphere: '#0088ff',
    particles: '#00ffaa',
    grid: '#00ff00'
  },
  sizes: {
    cube: 1.0,
    sphere: 2.5,
    particles: 0.05
  },
  animation: {
    rotationSpeed: 0.01,
    cameraSpeed: 0.1,
    particleSpeed: 0.02
  },
  effects: {
    wireframe: true,
    scanlines: true,
    grid: true,
    particles: true
  }
});

// Reset controls to default values
const resetControls = () => {
  controls.shapes.cube = true;
  controls.shapes.sphere = true;
  controls.shapes.type = 'cube';
  controls.colors.cube = '#00ff00';
  controls.colors.sphere = '#0088ff';
  controls.colors.particles = '#00ffaa';
  controls.colors.grid = '#00ff00';
  controls.sizes.cube = 1.0;
  controls.sizes.sphere = 2.5;
  controls.sizes.particles = 0.05;
  controls.animation.rotationSpeed = 0.01;
  controls.animation.cameraSpeed = 0.1;
  controls.animation.particleSpeed = 0.02;
  controls.effects.wireframe = true;
  controls.effects.scanlines = true;
  controls.effects.grid = true;
  controls.effects.particles = true;
};

// Randomize controls
const randomizeControls = () => {
  controls.colors.cube = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
  controls.colors.sphere = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
  controls.colors.particles = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
  controls.colors.grid = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
  controls.sizes.cube = Math.random() * 2.9 + 0.1;
  controls.sizes.sphere = Math.random() * 4.5 + 0.5;
  controls.sizes.particles = Math.random() * 0.19 + 0.01;
  controls.animation.rotationSpeed = Math.random() * 0.1;
  controls.animation.cameraSpeed = Math.random() * 0.2;
  controls.animation.particleSpeed = Math.random() * 0.1;
  
  const shapeTypes = ['cube', 'sphere', 'torus', 'octahedron', 'tetrahedron'];
  controls.shapes.type = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
};

// System status variables
const nodeCount = ref(0);
let consoleLines = [
  "Initializing mainframe connection...",
  "Bypassing security protocols...",
  "Accessing classified information...",
  "Decrypting neural pathways...",
  "Rendering quantum algorithms...",
  "System breach successful...",
  "Establishing secure connection...",
  "CAUTION: Multiple traces detected...",
  "Redirecting through proxy servers...",
  "Encryption algorithms activated...",
  "Data streams analyzing...",
  "Calculating dimensional shifts...",
  "Neural patterns identified...",
  "WARNING: Unauthorized access detected!",
  "Deploying countermeasures...",
  "Trace blocked successfully...",
  "Core systems online...",
  "Scanning for intrusions...",
  "Firewall integrity: 97.3%",
  "Rendering dimensional gateway..."
];

// Three.js objects
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let cube: THREE.Mesh;
let animationFrameId: number;
let particleSystem: THREE.Points;
let gridHelper: THREE.GridHelper;
let wireframeSphere: THREE.Mesh;
let clock: THREE.Clock;
let time = 0;

// Function to create geometry based on selected type
const createGeometry = (type: string, size: number) => {
  switch (type) {
    case 'cube':
      return new THREE.BoxGeometry(size, size, size);
    case 'sphere':
      return new THREE.SphereGeometry(size * 0.5, 16, 12);
    case 'torus':
      return new THREE.TorusGeometry(size * 0.5, size * 0.2, 16, 32);
    case 'octahedron':
      return new THREE.OctahedronGeometry(size * 0.5);
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(size * 0.5);
    default:
      return new THREE.BoxGeometry(size, size, size);
  }
};

// Initialize Three.js scene
const initThree = () => {
  if (!threeCanvas.value) return;

  clock = new THREE.Clock();

  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 1, 30);

  // Camera setup
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  camera.position.z = 5;
  camera.position.y = 2;
  camera.lookAt(0, 0, 0);

  // Renderer setup
  renderer = new THREE.WebGLRenderer({
    canvas: threeCanvas.value,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Add grid - very hacker/cyberspace aesthetic
  gridHelper = new THREE.GridHelper(30, 30, new THREE.Color(controls.colors.grid), new THREE.Color(controls.colors.grid).multiplyScalar(0.3));
  gridHelper.position.y = -2;
  if (controls.effects.grid) {
    scene.add(gridHelper);
  }

  // Create a cube
  const geometry = createGeometry(controls.shapes.type, controls.sizes.cube);
  const material = new THREE.MeshBasicMaterial({ 
    color: new THREE.Color(controls.colors.cube), 
    wireframe: controls.effects.wireframe,
    transparent: true,
    opacity: 0.8
  });
  cube = new THREE.Mesh(geometry, material);
  if (controls.shapes.cube) {
    scene.add(cube);
  }
  
  // Add wireframe sphere
  const sphereGeometry = new THREE.SphereGeometry(controls.sizes.sphere, 16, 12);
  const sphereMaterial = new THREE.MeshBasicMaterial({ 
    color: new THREE.Color(controls.colors.sphere), 
    wireframe: controls.effects.wireframe,
    transparent: true,
    opacity: 0.3
  });
  wireframeSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
  if (controls.shapes.sphere) {
    scene.add(wireframeSphere);
  }

  // Add particle system for "data flow" effect
  const particleGeometry = new THREE.BufferGeometry();
  const particleCount = 1000;
  
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  
  const particleColor = new THREE.Color(controls.colors.particles);
  
  for (let i = 0; i < particleCount; i++) {
    // Position
    positions[i * 3] = (Math.random() - 0.5) * 20; // x
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20; // y
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20; // z
    
    // Color - use the particle color with slight variations
    colors[i * 3] = particleColor.r * (0.8 + Math.random() * 0.2); // r
    colors[i * 3 + 1] = particleColor.g * (0.8 + Math.random() * 0.2); // g
    colors[i * 3 + 2] = particleColor.b * (0.8 + Math.random() * 0.2); // b
  }
  
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  const particleMaterial = new THREE.PointsMaterial({
    size: controls.sizes.particles,
    vertexColors: true,
    transparent: true,
    opacity: 0.8
  });
  
  particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  if (controls.effects.particles) {
    scene.add(particleSystem);
  }

  // Start animation
  animate();
  
  // Start console text simulation
  simulateConsoleOutput();
};

// Update scene based on controls
const updateScene = () => {
  if (!scene) return;

  // Update cube
  if (cube) {
    scene.remove(cube);
    cube.geometry.dispose();
    (cube.material as THREE.Material).dispose();
    
    const geometry = createGeometry(controls.shapes.type, controls.sizes.cube);
    const material = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color(controls.colors.cube), 
      wireframe: controls.effects.wireframe,
      transparent: true,
      opacity: 0.8
    });
    cube = new THREE.Mesh(geometry, material);
    if (controls.shapes.cube) {
      scene.add(cube);
    }
  }
  
  // Update sphere
  if (wireframeSphere) {
    scene.remove(wireframeSphere);
    wireframeSphere.geometry.dispose();
    (wireframeSphere.material as THREE.Material).dispose();
    
    const sphereGeometry = new THREE.SphereGeometry(controls.sizes.sphere, 16, 12);
    const sphereMaterial = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color(controls.colors.sphere), 
      wireframe: controls.effects.wireframe,
      transparent: true,
      opacity: 0.3
    });
    wireframeSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    if (controls.shapes.sphere) {
      scene.add(wireframeSphere);
    }
  }

  // Update particles
  if (particleSystem) {
    if (controls.effects.particles) {
      scene.add(particleSystem);
      (particleSystem.material as THREE.PointsMaterial).size = controls.sizes.particles;
      
      // Update colors
      const particleColor = new THREE.Color(controls.colors.particles);
      const colors = particleSystem.geometry.attributes.color.array;
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = particleColor.r * (0.8 + Math.random() * 0.2);
        colors[i + 1] = particleColor.g * (0.8 + Math.random() * 0.2);
        colors[i + 2] = particleColor.b * (0.8 + Math.random() * 0.2);
      }
      particleSystem.geometry.attributes.color.needsUpdate = true;
    } else {
      scene.remove(particleSystem);
    }
  }
  
  // Update grid
  if (gridHelper) {
    scene.remove(gridHelper);
    gridHelper = new THREE.GridHelper(
      30, 
      30, 
      new THREE.Color(controls.colors.grid), 
      new THREE.Color(controls.colors.grid).multiplyScalar(0.3)
    );
    gridHelper.position.y = -2;
    if (controls.effects.grid) {
      scene.add(gridHelper);
    }
  }
};

// Animation loop
const animate = () => {
  animationFrameId = requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  time += delta;

  // Rotate the cube
  if (cube && controls.shapes.cube) {
    cube.rotation.x += controls.animation.rotationSpeed;
    cube.rotation.y += controls.animation.rotationSpeed;
  }
  
  // Rotate the wireframe sphere in the opposite direction
  if (wireframeSphere && controls.shapes.sphere) {
    wireframeSphere.rotation.x -= controls.animation.rotationSpeed * 0.5;
    wireframeSphere.rotation.y -= controls.animation.rotationSpeed * 0.5;
    wireframeSphere.rotation.z += controls.animation.rotationSpeed * 0.5;
    
    // Pulsate the sphere
    const scale = 1 + 0.05 * Math.sin(time * 2);
    wireframeSphere.scale.set(scale, scale, scale);
  }
  
  // Animate particles
  if (particleSystem && particleSystem.geometry instanceof THREE.BufferGeometry && controls.effects.particles) {
    const positions = particleSystem.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      // Move particles downward slowly (like Matrix code)
      positions[i + 1] -= controls.animation.particleSpeed;
      
      // If a particle goes too far down, reset it to the top
      if (positions[i + 1] < -10) {
        positions[i + 1] = 10;
        positions[i] = (Math.random() - 0.5) * 20;
        positions[i + 2] = (Math.random() - 0.5) * 20;
      }
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
  }

  // Slowly rotate the camera around the scene
  const cameraRadius = 7;
  camera.position.x = Math.sin(time * controls.animation.cameraSpeed) * cameraRadius;
  camera.position.z = Math.cos(time * controls.animation.cameraSpeed) * cameraRadius;
  camera.position.y = 2 + Math.sin(time * 0.5) * 0.5;
  camera.lookAt(0, 0, 0);
  
  // Occasionally update the node count
  if (Math.random() < 0.01) {
    nodeCount.value = Math.floor(1000 + Math.random() * 9000);
  }
  
  // Render
  renderer.render(scene, camera);
};

// Handle window resize
const handleResize = () => {
  if (!threeCanvas.value) return;
  
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  // Update camera
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  
  // Update renderer
  renderer.setSize(width, height);
};

// Simulate hacker console output
const simulateConsoleOutput = () => {
  if (!consoleContent.value) return;
  
  let lineIndex = 0;
  const addLine = () => {
    if (!consoleContent.value) return;
    
    const line = consoleLines[lineIndex % consoleLines.length];
    const element = document.createElement('div');
    element.className = 'console-line';
    element.innerHTML = `> ${line}`;
    
    consoleContent.value.appendChild(element);
    consoleContent.value.scrollTop = consoleContent.value.scrollHeight;
    
    // Remove earlier lines if too many
    if (consoleContent.value.children.length > 15) {
      consoleContent.value.removeChild(consoleContent.value.children[0]);
    }
    
    lineIndex++;
    
    // Random delay for next line
    const nextDelay = 1000 + Math.random() * 2000;
    setTimeout(addLine, nextDelay);
  };
  
  // Start after a short delay
  setTimeout(addLine, 800);
};

// Watch for control changes
watch(controls, updateScene, { deep: true });

// Lifecycle hooks
onMounted(() => {
  nextTick(() => {
    initThree();
    window.addEventListener('resize', handleResize);
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  
  // Stop animation loop
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  
  // Dispose resources
  if (cube) {
    cube.geometry.dispose();
    (cube.material as THREE.Material).dispose();
    scene.remove(cube);
  }
  
  if (wireframeSphere) {
    wireframeSphere.geometry.dispose();
    (wireframeSphere.material as THREE.Material).dispose();
    scene.remove(wireframeSphere);
  }
  
  if (particleSystem) {
    particleSystem.geometry.dispose();
    (particleSystem.material as THREE.Material).dispose();
    scene.remove(particleSystem);
  }
  
  // Clean up renderer
  if (renderer) {
    renderer.dispose();
  }
});
</script>

<style scoped>
.threejs-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #000000;
  position: relative;
}

.threejs-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 300px;
  background-color: rgba(0, 20, 0, 0.85);
  border: 1px solid #00ff00;
  border-radius: 5px;
  color: #00ff00;
  font-family: 'Courier New', monospace;
  z-index: 10;
  pointer-events: all;
  transition: height 0.3s ease-out, opacity 0.3s ease-out;
  text-shadow: 0 0 5px #00ff00;
  max-height: 90vh;
  overflow-y: auto;
}

.control-panel-hidden {
  height: 40px;
  overflow: hidden;
}

.control-panel-header {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: rgba(0, 50, 0, 0.6);
  border-bottom: 1px solid #00ff00;
  cursor: pointer;
}

.control-panel-header h3 {
  margin: 0;
  font-size: 16px;
}

.control-panel-content {
  padding: 10px;
  max-height: 80vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #00ff00 #001100;
}

.control-panel-content::-webkit-scrollbar {
  width: 5px;
}

.control-panel-content::-webkit-scrollbar-track {
  background: #001100; 
}
 
.control-panel-content::-webkit-scrollbar-thumb {
  background-color: #00ff00;
}

.control-section {
  margin-bottom: 15px;
  border-bottom: 1px dotted rgba(0, 255, 0, 0.3);
  padding-bottom: 10px;
}

.control-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #00aaff;
}

.control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  font-size: 12px;
}

.control-row label {
  flex: 1;
}

.control-row input[type="range"] {
  width: 130px;
  background-color: #001100;
  appearance: none;
  height: 5px;
  outline: none;
  border-radius: 3px;
}

.control-row input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 10px;
  height: 15px;
  background: #00ff00;
  cursor: pointer;
  border-radius: 1px;
}

.control-row input[type="color"] {
  width: 30px;
  height: 20px;
  border: 1px solid #00ff00;
  background: none;
  cursor: pointer;
}

.control-row input[type="checkbox"] {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 1px solid #00ff00;
  background-color: transparent;
  display: grid;
  place-content: center;
  cursor: pointer;
}

.control-row input[type="checkbox"]::before {
  content: "";
  width: 12px;
  height: 12px;
  transform: scale(0);
  transition: 120ms transform ease-in-out;
  box-shadow: inset 1em 1em #00ff00;
  background-color: #00ff00;
}

.control-row input[type="checkbox"]:checked::before {
  transform: scale(1);
}

.control-row select {
  background: #001100;
  color: #00ff00;
  border: 1px solid #00ff00;
  padding: 3px;
  font-family: 'Courier New', monospace;
  width: 130px;
  cursor: pointer;
}

.control-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
}

.control-buttons button {
  background-color: #001100;
  border: 1px solid #00ff00;
  color: #00ff00;
  padding: 5px 10px;
  font-family: 'Courier New', monospace;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 12px;
}

.control-buttons button:hover {
  background-color: #002200;
}

.reset-button {
  background-color: #100000 !important;
  border-color: #ff3000 !important;
  color: #ff3000 !important;
}

.random-button {
  background-color: #001030 !important;
  border-color: #00aaff !important;
  color: #00aaff !important;
}

.control-toggle {
  background: none;
  border: 1px solid #00ff00;
  color: #00ff00;
  padding: 0px 8px;
  font-size: 12px;
  cursor: pointer;
}

.hacker-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  font-family: 'Courier New', monospace;
  color: #00ff00;
  padding: 20px;
  box-sizing: border-box;
  text-shadow: 0 0 5px #00ff00;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.console-text {
  background-color: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border: 1px solid #00ff00;
  border-radius: 5px;
  max-width: 600px;
  max-height: 40vh;
  overflow: hidden;
}

.console-header {
  color: #ff0000;
  border-bottom: 1px solid #00ff00;
  padding-bottom: 5px;
  margin-bottom: 10px;
  font-weight: bold;
}

.console-content {
  font-size: 12px;
  line-height: 1.3;
  max-height: calc(40vh - 40px);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #00ff00 #000;
}

.console-content::-webkit-scrollbar {
  width: 5px;
}

.console-content::-webkit-scrollbar-track {
  background: #000; 
}
 
.console-content::-webkit-scrollbar-thumb {
  background-color: #00ff00;
}

.console-line {
  animation: fadeIn 0.3s ease-in;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  background-color: rgba(0, 0, 0, 0.7);
  border: 1px solid #00ff00;
  padding: 5px 15px;
  font-size: 12px;
  border-radius: 5px;
}

.blink {
  animation: blink 1s infinite;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Scanline effect - can be toggled */
.threejs-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: v-bind('controls.effects.scanlines ? "repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.15) 1px, transparent 1px, transparent 2px)" : "none"');
  pointer-events: none;
}

/* Screen flicker */
.threejs-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 255, 0, 0.02);
  opacity: 0;
  pointer-events: none;
  animation: flicker 0.3s infinite alternate-reverse;
}

@keyframes flicker {
  0%, 95% { opacity: 0; }
  100% { opacity: 1; }
}
</style>
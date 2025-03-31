/**
 * Composable for handling Three.js setup and management for the ski visualizer
 */
import { ref, shallowRef, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { TrickRotation } from './useTrickParser';

export interface ThreeJsContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  skiMesh: THREE.Group;
  animationFrameId: number | null;
}

/**
 * Hook for setting up and managing Three.js scene for ski visualization
 */
export function useThreeJsSetup(canvasRef: any) {
  // Three.js objects - use shallowRef to prevent Vue from making Three.js objects reactive
  const context = shallowRef<ThreeJsContext | null>(null);
  const isInitialized = ref(false);

  // Store a raw reference to the context that isn't wrapped in Vue's reactivity system
  let contextRaw: ThreeJsContext | null = null;

  /**
   * Initialize Three.js scene
   */
  const initialize = () => {
    if (!canvasRef.value || isInitialized.value) return;

    const canvas = canvasRef.value as HTMLCanvasElement;
    
    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    // Camera setup
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(0, 2, -5);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Create ski group
    const skiMesh = new THREE.Group();
    scene.add(skiMesh);

    // Create context
    contextRaw = {
      scene,
      camera,
      renderer,
      controls,
      skiMesh,
      animationFrameId: null
    };

    // Store the raw object in the shallowRef
    context.value = contextRaw;

    isInitialized.value = true;
    return contextRaw;
  };

  /**
   * Create a pair of skis using box geometry
   */
  const createSkis = () => {
    if (!contextRaw) return;

    const { scene, skiMesh } = contextRaw;

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
      skiWidth,
      skiHeight,
      skiLength
    );
    const leftSki = new THREE.Mesh(leftSkiGeometry, skiMaterial);
    leftSki.position.x = -skiWidth; // Offset to the left
    leftSki.castShadow = true;

    // Create right ski
    const rightSkiGeometry = new THREE.BoxGeometry(
      skiWidth,
      skiHeight,
      skiLength
    );
    const rightSki = new THREE.Mesh(rightSkiGeometry, skiMaterial);
    rightSki.position.x = skiWidth; // Offset to the right
    rightSki.castShadow = true;

    // Add both skis to the group
    skiMesh.add(leftSki);
    skiMesh.add(rightSki);

    // Position the group in the scene
    skiMesh.position.y = 0.1; // Slightly above the ground
  };

  /**
   * Add lights to the scene
   */
  const addLights = () => {
    if (!contextRaw) return;
    
    const { scene } = contextRaw;

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

  /**
   * Add ground plane
   */
  const addGround = () => {
    if (!contextRaw) return;
    
    const { scene } = contextRaw;

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

  /**
   * Animate the scene
   */
  const startAnimationLoop = (animateCallback?: (ctx: ThreeJsContext) => void) => {
    if (!contextRaw) return;
    
    const { renderer, scene, camera, controls } = contextRaw;

    const animate = () => {
      if (!contextRaw) return;
      
      const animFrameId = requestAnimationFrame(animate);
      if (contextRaw) {
        contextRaw.animationFrameId = animFrameId;
        // Update context.value only with the animationFrameId
        if (context.value) {
          context.value.animationFrameId = animFrameId;
        }
      }
      
      // Execute custom animation callback if provided
      if (animateCallback && contextRaw) {
        animateCallback(contextRaw);
      }

      // Update controls
      controls.update();

      // Render
      renderer.render(scene, camera);
    };

    animate();
  };

  /**
   * Handle window resize
   */
  const handleResize = () => {
    if (!contextRaw || !canvasRef.value) return;
    
    const { camera, renderer } = contextRaw;
    const canvas = canvasRef.value as HTMLCanvasElement;
    
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Update camera
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(width, height);
  };

  /**
   * Setup everything and start rendering
   */
  const setupAndRender = (animateCallback?: (ctx: ThreeJsContext) => void) => {
    initialize();
    
    if (contextRaw) {
      createSkis();
      addLights();
      addGround();
      startAnimationLoop(animateCallback);
    }
  };

  /**
   * Cleanup Three.js resources
   */
  const cleanup = () => {
    if (!contextRaw) return;

    const { animationFrameId, skiMesh, scene, renderer } = contextRaw;

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

    context.value = null;
    contextRaw = null;
    isInitialized.value = false;
  };

  return {
    context,
    initialize,
    createSkis,
    addLights,
    addGround,
    startAnimationLoop,
    handleResize,
    setupAndRender,
    cleanup
  };
}
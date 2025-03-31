/**
 * Composable for handling Three.js setup and management for the ski visualizer
 */
import { ref, shallowRef } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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

  // Helper function to execute code only if context exists
  const withContext = (fn: (ctx: ThreeJsContext) => void) => {
    if (contextRaw) fn(contextRaw);
  };

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
      animationFrameId: null,
    };

    // Store the raw object in the shallowRef
    context.value = contextRaw;

    isInitialized.value = true;
    return contextRaw;
  };

  /**
   * Set up scene with ground, lights and skis
   */
  const setupScene = () => {
    withContext((ctx) => {
      const { scene, skiMesh } = ctx;

      // Add ground
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      // Add lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.5));

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 10, 7.5);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      scene.add(directionalLight);

      // Create skis
      const skiMaterial = new THREE.MeshStandardMaterial({
        color: 0x3366cc,
        roughness: 0.3,
        metalness: 0.7,
      });

      // Create ski geometry once and reuse
      const skiGeometry = new THREE.BoxGeometry(0.1, 0.02, 1.8);

      const leftSki = new THREE.Mesh(skiGeometry, skiMaterial);
      leftSki.position.x = -0.1;
      leftSki.castShadow = true;

      const rightSki = new THREE.Mesh(skiGeometry, skiMaterial);
      rightSki.position.x = 0.1;
      rightSki.castShadow = true;

      skiMesh.add(leftSki, rightSki);
      skiMesh.position.y = 0.1;
    });
  };

  /**
   * Animate the scene
   */
  const startAnimationLoop = (
    animateCallback?: (ctx: ThreeJsContext) => void
  ) => {
    if (!contextRaw) return;

    const animate = () => {
      if (!contextRaw) return;

      contextRaw.animationFrameId = requestAnimationFrame(animate);

      // Update reactive context
      if (context.value) {
        context.value.animationFrameId = contextRaw.animationFrameId;
      }

      // Execute custom animation callback if provided
      if (animateCallback) {
        animateCallback(contextRaw);
      }

      // Update controls and render
      contextRaw.controls.update();
      contextRaw.renderer.render(contextRaw.scene, contextRaw.camera);
    };

    animate();
  };

  /**
   * Handle window resize
   */
  const handleResize = () => {
    withContext((ctx) => {
      if (!canvasRef.value) return;

      const canvas = canvasRef.value as HTMLCanvasElement;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      // Update camera
      ctx.camera.aspect = width / height;
      ctx.camera.updateProjectionMatrix();

      // Update renderer
      ctx.renderer.setSize(width, height);
    });
  };

  /**
   * Setup everything and start rendering
   */
  const setupAndRender = (animateCallback?: (ctx: ThreeJsContext) => void) => {
    if (initialize()) {
      setupScene();
      startAnimationLoop(animateCallback);
    }
  };

  /**
   * Cleanup Three.js resources
   */
  const cleanup = () => {
    withContext((ctx) => {
      // Stop animation loop
      if (ctx.animationFrameId) {
        cancelAnimationFrame(ctx.animationFrameId);
      }

      // Cleanup resources
      if (ctx.skiMesh) {
        ctx.skiMesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            }
          }
        });
        ctx.scene.remove(ctx.skiMesh);
      }

      // Dispose renderer
      ctx.renderer.dispose();

      context.value = null;
      contextRaw = null;
      isInitialized.value = false;
    });
  };

  return {
    context,
    initialize,
    setupScene,
    startAnimationLoop,
    handleResize,
    setupAndRender,
    cleanup,
  };
}

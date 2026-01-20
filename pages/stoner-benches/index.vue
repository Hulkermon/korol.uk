<template>
  <div class="stoner-benches-container">
    <div class="header">
      <h1>🌿 STONER BENCHES 🌿</h1>
      <p class="subtitle">Find your spot in the digital wilderness</p>
    </div>

    <div class="controls">
      <div class="seed-display">
        <span class="label">Current Seed:</span>
        <span class="seed-value">{{ currentSeed }}</span>
      </div>
      <button class="refresh-btn" @click="refreshMap">🔄 Refresh Map</button>
    </div>

    <div class="canvas-wrapper">
      <canvas
        ref="canvasRef"
        class="map-canvas"
        :width="canvasWidth"
        :height="canvasHeight"
        @click="handleCanvasClick"
        @mousemove="handleCanvasHover"
        @mouseleave="hideTooltip"></canvas>
      <!-- Bench markers overlay -->
      <div class="bench-markers">
        <div
          v-for="bench in benches"
          :key="bench.id"
          class="bench-marker"
          :style="{ left: `${bench.x}px`, top: `${bench.y}px` }"
          @mouseenter="showBenchTooltip(bench, $event)"
          @mouseleave="hideTooltip"
          @click.stop="showBenchDetails(bench)">
          🪑
        </div>
      </div>
      <!-- Tooltip -->
      <div v-if="tooltipVisible" class="bench-tooltip" :style="tooltipPosition">
        <div class="tooltip-title">{{ tooltipBench?.title }}</div>
        <div class="tooltip-author">by {{ tooltipBench?.author_name }}</div>
        <div class="tooltip-hint">Click for details</div>
      </div>
    </div>

    <div class="footer-info">
      <p>Click anywhere on the map to place a bench</p>
      <p v-if="benches.length > 0" class="bench-count">
        🪑 {{ benches.length }} bench{{ benches.length === 1 ? '' : 'es' }} on this map
      </p>
    </div>

    <!-- Bench Details Modal -->
    <div v-if="showDetailsModal" class="modal-overlay" @click.self="closeDetailsModal">
      <div class="modal details-modal">
        <div class="modal-header">
          <h2>🪑 {{ selectedBench?.title }}</h2>
          <button class="close-btn" @click="closeDetailsModal">×</button>
        </div>
        <div class="bench-details">
          <p class="detail-description">{{ selectedBench?.description }}</p>
          <p class="detail-author">— {{ selectedBench?.author_name }}</p>
          <p class="detail-date">Placed on {{ formatDate(selectedBench?.created_at) }}</p>
        </div>
      </div>
    </div>

    <!-- Bench Placement Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal" :style="modalPosition">
        <div class="modal-header">
          <h2>🪑 Place a Bench</h2>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <form @submit.prevent="submitBench">
          <div class="form-group">
            <label for="authorName">Your Name *</label>
            <input
              id="authorName"
              v-model="benchForm.authorName"
              type="text"
              required
              placeholder="Anonymous Stoner" />
          </div>
          <div class="form-group">
            <label for="title">Bench Title *</label>
            <input
              id="title"
              v-model="benchForm.title"
              type="text"
              required
              placeholder="A chill spot" />
          </div>
          <div class="form-group">
            <label for="description">Message *</label>
            <textarea
              id="description"
              v-model="benchForm.description"
              required
              rows="3"
              placeholder="Leave your thoughts..."></textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="cancel-btn" @click="closeModal">Cancel</button>
            <button type="submit" class="submit-btn" :disabled="isSubmitting">
              {{ isSubmitting ? 'Placing...' : 'Place Bench' }}
            </button>
          </div>
          <p v-if="submitMessage" class="submit-message" :class="{ error: submitError }">
            {{ submitMessage }}
          </p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  interface Bench {
    id: number;
    x: number;
    y: number;
    title: string;
    description: string;
    author_name: string;
    created_at: string;
  }

  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const canvasWidth = 800;
  const canvasHeight = 600;
  const tileSize = 8;

  const currentSeed = ref(generateRandomSeed());

  // Benches state
  const benches = ref<Bench[]>([]);

  // Tooltip state
  const tooltipVisible = ref(false);
  const tooltipBench = ref<Bench | null>(null);
  const tooltipPosition = ref({ left: '0px', top: '0px' });

  // Bench details modal state
  const showDetailsModal = ref(false);
  const selectedBench = ref<Bench | null>(null);

  // Modal state
  const showModal = ref(false);
  const clickCoords = ref({ x: 0, y: 0 });
  const modalPosition = ref({ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' });

  // Form state
  const benchForm = ref({
    authorName: '',
    title: '',
    description: '',
  });
  const isSubmitting = ref(false);
  const submitMessage = ref('');
  const submitError = ref(false);

  async function fetchBenches() {
    try {
      const response = await $fetch<{ benches: Bench[] }>('/api/stoner-benches/benches', {
        query: { seedValue: currentSeed.value },
      });
      benches.value = response.benches || [];
    } catch (error) {
      console.error('Error fetching benches:', error);
      benches.value = [];
    }
  }

  function showBenchTooltip(bench: Bench, event: MouseEvent) {
    tooltipBench.value = bench;
    tooltipPosition.value = {
      left: `${bench.x + 20}px`,
      top: `${bench.y - 10}px`,
    };
    tooltipVisible.value = true;
  }

  function hideTooltip() {
    tooltipVisible.value = false;
  }

  function handleCanvasHover() {
    // Canvas hover is handled by bench markers
  }

  function showBenchDetails(bench: Bench) {
    selectedBench.value = bench;
    showDetailsModal.value = true;
  }

  function closeDetailsModal() {
    showDetailsModal.value = false;
    selectedBench.value = null;
  }

  function formatDate(dateString: string | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function handleCanvasClick(event: MouseEvent) {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(event.clientX - rect.left);
    const y = Math.floor(event.clientY - rect.top);

    clickCoords.value = { x, y };

    // Position modal near click but ensure it stays on screen
    const modalWidth = 320;
    const modalHeight = 350;
    let modalX = event.clientX + 20;
    let modalY = event.clientY - modalHeight / 2;

    // Keep modal within viewport
    if (modalX + modalWidth > window.innerWidth) {
      modalX = event.clientX - modalWidth - 20;
    }
    if (modalY < 10) modalY = 10;
    if (modalY + modalHeight > window.innerHeight - 10) {
      modalY = window.innerHeight - modalHeight - 10;
    }

    modalPosition.value = {
      left: `${modalX}px`,
      top: `${modalY}px`,
      transform: 'none',
    };

    showModal.value = true;
    submitMessage.value = '';
    submitError.value = false;
  }

  function closeModal() {
    showModal.value = false;
    benchForm.value = { authorName: '', title: '', description: '' };
    submitMessage.value = '';
    submitError.value = false;
  }

  async function submitBench() {
    if (isSubmitting.value) return;

    isSubmitting.value = true;
    submitMessage.value = '';
    submitError.value = false;

    try {
      await $fetch('/api/stoner-benches/benches', {
        method: 'POST',
        body: {
          seedValue: currentSeed.value,
          x: clickCoords.value.x,
          y: clickCoords.value.y,
          title: benchForm.value.title,
          description: benchForm.value.description,
          authorName: benchForm.value.authorName,
        },
      });

      submitMessage.value = 'Bench placed successfully! 🪑';
      await fetchBenches();
      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (error) {
      console.error('Error placing bench:', error);
      submitMessage.value = 'Failed to place bench. Please try again.';
      submitError.value = true;
    } finally {
      isSubmitting.value = false;
    }
  }

  function getLastSeed(): string {
    // TODO
  }

  function generateRandomSeed(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  function refreshMap() {
    currentSeed.value = generateRandomSeed();
  }

  function seededRandom(seed: string): () => number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return function () {
      hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
      hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
      hash = hash ^ (hash >>> 16);
      return (hash >>> 0) / 0xffffffff;
    };
  }

  const terrainColors = [
    '#0a1628', // Deep water
    '#0d2847', // Water
    '#1a4d2e', // Dark grass
    '#2d5a27', // Grass
    '#3d6b33', // Light grass
    '#5c4a1f', // Dirt
    '#7a6b3a', // Sand
    '#4a4a4a', // Stone
    '#6b5b47', // Mountain base
    '#8b7355', // Mountain
  ];

  function generateNoiseGrid(seed: string, cols: number, rows: number): number[][] {
    const random = seededRandom(seed);
    const grid: number[][] = [];

    for (let y = 0; y < rows; y++) {
      grid[y] = [];
      for (let x = 0; x < cols; x++) {
        grid[y][x] = random() < 0.45 ? 1 : 0;
      }
    }

    return grid;
  }

  function runCellularAutomata(grid: number[][], iterations: number): number[][] {
    const rows = grid.length;
    const cols = grid[0].length;
    let currentGrid = grid.map((row) => [...row]);

    for (let i = 0; i < iterations; i++) {
      const newGrid: number[][] = [];

      for (let y = 0; y < rows; y++) {
        newGrid[y] = [];
        for (let x = 0; x < cols; x++) {
          let neighbors = 0;

          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const ny = y + dy;
              const nx = x + dx;

              if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
                neighbors += currentGrid[ny][nx];
              } else {
                neighbors += 1;
              }
            }
          }

          if (currentGrid[y][x] === 1) {
            newGrid[y][x] = neighbors >= 4 ? 1 : 0;
          } else {
            newGrid[y][x] = neighbors >= 5 ? 1 : 0;
          }
        }
      }

      currentGrid = newGrid;
    }

    return currentGrid;
  }

  function generateTerrainFromGrid(baseGrid: number[][], seed: string): number[][] {
    const rows = baseGrid.length;
    const cols = baseGrid[0].length;
    const random = seededRandom(seed + '_terrain');
    const terrain: number[][] = [];

    for (let y = 0; y < rows; y++) {
      terrain[y] = [];
      for (let x = 0; x < cols; x++) {
        if (baseGrid[y][x] === 0) {
          const waterDepth = random();
          terrain[y][x] = waterDepth < 0.4 ? 0 : 1;
        } else {
          const landType = random();
          if (landType < 0.4) {
            terrain[y][x] = 2 + Math.floor(random() * 3);
          } else if (landType < 0.6) {
            terrain[y][x] = 5 + Math.floor(random() * 2);
          } else if (landType < 0.85) {
            terrain[y][x] = 7;
          } else {
            terrain[y][x] = 8 + Math.floor(random() * 2);
          }
        }
      }
    }

    return terrain;
  }

  function drawMap(seed: string) {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cols = Math.floor(canvasWidth / tileSize);
    const rows = Math.floor(canvasHeight / tileSize);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const noiseGrid = generateNoiseGrid(seed, cols, rows);
    const smoothedGrid = runCellularAutomata(noiseGrid, 5);
    const terrainGrid = generateTerrainFromGrid(smoothedGrid, seed);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const terrainType = terrainGrid[y][x];
        ctx.fillStyle = terrainColors[terrainType];
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * tileSize);
      ctx.lineTo(canvasWidth, y * tileSize);
      ctx.stroke();
    }
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * tileSize, 0);
      ctx.lineTo(x * tileSize, canvasHeight);
      ctx.stroke();
    }
  }

  onMounted(() => {
    drawMap(currentSeed.value);
    fetchBenches();
  });

  watch(currentSeed, (newSeed) => {
    drawMap(newSeed);
    fetchBenches();
  });
</script>

<style scoped>
  .stoner-benches-container {
    min-height: 100vh;
    background: linear-gradient(135deg, #1a0a2e 0%, #0d1b0d 50%, #1a2a1a 100%);
    padding: 20px;
    font-family: 'Courier New', monospace;
    color: #90ee90;
  }

  .header {
    text-align: center;
    margin-bottom: 20px;
  }

  .header h1 {
    font-size: 48px;
    color: #90ee90;
    text-shadow:
      0 0 10px #228b22,
      0 0 20px #228b22;
    margin: 0;
    letter-spacing: 4px;
  }

  .subtitle {
    font-size: 16px;
    color: #6b8e23;
    margin-top: 8px;
  }

  .controls {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-bottom: 20px;
  }

  .seed-display {
    background: rgba(0, 0, 0, 0.5);
    padding: 10px 20px;
    border: 2px solid #228b22;
    border-radius: 4px;
  }

  .label {
    color: #6b8e23;
    margin-right: 10px;
  }

  .seed-value {
    color: #90ee90;
    font-weight: bold;
  }

  .refresh-btn {
    background: rgba(34, 139, 34, 0.3);
    border: 2px solid #228b22;
    border-radius: 4px;
    padding: 10px 20px;
    color: #90ee90;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .refresh-btn:hover {
    background: #228b22;
    color: #fff;
    box-shadow: 0 0 10px rgba(34, 139, 34, 0.6);
  }

  .canvas-wrapper {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
    position: relative;
  }

  .map-canvas {
    border: 4px solid #228b22;
    box-shadow: 0 0 20px rgba(34, 139, 34, 0.5);
    cursor: crosshair;
    image-rendering: pixelated;
  }

  .bench-markers {
    position: absolute;
    top: 4px;
    left: 50%;
    transform: translateX(-50%);
    width: 800px;
    height: 600px;
    pointer-events: none;
  }

  .bench-marker {
    position: absolute;
    transform: translate(-50%, -50%);
    font-size: 16px;
    cursor: pointer;
    pointer-events: auto;
    filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.8));
    transition:
      transform 0.2s,
      filter 0.2s;
    z-index: 10;
  }

  .bench-marker:hover {
    transform: translate(-50%, -50%) scale(1.3);
    filter: drop-shadow(0 0 8px rgba(255, 255, 255, 1));
  }

  .bench-tooltip {
    position: absolute;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #228b22;
    border-radius: 4px;
    padding: 8px 12px;
    pointer-events: none;
    z-index: 20;
    max-width: 200px;
  }

  .tooltip-title {
    color: #90ee90;
    font-weight: bold;
    font-size: 14px;
    margin-bottom: 4px;
  }

  .tooltip-author {
    color: #6b8e23;
    font-size: 12px;
  }

  .tooltip-hint {
    color: #4a6b4a;
    font-size: 10px;
    margin-top: 6px;
    font-style: italic;
  }

  .footer-info {
    text-align: center;
    color: #6b8e23;
    font-size: 14px;
  }

  .bench-count {
    margin-top: 8px;
    color: #90ee90;
  }

  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 1000;
  }

  .modal {
    position: fixed;
    background: linear-gradient(135deg, #1a2a1a 0%, #0d1b0d 100%);
    border: 3px solid #228b22;
    border-radius: 8px;
    padding: 20px;
    width: 320px;
    box-shadow: 0 0 30px rgba(34, 139, 34, 0.6);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid #228b22;
    padding-bottom: 12px;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 20px;
    color: #90ee90;
  }

  .close-btn {
    background: none;
    border: none;
    color: #90ee90;
    font-size: 28px;
    cursor: pointer;
    line-height: 1;
    padding: 0;
  }

  .close-btn:hover {
    color: #fff;
  }

  .form-group {
    margin-bottom: 14px;
  }

  .form-group label {
    display: block;
    color: #6b8e23;
    font-size: 14px;
    margin-bottom: 6px;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 10px;
    background: rgba(0, 0, 0, 0.5);
    border: 2px solid #228b22;
    border-radius: 4px;
    color: #90ee90;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    box-sizing: border-box;
  }

  .form-group input::placeholder,
  .form-group textarea::placeholder {
    color: #4a6b4a;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #90ee90;
    box-shadow: 0 0 8px rgba(144, 238, 144, 0.4);
  }

  .form-actions {
    display: flex;
    gap: 10px;
    margin-top: 16px;
  }

  .cancel-btn,
  .submit-btn {
    flex: 1;
    padding: 10px 16px;
    border: 2px solid #228b22;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-btn {
    background: transparent;
    color: #90ee90;
  }

  .cancel-btn:hover {
    background: rgba(34, 139, 34, 0.2);
  }

  .submit-btn {
    background: #228b22;
    color: #fff;
  }

  .submit-btn:hover:not(:disabled) {
    background: #2d9d2d;
    box-shadow: 0 0 10px rgba(34, 139, 34, 0.6);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .submit-message {
    margin-top: 12px;
    padding: 8px;
    text-align: center;
    font-size: 14px;
    color: #90ee90;
    background: rgba(34, 139, 34, 0.2);
    border-radius: 4px;
  }

  .submit-message.error {
    color: #ff6b6b;
    background: rgba(255, 107, 107, 0.1);
  }

  /* Bench Details Modal */
  .details-modal {
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .bench-details {
    padding: 10px 0;
  }

  .detail-description {
    color: #90ee90;
    font-size: 16px;
    line-height: 1.5;
    margin-bottom: 16px;
    white-space: pre-wrap;
  }

  .detail-author {
    color: #6b8e23;
    font-style: italic;
    font-size: 14px;
    margin-bottom: 8px;
  }

  .detail-date {
    color: #4a6b4a;
    font-size: 12px;
  }
</style>

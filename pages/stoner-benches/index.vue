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
    </div>

    <div class="canvas-wrapper">
      <canvas ref="canvasRef" class="map-canvas" :width="canvasWidth" :height="canvasHeight"></canvas>
    </div>

    <div class="footer-info">
      <p>Click anywhere on the map to place a bench</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const canvasRef = ref<HTMLCanvasElement | null>(null);
const canvasWidth = 800;
const canvasHeight = 600;
const tileSize = 8;

const currentSeed = ref(generateRandomSeed());

function generateRandomSeed(): string {
  return Math.random().toString(36).substring(2, 15);
}

function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return function() {
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
  let currentGrid = grid.map(row => [...row]);
  
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
});

watch(currentSeed, (newSeed) => {
  drawMap(newSeed);
});
</script>

<style scoped>
.stoner-benches-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a0a2e 0%, #0d1b0d 50%, #1a2a1a 100%);
  padding: 20px;
  font-family: 'Courier New', monospace;
  color: #90EE90;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.header h1 {
  font-size: 48px;
  color: #90EE90;
  text-shadow: 0 0 10px #228B22, 0 0 20px #228B22;
  margin: 0;
  letter-spacing: 4px;
}

.subtitle {
  font-size: 16px;
  color: #6B8E23;
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
  border: 2px solid #228B22;
  border-radius: 4px;
}

.label {
  color: #6B8E23;
  margin-right: 10px;
}

.seed-value {
  color: #90EE90;
  font-weight: bold;
}

.canvas-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.map-canvas {
  border: 4px solid #228B22;
  box-shadow: 0 0 20px rgba(34, 139, 34, 0.5);
  cursor: crosshair;
  image-rendering: pixelated;
}

.footer-info {
  text-align: center;
  color: #6B8E23;
  font-size: 14px;
}
</style>

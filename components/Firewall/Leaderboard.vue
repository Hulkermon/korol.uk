<script setup lang="ts">
  import type { ScoreEntry } from '@/composables/firewall/engine/types';
  import Win98Window from './Win98Window.vue';

  defineProps<{
    entries: ScoreEntry[];
    loading: boolean;
    error: string | null;
    highlightId: number | null;
  }>();

  const emit = defineEmits<{ refresh: [] }>();
</script>

<template>
  <Win98Window title="HALL_OF_FAME.TXT" icon="&#9733;">
    <div class="fw-lb">
      <div v-if="loading && !entries.length" class="fw-lb-line" data-testid="loading">Loading...</div>
      <div v-else-if="error" class="fw-lb-line" data-testid="error">
        {{ error }}
        <button class="fw-lb-btn" data-testid="retry" @click="emit('refresh')">RETRY</button>
      </div>
      <div v-else-if="entries.length === 0" class="fw-lb-line" data-testid="empty">
        No hackers yet. Be the first!
      </div>
      <table v-else class="fw-lb-table" data-testid="table">
        <thead>
          <tr>
            <th>#</th>
            <th>HANDLE</th>
            <th>SCORE</th>
            <th>WAVE</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(e, i) in entries"
            :key="e.id"
            :class="{ 'fw-lb-hl': e.id === highlightId }"
            data-testid="row"
            :data-highlight="e.id === highlightId ? 'true' : 'false'">
            <td>{{ i + 1 }}</td>
            <td class="fw-lb-name">{{ e.name }}</td>
            <td>{{ e.score }}</td>
            <td>{{ e.wave }}/20</td>
            <td>
              <span v-if="e.won" data-testid="trophy" title="Won">&#127942;</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Win98Window>
</template>

<style scoped>
  .fw-lb {
    background: #000;
    color: #00ff66;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    padding: 6px;
    min-height: 60px;
    border: 2px solid;
    border-color: #404040 #fff #fff #404040;
  }
  .fw-lb-line {
    padding: 6px 0;
  }
  .fw-lb-table {
    width: 100%;
    border-collapse: collapse;
  }
  .fw-lb-table th {
    text-align: left;
    color: #00fff0;
    border-bottom: 1px solid #00ff66;
  }
  .fw-lb-table td,
  .fw-lb-table th {
    padding: 1px 4px;
  }
  .fw-lb-name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fw-lb-hl {
    animation: fw-lb-blink 0.8s steps(2, start) infinite;
    color: #ff2bd6;
  }
  .fw-lb-btn {
    margin-left: 6px;
    font-family: inherit;
    font-size: 11px;
    background: #c0c0c0;
    color: #000;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    cursor: pointer;
  }
  @keyframes fw-lb-blink {
    to {
      visibility: hidden;
    }
  }
</style>

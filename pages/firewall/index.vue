<template>
  <div class="fw-root fw-page">
    <header class="fw-banner">
      <div class="fw-logo">FIREWALL.EXE</div>
      <NewsTicker :items="state.news.slice(-6)" />
    </header>

    <main class="fw-main">
      <div class="fw-col fw-left">
        <ShopPanel
          :credits="credits"
          :placing="placing"
          @pick="(p) => beginPlacing(p.kind, p.defId)"
          @cancel="cancelPlacing" />
        <AbilityBar
          :unlocked="unlocked"
          :cooldowns="cooldowns"
          :pending="pendingAbility"
          @trigger="triggerAbility"
          @cancel="cancelAbility" />
      </div>

      <div class="fw-col fw-center">
        <Win98Window title="Network Monitor">
          <StatusBar
            :credits="credits"
            :integrity="integrity"
            :max-integrity="state.maxIntegrity"
            :wave="displayWave"
            :total-waves="totalWaves"
            :speed="speed"
            :paused="paused"
            :can-start-wave="canStartWave"
            @start-wave="startWave"
            @toggle-pause="togglePause"
            @set-speed="setSpeed" />
          <div class="fw-stage">
            <canvas ref="canvasRef" width="720" height="440" class="fw-canvas" />
            <ScreenOverlay
              v-if="overlayPhase"
              :phase="overlayPhase"
              :wave="state.wave"
              :total-waves="totalWaves"
              :kills="state.stats.kills"
              :score="score"
              :submit-state="submitState"
              :rank="lastRank"
              @begin="onBegin"
              @restart="onRestart"
              @resume="togglePause"
              @submit-score="onSubmitScore" />
          </div>
        </Win98Window>
      </div>

      <div class="fw-col fw-right">
        <InspectPanel
          :entity="selectedEntity"
          :kind="selection?.kind ?? null"
          :credits="credits"
          @upgrade="upgrade"
          @sell="sell"
          @target-mode="setTargetMode"
          @close="select(null)" />
        <Leaderboard
          :entries="entries"
          :loading="loading"
          :error="error"
          :highlight-id="lastEntryId"
          @refresh="refresh" />
      </div>
    </main>

    <footer class="fw-footer">
      <div class="fw-construction fw-strip">UNDER CONSTRUCTION</div>
      <div class="fw-counter-wrap">
        <span>You are visitor number</span>
        <span class="fw-odometer fw-mono">
          <span v-for="(d, i) in hitDigits" :key="i" class="fw-digit">{{ d }}</span>
        </span>
      </div>
      <span class="fw-badge">Best viewed in IE 6 @ 800x600</span>
    </footer>

    <Taskbar />
  </div>
</template>

<script setup lang="ts">
  import '@/assets/css/firewall.css';
  import Win98Window from '@/components/Firewall/Win98Window.vue';
  import StatusBar from '@/components/Firewall/StatusBar.vue';
  import NewsTicker from '@/components/Firewall/NewsTicker.vue';
  import Taskbar from '@/components/Firewall/Taskbar.vue';
  import ShopPanel from '@/components/Firewall/ShopPanel.vue';
  import AbilityBar from '@/components/Firewall/AbilityBar.vue';
  import InspectPanel from '@/components/Firewall/InspectPanel.vue';
  import ScreenOverlay from '@/components/Firewall/ScreenOverlay.vue';
  import Leaderboard from '@/components/Firewall/Leaderboard.vue';
  import { useFirewallGame } from '@/composables/firewall/useFirewallGame';
  import { useFirewallScores } from '@/composables/firewall/useFirewallScores';
  import { isAbilityUnlocked } from '@/composables/firewall/engine/abilities';
  import { computeScore } from '@/composables/firewall/engine/score';
  import { TOWER_DEFS } from '@/composables/firewall/data/towers';
  import { BUILDING_DEFS } from '@/composables/firewall/data/buildings';
  import { ABILITY_DEFS } from '@/composables/firewall/data/abilities';
  import { WAVES } from '@/composables/firewall/data/waves';

  useHead({ title: 'FIREWALL.EXE' });

  const {
    state,
    tick,
    selection,
    placing,
    pendingAbility,
    attach,
    detach,
    begin,
    restart,
    startWave,
    togglePause,
    setSpeed,
    beginPlacing,
    cancelPlacing,
    select,
    sell,
    upgrade,
    setTargetMode,
    triggerAbility,
    cancelAbility,
  } = useFirewallGame();

  const { entries, loading, error, submitState, lastRank, lastEntryId, refresh, submit, reset } =
    useFirewallScores();

  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const hitDigits = ref<string[]>('000000'.split(''));
  const totalWaves = WAVES.length;

  const credits = computed(() => (tick.value, state.value.credits));
  const integrity = computed(() => (tick.value, state.value.integrity));
  const displayWave = computed(() => {
    tick.value;
    const s = state.value;
  const speed = computed(() => (tick.value, state.value.speed));
  const paused = computed(() => (tick.value, state.value.paused));
    // state.wave is the 0-based index of the current (wave phase) or next (build phase) wave
    return Math.min(s.wave + 1, totalWaves);
  });
  const canStartWave = computed(() => (tick.value, state.value.phase === 'build'));

  const selectedEntity = computed(() => {
    tick.value;
    const sel = selection.value;
    if (!sel) return null;
    const list = sel.kind === 'tower' ? state.value.towers : state.value.buildings;
    return list.find((e) => e.id === sel.id) ?? null;
  });

  // clear a selection whose entity no longer exists (sold)
  watch(tick, () => {
    if (selection.value && !selectedEntity.value) select(null);
  });

  const unlocked = computed(() => {
    tick.value;
    const out: Record<string, boolean> = {};
    for (const d of ABILITY_DEFS) out[d.id] = isAbilityUnlocked(state.value, d.id);
    return out;
  });
  const cooldowns = computed(() => (tick.value, { ...state.value.abilityCooldowns }));

  const overlayPhase = computed<'title' | 'won' | 'lost' | 'paused' | null>(() => {
    tick.value;
    const s = state.value;
    if (s.phase === 'title' || s.phase === 'won' || s.phase === 'lost') return s.phase;
    return s.paused ? 'paused' : null;
  });

  const score = computed(() => {
    tick.value;
    const s = state.value;
    if (s.phase !== 'won' && s.phase !== 'lost') return 0;
    return computeScore({
      wave: s.wave,
      kills: s.stats.kills,
      integrity: s.integrity,
      credits: s.credits,
      won: s.phase === 'won',
    });
  });

  function onBegin() {
    reset();
    begin();
  }

  function onRestart() {
    reset();
    restart();
  }

  async function onSubmitScore(name: string) {
    const s = state.value;
    await submit({
      name,
      wave: s.wave,
      won: s.phase === 'won',
      kills: s.stats.kills,
      integrity: s.integrity,
      credits: s.credits,
    });
  }

  function onKeydown(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    if (t && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.toLowerCase();

    if (key === 'escape') {
      cancelPlacing();
      cancelAbility();
      select(null);
      return;
    }
    if (key === ' ') {
      e.preventDefault();
      if (canStartWave.value) startWave();
      return;
    }
    if (key === 'p') {
      togglePause();
      return;
    }
    if (key === 'delete' || key === 'backspace') {
      if (selection.value) sell();
      return;
    }
    const tower = TOWER_DEFS.find((d) => d.hotkey.toLowerCase() === key);
    if (tower) return beginPlacing('tower', tower.id);
    const building = BUILDING_DEFS.find((d) => d.hotkey.toLowerCase() === key);
    if (building) return beginPlacing('building', building.id);
    const ability = ABILITY_DEFS.find((d) => d.hotkey.toLowerCase() === key);
    if (ability && unlocked.value[ability.id] && (cooldowns.value[ability.id] ?? 0) <= 0) {
      triggerAbility(ability.id);
    }
  }

  onMounted(() => {
    hitDigits.value = String(Math.floor(100000 + Math.random() * 900000)).split('');
    if (canvasRef.value) attach(canvasRef.value);
    window.addEventListener('keydown', onKeydown);
    refresh();
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeydown);
    detach();
  });
</script>

<style scoped>
  .fw-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .fw-banner {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 6px 10px;
    flex-wrap: wrap;
  }
  .fw-logo {
    font: bold 24px 'Courier New', monospace;
    color: var(--fw-magenta);
    text-shadow: 2px 2px 0 var(--fw-dark);
    display: flex;
    align-items: center;
    gap: 10px;
    white-space: nowrap;
  }
  .fw-main {
    flex: 1;
    display: flex;
    gap: 8px;
    padding: 8px 10px;
    align-items: flex-start;
    justify-content: center;
  }
  .fw-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .fw-left,
  .fw-right {
    width: 230px;
    flex: 0 0 auto;
  }
  .fw-center {
    flex: 0 1 auto;
    max-width: 100%;
  }
  .fw-stage {
    position: relative;
    width: 720px;
    max-width: 100%;
  }
  .fw-canvas {
    display: block;
    width: 100%;
    height: auto;
    background: #000;
  }
  .fw-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 6px 10px;
  }
  .fw-strip {
    padding: 2px 12px;
    font: bold 11px 'Courier New', monospace;
  }
  .fw-counter-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .fw-odometer {
    display: inline-flex;
    gap: 1px;
  }
  .fw-digit {
    background: #000;
    color: var(--fw-green);
    border: 1px solid var(--fw-dark);
    padding: 1px 4px;
    font-weight: bold;
  }
  @media (max-width: 1100px) {
    .fw-main {
      flex-direction: column;
      align-items: center;
    }
    .fw-left,
    .fw-right {
      width: 100%;
      max-width: 720px;
    }
  }
</style>

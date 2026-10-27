<script setup lang="ts">
  import { ABILITY_DEFS } from '@/composables/firewall/data/abilities';
  import { getBuildingDef } from '@/composables/firewall/data/buildings';

  const props = defineProps<{
    unlocked: Record<string, boolean>;
    cooldowns: Record<string, number>;
    pending: string | null;
  }>();

  const emit = defineEmits<{
    (e: 'trigger', id: string): void;
    (e: 'cancel'): void;
  }>();

  const abilities = computed(() =>
    ABILITY_DEFS.map((d) => {
      const unlocked = !!props.unlocked[d.id];
      const cd = props.cooldowns[d.id] ?? 0;
      const isPending = props.pending === d.id;
      return {
        def: d,
        unlocked,
        cd,
        isPending,
        ready: unlocked && cd <= 0,
        frac: d.cooldown > 0 ? Math.min(1, Math.max(0, cd / d.cooldown)) : 0,
        tip: unlocked
          ? `${d.blurb} (cooldown ${d.cooldown}s)`
          : `Unlock: ${getBuildingDef(d.unlock.building).name} level ${d.unlock.level}`,
      };
    })
  );

  function onClick(a: (typeof abilities.value)[number]) {
    if (a.isPending) emit('cancel');
    else if (a.ready) emit('trigger', a.def.id);
  }
</script>

<template>
  <div class="fw-abilities">
    <button
      v-for="a in abilities"
      :key="a.def.id"
      type="button"
      class="fw-ab"
      :class="{
        'fw-locked': !a.unlocked,
        'fw-ready': a.ready,
        'fw-pending': a.isPending,
      }"
      :style="{ '--ab-color': a.def.color }"
      :disabled="!a.unlocked || (a.cd > 0 && !a.isPending)"
      :title="a.tip"
      @click="onClick(a)">
      <span v-if="a.unlocked && a.cd > 0" class="fw-cd" :style="{ height: a.frac * 100 + '%' }" />
      <span class="fw-ab-name">{{ a.def.name }}</span>
      <span class="fw-ab-state">
        <template v-if="a.isPending">CLICK MAP...</template>
        <template v-else-if="!a.unlocked">LOCKED</template>
        <template v-else-if="a.cd > 0">{{ Math.ceil(a.cd) }}s</template>
        <template v-else>READY</template>
      </span>
      <span class="fw-ab-key">[{{ a.def.hotkey }}]</span>
    </button>
  </div>
</template>

<style scoped>
  .fw-abilities {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .fw-ab {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 92px;
    padding: 4px 6px;
    background: #c0c0c0;
    color: #000;
    font: 11px Tahoma, Verdana, 'MS Sans Serif', sans-serif;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    cursor: pointer;
  }
  .fw-ab > span {
    position: relative;
  }
  .fw-ab-name {
    font-weight: bold;
  }
  .fw-ab-state {
    font-family: 'Courier New', monospace;
  }
  .fw-ab-key {
    color: #404040;
    font-family: 'Courier New', monospace;
  }
  .fw-cd {
    position: absolute !important;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.35);
  }
  .fw-ab.fw-ready {
    box-shadow: 0 0 6px 2px var(--ab-color);
    animation: fw-glow 1s ease-in-out infinite alternate;
  }
  .fw-ab.fw-pending {
    border-color: #404040 #fff #fff #404040;
    background: #a8a8a8;
  }
  .fw-ab.fw-locked {
    color: #808080;
    cursor: default;
  }
  @keyframes fw-glow {
    to {
      box-shadow: 0 0 10px 3px var(--ab-color);
    }
  }
</style>

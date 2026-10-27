<script setup lang="ts">
  import Win98Window from '@/components/Firewall/Win98Window.vue';
  import { TOWER_DEFS } from '@/composables/firewall/data/towers';
  import { BUILDING_DEFS } from '@/composables/firewall/data/buildings';
  import type { Shape } from '@/composables/firewall/engine/types';

  type Kind = 'tower' | 'building';

  const props = defineProps<{
    credits: number;
    placing: { kind: Kind; defId: string } | null;
  }>();

  const emit = defineEmits<{
    (e: 'pick', payload: { kind: Kind; defId: string }): void;
    (e: 'cancel'): void;
  }>();

  const shapeClip: Record<Shape, string> = {
    diamond: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
    hex: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)',
    triangle: 'polygon(50% 0, 100% 100%, 0 100%)',
    square: 'none',
    circle: 'circle(50%)',
  };

  const groups = computed(() => [
    {
      title: 'TOWERS',
      kind: 'tower' as Kind,
      items: TOWER_DEFS.map((d) => ({
        id: d.id,
        name: d.name,
        cost: d.cost,
        color: d.color,
        shape: d.shape,
        hotkey: d.hotkey,
        tip:
          `${d.blurb}\nDamage ${d.base.damage}, range ${d.base.range}, ` +
          `rate ${(1 / d.base.cooldown).toFixed(1)}/s`,
      })),
    },
    {
      title: 'SUPPORT',
      kind: 'building' as Kind,
      items: BUILDING_DEFS.map((d) => {
        const stats: string[] = [];
        if (d.base.auraRange) stats.push(`aura ${d.base.auraRange}`);
        if (d.base.fireRateBonus) stats.push(`fire rate +${Math.round(d.base.fireRateBonus * 100)}%`);
        if (d.base.rangeBonus) stats.push(`range +${Math.round(d.base.rangeBonus * 100)}%`);
        if (d.base.damageBonus) stats.push(`damage +${Math.round(d.base.damageBonus * 100)}%`);
        if (d.base.incomePerWave) stats.push(`income $${d.base.incomePerWave}/wave`);
        if (d.base.healPerWave) stats.push(`heal ${d.base.healPerWave}/wave`);
        if (d.base.bountyBonus) stats.push(`bounty +${Math.round(d.base.bountyBonus * 100)}%`);
        return {
          id: d.id,
          name: d.name,
          cost: d.cost,
          color: d.color,
          shape: d.shape,
          hotkey: d.hotkey,
          tip: d.blurb + (stats.length ? '\n' + stats.join(', ') : ''),
        };
      }),
    },
  ]);

  const isActive = (kind: Kind, id: string) =>
    props.placing?.kind === kind && props.placing.defId === id;

  function onClick(kind: Kind, id: string) {
    if (isActive(kind, id)) emit('cancel');
    else emit('pick', { kind, defId: id });
  }
</script>

<template>
  <Win98Window title="Shop" icon="$">
    <div v-for="g in groups" :key="g.title" class="fw-group">
      <div class="fw-group-title">{{ g.title }}</div>
      <button
        v-for="it in g.items"
        :key="it.id"
        type="button"
        class="fw-item"
        :class="{ 'fw-pressed': isActive(g.kind, it.id) }"
        :disabled="credits < it.cost"
        :title="it.tip"
        @click="onClick(g.kind, it.id)">
        <span
          class="fw-swatch"
          :style="{ background: it.color, clipPath: shapeClip[it.shape] }" />
        <span class="fw-name">{{ it.name }}</span>
        <span class="fw-cost">${{ it.cost }}</span>
        <span class="fw-key">[{{ it.hotkey }}]</span>
      </button>
    </div>
  </Win98Window>
</template>

<style scoped>
  .fw-group {
    margin-bottom: 6px;
  }
  .fw-group-title {
    font: bold 11px Tahoma, Verdana, sans-serif;
    color: #404040;
    margin-bottom: 2px;
  }
  .fw-item {
    display: flex;
    align-items: center;
    gap: 5px;
    width: 100%;
    margin-bottom: 2px;
    padding: 3px 4px;
    background: #c0c0c0;
    color: #000;
    font: 12px Tahoma, Verdana, 'MS Sans Serif', sans-serif;
    text-align: left;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    cursor: pointer;
  }
  .fw-item.fw-pressed {
    border-color: #404040 #fff #fff #404040;
    background: #a8a8a8;
    font-weight: bold;
  }
  .fw-item:disabled {
    color: #808080;
    cursor: default;
  }
  .fw-item:disabled .fw-swatch {
    opacity: 0.35;
  }
  .fw-swatch {
    flex: none;
    width: 14px;
    height: 14px;
    outline: 1px solid #404040;
  }
  .fw-name {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fw-cost {
    font: bold 11px 'Courier New', monospace;
    background: #000;
    color: #30ff60;
    padding: 0 3px;
  }
  .fw-item:disabled .fw-cost {
    color: #808080;
  }
  .fw-key {
    font: 11px 'Courier New', monospace;
    color: #404040;
  }
</style>

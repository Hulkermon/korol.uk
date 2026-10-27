<script setup lang="ts">
  import { computed } from 'vue';
  import type {
    Building,
    BuildingStats,
    TargetMode,
    Tower,
    TowerStats,
    UpgradeNode,
  } from '@/composables/firewall/engine/types';
  import { availableUpgrades, getLevel, lockedUpgrades } from '@/composables/firewall/engine/stats';
  import { sellValue } from '@/composables/firewall/engine/economy';
  import { getTowerDef } from '@/composables/firewall/data/towers';
  import { getBuildingDef } from '@/composables/firewall/data/buildings';
  import { ABILITY_DEFS } from '@/composables/firewall/data/abilities';
  import Win98Window from './Win98Window.vue';

  type AnyNode = UpgradeNode<TowerStats> | UpgradeNode<BuildingStats>;
  type NodeState = 'bought' | 'available' | 'locked';

  const props = defineProps<{
    entity: Tower | Building | null;
    kind: 'tower' | 'building' | null;
    credits: number;
    effectiveStats?: TowerStats | null;
  }>();

  const emit = defineEmits<{
    upgrade: [nodeId: string];
    sell: [];
    'target-mode': [mode: TargetMode];
    close: [];
  }>();

  const modes: TargetMode[] = ['first', 'last', 'strongest', 'closest'];

  const def = computed(() => {
    if (!props.entity || !props.kind) return null;
    return props.kind === 'tower'
      ? getTowerDef(props.entity.defId)
      : getBuildingDef(props.entity.defId);
  });

  const tree = computed<AnyNode[]>(() => (def.value ? (def.value.tree as AnyNode[]) : []));
  const purchased = computed(() => props.entity?.purchased ?? []);
  const level = computed(() => getLevel(purchased.value));
  const refund = computed(() => (props.entity ? sellValue(props.entity) : 0));

  const availableIds = computed(
    () =>
      new Set(
        availableUpgrades(tree.value as UpgradeNode<any>[], purchased.value).map((n) => n.id),
      ),
  );
  const lockedIds = computed(
    () =>
      new Set(lockedUpgrades(tree.value as UpgradeNode<any>[], purchased.value).map((n) => n.id)),
  );

  const stateOf = (node: AnyNode): NodeState => {
    if (purchased.value.includes(node.id)) return 'bought';
    if (availableIds.value.has(node.id) && !lockedIds.value.has(node.id)) return 'available';
    return 'locked';
  };

  const root = computed(() => tree.value.find((n) => n.parent === null) ?? null);
  const branchA = computed(() => tree.value.filter((n) => n.branch === 'A'));
  const branchB = computed(() => tree.value.filter((n) => n.branch === 'B'));

  const forkOpen = computed(() => {
    const forks = tree.value.filter((n) => n.parent === root.value?.id);
    return forks.length > 1 && forks.every((n) => stateOf(n) === 'available');
  });

  const fmt = (n: number) => String(Math.round(n * 100) / 100);

  const rows = computed<[string, string][]>(() => {
    if (!props.entity || !props.kind) return [];
    const out: [string, string][] = [];
    if (props.kind === 'tower') {
      const s = props.effectiveStats ?? (props.entity as Tower).stats;
      out.push(
        ['Damage', fmt(s.damage)],
        ['Range', fmt(s.range)],
        ['Rate', fmt(1 / s.cooldown) + '/s'],
      );
      if (s.slowFactor < 1) out.push(['Slow', fmt((1 - s.slowFactor) * 100) + '%']);
      if (s.stunDuration > 0) out.push(['Stun', fmt(s.stunDuration) + 's']);
      if (s.dotDps > 0) out.push(['DoT', fmt(s.dotDps) + '/s']);
      if (s.chainCount > 0) out.push(['Chain', fmt(s.chainCount)]);
      if (s.splashRadius > 0) out.push(['Splash', fmt(s.splashRadius)]);
      if (s.armorPierce > 0) out.push(['Pierce', fmt(s.armorPierce * 100) + '%']);
    } else {
      const s = (props.entity as Building).stats;
      if (s.auraRange > 0) out.push(['Aura range', fmt(s.auraRange)]);
      if (s.fireRateBonus > 0) out.push(['Fire rate', '+' + fmt(s.fireRateBonus * 100) + '%']);
      if (s.rangeBonus > 0) out.push(['Range', '+' + fmt(s.rangeBonus * 100) + '%']);
      if (s.damageBonus > 0) out.push(['Damage', '+' + fmt(s.damageBonus * 100) + '%']);
      if (s.incomePerWave > 0) out.push(['Income', '$' + fmt(s.incomePerWave) + '/wave']);
      if (s.healPerWave > 0) out.push(['Heal', fmt(s.healPerWave) + '/wave']);
      if (s.bountyBonus > 0) out.push(['Bounty', '+' + fmt(s.bountyBonus * 100) + '%']);
    }
    return out;
  });

  const abilities = computed(() => {
    if (props.kind !== 'building' || !def.value) return [];
    return ABILITY_DEFS.filter((a) => a.unlock.building === def.value!.id).map((a) => ({
      id: a.id,
      name: a.name,
      level: a.unlock.level,
      unlocked: level.value >= a.unlock.level,
    }));
  });

  const onNode = (node: AnyNode) => {
    if (stateOf(node) !== 'available' || props.credits < node.cost) return;
    emit('upgrade', node.id);
  };

  const onMode = (e: Event) =>
    emit('target-mode', (e.target as HTMLSelectElement).value as TargetMode);
</script>

<template>
  <Win98Window title="Inspector" icon="?">
    <div v-if="!entity || !def" class="fw-ip-empty" data-testid="placeholder">
      Select a tower or building
    </div>
    <div v-else class="fw-ip">
      <div class="fw-ip-head">
        <strong data-testid="name">{{ def.name }}</strong>
        <span data-testid="level">LV {{ level }}/5</span>
        <button class="fw-btn fw-ip-close" data-testid="close" @click="emit('close')">x</button>
      </div>

      <table class="fw-ip-stats">
        <tbody>
          <tr v-for="[label, value] in rows" :key="label">
            <td>{{ label }}</td>
            <td>{{ value }}</td>
          </tr>
          <tr v-if="kind === 'tower'">
            <td>Kills</td>
            <td data-testid="kills">{{ (entity as Tower).kills }}</td>
          </tr>
        </tbody>
      </table>

      <label v-if="kind === 'tower'" class="fw-ip-mode">
        Target
        <select data-testid="target-mode" :value="(entity as Tower).targetMode" @change="onMode">
          <option v-for="m in modes" :key="m" :value="m">{{ m }}</option>
        </select>
      </label>

      <div class="fw-ip-tree">
        <template v-if="root">
          <div class="fw-ip-row">
            <button
              v-if="stateOf(root) === 'available'"
              class="fw-btn fw-ip-node"
              :data-testid="'node-' + root.id"
              data-state="available"
              :disabled="credits < root.cost"
              @click="onNode(root)">
              <b>{{ root.name }}</b>
              <small>{{ root.blurb }}</small>
              <small>${{ root.cost }}</small>
              <small v-if="credits < root.cost" class="fw-ip-need">need ${{ root.cost }}</small>
            </button>
            <div
              v-else
              class="fw-ip-node"
              :class="'fw-ip-' + stateOf(root)"
              :data-testid="'node-' + root.id"
              :data-state="stateOf(root)">
              <b>{{ root.name }}</b>
              <small>{{ root.blurb }}</small>
            </div>
          </div>
          <div v-if="forkOpen" class="fw-ip-fork fw-blink" data-testid="fork">CHOOSE A PATH</div>
          <div class="fw-ip-branches">
            <div v-for="(col, ci) in [branchA, branchB]" :key="ci" class="fw-ip-col">
              <template v-for="node in col" :key="node.id">
                <button
                  v-if="stateOf(node) === 'available'"
                  class="fw-btn fw-ip-node"
                  :data-testid="'node-' + node.id"
                  data-state="available"
                  :disabled="credits < node.cost"
                  @click="onNode(node)">
                  <b>{{ node.name }}</b>
                  <small>{{ node.blurb }}</small>
                  <small>${{ node.cost }}</small>
                  <small v-if="credits < node.cost" class="fw-ip-need">need ${{ node.cost }}</small>
                </button>
                <div
                  v-else
                  class="fw-ip-node"
                  :class="'fw-ip-' + stateOf(node)"
                  :data-testid="'node-' + node.id"
                  :data-state="stateOf(node)">
                  <b>{{ node.name }}</b>
                  <small>{{ node.blurb }}</small>
                </div>
              </template>
            </div>
          </div>
        </template>
      </div>

      <ul v-if="abilities.length" class="fw-ip-abilities">
        <li
          v-for="a in abilities"
          :key="a.id"
          :class="a.unlocked ? 'fw-ip-bought' : 'fw-ip-locked'"
          :data-testid="'ability-' + a.id">
          {{ a.name }} (LV {{ a.level }}) {{ a.unlocked ? 'unlocked' : 'locked' }}
        </li>
      </ul>

      <button class="fw-btn fw-ip-sell" data-testid="sell" @click="emit('sell')">
        SELL ${{ refund }}
      </button>
    </div>
  </Win98Window>
</template>

<style scoped>
  .fw-ip-empty {
    padding: 16px 8px;
    text-align: center;
    font-size: 12px;
    color: #404040;
  }
  .fw-ip {
    font-size: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .fw-ip-head {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .fw-ip-head strong {
    flex: 1;
  }
  .fw-ip-close {
    padding: 0 6px;
  }
  .fw-ip-stats {
    width: 100%;
    border-collapse: collapse;
    background: #fff;
    border: 2px solid;
    border-color: #404040 #fff #fff #404040;
  }
  .fw-ip-stats td {
    padding: 1px 4px;
  }
  .fw-ip-stats td:last-child {
    text-align: right;
    font-family: 'Courier New', monospace;
  }
  .fw-ip-mode select {
    margin-left: 4px;
  }
  .fw-ip-tree {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .fw-ip-row {
    display: flex;
    justify-content: center;
  }
  .fw-ip-branches {
    display: flex;
    gap: 6px;
  }
  .fw-ip-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .fw-ip-fork {
    text-align: center;
    font-weight: bold;
    color: #ff2bd6;
  }
  .fw-ip-node {
    display: flex;
    flex-direction: column;
    gap: 1px;
    text-align: left;
    padding: 3px 4px;
    font-size: 11px;
    border: 2px solid;
    border-color: #fff #404040 #404040 #fff;
    background: #c0c0c0;
  }
  .fw-ip-node small {
    font-size: 10px;
  }
  .fw-ip-bought {
    background: #30ff60;
    border-color: #404040 #fff #fff #404040;
  }
  .fw-ip-locked {
    color: #808080;
    background: #a0a0a0;
    border-style: dashed;
  }
  .fw-ip-need {
    color: #c00000;
  }
  .fw-ip-abilities {
    margin: 0;
    padding-left: 16px;
  }
  .fw-ip-sell {
    align-self: flex-end;
  }
</style>

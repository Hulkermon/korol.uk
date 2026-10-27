import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import InspectPanel from '../../components/Firewall/InspectPanel.vue';
import { getTowerDef } from '../../composables/firewall/data/towers';
import { getBuildingDef } from '../../composables/firewall/data/buildings';
import { computeStats } from '../../composables/firewall/engine/stats';
import type { Building, Tower } from '../../composables/firewall/engine/types';

const makeTower = (purchased: string[] = [], spent = 100): Tower => {
  const def = getTowerDef('ping');
  return {
    id: 1,
    defId: 'ping',
    cell: { col: 0, row: 0 },
    pos: { x: 0, y: 0 },
    purchased,
    stats: computeStats(def.base, def.tree, purchased),
    cooldownLeft: 0,
    angle: 0,
    targetMode: 'first',
    spent,
    kills: 3,
  };
};

const makeBuilding = (): Building => {
  const def = getBuildingDef('backup');
  return {
    id: 2,
    defId: 'backup',
    cell: { col: 0, row: 0 },
    pos: { x: 0, y: 0 },
    purchased: [],
    stats: def.base,
    spent: 100,
  };
};

const mountTower = (purchased: string[], credits = 1000) =>
  mount(InspectPanel, { props: { entity: makeTower(purchased), kind: 'tower', credits } });

describe('InspectPanel', () => {
  it('renders a placeholder without an entity', () => {
    const w = mount(InspectPanel, { props: { entity: null, kind: null, credits: 0 } });
    expect(w.find('[data-testid="placeholder"]').text()).toContain('Select a tower or building');
  });

  it('renders a building with its abilities', () => {
    const w = mount(InspectPanel, {
      props: { entity: makeBuilding(), kind: 'building', credits: 0 },
    });
    expect(w.find('[data-testid="name"]').text()).toBe(getBuildingDef('backup').name);
    expect(w.findAll('[data-testid^="ability-"]').length).toBeGreaterThan(0);
  });

  it('shows n2 as available at level 1', () => {
    const w = mountTower([]);
    expect(w.find('[data-testid="level"]').text()).toBe('LV 1/5');
    expect(w.find('[data-testid="node-n2"]').attributes('data-state')).toBe('available');
    expect(w.find('[data-testid="node-n3a"]').attributes('data-state')).toBe('locked');
    expect(w.find('[data-testid="fork"]').exists()).toBe(false);
  });

  it('shows the fork after n2', () => {
    const w = mountTower(['n2']);
    expect(w.find('[data-testid="node-n2"]').attributes('data-state')).toBe('bought');
    expect(w.find('[data-testid="node-n3a"]').attributes('data-state')).toBe('available');
    expect(w.find('[data-testid="node-n3b"]').attributes('data-state')).toBe('available');
    expect(w.find('[data-testid="fork"]').text()).toBe('CHOOSE A PATH');
  });

  it('locks the other branch after choosing one', async () => {
    const w = mountTower(['n2', 'n3a']);
    expect(w.find('[data-testid="node-n3b"]').attributes('data-state')).toBe('locked');
    expect(w.find('[data-testid="fork"]').exists()).toBe(false);
    await w.find('[data-testid="node-n3b"]').trigger('click');
    expect(w.emitted('upgrade')).toBeUndefined();
  });

  it('emits upgrade when clicking an available node', async () => {
    const w = mountTower([]);
    await w.find('[data-testid="node-n2"]').trigger('click');
    expect(w.emitted('upgrade')![0]).toEqual(['n2']);
  });

  it('disables unaffordable nodes', async () => {
    const w = mountTower([], 0);
    const btn = w.find('[data-testid="node-n2"]');
    expect(btn.attributes('disabled')).toBeDefined();
    await btn.trigger('click');
    expect(w.emitted('upgrade')).toBeUndefined();
  });

  it('emits sell and shows the refund', async () => {
    const w = mountTower([]);
    const sell = w.find('[data-testid="sell"]');
    expect(sell.text()).toContain('$70');
    await sell.trigger('click');
    expect(w.emitted('sell')).toHaveLength(1);
  });

  it('emits target-mode', async () => {
    const w = mountTower([]);
    await w.find('[data-testid="target-mode"]').setValue('strongest');
    expect(w.emitted('target-mode')![0]).toEqual(['strongest']);
  });
});

describe('InspectPanel effective stats', () => {
  it('shows aura-boosted stats for a tower when provided', () => {
    const tower = makeTower();
    const wrapper = mount(InspectPanel, {
      props: {
        entity: tower,
        kind: 'tower',
        credits: 0,
        effectiveStats: { ...tower.stats, range: 1234 },
      },
    });
    expect(wrapper.text()).toContain('1234');
  });
});

describe('InspectPanel upgrade descriptions', () => {
  it('describes upgrades by their stat changes', () => {
    const w = mountTower([]);
    expect(w.find('[data-testid="node-n2"]').text()).toContain('Damage 9 → 12.6');
  });
});

import { describe, it, expect } from 'vitest';
import { TIER_COLORS, pinLabel, pinHtml, pinClass } from '../../composables/freeride/pins';
import type { FreerideEvent } from '../../composables/freeride/types';

const ev = (tier: FreerideEvent['tier'], stars: FreerideEvent['stars'] = null) => ({
  tier,
  stars,
});
const idle = { selected: false, planned: false, order: null };

describe('pinLabel', () => {
  it('labels each tier', () => {
    expect(pinLabel(ev('pro'))).toBe('PRO');
    expect(pinLabel(ev('challenger'))).toBe('CH');
    expect(pinLabel(ev('challenger', 2))).toBe('★★');
    expect(pinLabel(ev('qualifier', 1))).toBe('★');
    expect(pinLabel(ev('qualifier', 4))).toBe('★★★★');
    expect(pinLabel(ev('junior', 2))).toBe('J★★');
    expect(pinLabel(ev('junior'))).toBe('J');
  });
});

describe('pinHtml', () => {
  it('includes colour and label', () => {
    const html = pinHtml(ev('qualifier', 3), idle);
    expect(html).toContain(TIER_COLORS.qualifier);
    expect(html).toContain('★★★');
  });

  it('shows order badge only when planned', () => {
    expect(pinHtml(ev('pro'), idle)).not.toContain('fr-pin__order');
    expect(pinHtml(ev('pro'), { selected: false, planned: true, order: 3 })).toContain(
      '<span class="fr-pin__order">3</span>',
    );
  });

  it('does not contain event names', () => {
    const e = { ...ev('pro'), name: '<script>x</script>' };
    expect(pinHtml(e, idle)).not.toContain('script');
  });
});

describe('pinClass', () => {
  it('composes classes', () => {
    expect(pinClass(ev('pro'), idle)).toBe('fr-pin fr-pin--pro');
    expect(pinClass(ev('junior', 1), { selected: true, planned: false, order: null })).toBe(
      'fr-pin fr-pin--junior fr-pin--selected',
    );
    expect(pinClass(ev('qualifier', 1), { selected: true, planned: true, order: 1 })).toBe(
      'fr-pin fr-pin--qualifier fr-pin--selected fr-pin--planned',
    );
  });
});

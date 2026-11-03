import { describe, it, expect } from 'vitest';
import {
  TIER_COLORS,
  TIER_SHADES,
  pinColor,
  pinRows,
  pinHtml,
  pinClass,
} from '../../composables/freeride/pins';
import type { FreerideEvent } from '../../composables/freeride/types';

const ev = (tier: FreerideEvent['tier'], stars: FreerideEvent['stars'] = null) => ({
  tier,
  stars,
});
const idle = { selected: false, planned: false, order: null };

describe('pinRows', () => {
  it('labels pro and challenger without stars', () => {
    expect(pinRows(ev('pro'))).toEqual(['PRO']);
    expect(pinRows(ev('challenger'))).toEqual(['CH']);
  });

  it('lays out stars over up to two rows', () => {
    expect(pinRows(ev('qualifier', 1))).toEqual(['★']);
    expect(pinRows(ev('qualifier', 2))).toEqual(['★★']);
    expect(pinRows(ev('qualifier', 3))).toEqual(['★★', '★']);
    expect(pinRows(ev('qualifier', 4))).toEqual(['★★', '★★']);
    expect(pinRows(ev('challenger', 2))).toEqual(['★★']);
  });

  it('has no J prefix for juniors', () => {
    expect(pinRows(ev('junior', 2))).toEqual(['★★']);
    expect(pinRows(ev('junior', 4))).toEqual(['★★', '★★']);
  });
});

describe('pinColor', () => {
  it('uses the shade for each star count', () => {
    for (const tier of ['qualifier', 'junior', 'challenger'] as const) {
      for (const s of [1, 2, 3, 4] as const) {
        expect(pinColor(ev(tier, s))).toBe(TIER_SHADES[tier][s - 1]);
      }
    }
    expect(pinColor(ev('qualifier', 1))).toBe('#9cc3ff');
    expect(pinColor(ev('junior', 4))).toBe('#0b5d2a');
    expect(pinColor(ev('challenger', 3))).toBe('#c2410c');
  });

  it('falls back to the tier colour without stars', () => {
    expect(pinColor(ev('pro'))).toBe('#ff6b1a');
    expect(pinColor(ev('challenger'))).toBe(TIER_COLORS.challenger);
  });
});

describe('pinHtml', () => {
  it('includes shade colour and rows', () => {
    const html = pinHtml(ev('qualifier', 3), idle);
    expect(html).toContain('#1f6feb');
    expect(html).toContain('<span class="fr-pin__row">★★</span>');
    expect(html).toContain('<span class="fr-pin__row">★</span>');
  });

  it('renders two rows for 4 stars', () => {
    const html = pinHtml(ev('junior', 4), idle);
    expect(html.match(/class="fr-pin__row"/g)).toHaveLength(2);
  });

  it('shows order badge only when planned', () => {
    expect(pinHtml(ev('pro'), idle)).not.toContain('fr-pin__order');
    expect(pinHtml(ev('pro'), { selected: false, planned: true, order: 3 })).toContain(
      '<span class="fr-pin__order">3</span>',
    );
  });

  it('has no leader without an offset', () => {
    expect(pinHtml(ev('pro'), idle)).not.toContain('fr-pin__leader');
    expect(pinHtml(ev('pro'), idle, { dx: 0, dy: 0 })).not.toContain('fr-pin__leader');
  });

  it('draws a leader back to the true location when offset', () => {
    const html = pinHtml(ev('pro'), idle, { dx: 20, dy: -10 });
    expect(html).toContain('fr-pin__leader');
    expect(html).toContain('x1="15" y1="40" x2="-5" y2="50"');
    expect(html).toContain('<circle cx="-5" cy="50" r="3"');
  });

  it('does not contain event names', () => {
    const e = { ...ev('pro'), name: '<script>x</script>' };
    expect(pinHtml(e, idle)).not.toContain('script');
  });
});

describe('pinClass', () => {
  it('composes classes', () => {
    expect(pinClass(ev('pro'), idle)).toBe('fr-pin fr-pin--pro');
    expect(pinClass(ev('junior', 2), { selected: true, planned: false, order: null })).toBe(
      'fr-pin fr-pin--junior fr-pin--selected',
    );
    expect(pinClass(ev('qualifier', 1), { selected: true, planned: true, order: 1 })).toBe(
      'fr-pin fr-pin--qualifier fr-pin--light fr-pin--selected fr-pin--planned',
    );
  });

  it('adds light only for 1 star and rows2 only for 3/4 stars', () => {
    for (const s of [1, 2, 3, 4] as const) {
      const c = pinClass(ev('qualifier', s), idle).split(' ');
      expect(c.includes('fr-pin--light')).toBe(s === 1);
      expect(c.includes('fr-pin--rows2')).toBe(s === 3 || s === 4);
    }
    expect(pinClass(ev('pro'), idle)).not.toContain('rows2');
  });
});

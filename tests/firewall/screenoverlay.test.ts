import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ScreenOverlay from '../../components/Firewall/ScreenOverlay.vue';

const base = {
  phase: 'title' as const,
  wave: 7,
  totalWaves: 20,
  kills: 42,
  score: 12345,
  submitState: 'idle' as const,
  rank: null as number | null,
};

function mountWith(props: Partial<typeof base> & { submitState?: string; phase?: string }) {
  return mount(ScreenOverlay, { props: { ...base, ...props } as any });
}

describe('ScreenOverlay', () => {
  it('renders a distinct screen per phase', () => {
    const html = (['title', 'won', 'lost', 'paused'] as const).map(
      (phase) => mountWith({ phase }).html()
    );
    expect(new Set(html).size).toBe(4);
    expect(html[0]).toContain('START');
    expect(html[1]).toContain('SYSTEM SECURED');
    expect(html[2]).toContain('fatal exception 0E');
    expect(html[3]).toContain('PAUSED');
  });

  it('emits begin, resume and restart', async () => {
    const t = mountWith({ phase: 'title' });
    await t.find('button.fw-start').trigger('click');
    expect(t.emitted('begin')).toHaveLength(1);

    const p = mountWith({ phase: 'paused' });
    await p.find('button').trigger('click');
    expect(p.emitted('resume')).toHaveLength(1);

    const w = mountWith({ phase: 'won' });
    const again = w.findAll('button').find((b) => b.text() === 'PLAY AGAIN')!;
    await again.trigger('click');
    expect(w.emitted('restart')).toHaveLength(1);

    const l = mountWith({ phase: 'lost' });
    await l.find('button.fw-anykey').trigger('click');
    expect(l.emitted('restart')).toHaveLength(1);
  });

  it.each(['won', 'lost'])('submits the trimmed name on %s', async (phase) => {
    const w = mountWith({ phase });
    const btn = w.find('button[type="submit"]');
    expect(btn.attributes('disabled')).toBeDefined();
    const input = w.find('input');
    expect(input.attributes('maxlength')).toBe('24');
    await input.setValue('   ');
    expect(btn.attributes('disabled')).toBeDefined();
    await input.setValue('  Neo  ');
    expect(btn.attributes('disabled')).toBeUndefined();
    await btn.trigger('click');
    await w.find('form').trigger('submit');
    expect(w.emitted('submit-score')![0]).toEqual(['Neo']);
  });

  it('disables submit while sending and shows error', async () => {
    const w = mountWith({ phase: 'won', submitState: 'sending' });
    await w.find('input').setValue('Neo');
    expect(w.find('button[type="submit"]').attributes('disabled')).toBeDefined();
    await w.setProps({ submitState: 'error' });
    expect(w.find('.fw-error').exists()).toBe(true);
    expect(w.find('button[type="submit"]').attributes('disabled')).toBeUndefined();
  });

  it('replaces the form with the rank once sent', () => {
    const w = mountWith({ phase: 'lost', submitState: 'sent', rank: 3 });
    expect(w.find('input').exists()).toBe(false);
    expect(w.text()).toContain('Hall of Fame: #3');
    expect(w.text()).toContain('Press any key');
  });
});

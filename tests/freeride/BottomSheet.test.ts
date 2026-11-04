import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import BottomSheet from '@/components/Freeride/BottomSheet.vue';

function ev(type: string, y: number, t: number) {
  const e = new Event(type, { bubbles: true }) as any;
  e.clientY = y;
  e.pointerId = 1;
  Object.defineProperty(e, 'timeStamp', { value: t });
  return e;
}

function make(modelValue: 'peek' | 'half' | 'full' = 'peek') {
  return mount(BottomSheet, {
    props: { modelValue },
    slots: { header: '<button class="tab">Tab</button>', default: '<p class="body">Hi</p>' }
  });
}

beforeEach(() => {
  vi.stubGlobal('innerHeight', 800);
  (window as any).innerHeight = 800;
  (HTMLElement.prototype as any).setPointerCapture = vi.fn();
  (HTMLElement.prototype as any).releasePointerCapture = vi.fn();
});

describe('BottomSheet', () => {
  it('sets height per modelValue', () => {
    expect(make('peek').find('.fr-sheet').attributes('style')).toContain('height: 112px');
    expect(make('half').find('.fr-sheet').attributes('style')).toContain('height: 400px');
    expect(make('full').find('.fr-sheet').attributes('style')).toContain('height: 744px');
  });

  it('renders slots', () => {
    const w = make();
    expect(w.find('.tab').exists()).toBe(true);
    expect(w.find('.body').text()).toBe('Hi');
  });

  it('emits nearest snap after a drag', async () => {
    const w = make('peek');
    const h = w.find('.fr-sheet-handle').element;
    h.dispatchEvent(ev('pointerdown', 700, 0));
    h.dispatchEvent(ev('pointermove', 500, 1000));
    h.dispatchEvent(ev('pointermove', 300, 2000));
    h.dispatchEvent(ev('pointerup', 300, 2000));
    await w.vm.$nextTick();
    expect(w.emitted('update:modelValue')![0]).toEqual(['half']);
  });

  it('flick up moves one step taller', async () => {
    const w = make('peek');
    const h = w.find('.fr-sheet-handle').element;
    h.dispatchEvent(ev('pointerdown', 700, 0));
    h.dispatchEvent(ev('pointermove', 600, 50));
    h.dispatchEvent(ev('pointerup', 600, 60));
    await w.vm.$nextTick();
    expect(w.emitted('update:modelValue')![0]).toEqual(['half']);
  });

  it('cycles on tap', async () => {
    const w = make('full');
    const h = w.find('.fr-sheet-handle').element;
    h.dispatchEvent(ev('pointerdown', 100, 0));
    h.dispatchEvent(ev('pointerup', 100, 50));
    await w.vm.$nextTick();
    expect(w.emitted('update:modelValue')![0]).toEqual(['peek']);
  });

  it('does not start a drag from a header button', async () => {
    const w = make('peek');
    const b = w.find('.tab').element;
    b.dispatchEvent(ev('pointerdown', 700, 0));
    b.dispatchEvent(ev('pointermove', 300, 100));
    b.dispatchEvent(ev('pointerup', 300, 100));
    await w.vm.$nextTick();
    expect(w.emitted('update:modelValue')).toBeUndefined();
  });
});

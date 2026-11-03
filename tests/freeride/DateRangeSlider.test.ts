import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DateRangeSlider from '@/components/Freeride/DateRangeSlider.vue';

const MIN = '2026-12-01';
const MAX = '2027-03-31';
// days from MIN to MAX
const TOTAL = 120;

const make = (modelValue = { from: MIN, to: MAX }) =>
  mount(DateRangeSlider, { props: { min: MIN, max: MAX, modelValue } });

describe('DateRangeSlider', () => {
  it('renders both handles at the ends with no reset button', () => {
    const w = make();
    const [from, to] = w.findAll('input[type="range"]');
    expect((from.element as HTMLInputElement).value).toBe('0');
    expect((to.element as HTMLInputElement).value).toBe(String(TOTAL));
    expect(from.attributes('aria-label')).toBe('From date');
    expect(to.attributes('aria-label')).toBe('To date');
    expect(w.find('button.reset').exists()).toBe(false);
  });

  it('emits new from when the from input changes', async () => {
    const w = make();
    const from = w.findAll('input[type="range"]')[0];
    await from.setValue('10');
    expect(w.emitted('update:modelValue')![0][0]).toEqual({ from: '2026-12-11', to: MAX });
  });

  it('clamps from when dragged past to', async () => {
    const w = make({ from: MIN, to: '2027-01-01' });
    const from = w.findAll('input[type="range"]')[0];
    await from.setValue('100');
    expect(w.emitted('update:modelValue')![0][0]).toEqual({ from: '2027-01-01', to: '2027-01-01' });
  });

  it('clamps to when dragged before from', async () => {
    const w = make({ from: '2027-01-01', to: MAX });
    const to = w.findAll('input[type="range"]')[1];
    await to.setValue('5');
    expect(w.emitted('update:modelValue')![0][0]).toEqual({ from: '2027-01-01', to: '2027-01-01' });
  });

  it('reset emits the full range', async () => {
    const w = make({ from: '2027-01-05', to: '2027-02-22' });
    await w.find('button.reset').trigger('click');
    expect(w.emitted('update:modelValue')![0][0]).toEqual({ from: MIN, to: MAX });
  });

  it('shows formatted labels', () => {
    const w = make({ from: '2027-01-05', to: '2027-02-22' });
    expect(w.text()).toContain('5 Jan 2027');
    expect(w.text()).toContain('22 Feb 2027');
  });
});

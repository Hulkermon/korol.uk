import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Leaderboard from '../../components/Firewall/Leaderboard.vue';
import { useFirewallScores } from '../../composables/firewall/useFirewallScores';
import type { ScoreEntry, ScoreSubmission } from '../../composables/firewall/engine/types';

const entry = (id: number, over: Partial<ScoreEntry> = {}): ScoreEntry => ({
  id,
  name: `hax${id}`,
  score: 20000 - id,
  wave: 12,
  won: false,
  kills: 100,
  createdAt: '2025-01-01T00:00:00.000Z',
  ...over,
});

const mountLb = (props: Partial<InstanceType<typeof Leaderboard>['$props']> = {}) =>
  mount(Leaderboard, {
    props: { entries: [], loading: false, error: null, highlightId: null, ...props },
  });

describe('Leaderboard', () => {
  it('shows the empty state', () => {
    expect(mountLb().find('[data-testid="empty"]').text()).toContain('No hackers yet');
  });

  it('shows the loading line', () => {
    const w = mountLb({ loading: true });
    expect(w.find('[data-testid="loading"]').exists()).toBe(true);
    expect(w.find('[data-testid="empty"]').exists()).toBe(false);
  });

  it('shows the error and emits refresh on retry', async () => {
    const w = mountLb({ error: 'boom' });
    expect(w.find('[data-testid="error"]').text()).toContain('boom');
    await w.find('[data-testid="retry"]').trigger('click');
    expect(w.emitted('refresh')).toHaveLength(1);
  });

  it('renders rows with wave, trophy and highlight', () => {
    const w = mountLb({
      entries: [entry(1, { won: true, wave: 20 }), entry(2)],
      highlightId: 2,
    });
    const rows = w.findAll('[data-testid="row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('hax1');
    expect(rows[0].text()).toContain('20/20');
    expect(rows[0].find('[data-testid="trophy"]').exists()).toBe(true);
    expect(rows[1].text()).toContain('12/20');
    expect(rows[1].find('[data-testid="trophy"]').exists()).toBe(false);
    expect(rows[0].attributes('data-highlight')).toBe('false');
    expect(rows[1].attributes('data-highlight')).toBe('true');
  });
});

describe('useFirewallScores', () => {
  afterEach(() => vi.unstubAllGlobals());

  const sub: ScoreSubmission = {
    name: 'neo',
    wave: 5,
    won: false,
    kills: 10,
    integrity: 50,
    credits: 100,
  };

  it('submits, tracks state, refreshes, and blocks a second submit', async () => {
    const fetchMock = vi.fn(async (url: string, opts?: { method: string }) =>
      opts?.method === 'POST' ? { id: 7, score: 123, rank: 3 } : [entry(7)]
    );
    vi.stubGlobal('$fetch', fetchMock);
    const s = useFirewallScores();
    expect(s.submitState.value).toBe('idle');
    const p = s.submit(sub);
    expect(s.submitState.value).toBe('sending');
    await p;
    expect(s.submitState.value).toBe('sent');
    expect(s.lastRank.value).toBe(3);
    expect(s.lastEntryId.value).toBe(7);
    expect(s.entries.value).toHaveLength(1);
    const calls = fetchMock.mock.calls.length;
    await s.submit(sub);
    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it('sets error state on failure without throwing', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('x')));
    const s = useFirewallScores();
    await expect(s.submit(sub)).resolves.toBeUndefined();
    expect(s.submitState.value).toBe('error');
  });

  it('refresh sets error on failure', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(new Error('x')));
    const s = useFirewallScores();
    await s.refresh();
    expect(s.error.value).not.toBeNull();
    expect(s.loading.value).toBe(false);
  });
});

describe('useFirewallScores reset', () => {
  it('reset clears the submission state so a new run can submit', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ id: 1, score: 5, rank: 2 }));
    const scores = useFirewallScores();
    const run = { name: 'a', wave: 0, won: false, kills: 0, integrity: 0, credits: 0 };
    await scores.submit(run);
    expect(scores.submitState.value).toBe('sent');
    scores.reset();
    expect(scores.submitState.value).toBe('idle');
    expect(scores.lastRank.value).toBeNull();
    await scores.submit(run);
    expect(scores.submitState.value).toBe('sent');
    vi.unstubAllGlobals();
  });
});

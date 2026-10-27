import { ref } from 'vue';
import type { ScoreEntry, ScoreSubmission } from '@/composables/firewall/engine/types';

export function useFirewallScores() {
  const entries = ref<ScoreEntry[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const submitState = ref<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const lastRank = ref<number | null>(null);
  const lastEntryId = ref<number | null>(null);

  async function refresh(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      entries.value = await $fetch<ScoreEntry[]>('/api/firewall/scores');
    } catch {
      error.value = 'Could not load the Hall of Fame.';
    } finally {
      loading.value = false;
    }
  }

  async function submit(s: ScoreSubmission): Promise<void> {
    if (submitState.value === 'sending' || submitState.value === 'sent') return;
    submitState.value = 'sending';
    try {
      const res = await $fetch<{ id: number; score: number; rank: number }>(
        '/api/firewall/scores',
        { method: 'POST', body: s }
      );
      lastRank.value = res.rank;
      lastEntryId.value = res.id;
      submitState.value = 'sent';
      await refresh();
    } catch {
      submitState.value = 'error';
    }
  }

  /** Call when a new run starts so the next result can be submitted. */
  function reset(): void {
    submitState.value = 'idle';
    lastRank.value = null;
    lastEntryId.value = null;
  }

  return { entries, loading, error, submitState, lastRank, lastEntryId, refresh, submit, reset };
}

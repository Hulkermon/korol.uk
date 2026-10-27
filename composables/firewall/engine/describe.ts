import type { BuildingStats, TowerStats, UpgradeNode } from './types';
import { computeStats } from './stats';

type Format<S> = { label: string; key: keyof S; format: (v: number) => string; hideAt?: number };

const fmt = (n: number) => String(Math.round(n * 100) / 100);
const pct = (v: number) => fmt(v * 100) + '%';
const plusPct = (v: number) => '+' + pct(v);

export const TOWER_STAT_FORMATS: Format<TowerStats>[] = [
  { label: 'Damage', key: 'damage', format: fmt },
  { label: 'Range', key: 'range', format: fmt },
  { label: 'Rate', key: 'cooldown', format: (v) => fmt(1 / v) + '/s' },
  { label: 'Slow', key: 'slowFactor', format: (v) => pct(1 - v), hideAt: 1 },
  { label: 'Slow time', key: 'slowDuration', format: (v) => fmt(v) + 's' },
  { label: 'Stun', key: 'stunDuration', format: (v) => fmt(v) + 's' },
  { label: 'DoT', key: 'dotDps', format: (v) => fmt(v) + '/s' },
  { label: 'DoT time', key: 'dotDuration', format: (v) => fmt(v) + 's' },
  { label: 'Chain', key: 'chainCount', format: fmt },
  { label: 'Splash', key: 'splashRadius', format: fmt },
  { label: 'Pierce', key: 'armorPierce', format: pct },
];

export const BUILDING_STAT_FORMATS: Format<BuildingStats>[] = [
  { label: 'Aura range', key: 'auraRange', format: fmt },
  { label: 'Fire rate', key: 'fireRateBonus', format: plusPct },
  { label: 'Range', key: 'rangeBonus', format: plusPct },
  { label: 'Damage', key: 'damageBonus', format: plusPct },
  { label: 'Income', key: 'incomePerWave', format: (v) => '$' + fmt(v) + '/wave' },
  { label: 'Heal', key: 'healPerWave', format: (v) => fmt(v) + '/wave' },
  { label: 'Bounty', key: 'bountyBonus', format: plusPct },
];

/** Stat rows worth showing: zero (or "none") values are hidden. */
export const statRows = <S>(stats: S, formats: Format<S>[]): [string, string][] =>
  formats
    .filter((f) => (stats[f.key] as number) !== (f.hideAt ?? 0))
    .map((f) => [f.label, f.format(stats[f.key] as number)]);

/**
 * One "Label: before → after" line per stat the upgrade changes, computed
 * from the stats along the path leading to the node.
 */
export const describeUpgrade = <S>(
  base: S,
  tree: UpgradeNode<S>[],
  node: UpgradeNode<S>,
  formats: Format<S>[],
): string[] => {
  const path: string[] = [];
  for (let n: UpgradeNode<S> | undefined = node; n;) {
    path.unshift(n.id);
    n = tree.find((t) => t.id === n!.parent);
  }
  const before = computeStats(base, tree, path.slice(0, -1));
  const after = computeStats(base, tree, path);
  return formats
    .filter((f) => before[f.key] !== after[f.key])
    .map((f) => {
      const b = f.format(before[f.key] as number);
      const a = f.format(after[f.key] as number);
      return `${f.label} ${(before[f.key] as number) === (f.hideAt ?? 0) ? a : `${b} → ${a}`}`;
    });
};

import type { UpgradeNode } from './types';

export const getLevel = (purchased: string[]): number => 1 + purchased.length;

export const computeStats = <S>(base: S, tree: UpgradeNode<S>[], purchased: string[]): S => {
  const stats = { ...base } as Record<keyof S, number>;
  for (const node of tree) {
    if (!purchased.includes(node.id)) continue;
    for (const mod of node.mods) {
      if (mod.op === 'add') stats[mod.stat] += mod.value;
    }
    for (const mod of node.mods) {
      if (mod.op === 'mul') stats[mod.stat] *= mod.value;
    }
  }
  return stats as S;
};

export const availableUpgrades = <S>(
  tree: UpgradeNode<S>[],
  purchased: string[],
): UpgradeNode<S>[] => {
  const last = purchased.length ? purchased[purchased.length - 1] : null;
  return tree.filter((n) => n.parent === last && !purchased.includes(n.id));
};

export const lockedUpgrades = <S>(
  tree: UpgradeNode<S>[],
  purchased: string[],
): UpgradeNode<S>[] => {
  const bought = tree.filter((n) => purchased.includes(n.id));
  return tree.filter(
    (n) => !purchased.includes(n.id) && bought.some((b) => b.parent === n.parent && b.id !== n.id),
  );
};

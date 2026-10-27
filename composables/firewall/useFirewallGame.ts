import { ref, shallowRef } from 'vue';
import { getAbilityDef } from '@/composables/firewall/data/abilities';
import { useAbility } from '@/composables/firewall/engine/abilities';
import {
  buyUpgrade,
  placeBuilding,
  placeTower,
  sellEntity,
  setTargetMode as setTowerTargetMode,
  type Result,
} from '@/composables/firewall/engine/economy';
import { beginRun, createGame, restartGame, update } from '@/composables/firewall/engine/game';
import { pointToCell } from '@/composables/firewall/engine/path';
import { render } from '@/composables/firewall/engine/render';
import {
  H,
  W,
  pushNews,
  type Cell,
  type TargetMode,
  type Vec,
} from '@/composables/firewall/engine/types';
import { startWave as startWaveEngine } from '@/composables/firewall/engine/waves';

type Selection = { kind: 'tower' | 'building'; id: number };
type Placing = { kind: 'tower' | 'building'; defId: string };

const TICK_INTERVAL = 0.1;
const MAX_FRAME_DT = 0.25;

export const useFirewallGame = () => {
  const state = shallowRef(createGame());
  const tick = ref(0);
  const selection = ref<Selection | null>(null);
  const placing = ref<Placing | null>(null);
  const hoverCell = ref<Cell | null>(null);
  const pendingAbility = ref<string | null>(null);

  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let raf = 0;
  let lastFrame = 0;
  let lastTick = 0;
  let mouse: Vec | null = null;

  const bump = () => {
    tick.value++;
  };

  const report = (result: Result) => {
    if (!result.ok) pushNews(state.value, result.reason);
    return result.ok;
  };

  const toPoint = (e: MouseEvent): Vec => {
    const rect = canvas!.getBoundingClientRect();
    const sx = rect.width ? canvas!.width / rect.width : 1;
    const sy = rect.height ? canvas!.height / rect.height : 1;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const onMove = (e: MouseEvent) => {
    mouse = toPoint(e);
    hoverCell.value = pointToCell(mouse);
  };

  const onLeave = () => {
    mouse = null;
    hoverCell.value = null;
  };

  const onClick = (e: MouseEvent) => {
    const point = toPoint(e);
    const s = state.value;
    if (pendingAbility.value) {
      const id = pendingAbility.value;
      pendingAbility.value = null;
      report(useAbility(s, id, point));
      bump();
      return;
    }
    const cell = pointToCell(point);
    if (!cell) return;
    if (placing.value) {
      const { kind, defId } = placing.value;
      report(kind === 'tower' ? placeTower(s, defId, cell) : placeBuilding(s, defId, cell));
      bump();
      return;
    }
    const at = (e: { cell: Cell }) => e.cell.col === cell.col && e.cell.row === cell.row;
    const tower = s.towers.find(at);
    const building = tower ? undefined : s.buildings.find(at);
    if (tower) selection.value = { kind: 'tower', id: tower.id };
    else if (building) selection.value = { kind: 'building', id: building.id };
    else selection.value = null;
    bump();
  };

  const onContext = (e: MouseEvent) => {
    e.preventDefault();
    placing.value = null;
    pendingAbility.value = null;
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - lastFrame) / 1000, MAX_FRAME_DT);
    lastFrame = now;
    update(state.value, dt);
    if (ctx) {
      render(
        ctx,
        state.value,
        {
          hoverCell: hoverCell.value,
          placing: placing.value,
          selection: selection.value,
          pendingAbility: pendingAbility.value,
          mouse,
        },
        now / 1000,
      );
    }
    if (now / 1000 - lastTick >= TICK_INTERVAL) {
      lastTick = now / 1000;
      bump();
    }
  };

  const detach = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (canvas) {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('contextmenu', onContext);
    }
    canvas = null;
    ctx = null;
    mouse = null;
  };

  const attach = (el: HTMLCanvasElement) => {
    detach();
    canvas = el;
    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext('2d');
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('contextmenu', onContext);
    lastFrame = performance.now();
    lastTick = 0;
    raf = requestAnimationFrame(frame);
  };

  const begin = () => {
    beginRun(state.value);
    bump();
  };

  const restart = () => {
    restartGame(state.value);
    selection.value = null;
    placing.value = null;
    pendingAbility.value = null;
    bump();
  };

  const startWave = () => {
    if (state.value.phase === 'build') startWaveEngine(state.value);
    bump();
  };

  const togglePause = () => {
    state.value.paused = !state.value.paused;
    bump();
  };

  const setSpeed = (s: 1 | 2 | 3) => {
    state.value.speed = s;
    bump();
  };

  const beginPlacing = (kind: 'tower' | 'building', defId: string) => {
    pendingAbility.value = null;
    selection.value = null;
    placing.value = { kind, defId };
  };

  const cancelPlacing = () => {
    placing.value = null;
  };

  const select = (sel: Selection | null) => {
    placing.value = null;
    pendingAbility.value = null;
    selection.value = sel;
  };

  const sell = () => {
    const sel = selection.value;
    if (!sel) return;
    if (report(sellEntity(state.value, sel.kind, sel.id))) selection.value = null;
    bump();
  };

  const upgrade = (nodeId: string) => {
    const sel = selection.value;
    if (!sel) return;
    report(buyUpgrade(state.value, sel.kind, sel.id, nodeId));
    bump();
  };

  const setTargetMode = (mode: TargetMode) => {
    const sel = selection.value;
    if (!sel || sel.kind !== 'tower') return;
    setTowerTargetMode(state.value, sel.id, mode);
    bump();
  };

  const triggerAbility = (id: string) => {
    if (getAbilityDef(id).targeting === 'point') {
      placing.value = null;
      pendingAbility.value = id;
      return;
    }
    report(useAbility(state.value, id));
    bump();
  };

  const cancelAbility = () => {
    pendingAbility.value = null;
  };

  return {
    state,
    tick,
    selection,
    placing,
    hoverCell,
    pendingAbility,
    attach,
    detach,
    begin,
    restart,
    startWave,
    togglePause,
    setSpeed,
    beginPlacing,
    cancelPlacing,
    select,
    sell,
    upgrade,
    setTargetMode,
    triggerAbility,
    cancelAbility,
  };
};

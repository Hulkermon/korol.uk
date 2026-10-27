import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFirewallGame } from '../../composables/firewall/useFirewallGame';

const click = (canvas: HTMLCanvasElement, col: number, row: number) =>
  canvas.dispatchEvent(
    new MouseEvent('click', { clientX: col * 40 + 20, clientY: row * 40 + 20, bubbles: true }),
  );

describe('useFirewallGame', () => {
  let canvas: HTMLCanvasElement;
  let game: ReturnType<typeof useFirewallGame>;

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    canvas = document.createElement('canvas');
    game = useFirewallGame();
    game.attach(canvas);
    game.begin();
  });

  afterEach(() => {
    game.detach();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('begins placing and cancels', () => {
    game.beginPlacing('tower', 'ping');
    expect(game.placing.value).toEqual({ kind: 'tower', defId: 'ping' });
    game.cancelPlacing();
    expect(game.placing.value).toBeNull();
  });

  it('places a tower on click and leaves placing mode', () => {
    game.beginPlacing('tower', 'ping');
    click(canvas, 0, 0);
    expect(game.state.value.towers).toHaveLength(1);
    expect(game.placing.value).toBeNull();
  });

  it('reports failed placement in the news', () => {
    game.beginPlacing('tower', 'ping');
    click(canvas, 0, 0);
    game.beginPlacing('tower', 'ping');
    click(canvas, 0, 0);
    expect(game.state.value.towers).toHaveLength(1);
    expect(game.state.value.news.at(-1)).toBe('Cell is occupied');
    // a refused placement keeps the mode so the player can pick another cell
    expect(game.placing.value).not.toBeNull();
  });

  it('selects by cell, clears on empty cell, and sell clears selection', () => {
    game.beginPlacing('tower', 'ping');
    click(canvas, 0, 0);
    game.cancelPlacing();
    click(canvas, 0, 0);
    const id = game.state.value.towers[0].id;
    expect(game.selection.value).toEqual({ kind: 'tower', id });
    game.sell();
    expect(game.selection.value).toBeNull();
    expect(game.state.value.towers).toHaveLength(0);
    click(canvas, 1, 0);
    expect(game.selection.value).toBeNull();
  });

  it('sets pendingAbility for point abilities and clears it on cancel', () => {
    game.triggerAbility('ion');
    expect(game.pendingAbility.value).toBe('ion');
    game.cancelAbility();
    expect(game.pendingAbility.value).toBeNull();
  });

  it('right click cancels placing', () => {
    game.beginPlacing('tower', 'ping');
    canvas.dispatchEvent(new MouseEvent('contextmenu', { cancelable: true }));
    expect(game.placing.value).toBeNull();
  });

  it('toggles pause and sets speed', () => {
    game.togglePause();
    expect(game.state.value.paused).toBe(true);
    game.togglePause();
    expect(game.state.value.paused).toBe(false);
    game.setSpeed(3);
    expect(game.state.value.speed).toBe(3);
  });

  it('detach cancels the loop and unbinds listeners', () => {
    game.detach();
    expect(cancelAnimationFrame).toHaveBeenCalled();
    game.beginPlacing('tower', 'ping');
    click(canvas, 0, 0);
    expect(game.state.value.towers).toHaveLength(0);
  });
});

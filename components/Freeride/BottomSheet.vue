<template>
  <div
    class="fr-sheet"
    :class="{ dragging }"
    :style="{ height: `${currentHeight}px` }">
    <div
      class="fr-sheet-top"
      @pointerdown="onHeaderDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp">
      <button
        type="button"
        class="fr-sheet-handle"
        aria-label="Resize panel"
        @pointerdown="onHandleDown">
        <span class="fr-sheet-bar"></span>
      </button>
      <div class="fr-sheet-header">
        <slot name="header" />
      </div>
    </div>
    <div class="fr-sheet-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
  import { SNAPS, clampHeight, nearestSnap, snapHeight, type Snap } from '@/composables/freeride/sheet';

  const props = defineProps<{ modelValue: Snap }>();
  const emit = defineEmits<{ (e: 'update:modelValue', v: Snap): void }>();

  const viewport = ref(typeof window !== 'undefined' ? window.innerHeight : 800);
  const dragging = ref(false);
  const dragHeight = ref(0);

  const currentHeight = computed(() =>
    dragging.value ? dragHeight.value : snapHeight(props.modelValue, viewport.value)
  );

  let startY = 0;
  let startHeight = 0;
  let moved = false;
  let samples: { y: number; t: number }[] = [];
  let pointerTarget: HTMLElement | null = null;

  function onResize() {
    viewport.value = window.innerHeight;
  }
  onMounted(() => window.addEventListener('resize', onResize));
  onBeforeUnmount(() => window.removeEventListener('resize', onResize));

  function begin(e: PointerEvent, target: HTMLElement) {
    viewport.value = window.innerHeight;
    startY = e.clientY;
    startHeight = snapHeight(props.modelValue, viewport.value);
    moved = false;
    samples = [{ y: e.clientY, t: e.timeStamp }];
    dragHeight.value = startHeight;
    dragging.value = true;
    pointerTarget = target;
    target.setPointerCapture?.(e.pointerId);
  }

  function onHandleDown(e: PointerEvent) {
    e.stopPropagation();
    begin(e, e.currentTarget as HTMLElement);
  }

  function onHeaderDown(e: PointerEvent) {
    const el = e.target as HTMLElement;
    if (el.closest?.('button, input, select, textarea, a, [role="tab"]')) return;
    begin(e, e.currentTarget as HTMLElement);
  }

  function onMove(e: PointerEvent) {
    if (!dragging.value) return;
    const dy = startY - e.clientY;
    if (Math.abs(dy) > 4) moved = true;
    dragHeight.value = clampHeight(startHeight + dy, viewport.value);
    samples.push({ y: e.clientY, t: e.timeStamp });
    if (samples.length > 5) samples.shift();
  }

  function onUp(e: PointerEvent) {
    if (!dragging.value) return;
    dragging.value = false;
    pointerTarget?.releasePointerCapture?.(e.pointerId);
    pointerTarget = null;
    if (!moved) {
      if ((e.target as HTMLElement).closest?.('.fr-sheet-handle')) {
        const next = SNAPS[(SNAPS.indexOf(props.modelValue) + 1) % SNAPS.length];
        emit('update:modelValue', next);
      }
      return;
    }
    let velocity = 0;
    const first = samples[0];
    const last = samples[samples.length - 1];
    if (first && last && last.t > first.t) velocity = (first.y - last.y) / (last.t - first.t);
    emit('update:modelValue', nearestSnap(dragHeight.value, viewport.value, velocity));
  }
</script>

<style scoped>
  .fr-sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1100;
    display: flex;
    flex-direction: column;
    background: #f7f9fb;
    color: #1f2a37;
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -4px 16px rgba(31, 42, 55, 0.2);
    transition: height 0.25s ease;
  }
  .fr-sheet.dragging {
    transition: none;
  }
  .fr-sheet-top {
    flex: none;
    touch-action: none;
  }
  .fr-sheet-handle {
    display: flex;
    justify-content: center;
    width: 100%;
    padding: 8px 0;
    border: 0;
    background: none;
    cursor: grab;
    touch-action: none;
  }
  .fr-sheet-bar {
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: #6b7a8a;
    opacity: 0.6;
  }
  .fr-sheet-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-bottom: env(safe-area-inset-bottom);
  }
</style>

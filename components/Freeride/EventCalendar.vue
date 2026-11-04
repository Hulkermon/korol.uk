<template>
  <div class="fr-cal">
    <div class="fr-cal-toolbar">
      <MapLegend
        :model-value="legend"
        :events="events"
        collapsed
        @update:model-value="emit('update:legend', $event)" />
      <button
        type="button"
        class="fr-cal-toggle"
        data-test="only-plan"
        :aria-pressed="onlyPlan ? 'true' : 'false'"
        @click="onlyPlan = !onlyPlan">
        In my plan
      </button>
      <button
        type="button"
        class="fr-cal-toggle"
        data-test="only-homies"
        :aria-pressed="onlyHomies ? 'true' : 'false'"
        @click="onlyHomies = !onlyHomies">
        Homies' events
      </button>
      <div v-if="!mobile" class="fr-cal-nav">
        <button
          type="button"
          class="fr-cal-step"
          data-test="prev-month"
          aria-label="Previous month"
          :disabled="monthIndex <= 0"
          @click="step(-1)">
          ‹
        </button>
        <span class="fr-cal-month" data-test="month-label">{{ monthLabel(month) }}</span>
        <button
          type="button"
          class="fr-cal-step"
          data-test="next-month"
          aria-label="Next month"
          :disabled="monthIndex >= months.length - 1"
          @click="step(1)">
          ›
        </button>
      </div>
    </div>

    <p v-if="filtered.length === 0" class="fr-cal-empty">No events match these filters</p>

    <template v-if="mobile">
      <div v-if="filtered.length > 0" class="fr-cal-agenda">
        <section v-for="g in groups" :key="g.month" class="fr-cal-group" :data-month="g.month">
          <h3 class="fr-cal-group-title">{{ g.label }}</h3>
          <button
            v-for="e in g.events"
            :key="e.id"
            type="button"
            class="fr-cal-row"
            :class="{
              'fr-cal-row--selected': e.id === selectedId,
              'fr-cal-row--done': isFinished(e),
            }"
            @click="emit('select', e.id)">
            <span class="fr-cal-dot" :style="{ background: pinColor(e) }"></span>
            <span class="fr-cal-row-date">{{ formatRange(e.start, e.end) }}</span>
            <span class="fr-cal-row-name">{{ e.name }}</span>
            <span v-if="planned.has(e.id)" class="fr-inplan" title="In your plan">✓</span>
          </button>
        </section>
      </div>
    </template>

    <template v-else>
      <div class="fr-cal-weekdays">
        <span v-for="d in WEEKDAYS" :key="d">{{ d }}</span>
      </div>
      <div v-for="(week, wi) in weeks" :key="wi" class="fr-cal-week" data-test="week">
        <div
          v-for="(day, di) in week.days"
          :key="day.date"
          class="fr-cal-day"
          :class="{ 'fr-cal-day--out': !day.inMonth }"
          :style="{ gridColumn: di + 1, gridRow: 1 }">
          {{ day.day }}
        </div>
        <button
          v-for="bar in week.bars"
          :key="bar.event.id"
          type="button"
          class="fr-cal-bar"
          :class="{
            'fr-cal-bar--selected': bar.event.id === selectedId,
            'fr-cal-bar--done': isFinished(bar.event),
            'fr-cal-bar--left': bar.contLeft,
            'fr-cal-bar--right': bar.contRight,
          }"
          :style="{
            background: pinColor(bar.event),
            gridColumn: `${bar.col + 1} / span ${bar.span}`,
            gridRow: bar.lane + 2,
          }"
          :title="bar.event.name"
          @click="emit('select', bar.event.id)">
          <span class="fr-cal-bar-name">{{ bar.event.name }}</span>
          <span class="fr-cal-bar-tag">{{ pinRows(bar.event).join(' ') }}</span>
          <span v-if="planned.has(bar.event.id)" class="fr-inplan" title="In your plan">✓</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue';
  import MapLegend from '@/components/Freeride/MapLegend.vue';
  import {
    agendaGroups,
    calendarEvents,
    initialMonth,
    monthGrid,
    monthLabel,
    seasonMonths,
  } from '@/composables/freeride/calendar';
  import type { DateRange, LegendFilter } from '@/composables/freeride/filters';
  import { pinColor, pinRows } from '@/composables/freeride/pins';
  import { isFinished } from '@/composables/freeride/riders';
  import type { FreerideEvent } from '@/composables/freeride/types';

  const props = defineProps<{
    events: FreerideEvent[];
    legend: LegendFilter;
    plannedIds: string[];
    homieKeys: string[];
    selectedId: string | null;
    bounds: DateRange;
    mobile: boolean;
    today?: string;
  }>();

  const emit = defineEmits<{
    select: [id: string];
    'update:legend': [value: LegendFilter];
  }>();

  const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const onlyPlan = ref(false);
  const onlyHomies = ref(false);

  const months = computed(() => seasonMonths(props.bounds));
  const monthIndex = computed(() => months.value.indexOf(month.value));

  function step(delta: number) {
    const next = months.value[monthIndex.value + delta];
    if (next) month.value = next;
  }

  const planned = computed(() => new Set(props.plannedIds));

  const filtered = computed(() =>
    calendarEvents(
      props.events,
      { legend: props.legend, onlyPlan: onlyPlan.value, onlyHomies: onlyHomies.value },
      props.plannedIds,
      props.homieKeys,
    ),
  );
  const month = ref(
    initialMonth(
      months.value,
      props.today ?? new Date().toISOString().slice(0, 10),
      filtered.value[0]?.start,
    ),
  );
  const weeks = computed(() => monthGrid(month.value, filtered.value));
  const groups = computed(() => agendaGroups(filtered.value));

  function formatRange(start: string, end: string): string {
    const [, sm, sd] = start.split('-').map(Number);
    const [, em, ed] = end.split('-').map(Number);
    if (start === end) return `${sd} ${MONTHS[sm - 1]}`;
    if (sm === em) return `${sd}–${ed} ${MONTHS[sm - 1]}`;
    return `${sd} ${MONTHS[sm - 1]} – ${ed} ${MONTHS[em - 1]}`;
  }
</script>

<style scoped>
  .fr-cal {
    height: 100%;
    overflow: auto;
    background: #f7f9fb;
    color: #1f2a37;
    padding: 12px;
    box-sizing: border-box;
  }
  .fr-cal-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 12px;
  }
  .fr-cal-toggle {
    border: 1px solid #c9d3dd;
    background: #fff;
    color: #1f2a37;
    border-radius: 999px;
    padding: 6px 12px;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  .fr-cal-toggle[aria-pressed='true'] {
    background: #1f2a37;
    border-color: #1f2a37;
    color: #fff;
  }
  .fr-cal-nav {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .fr-cal-month {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 22px;
    font-weight: 700;
    text-transform: uppercase;
    min-width: 170px;
    text-align: center;
  }
  .fr-cal-step {
    width: 32px;
    height: 32px;
    border: 1px solid #c9d3dd;
    background: #fff;
    border-radius: 6px;
    font-size: 18px;
    cursor: pointer;
    color: #1f2a37;
  }
  .fr-cal-step:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .fr-cal-empty {
    color: #6b7a8a;
    text-align: center;
    padding: 32px 0;
  }
  .fr-cal-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-weight: 600;
    color: #6b7a8a;
    text-transform: uppercase;
    padding: 0 6px 4px;
  }
  .fr-cal-week {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    grid-auto-rows: 24px;
    grid-template-rows: 26px;
    row-gap: 2px;
    min-height: 90px;
    align-content: start;
    background: #fff;
    border: 1px solid #e1e7ed;
    border-top: 0;
  }
  .fr-cal-weekdays + .fr-cal-week {
    border-top: 1px solid #e1e7ed;
  }
  .fr-cal-day {
    padding: 4px 6px;
    font-size: 12px;
    color: #1f2a37;
    border-left: 1px solid #eef2f6;
  }
  .fr-cal-day--out {
    color: #aab5c0;
  }
  .fr-cal-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    margin: 0 2px;
    padding: 0 6px;
    border: 0;
    border-radius: 6px;
    color: #fff;
    font: inherit;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    text-shadow: 0 0 2px rgba(0, 0, 0, 0.35);
  }
  .fr-cal-bar--left {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    margin-left: 0;
  }
  .fr-cal-bar--right {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    margin-right: 0;
  }
  .fr-cal-bar--done {
    opacity: 0.55;
  }
  .fr-cal-bar--selected {
    outline: 2px solid #1f2a37;
    outline-offset: 1px;
  }
  .fr-cal-bar-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fr-cal-bar-tag {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-weight: 700;
    font-size: 11px;
    white-space: nowrap;
  }
  .fr-inplan {
    flex: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #1f2a37;
    color: #fff;
    font-size: 10px;
    line-height: 16px;
    text-align: center;
    text-shadow: none;
  }
  .fr-cal-agenda {
    padding-bottom: 120px;
  }
  .fr-cal-group-title {
    font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif;
    font-size: 20px;
    text-transform: uppercase;
    margin: 14px 0 6px;
  }
  .fr-cal-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px;
    margin-bottom: 4px;
    border: 1px solid #e1e7ed;
    border-radius: 8px;
    background: #fff;
    font: inherit;
    text-align: left;
    color: #1f2a37;
    cursor: pointer;
  }
  .fr-cal-row--selected {
    border-color: #5aa9e6;
    box-shadow: 0 0 0 2px #5aa9e6;
  }
  .fr-cal-row--done {
    opacity: 0.6;
  }
  .fr-cal-dot {
    flex: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  .fr-cal-row-date {
    flex: none;
    min-width: 78px;
    font-size: 13px;
    color: #6b7a8a;
  }
  .fr-cal-row-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

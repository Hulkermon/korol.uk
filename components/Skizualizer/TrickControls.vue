<template>
  <div class="controls-container">
    <div class="control-group">
      <label>Trick Name:</label>
      <input
        type="text"
        class="win95-input"
        v-model="trickName"
        placeholder="backflip"
        @keyup.enter="startTrick" />
      <button class="win95-button" @click="startTrick">Flip It!</button>
    </div>
    <div class="control-group">
      <label>Progress:</label>
      <input
        type="range"
        class="win95-slider"
        min="0"
        max="100"
        :value="sliderValue"
        @input="handleSliderInput" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  const trickName = ref('backflip');
  const sliderValue = ref(0);

  const emit = defineEmits(['update:trick', 'update:progress']);

  const startTrick = () => {
    // TODO: Refactor this crap and use like global state or something
    
    // emit('update:trick', trickName.value);
  };

  const handleSliderInput = () => {
    // TODO: Refactor this crap and use like global state or something
    
    // console.log('emitting progress:', sliderValue.value);
    // emit('update:progress', sliderValue.value / 100);
  }
</script>

<template>
  <div class="sudoku-container bg-[#14031f] h-screen flex justify-center items-center">
    <div class="sudoku grid grid-cols-3 grid-rows-3">
      <!-- Outer loop for the 9 houses (3x3 blocks), using 0-indexed houseIdx -->
      <div
        class="sudoku-row grid grid-cols-3 grid-rows-3 border border-white"
        v-for="(house, houseIdx) in 9"
        :key="'house-' + houseIdx">
        <!-- Inner loop for the 9 cells within each house, using 0-indexed cellIdx -->
        <div
          class="sudoku-cell border border-white/25 size-12"
          v-for="(cell, cellIdx) in 9"
          :key="'cell-' + houseIdx + '-' + cellIdx">
          <input
            type="number"
            min="1"
            max="9"
            class="bg-transparent size-full text-white text-center text-xl focus:bg-indigo-700/25 outline-none"
            :class="{ '!bg-red-400/50': !validateCell(houseIdx, cellIdx) }"
            @input="handleInput"
            @keydown="handleKeyDown($event, houseIdx, cellIdx)"
            :tabindex="getTabIndex(houseIdx, cellIdx)" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  const handleInput = (event: Event) => {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.value;

    // Allow only digits, including zero which will clear cell
    value = value.replace(/[^0-9]/g, '');

    // If multiple characters, take second one as it's probably the most recent
    if (value.length > 1) {
      value = value.charAt(1);
    }

    // Ensure the value is between 1 and 9
    if (value) {
      const num = parseInt(value, 10);
      if (num < 1 || num > 9) {
        value = '';
      }
    }

    inputElement.value = value;
  };

  const validateCell = (houseIdx: number, cellIdx: number) => {
    const rowInHouse = Math.floor(cellIdx / 3);
    const houseRow = Math.floor(houseIdx / 3);
    const globalRow = houseRow * 3 + rowInHouse;
    
    const colInHouse = cellIdx % 3;

    

    if (false) {
      return false;
    }
    return true;
  };

  const handleKeyDown = (
    event: KeyboardEvent,
    currentHouseIdx: number,
    currentCellInHouseIdx: number
  ) => {
    const key = event.key;

    // Calculate current globalRow and globalCol from houseIdx and cellIdx
    const currentHouseRow = Math.floor(currentHouseIdx / 3);
    const currentHouseCol = currentHouseIdx % 3;
    const currentCellRowInHouse = Math.floor(currentCellInHouseIdx / 3);
    const currentCellColInHouse = currentCellInHouseIdx % 3;

    let globalRow = currentHouseRow * 3 + currentCellRowInHouse;
    let globalCol = currentHouseCol * 3 + currentCellColInHouse;

    let newGlobalRow = globalRow;
    let newGlobalCol = globalCol;

    if (key === 'ArrowUp' || key.toLowerCase() === 'w') {
      newGlobalRow = (globalRow - 1 + 9) % 9; // +9 for correct modulo of negative numbers
      event.preventDefault();
    } else if (key === 'ArrowDown' || key.toLowerCase() === 's') {
      newGlobalRow = (globalRow + 1) % 9;
      event.preventDefault();
    } else if (key === 'ArrowLeft' || key.toLowerCase() === 'a') {
      newGlobalCol = (globalCol - 1 + 9) % 9; // +9 for correct modulo of negative numbers
      event.preventDefault();
    } else if (key === 'ArrowRight' || key.toLowerCase() === 'd') {
      newGlobalCol = (globalCol + 1) % 9;
      event.preventDefault();
    } else {
      return; // Not a navigation key
    }

    // Calculate the tabindex of the target cell: (globalRow * 9) + globalCol + 1
    const nextTabIndex = newGlobalRow * 9 + newGlobalCol + 1;

    // Find the next input element by its tabindex
    const nextInput = document.querySelector(
      `input[tabindex="${nextTabIndex}"]`
    ) as HTMLInputElement | null;

    if (nextInput) {
      nextInput.focus();
    }
  };

  const getTabIndex = (houseIndex: number, cellInHouseIndex: number): number => {
    // houseIndex: 0-8 (which of the 9 large 3x3 squares, iterated row by row, then col by col)
    // cellInHouseIndex: 0-8 (which cell within that large square, iterated row by row, then col by col)

    const houseRow = Math.floor(houseIndex / 3); // Row of the current house (0, 1, or 2)
    const houseCol = houseIndex % 3; // Column of the current house (0, 1, or 2)

    const cellRowInHouse = Math.floor(cellInHouseIndex / 3); // Row of the cell within its house (0, 1, or 2)
    const cellColInHouse = cellInHouseIndex % 3; // Column of the cell within its house (0, 1, or 2)

    // Calculate the global row and column of the cell in the 9x9 grid
    const globalRow = houseRow * 3 + cellRowInHouse; // Overall row of the cell (0-8)
    const globalCol = houseCol * 3 + cellColInHouse; // Overall column of the cell (0-8)

    // Tabindex should be row-major: (globalRow * 9) + globalCol + 1
    return globalRow * 9 + globalCol + 1;
  };
</script>

<style lang="scss" scoped>
  /* Hide spinner arrows from number input */
  input[type='number']::-webkit-inner-spin-button,
  input[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type='number'] {
    -moz-appearance: textfield; /* Firefox */
    appearance: textfield; /* Standard */
  }

  /* Hide blinking cursor when input is focused */
  input[type='number']:focus {
    caret-color: transparent;
  }
</style>

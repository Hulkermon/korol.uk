import type { DosCommand, DosCommandContext } from '@/composables/dos/useDosCommands';
// Removed inject import

const snakeCommand: DosCommand = {
  name: 'snake',
  description: 'Starts the classic Snake game.',
  execute: async (args: string[], context: DosCommandContext): Promise<string> => {
    // Get the function from the context
    const enterGameModeFunc = context.enterGameMode;

    if (enterGameModeFunc) {
      enterGameModeFunc();
      // Return an empty string, as the game takes over the display
      return ''; // Return empty string to indicate success but no output
    } else {
      // This might happen if the Terminal component ref wasn't ready
      console.error('Snake command context missing enterGameMode function.');
      return 'Error: Could not start game mode. Terminal context not available.';
    }
  },
};

export default snakeCommand;

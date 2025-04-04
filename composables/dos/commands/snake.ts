import type { DosCommand, DosCommandContext } from '@/composables/dos/useDosCommands';
// Import the options type from the main game file or types file
import type { SnakeGameOptions } from '@/composables/dos/games/snake/types';


const snakeCommand: DosCommand = {
  name: 'snake',
  description: 'Starts the classic Snake game. Args: -t/--tron, -p/--powerups',
  execute: async (args: string[], context: DosCommandContext): Promise<string> => {
    // Cast to the correct type, now including enablePowerups
    const enterGameModeFunc = context.enterGameMode as (options: SnakeGameOptions) => void | undefined;

    // Parse arguments for both modes
    const options: SnakeGameOptions = {
      isTron: args.includes('-t') || args.includes('--tron'),
      enablePowerups: args.includes('-p') || args.includes('--powerups'),
      // Add future options here
    };

    // Prevent Tron and Powerups from being active simultaneously for now (can be adjusted later)
    if (options.isTron && options.enablePowerups) {
        return 'Error: Tron mode and Power-ups mode cannot be enabled at the same time.';
    }


    if (enterGameModeFunc) {
      enterGameModeFunc(options);
      return ''; // Return empty string to indicate success but no output
    } else {
      // This might happen if the Terminal component ref wasn't ready
      console.error('Snake command context missing enterGameMode function.');
      return 'Error: Could not start game mode. Terminal context not available.';
    }
  },
};

export default snakeCommand;

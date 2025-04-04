import type { DosCommand, DosCommandContext } from '@/composables/dos/useDosCommands';

interface SnakeGameOptions {
  isTron: boolean;
}

const snakeCommand: DosCommand = {
  name: 'snake',
  description: 'Starts the classic Snake game. Args: -t/--tron',
  execute: async (args: string[], context: DosCommandContext): Promise<string> => {
    const enterGameModeFunc = context.enterGameMode as (options: SnakeGameOptions) => void | undefined;

    const options: SnakeGameOptions = {
      isTron: args.includes('-t') || args.includes('--tron'),
    };

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

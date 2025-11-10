import type { DosCommand, DosCommandContext } from '@/composables/dos/useDosCommands';

const cdCommand: DosCommand = {
  name: 'cd',
  description: 'Displays the name of or changes the current directory.',
  execute: async (args: string[], context: DosCommandContext): Promise<string> => {
    if (args.length === 0) {
      // Display current directory
      return context.currentPath.join('\\');
    }

    if (args.length > 1) {
      return 'Invalid syntax. Too many arguments.';
    }

    const target = args[0];
    const errorMessage = context.changeDir(target);

    return errorMessage || ''; // Return error message if change failed, otherwise empty string
  },
};

export default cdCommand;

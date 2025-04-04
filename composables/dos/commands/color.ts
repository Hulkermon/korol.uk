import type { DosCommand, DosCommandContext } from '@/composables/dos/useDosCommands';

const allowedColors = ['green', 'yellow', 'cyan', 'white', 'red', 'pink'];

const colorCommand: DosCommand = {
  name: 'color',
  description: `Sets the default console text color. Usage: color [color_name]. Allowed colors: ${allowedColors.join(', ')}.`,
  execute: async (args: string[], context: DosCommandContext): Promise<string> => {
    if (args.length !== 1) {
      return `Invalid syntax. Usage: color [color_name]. Allowed: ${allowedColors.join(', ')}`;
    }

    const requestedColor = args[0].toLowerCase();

    if (allowedColors.includes(requestedColor)) {
      context.setTerminalColor(requestedColor);
      return ''; // No output on success, color change happens via state
    } else {
      return `Invalid color specified: ${args[0]}. Allowed: ${allowedColors.join(', ')}`;
    }
  },
};

export default colorCommand;

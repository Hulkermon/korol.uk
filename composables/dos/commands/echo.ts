import type { DosCommand, DosCommandContext } from '@/composables/dos/useDosCommands';

const echoCommand: DosCommand = {
  name: 'echo',
  description: 'Displays messages, or turns command echoing on or off.',
  execute: async (args: string[], context: DosCommandContext): Promise<string> => {
    // Basic implementation: just display the arguments joined by spaces
    // TODO: Implement ON/OFF functionality later if desired
    if (args.length === 0) {
      // In real DOS, this would show if ECHO is ON or OFF.
      return 'ECHO is on.'; // Placeholder
    }
    return args.join(' ');
  },
};

export default echoCommand;

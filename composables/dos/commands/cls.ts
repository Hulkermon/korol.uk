import type { DosCommand, DosCommandContext } from '@/composables/dos/useDosCommands';

const clsCommand: DosCommand = {
  name: 'cls',
  aliases: ['clear'],
  description: 'Clears the screen.',
  execute: async (args: string[], context: DosCommandContext): Promise<string | string[]> => {
    // The actual clearing logic is handled directly in useDosCommands.
    // This command just needs to exist for discovery and potentially return nothing.
    return ''; // Return empty string, no output needed
  },
};

export default clsCommand;

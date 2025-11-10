import type { DosCommand, DosCommandContext } from '@/composables/dos/useDosCommands';

const verCommand: DosCommand = {
  name: 'version',
  aliases: ['version'],
  description: 'Displays the ClineDOS version.',
  execute: async (args: string[], context: DosCommandContext): Promise<string[]> => {
    return vibeOS_thin;
  },
};

export default verCommand;

import type { DosCommand, DosCommandContext } from '@/composables/dos/useDosCommands';

// Simple ASCII Art for "DOS NUTS V.4.20"
// (Could be improved with more detail or different styles)
const dosNutsArt = [
  ' ____   ___  ____     _   _ __  __ _   _ ____  ',
  '|  _ \\ / _ \\/ ___|   | \\ | |  \\/  | | | / ___| ',
  '| | | | | | \\___ \\   |  \\| | |\\/| | | | \\___ \\ ',
  '| |_| | |_| |___) |  | |\\  | |  | | |_| |___) |',
  '|____/ \\___/|____/   |_| \\_|_|  |_|\\___/|____/ ',
  '                                  V.4.20       '
];


const verCommand: DosCommand = {
  name: 'ver',
  description: 'Displays the ClineDOS version.',
  execute: async (args: string[], context: DosCommandContext): Promise<string[]> => {
    return dosNutsArt;
  },
};

export default verCommand;

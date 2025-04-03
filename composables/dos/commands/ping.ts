import type { DosCommand } from "../useDosCommands";

const pingCommand: DosCommand = {
  name: 'ping',
  description: 'Replies with pong',
  execute: async (args?: string[]): Promise<string> => {
    // Basic implementation for now
    return 'pong';
  },
};

export default pingCommand;

export interface DosCommand {
  name: string;
  description: string;
  execute: (args?: string[]) => Promise<string | string[]>; // Can return single line or multiple lines
}

const pingCommand: DosCommand = {
  name: 'ping',
  description: 'Replies with pong',
  execute: async (args?: string[]): Promise<string> => {
    // Basic implementation for now
    return 'pong';
  },
};

export default pingCommand;

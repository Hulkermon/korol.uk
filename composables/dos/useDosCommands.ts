import { ref } from 'vue';
import type { DosCommand } from './commands/ping'; // Import the interface

// Define the structure for history entries
export interface HistoryEntry {
  id: number;
  type: 'input' | 'output' | 'error';
  text: string | string[]; // Output can be multi-line
  timestamp: Date;
}

// Placeholder implementation for now
export function useDosCommands() {
  const commandHistory = ref<HistoryEntry[]>([]);
  let historyIdCounter = 0;

  // Function to dynamically load command modules
  const loadCommand = async (commandName: string): Promise<DosCommand | null> => {
    // Basic implementation: only handles 'ping' for now.
    // A more robust version would handle errors and potentially list available commands.
    if (commandName.toLowerCase() === 'ping') {
      try {
        // Use dynamic import - Vitest's vi.mock should intercept this for 'ping' during tests
        const module = await import(`@/composables/dos/commands/${commandName.toLowerCase()}.ts`);
        return module.default as DosCommand;
      } catch (error) {
        console.error(`Error loading command module ${commandName}:`, error);
        return null; // Command module not found or failed to load
      }
    }
    // In the future, add more commands here or implement a discovery mechanism
    return null; // Command not found
  };

  const addHistoryEntry = (type: HistoryEntry['type'], text: string | string[]) => {
    commandHistory.value.push({
      id: historyIdCounter++,
      type,
      text,
      timestamp: new Date(),
    });
  };

  const processCommand = async (input: string) => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    addHistoryEntry('input', `C:\\> ${trimmedInput}`); // Add input to history

    const [commandName, ...args] = trimmedInput.split(/\s+/);

    try {
      const command = await loadCommand(commandName); // Use the placeholder loader

      if (command) {
        const output = await command.execute(args);
        addHistoryEntry('output', output);
      } else {
        addHistoryEntry('error', `Bad command or file name: ${commandName}`);
      }
    } catch (error) {
       console.error(`Error executing command ${commandName}:`, error);
       addHistoryEntry('error', `Error executing command: ${commandName}`);
    }
  };

  return {
    commandHistory,
    processCommand,
    // Expose loadCommand only if needed externally, otherwise keep it internal
  };
}

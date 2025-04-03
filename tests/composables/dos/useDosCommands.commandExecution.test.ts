import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDosCommands } from '@/composables/dos/useDosCommands'; // Use alias path

// Mock the command module using alias
vi.mock('@/composables/dos/commands/ping', () => ({
  default: {
    name: 'ping',
    description: 'Replies with pong',
    execute: vi.fn(() => Promise.resolve('pong')),
  },
}));

// We will use the actual useDosCommands composable now.
// The vi.mock above should intercept the dynamic import for 'ping'
// inside the actual composable's loadCommand function (if implemented correctly).

describe('useDosCommands - Command Execution', () => {
  beforeEach(() => {
    // Reset mocks AND clear command history before each test
    vi.clearAllMocks();
    // Get a fresh instance for each test to reset state like history
    const { commandHistory, processCommand } = useDosCommands();
    commandHistory.value = []; // Explicitly clear history state
  });

  it('should execute a known command and add input/output to history', async () => {
    // Get a fresh instance for the test
    const { commandHistory, processCommand } = useDosCommands();
    commandHistory.value = []; // Ensure clean state

    await processCommand('ping'); // Use the actual processCommand

    // Check if the mocked execute function was called
    // We need to import the mocked module to check its functions
    const pingCommandMock = await import('@/composables/dos/commands/ping'); // Use alias path
    // The actual processCommand should internally call loadCommand,
    // which should dynamically import the command. Vitest's mock for ping
    // should intercept this dynamic import.
    expect(pingCommandMock.default.execute).toHaveBeenCalled();

    // Check history for command input and output (expect 2 entries)
    expect(commandHistory.value).toHaveLength(2);

    // Check input entry
    expect(commandHistory.value[0].type).toBe('input');
    expect(commandHistory.value[0].text).toBe('C:\\> ping');

    // Check output entry
    expect(commandHistory.value[1].type).toBe('output');
    expect(commandHistory.value[1].text).toBe('pong');
  });
});

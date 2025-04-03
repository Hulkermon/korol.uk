import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDosCommands } from '@/composables/dos/useDosCommands';

// Mock ping command again for consistent testing environment
vi.mock('@/composables/dos/commands/ping', () => ({
  default: {
    name: 'ping',
    description: 'Replies with pong',
    execute: vi.fn(() => Promise.resolve('pong')),
  },
}));

describe('useDosCommands - History', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure clean state for each test
    const { commandHistory } = useDosCommands();
    commandHistory.value = [];
  });

  it('should add input and output entries to history after a successful command', async () => {
    const { commandHistory, processCommand } = useDosCommands();
    await processCommand('ping');

    expect(commandHistory.value).toHaveLength(2);
    expect(commandHistory.value[0].type).toBe('input');
    expect(commandHistory.value[0].text).toBe('C:\\> ping');
    expect(commandHistory.value[1].type).toBe('output');
    expect(commandHistory.value[1].text).toBe('pong');
  });

  it('should add input and error entries to history after an unknown command', async () => {
    const { commandHistory, processCommand } = useDosCommands();
    const command = 'unknowncmd';
    await processCommand(command);

    expect(commandHistory.value).toHaveLength(2);
    expect(commandHistory.value[0].type).toBe('input');
    expect(commandHistory.value[0].text).toBe(`C:\\> ${command}`);
    expect(commandHistory.value[1].type).toBe('error');
    expect(commandHistory.value[1].text).toContain('Bad command or file name');
  });

  it('should not add anything to history for empty input', async () => {
    const { commandHistory, processCommand } = useDosCommands();
    await processCommand('');
    await processCommand('   '); // Test with whitespace only

    expect(commandHistory.value).toHaveLength(0);
  });

  it('should assign unique, incrementing IDs to history entries', async () => {
     const { commandHistory, processCommand } = useDosCommands();
     await processCommand('ping'); // Adds 2 entries
     await processCommand('another'); // Adds 2 entries

     expect(commandHistory.value).toHaveLength(4);
     const ids = commandHistory.value.map(entry => entry.id);
     // Check for uniqueness
     expect(new Set(ids).size).toBe(ids.length);
     // Check for incrementing order (assuming they are added sequentially)
     expect(ids).toEqual([0, 1, 2, 3]); // Or check if ids[i] < ids[i+1]
  });
});

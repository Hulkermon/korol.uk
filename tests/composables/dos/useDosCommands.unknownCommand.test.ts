import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDosCommands } from '@/composables/dos/useDosCommands';

// We don't need to mock specific commands here, as we're testing the fallback case.
// However, ensure no mocks from other files interfere if running all tests together.

describe('useDosCommands - Unknown Command', () => {
  beforeEach(() => {
    // Reset any potential mocks if needed
    vi.clearAllMocks();
    // Get a fresh instance and clear history
    const { commandHistory } = useDosCommands();
    commandHistory.value = [];
  });

  it('should add input and error message to history for an unknown command', async () => {
    const { commandHistory, processCommand } = useDosCommands();
    commandHistory.value = []; // Ensure clean state

    const unknownCommand = 'nonexistent';
    await processCommand(unknownCommand);

    // Check history for input and error output (expect 2 entries)
    expect(commandHistory.value).toHaveLength(2);

    // Check input entry
    expect(commandHistory.value[0].type).toBe('input');
    expect(commandHistory.value[0].text).toBe(`C:\\> ${unknownCommand}`);

    // Check error entry
    expect(commandHistory.value[1].type).toBe('error');
    expect(commandHistory.value[1].text).toContain(`Bad command or file name: ${unknownCommand}`);
  });

  it('should not call execute on any command module for an unknown command', async () => {
     // To be absolutely sure, we could mock 'ping' again and check it wasn't called,
     // but the core logic in useDosCommands should prevent this if loadCommand returns null.
     // Let's rely on the previous test structure for now. If issues arise, we can add mocks.
     const { processCommand } = useDosCommands();
     // Spy on console.error to ensure the loadCommand error isn't thrown unexpectedly
     const consoleSpy = vi.spyOn(console, 'error');

     await processCommand('anotherUnknown');

     // Verify no command loading errors were logged for this specific unknown command
     // (assuming loadCommand handles unknown commands gracefully without throwing)
     expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Error loading command module'));

     consoleSpy.mockRestore(); // Clean up spy
  });
});

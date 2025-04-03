import { describe, it, expect } from 'vitest';
// Import the actual command object, not mocked
import pingCommand from '@/composables/dos/commands/ping';

describe('Ping Command', () => {
  it('should have the correct name', () => {
    expect(pingCommand.name).toBe('ping');
  });

  it('should have a description', () => {
    expect(pingCommand.description).toBeTruthy(); // Check it's not empty
    expect(typeof pingCommand.description).toBe('string');
  });

  it('should return "pong" when executed', async () => {
    const result = await pingCommand.execute();
    expect(result).toBe('pong');
  });

  it('should return "pong" even when arguments are provided', async () => {
    // Ensure it ignores any arguments passed
    const result = await pingCommand.execute(['some', 'arguments']);
    expect(result).toBe('pong');
  });
});

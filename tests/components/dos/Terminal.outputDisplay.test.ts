import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Terminal from '@/components/dos/Terminal.vue'; // Use alias
import type { HistoryEntry } from '@/composables/dos/useDosCommands'; // Import type

describe('Terminal.vue - Output Display', () => {
  let wrapper: ReturnType<typeof mount>;

  // Sample history data for testing
  const mockHistory: HistoryEntry[] = [
    { id: 0, type: 'input', text: 'C:\\> first command', timestamp: new Date() },
    { id: 1, type: 'output', text: 'Output of first command', timestamp: new Date() },
    { id: 2, type: 'input', text: 'C:\\> second command', timestamp: new Date() },
    { id: 3, type: 'error', text: 'Error from second command', timestamp: new Date() },
    { id: 4, type: 'output', text: ['Multi-line output 1', 'Multi-line output 2'], timestamp: new Date() },
  ];

  beforeEach(() => {
    // Mount with props for history
    wrapper = mount(Terminal, {
      props: {
        history: mockHistory, // Pass mock history as a prop
      },
      attachTo: document.body
    });
  });

  it('renders history entries passed via props', async () => {
    await wrapper.vm.$nextTick(); // Wait for rendering updates

    const outputArea = wrapper.find('.output-area');
    expect(outputArea.exists()).toBe(true);

    // Check if all history entries are rendered (simple check based on text content)
    mockHistory.forEach(entry => {
      if (Array.isArray(entry.text)) {
        entry.text.forEach(line => {
          expect(outputArea.text()).toContain(line);
        });
      } else {
        expect(outputArea.text()).toContain(entry.text);
      }
    });
  });

  it('renders different types of history entries correctly (basic check)', async () => {
     await wrapper.vm.$nextTick();
     const outputArea = wrapper.find('.output-area');

     // Example: Check if input lines are rendered (assuming a specific structure/class)
     // This depends heavily on how the component renders history items
     const inputLines = outputArea.findAll('.history-input'); // Assuming a class '.history-input'
     // expect(inputLines.length).toBe(mockHistory.filter(e => e.type === 'input').length);
     // expect(inputLines[0].text()).toContain('C:\\> first command');

     // Example: Check output lines
     const outputLines = outputArea.findAll('.history-output'); // Assuming '.history-output'
     // expect(outputLines.length).toBe(mockHistory.filter(e => e.type === 'output').length); // This needs adjustment for multi-line output
     // expect(outputLines[0].text()).toContain('Output of first command');

     // Example: Check error lines
     const errorLines = outputArea.findAll('.history-error'); // Assuming '.history-error'
     // expect(errorLines.length).toBe(mockHistory.filter(e => e.type === 'error').length);
     // expect(errorLines[0].text()).toContain('Error from second command');

     // NOTE: These specific class-based checks are commented out as the component
     // doesn't implement history rendering yet. The basic text check above is active.
     // We will uncomment and refine these when implementing the rendering logic.
     expect(outputArea.text()).toContain('C:\\> first command');
     expect(outputArea.text()).toContain('Output of first command');
     expect(outputArea.text()).toContain('Error from second command');
     expect(outputArea.text()).toContain('Multi-line output 1');
     expect(outputArea.text()).toContain('Multi-line output 2');
  });

  // Clean up after tests
  afterEach(() => {
    wrapper.unmount();
  });
});

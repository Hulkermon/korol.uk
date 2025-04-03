import { describe, it, expect, beforeEach, afterEach } from 'vitest'; // Add afterEach
import { mount } from '@vue/test-utils';
import Terminal from '@/components/dos/Terminal.vue'; // Use alias

describe('Terminal.vue - Input Handling', () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    // Mount a fresh component before each test
    wrapper = mount(Terminal, {
       attachTo: document.body // Attach to DOM to ensure input focusing works
    });
  });

  it('renders an input field', () => {
    const input = wrapper.find('input.terminal-input');
    expect(input.exists()).toBe(true);
  });

  it('updates the input value when typed into', async () => {
    const input = wrapper.find<HTMLInputElement>('input.terminal-input');
    await input.setValue('test command');
    expect(input.element.value).toBe('test command');
  });

  it('emits "submit-command" event with the current input value when Enter is pressed', async () => {
    const input = wrapper.find<HTMLInputElement>('input.terminal-input');
    const testCommand = 'ping test';
    await input.setValue(testCommand);
    await input.trigger('keydown.enter');

    // Check if the event was emitted
    expect(wrapper.emitted()).toHaveProperty('submit-command');
    // Check if the event was emitted with the correct payload
    expect(wrapper.emitted('submit-command')?.[0]).toEqual([testCommand]);
  });

  it('clears the input field after Enter is pressed', async () => {
    const input = wrapper.find<HTMLInputElement>('input.terminal-input');
    await input.setValue('some input');
    await input.trigger('keydown.enter');
    expect(input.element.value).toBe('');
  });

   it('focuses the input field on mount', async () => {
     // Need to wait for mount lifecycle
     await wrapper.vm.$nextTick(); // Wait for potential async operations in onMounted
     const inputElement = wrapper.find<HTMLInputElement>('input.terminal-input').element;
     // Check if the input element is the active element in the document
     expect(document.activeElement).toBe(inputElement);
   });

   // Clean up after tests
   afterEach(() => {
       wrapper.unmount();
   });
});

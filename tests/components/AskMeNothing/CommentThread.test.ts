import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CommentThread from '@/components/AskMeNothing/CommentThread.vue'
import type { Comment, Reply } from '@/types/askMeNothing'
import { timeAgo } from '@/utils/timeFormat' // Import the actual function

// Mock the timeAgo function for consistent output in tests
vi.mock('@/utils/timeFormat', () => ({
  // Correct the type annotation here to match the original function
  timeAgo: vi.fn((timestamp: number | Date) => `${Math.round((Date.now() - new Date(timestamp).getTime()) / 1000 / 60)} minutes ago`)
}))

describe('AskMeNothing/CommentThread.vue', () => {
  const baseTimestamp = Date.now() - 15 * 60 * 1000 // 15 minutes ago
  const dummyComment: Comment = {
    id: 'c1',
    text: 'This is the main comment text.',
    author: 'Anonymous',
    timestamp: baseTimestamp,
    replies: []
  };
  const dummyReply: Reply = {
    id: 'r1',
    text: 'This is a reply.',
    author: 'User',
    timestamp: baseTimestamp + 5 * 60 * 1000 // 10 minutes ago
  };
  const dummyCommentWithReply: Comment = {
    ...dummyComment,
    replies: [dummyReply]
  };

  beforeEach(() => {
    // Reset mocks if needed, though timeAgo is mocked globally for this suite
    vi.clearAllMocks();
    // Re-apply mock implementation if it gets reset elsewhere, ensuring type consistency
     vi.mocked(timeAgo).mockImplementation(
       (timestamp: number | Date) => `${Math.round((Date.now() - new Date(timestamp).getTime()) / 1000 / 60)} minutes ago`
     );
  })

  it('renders the main comment text, author, and timestamp', () => {
    const wrapper = mount(CommentThread, { props: { comment: dummyComment } })

    expect(wrapper.text()).toContain(dummyComment.text)
    expect(wrapper.text()).toContain(dummyComment.author)
    // Check if timeAgo was called and its result is displayed (approximate check)
    expect(timeAgo).toHaveBeenCalledWith(dummyComment.timestamp)
    expect(wrapper.text()).toContain('15 minutes ago') // Based on mock implementation
  })

  it('does not render replies section if replies array is empty', () => {
    const wrapper = mount(CommentThread, { props: { comment: dummyComment } })
    const repliesSection = wrapper.find('.replies')
    expect(repliesSection.exists()).toBe(false)
  })

  it('renders replies when the replies array is not empty', () => {
    const wrapper = mount(CommentThread, { props: { comment: dummyCommentWithReply } })
    const repliesSection = wrapper.find('.replies')
    expect(repliesSection.exists()).toBe(true)
    expect(repliesSection.text()).toContain(dummyReply.text)
    expect(repliesSection.text()).toContain(dummyReply.author)
    // Check timeAgo for reply
    expect(timeAgo).toHaveBeenCalledWith(dummyReply.timestamp)
    expect(repliesSection.text()).toContain('10 minutes ago') // Based on mock
  })

  it('toggles the reply input visibility when "Reply"/"Cancel Reply" is clicked', async () => {
    const wrapper = mount(CommentThread, { props: { comment: dummyComment } })
    const replyButton = wrapper.find('.comment-actions button')
    const replyInputSection = () => wrapper.find('.reply-input') // Use function to re-query

    // Initially hidden
    expect(replyInputSection().exists()).toBe(false)
    expect(replyButton.text()).toBe('Reply')

    // Click to show
    await replyButton.trigger('click')
    expect(replyInputSection().exists()).toBe(true)
    expect(replyButton.text()).toBe('Cancel Reply')

    // Click to hide
    await replyButton.trigger('click')
    expect(replyInputSection().exists()).toBe(false)
    expect(replyButton.text()).toBe('Reply')
  })

  it('updates reply text area value on input', async () => {
    const wrapper = mount(CommentThread, { props: { comment: dummyComment } })
    const replyButton = wrapper.find('.comment-actions button')
    await replyButton.trigger('click') // Show input

    const textarea = wrapper.find('[data-testid="reply-textarea"]')
    await textarea.setValue('My reply text')

    expect((textarea.element as HTMLTextAreaElement).value).toBe('My reply text')
    // Also check component internal state if needed (though v-model handles this)
    expect((wrapper.vm as any).replyText).toBe('My reply text')
  })

  it('disables submit reply button when textarea is empty or whitespace', async () => {
     const wrapper = mount(CommentThread, { props: { comment: dummyComment } })
     const replyButton = wrapper.find('.comment-actions button')
     await replyButton.trigger('click') // Show input

     const submitButton = wrapper.find('[data-testid="submit-reply-button"]')
     const textarea = wrapper.find('[data-testid="reply-textarea"]')

     // Initially empty
     expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)

     // With whitespace
     await textarea.setValue('   \n ')
     expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)

     // With content
     await textarea.setValue('Valid reply')
     expect((submitButton.element as HTMLButtonElement).disabled).toBe(false)

     // Back to empty
     await textarea.setValue('')
     expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('emits "reply-submitted" with correct data and hides input on submit', async () => {
    const wrapper = mount(CommentThread, { props: { comment: dummyComment } })
    const replyButton = wrapper.find('.comment-actions button')
    await replyButton.trigger('click') // Show input

    const submitButton = wrapper.find('[data-testid="submit-reply-button"]')
    const textarea = wrapper.find('[data-testid="reply-textarea"]')
    const testReplyText = 'This is my submitted reply.'

    await textarea.setValue(testReplyText)
    await submitButton.trigger('click')

    // Check emitted event
    expect(wrapper.emitted()).toHaveProperty('reply-submitted')
    expect(wrapper.emitted()['reply-submitted']).toHaveLength(1)
    expect(wrapper.emitted()['reply-submitted'][0]).toEqual([{
      commentId: dummyComment.id,
      replyText: testReplyText
    }])

    // Check input is hidden and textarea cleared
    expect(wrapper.find('.reply-input').exists()).toBe(false)
    expect((wrapper.vm as any).replyText).toBe('') // Internal state cleared
  })

})

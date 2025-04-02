import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PostDisplay from '@/components/AskMeNothing/PostDisplay.vue'
import CommentThread from '@/components/AskMeNothing/CommentThread.vue' // Import CommentThread
import type { Comment } from '@/types/askMeNothing'; // Import the type at the top level

describe('AskMeNothing/PostDisplay.vue', () => {
  const testPostContent = 'This is the content of my post.'
  const dummyComment: Comment = { // Create a valid dummy comment
    id: 'c1',
    text: 'A test comment',
    author: 'Anonymous',
    timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes ago
    replies: []
  };
  const dummyCommentWithReply: Comment = {
    id: 'c2',
    text: 'Another comment',
    author: 'Anonymous',
    timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
    replies: [
      { id: 'r1', text: 'A reply', author: 'User', timestamp: Date.now() - 2 * 60 * 1000 }
    ]
  };

  it('renders the post content correctly', () => {
    const wrapper = mount(PostDisplay, {
      props: { postContent: testPostContent, comments: [], shareUrl: '' }
    })
    expect(wrapper.text()).toContain(testPostContent)
  })

  it('displays "Posted by Anonymous"', () => {
    const wrapper = mount(PostDisplay, {
      props: { postContent: testPostContent, comments: [], shareUrl: '' }
    })
    expect(wrapper.text()).toContain('Posted by Anonymous')
  })

  it('shows "No comments yet" message when comments array is empty', () => {
    const wrapper = mount(PostDisplay, {
      props: { postContent: testPostContent, comments: [], shareUrl: '' }
    })
    expect(wrapper.text()).toContain('No comments yet. Generating...')
    expect(wrapper.findComponent(CommentThread).exists()).toBe(false) // No threads should render
  })

  it('does not show "No comments yet" message and renders CommentThread when comments exist', () => {
    const wrapper = mount(PostDisplay, {
      props: {
        postContent: testPostContent,
        comments: [dummyComment], // Use the valid dummy comment
        shareUrl: ''
      },
      global: {
        stubs: { // Stub timeAgo for consistent testing if needed, or ensure utils/timeFormat is available
           CommentThread: true // Can stub CommentThread if testing PostDisplay in isolation
        }
      }
    })
    expect(wrapper.text()).not.toContain('No comments yet. Generating...')
    // Check if CommentThread component is rendered
    const commentThreads = wrapper.findAllComponents(CommentThread)
    expect(commentThreads).toHaveLength(1)
    // Check if the props are passed correctly (if not stubbing)
    // expect(commentThreads[0].props('comment')).toEqual(dummyComment)
  })

  it('renders multiple CommentThread components for multiple comments', () => {
     const wrapper = mount(PostDisplay, {
      props: {
        postContent: testPostContent,
        comments: [dummyComment, dummyCommentWithReply],
        shareUrl: ''
      }
    })
    const commentThreads = wrapper.findAllComponents(CommentThread)
    expect(commentThreads).toHaveLength(2)
  })


  it('displays the Save & Share button', () => {
    const wrapper = mount(PostDisplay, {
      props: { postContent: testPostContent, comments: [], shareUrl: '' }
    })
    const button = wrapper.find('[data-testid="save-share-button"]')
    expect(button.exists()).toBe(true)
    expect(button.text()).toBe('Save & Share')
  })

   it('emits "save-share" event when the button is clicked', async () => {
    const wrapper = mount(PostDisplay, {
      props: { postContent: testPostContent, comments: [], shareUrl: '' }
    })
    const button = wrapper.find('[data-testid="save-share-button"]')
    await button.trigger('click')
    expect(wrapper.emitted()).toHaveProperty('save-share')
    expect(wrapper.emitted()['save-share']).toHaveLength(1)
  })

  it('emits "reply-submitted" event when CommentThread emits it', async () => {
     const wrapper = mount(PostDisplay, {
      props: {
        postContent: testPostContent,
        comments: [dummyComment], // Need at least one comment
        shareUrl: ''
      }
    })
    const commentThread = wrapper.findComponent(CommentThread)
    const replyData = { commentId: dummyComment.id, replyText: 'My test reply' }

    // Simulate the event emission from the child
    await commentThread.vm.$emit('reply-submitted', replyData)

    // Check if PostDisplay emitted the event upwards
    expect(wrapper.emitted()).toHaveProperty('reply-submitted')
    expect(wrapper.emitted()['reply-submitted']).toHaveLength(1)
    expect(wrapper.emitted()['reply-submitted'][0]).toEqual([replyData])
  })


  it('does not display the share URL initially', () => {
    const wrapper = mount(PostDisplay, {
      props: { postContent: testPostContent, comments: [], shareUrl: '' }
    })
    const shareUrlSpan = wrapper.find('[data-testid="share-url"]')
    expect(shareUrlSpan.exists()).toBe(false)
  })

  it('displays the share URL when provided via prop', () => {
    const testUrl = '/ask-me-nothing/saved/12345'
    const wrapper = mount(PostDisplay, {
      props: { postContent: testPostContent, comments: [], shareUrl: testUrl }
    })
    const shareUrlSpan = wrapper.find('[data-testid="share-url"]')
    expect(shareUrlSpan.exists()).toBe(true)
    expect(shareUrlSpan.text()).toContain('Shareable Link:')
    const link = shareUrlSpan.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe(testUrl)
    expect(link.text()).toBe(testUrl)
  })

})

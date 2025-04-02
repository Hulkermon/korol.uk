import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import AskMeNothingPage from '@/pages/ask-me-nothing/index.vue'
import AskMeNothingCreatePostForm from '@/components/AskMeNothing/CreatePostForm.vue'
import AskMeNothingPostDisplay from '@/components/AskMeNothing/PostDisplay.vue'
import AskMeNothingApiKeyPrompt from '@/components/AskMeNothing/ApiKeyPrompt.vue'
import type { Comment } from '@/types/askMeNothing';

// --- Mocks ---
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

const mockUseRuntimeConfig = vi.fn();
vi.stubGlobal('useRuntimeConfig', mockUseRuntimeConfig);
// --- End Mocks ---

describe('AskMeNothingPage', () => {
  let wrapper: VueWrapper<any>
  const testApiKey = 'test-api-key-from-tests'; // Define a key for tests

  // Function to mount with specific runtime config
  const mountComponent = (runtimeConfigValue = { public: {} }) => {
    mockUseRuntimeConfig.mockReturnValue(runtimeConfigValue);
    if (wrapper && wrapper.exists()) {
        wrapper.unmount();
    }
    // Define a default safe mock implementation for $fetch
    // This prevents errors if a test triggers fetch without a specific mock
    mockFetch.mockImplementation(async (url: string) => {
        console.warn(`Vitest Warning: $fetch called for "${url}" without specific mock. Returning default empty success.`);
        if (url === '/api/generate-comment') return Promise.resolve({ comment: '' });
        if (url === '/api/generate-reply') return Promise.resolve({ reply: '' });
        if (url === '/api/save-post') return Promise.resolve({ slug: 'default-slug', path: '/default/path' });
        return Promise.resolve({}); // Generic default
    });

    wrapper = mount(AskMeNothingPage, {
        global: {
            // Ensure components are registered or stubbed if needed
            components: {
                AskMeNothingCreatePostForm,
                AskMeNothingPostDisplay,
                AskMeNothingApiKeyPrompt
            }
        }
    });
  };

  // Helper to simulate providing API key via prompt
  const simulateApiKeyPromptSubmit = async (key = testApiKey) => {
      (wrapper.vm as any).showApiKeyPrompt = true;
      await wrapper.vm.$nextTick();
      const promptComponent = wrapper.findComponent(AskMeNothingApiKeyPrompt);
      expect(promptComponent.exists(), 'API Key prompt should exist').toBe(true);
      const apiKeyInput = promptComponent.find('[data-testid="api-key-input"]');
      const submitKeyButton = promptComponent.find('[data-testid="submit-api-key-button"]');
      await apiKeyInput.setValue(key);
      await submitKeyButton.trigger('click');
      await flushPromises();
      expect((wrapper.vm as any).apiKey).toBe(key);
      expect((wrapper.vm as any).showApiKeyPrompt).toBe(false);
  };

  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch.mockReset() // Reset mocks, specific implementations will be set in tests or by default mount
    mockUseRuntimeConfig.mockReset()
    // Default mount assumes no key from runtime config, includes default fetch mock
    mountComponent({ public: {} });
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    if (wrapper && wrapper.vm && typeof (wrapper.vm as any).stopCommentGeneration === 'function') {
        (wrapper.vm as any).stopCommentGeneration();
    }
    if (wrapper?.exists()) {
       wrapper.unmount();
    }
  })


  // --- Initial State & Post Creation Tests ---
  describe('Initial State & Post Creation', () => {
     beforeEach(() => { // Ensure clean mount for this suite
        mountComponent({ public: {} });
     });

     it('renders without crashing', () => {
       expect(wrapper.exists()).toBe(true)
     })

     it('displays the create post form initially', () => {
       const formWrapper = wrapper.find('[data-testid="create-post-form-wrapper"]')
       expect(formWrapper.exists()).toBe(true)
       const createPostForm = wrapper.findComponent(AskMeNothingCreatePostForm)
       expect(createPostForm.exists()).toBe(true)
       const postDisplayWrapper = wrapper.find('[data-testid="post-display-wrapper"]')
       expect(postDisplayWrapper.exists()).toBe(false)
     })

     it('updates post content on user input in the form', async () => {
       const createPostForm = wrapper.findComponent(AskMeNothingCreatePostForm)
       const textarea = createPostForm.find('[data-testid="post-textarea"]')
       await textarea.setValue('This is my test post content.')
       expect((createPostForm.vm as any).postContent).toBe('This is my test post content.')
     })

     it('emits post content on submission and displays the post (when API key is present)', async () => {
       // Simulate key being present (e.g., loaded from config or previously entered)
       mountComponent({ public: { geminiApiKeyDev: testApiKey } }); // Mount with key
       await flushPromises(); // Allow onMounted hook to run

       const createPostForm = wrapper.findComponent(AskMeNothingCreatePostForm)
       const textarea = createPostForm.find('[data-testid="post-textarea"]')
       const submitButton = createPostForm.find('[data-testid="submit-post-button"]')
       const testContent = 'My amazing AMA story!'

       expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)
       await textarea.setValue(testContent)
       expect((submitButton.element as HTMLButtonElement).disabled).toBe(false)

       mockFetch.mockResolvedValue({ comment: 'First comment' });
       await submitButton.trigger('click')
       await flushPromises()

       expect((wrapper.vm as any).postSubmitted).toBe(true)
       expect((wrapper.vm as any).submittedPostContent).toBe(testContent)
       expect(wrapper.find('[data-testid="create-post-form-wrapper"]').exists()).toBe(false)
       const postDisplayWrapper = wrapper.findComponent(AskMeNothingPostDisplay)
       expect(postDisplayWrapper.exists()).toBe(true)
       expect(postDisplayWrapper.props('postContent')).toBe(testContent)
     })

     it('submit button is disabled when textarea is empty or only whitespace', async () => {
       const createPostForm = wrapper.findComponent(AskMeNothingCreatePostForm)
       const textarea = createPostForm.find('[data-testid="post-textarea"]')
       const submitButton = createPostForm.find('[data-testid="submit-post-button"]')
       expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)
       await textarea.setValue('   \n  ')
       expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)
       await textarea.setValue('Some content')
       expect((submitButton.element as HTMLButtonElement).disabled).toBe(false)
       await textarea.setValue('')
       expect((submitButton.element as HTMLButtonElement).disabled).toBe(true)
     })
  })


  // --- AI Comment Generation Tests ---
  describe('AI Comment Generation', () => {
     beforeEach(async () => { // Mount with API key for this suite
        mountComponent({ public: { geminiApiKeyDev: testApiKey } });
        await flushPromises(); // Ensure onMounted runs
     });

    const testContent = 'This is the post content for AI testing.'
    const mockSuccessResponse = { comment: 'This is a generated comment.' }
    const mockErrorResponse = { error: 'API failed' }

    const submitTestPost = async (content = testContent) => {
      const createPostForm = wrapper.findComponent(AskMeNothingCreatePostForm)
      const textarea = createPostForm.find('[data-testid="post-textarea"]')
      const submitButton = createPostForm.find('[data-testid="submit-post-button"]')
      await textarea.setValue(content)
      await submitButton.trigger('click')
      await flushPromises()
    }

    it('calls the generate comment API with API key', async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse)
      await submitTestPost()
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('/api/generate-comment', {
        method: 'POST',
        body: {
            postContent: testContent,
            apiKey: testApiKey // Verify key from config/state is passed
        }
      })
    })

    // ... (rest of the AI Comment Generation tests remain largely the same,
    //      as they assume the key exists and focus on fetch/interval logic) ...

    it('adds the generated comment to the comments list', async () => {
       mockFetch.mockResolvedValue(mockSuccessResponse)
       await submitTestPost()
       const comments = (wrapper.vm as any).comments
       expect(comments).toHaveLength(1)
       expect(comments[0].text).toBe(mockSuccessResponse.comment)
       const postDisplay = wrapper.findComponent(AskMeNothingPostDisplay)
       expect(postDisplay.props('comments')).toEqual(comments)
    })

     it('sets commentError on API failure', async () => {
       mockFetch.mockResolvedValue(mockErrorResponse)
       await submitTestPost()
       expect((wrapper.vm as any).comments).toHaveLength(0)
       expect((wrapper.vm as any).commentError).toBe(mockErrorResponse.error)
     })

     it('sets commentError on network error', async () => {
        const networkError = new Error('Network failed')
        mockFetch.mockRejectedValue(networkError)
        await submitTestPost()
        expect((wrapper.vm as any).comments).toHaveLength(0)
        expect((wrapper.vm as any).commentError).toBe(networkError.message)
     })

     it('manages isLoadingComment state', async () => {
        let resolveFetch: (value: any) => void;
        const fetchPromise = new Promise(resolve => { resolveFetch = resolve; });
        mockFetch.mockReturnValue(fetchPromise);
        await submitTestPost()
        expect((wrapper.vm as any).isLoadingComment).toBe(true)
        resolveFetch!(mockSuccessResponse);
        await flushPromises();
        expect((wrapper.vm as any).isLoadingComment).toBe(false)
     })

     it('calls generate comment API again after interval', async () => {
        mockFetch.mockResolvedValue(mockSuccessResponse)
        await submitTestPost()
        expect(mockFetch).toHaveBeenCalledTimes(1)
        vi.advanceTimersByTime((wrapper.vm as any).COMMENT_INTERVAL_MS);
        await flushPromises()
        expect(mockFetch).toHaveBeenCalledTimes(2)
     })

     it('stops generating comments after MAX_COMMENTS', async () => {
        const MAX_COMMENTS = (wrapper.vm as any).MAX_COMMENTS;
        mockFetch.mockResolvedValue(mockSuccessResponse)
        await submitTestPost() // 1st call
        expect(mockFetch).toHaveBeenCalledTimes(1);
        for (let i = 1; i < MAX_COMMENTS; i++) {
          vi.advanceTimersByTime((wrapper.vm as any).COMMENT_INTERVAL_MS);
          await flushPromises();
        }
        expect(mockFetch).toHaveBeenCalledTimes(MAX_COMMENTS);
        expect((wrapper.vm as any).comments).toHaveLength(MAX_COMMENTS);
        vi.advanceTimersByTime((wrapper.vm as any).COMMENT_INTERVAL_MS);
        await flushPromises();
        expect(mockFetch).toHaveBeenCalledTimes(MAX_COMMENTS);
        expect((wrapper.vm as any).commentIntervalId).toBeNull();
     })

     it('clears interval when stopCommentGeneration is called', async () => {
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
        mockFetch.mockResolvedValue(mockSuccessResponse)
        await submitTestPost()
        const intervalIdBeforeClear = (wrapper.vm as any).commentIntervalId;
        expect(intervalIdBeforeClear).not.toBeNull()
        ;(wrapper.vm as any).stopCommentGeneration()
        expect(clearIntervalSpy).toHaveBeenCalledWith(intervalIdBeforeClear)
        expect((wrapper.vm as any).commentIntervalId).toBeNull()
        clearIntervalSpy.mockRestore()
     })

     it('clears interval when component is unmounted', async () => {
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
        mockFetch.mockResolvedValue(mockSuccessResponse)
        await submitTestPost()
        const intervalId = (wrapper.vm as any).commentIntervalId
        expect(intervalId).not.toBeNull()
        wrapper.unmount()
        expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId)
        clearIntervalSpy.mockRestore()
     })
  })

  // --- AI Reply Generation Tests ---
  describe('AI Reply Generation', () => {
     beforeEach(async () => { // Mount with API key for this suite
        mountComponent({ public: { geminiApiKeyDev: testApiKey } });
        await flushPromises(); // Ensure onMounted runs
     });

    const testContent = 'This is the post content for reply testing.'
    const initialCommentText = 'Initial AI comment.';
    let actualInitialComment: Comment;
    const userReplyText = 'This is the user reply.';
    const mockReplySuccessResponse = { reply: 'This is the AI reply.' };
    const mockReplyErrorResponse = { error: 'Reply API failed' };

    const setupWithInitialComment = async (): Promise<Comment> => {
      mockFetch.mockResolvedValueOnce({ comment: initialCommentText });
      const createPostForm = wrapper.findComponent(AskMeNothingCreatePostForm);
      const textarea = createPostForm.find('[data-testid="post-textarea"]');
      const submitButton = createPostForm.find('[data-testid="submit-post-button"]');
      await textarea.setValue(testContent);
      await submitButton.trigger('click');
      await flushPromises();
      mockFetch.mockClear();
      const commentsInState = (wrapper.vm as any).comments as Comment[];
      expect(commentsInState).toHaveLength(1);
      actualInitialComment = commentsInState[0];
      expect(actualInitialComment.text).toBe(initialCommentText);
      return actualInitialComment;
    };

    const submitUserReply = async (commentId: string, replyText = userReplyText) => {
        const postDisplay = wrapper.findComponent(AskMeNothingPostDisplay);
        expect(postDisplay.exists()).toBe(true);
        await postDisplay.vm.$emit('reply-submitted', { commentId, replyText });
        await flushPromises();
    }

    it('adds user reply immediately', async () => {
      const comment = await setupWithInitialComment();
      await submitUserReply(comment.id);
      const comments = (wrapper.vm as any).comments as Comment[];
      expect(comments[0].replies).toHaveLength(1);
      expect(comments[0].replies[0].text).toBe(userReplyText);
      expect(comments[0].replies[0].author).toBe('User');
    });

    it('calls generate reply API with correct payload and API key', async () => {
      mockFetch.mockResolvedValue(mockReplySuccessResponse);
      const comment = await setupWithInitialComment();
      await submitUserReply(comment.id);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/generate-reply', {
        method: 'POST',
        body: {
          originalPost: testContent,
          commentText: comment.text,
          userReplyText: userReplyText,
          apiKey: testApiKey // Verify key from state is passed
        }
      });
    });

     // ... (rest of AI Reply Generation tests remain largely the same) ...

     it('adds AI reply after delay', async () => {
        mockFetch.mockResolvedValue(mockReplySuccessResponse);
        const comment = await setupWithInitialComment();
        await submitUserReply(comment.id);
        expect((wrapper.vm as any).comments[0].replies).toHaveLength(1);
        vi.advanceTimersByTime((wrapper.vm as any).REPLY_DELAY_MS);
        await flushPromises();
        const replies = (wrapper.vm as any).comments[0].replies;
        expect(replies).toHaveLength(2);
        expect(replies[1].text).toBe(mockReplySuccessResponse.reply);
        expect(replies[1].author).toBe('Anonymous');
     });

     it('sets replyError on API failure', async () => {
        mockFetch.mockResolvedValue(mockReplyErrorResponse);
        const comment = await setupWithInitialComment();
        await submitUserReply(comment.id);
        expect((wrapper.vm as any).comments[0].replies).toHaveLength(1);
        expect((wrapper.vm as any).replyError).toBe(mockReplyErrorResponse.error);
        vi.advanceTimersByTime((wrapper.vm as any).REPLY_DELAY_MS);
        await flushPromises();
        expect((wrapper.vm as any).comments[0].replies).toHaveLength(1);
     });

     it('sets replyError on network error', async () => {
        const networkError = new Error('Reply Network Failed');
        mockFetch.mockRejectedValue(networkError);
        const comment = await setupWithInitialComment();
        await submitUserReply(comment.id);
        expect((wrapper.vm as any).comments[0].replies).toHaveLength(1);
        expect((wrapper.vm as any).replyError).toBe(networkError.message);
        vi.advanceTimersByTime((wrapper.vm as any).REPLY_DELAY_MS);
        await flushPromises();
        expect((wrapper.vm as any).comments[0].replies).toHaveLength(1);
     });

     it('manages isLoadingReply state', async () => {
        let resolveReplyFetch: (value: any) => void;
        const replyFetchPromise = new Promise(resolve => { resolveReplyFetch = resolve; });
        mockFetch.mockReturnValue(replyFetchPromise);
        const comment = await setupWithInitialComment();
        await submitUserReply(comment.id);
        expect((wrapper.vm as any).isLoadingReply[comment.id]).toBe(true);
        resolveReplyFetch!(mockReplySuccessResponse);
        await flushPromises();
        expect((wrapper.vm as any).isLoadingReply[comment.id]).toBe(true); // Still true before delay
        vi.advanceTimersByTime((wrapper.vm as any).REPLY_DELAY_MS);
        await flushPromises();
        expect((wrapper.vm as any).isLoadingReply[comment.id]).toBeUndefined(); // Cleared after delay
     });

     it('clears isLoadingReply state on error', async () => {
        mockFetch.mockRejectedValue(new Error('Failed'));
        const comment = await setupWithInitialComment();
        await submitUserReply(comment.id);
        await flushPromises();
        expect((wrapper.vm as any).isLoadingReply[comment.id]).toBeUndefined();
     });
  })

  // --- Save & Share Tests ---
  describe('Save & Share', () => {
     beforeEach(async () => { // Mount with API key for this suite
        mountComponent({ public: { geminiApiKeyDev: testApiKey } });
        await flushPromises(); // Ensure onMounted runs
     });

    const testContent = 'This is the post content for saving.';
    const mockSaveSuccessResponse = { slug: '123-abc', path: '/ask-me-nothing/saved/123-abc' };
    const mockSaveErrorResponse = { error: 'Save failed' };
    const initialComment: Comment = {
      id: 'c1-save-test', text: 'Comment 1', author: 'Anonymous', timestamp: Date.now(), replies: []
    };

    const setupWithContent = async () => {
      mockFetch.mockResolvedValueOnce({ comment: initialComment.text });
      const createPostForm = wrapper.findComponent(AskMeNothingCreatePostForm);
      const textarea = createPostForm.find('[data-testid="post-textarea"]');
      const submitButton = createPostForm.find('[data-testid="submit-post-button"]');
      await textarea.setValue(testContent);
      await submitButton.trigger('click');
      await flushPromises();
      expect((wrapper.vm as any).comments).toHaveLength(1);
      const actualComment = (wrapper.vm as any).comments[0];
      mockFetch.mockClear();
      return actualComment;
    };

    const clickSaveButton = async () => {
      const postDisplay = wrapper.findComponent(AskMeNothingPostDisplay);
      expect(postDisplay.exists()).toBe(true);
      const saveButton = postDisplay.find('[data-testid="save-share-button"]');
      expect(saveButton.exists()).toBe(true);
      await saveButton.trigger('click');
      await flushPromises();
    };

    it('calls save post API with correct payload', async () => {
      mockFetch.mockResolvedValue(mockSaveSuccessResponse);
      const comment = await setupWithContent();
      await clickSaveButton();
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/save-post', {
        method: 'POST',
        body: { postContent: testContent, comments: [comment] }
      });
    });

    it('updates shareUrl on successful save', async () => {
      mockFetch.mockResolvedValue(mockSaveSuccessResponse);
      await setupWithContent();
      await clickSaveButton();
      expect((wrapper.vm as any).shareUrl).toBe(mockSaveSuccessResponse.path);
      const postDisplay = wrapper.findComponent(AskMeNothingPostDisplay);
      expect(postDisplay.props('shareUrl')).toBe(mockSaveSuccessResponse.path);
    });

    it('stops comment generation interval on save', async () => {
       mockFetch.mockResolvedValue(mockSaveSuccessResponse);
       await setupWithContent();
       const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
       const initialIntervalId = (wrapper.vm as any).commentIntervalId;
       expect(initialIntervalId).not.toBeNull();
       await clickSaveButton();
       expect(clearIntervalSpy).toHaveBeenCalledWith(initialIntervalId);
       expect((wrapper.vm as any).commentIntervalId).toBeNull();
       clearIntervalSpy.mockRestore();
    });

     it('sets saveError on API failure', async () => {
        mockFetch.mockResolvedValue(mockSaveErrorResponse);
        await setupWithContent();
        await clickSaveButton();
        expect((wrapper.vm as any).shareUrl).toBe('');
        expect((wrapper.vm as any).saveError).toBe(mockSaveErrorResponse.error);
     });

     it('sets saveError on network error', async () => {
        const networkError = new Error('Save Network Failed');
        mockFetch.mockRejectedValue(networkError);
        await setupWithContent();
        await clickSaveButton();
        expect((wrapper.vm as any).shareUrl).toBe('');
        expect((wrapper.vm as any).saveError).toBe(networkError.message);
     });

     it('manages isLoadingSave state', async () => {
        let resolveSaveFetch: (value: any) => void;
        const saveFetchPromise = new Promise(resolve => { resolveSaveFetch = resolve; });
        mockFetch.mockReturnValue(saveFetchPromise);
        await setupWithContent();
        const postDisplay = wrapper.findComponent(AskMeNothingPostDisplay);
        const saveButton = postDisplay.find('[data-testid="save-share-button"]');
        await saveButton.trigger('click'); // Don't wait for flush
        expect((wrapper.vm as any).isLoadingSave).toBe(true);
        resolveSaveFetch!(mockSaveSuccessResponse);
        await flushPromises();
        expect((wrapper.vm as any).isLoadingSave).toBe(false);
     });

     it('clears isLoadingSave state on error', async () => {
        mockFetch.mockRejectedValue(new Error('Failed'));
        await setupWithContent();
        const postDisplay = wrapper.findComponent(AskMeNothingPostDisplay);
        const saveButton = postDisplay.find('[data-testid="save-share-button"]');
        await saveButton.trigger('click');
        await flushPromises();
        expect((wrapper.vm as any).isLoadingSave).toBe(false);
     });
  })

  // --- API Key Handling Tests ---
  describe('API Key Handling', () => {
    // Note: beforeEach for this suite mounts *without* runtime config key by default

    it('loads API key from runtime config in dev mode', async () => {
      // Remount with dev key in config
      mountComponent({ public: { geminiApiKeyDev: testApiKey } });
      await flushPromises(); // Allow onMounted to run

      expect((wrapper.vm as any).apiKey).toBe(testApiKey);
      expect((wrapper.vm as any).showApiKeyPrompt).toBe(false);
      const prompt = wrapper.findComponent(AskMeNothingApiKeyPrompt);
      expect(prompt.exists()).toBe(false);
    });

    it('does not load API key if not in dev config', () => {
       // Uses default mount from outer beforeEach
       expect((wrapper.vm as any).apiKey).toBeNull();
       expect((wrapper.vm as any).showApiKeyPrompt).toBe(false);
    });

    it('shows API key prompt if user tries to post without a key', async () => {
       expect((wrapper.vm as any).apiKey).toBeNull();
       expect((wrapper.vm as any).showApiKeyPrompt).toBe(false);

       const createPostForm = wrapper.findComponent(AskMeNothingCreatePostForm);
       const textarea = createPostForm.find('[data-testid="post-textarea"]');
       const submitButton = createPostForm.find('[data-testid="submit-post-button"]');
       await textarea.setValue('Some content');
       await submitButton.trigger('click');
       await flushPromises();

       expect((wrapper.vm as any).showApiKeyPrompt).toBe(true);
       const prompt = wrapper.findComponent(AskMeNothingApiKeyPrompt);
       expect(prompt.exists()).toBe(true);
       expect((wrapper.vm as any).postSubmitted).toBe(false);
    });

    it('updates API key and hides prompt when key is submitted via prompt', async () => {
       // Trigger the prompt manually for this test case
       (wrapper.vm as any).showApiKeyPrompt = true;
       await wrapper.vm.$nextTick();

       const promptComponent = wrapper.findComponent(AskMeNothingApiKeyPrompt);
       expect(promptComponent.exists()).toBe(true);

       const apiKeyInput = promptComponent.find('[data-testid="api-key-input"]');
       const submitKeyButton = promptComponent.find('[data-testid="submit-api-key-button"]');
       const submittedKey = 'user-submitted-key-456';

       await apiKeyInput.setValue(submittedKey);
       await submitKeyButton.trigger('click');
       await flushPromises();

       expect((wrapper.vm as any).apiKey).toBe(submittedKey);
       expect((wrapper.vm as any).showApiKeyPrompt).toBe(false);
    });

     it('allows post submission after API key is provided via prompt', async () => {
        // 1. Try submit -> prompt appears
        const createPostForm = wrapper.findComponent(AskMeNothingCreatePostForm);
        const textarea = createPostForm.find('[data-testid="post-textarea"]');
        const submitButton = createPostForm.find('[data-testid="submit-post-button"]');
        const testContent = 'Content after key submit';
        await textarea.setValue(testContent);
        await submitButton.trigger('click');
        await flushPromises();
        expect((wrapper.vm as any).showApiKeyPrompt).toBe(true);
        expect((wrapper.vm as any).postSubmitted).toBe(false);

        // 2. Submit key via prompt
        await simulateApiKeyPromptSubmit('user-key-789'); // Use helper

        // 3. Try submitting post again
        mockFetch.mockResolvedValue({ comment: 'Comment after key submit' });
        // Need to find the button again as component might have re-rendered
        const submitButtonAgain = wrapper.find('[data-testid="submit-post-button"]');
        await submitButtonAgain.trigger('click');
        await flushPromises();

        expect((wrapper.vm as any).postSubmitted).toBe(true);
        expect((wrapper.vm as any).submittedPostContent).toBe(testContent);
        expect(mockFetch).toHaveBeenCalledTimes(1); // Comment generation triggered
        expect(mockFetch).toHaveBeenCalledWith('/api/generate-comment', expect.objectContaining({
            body: expect.objectContaining({ apiKey: 'user-key-789' }) // Check submitted key was used
        }));
     });
  })

})

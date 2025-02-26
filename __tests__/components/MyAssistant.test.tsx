import '@testing-library/jest-dom';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { MyAssistant } from '@/src/app/components/MyAssistant';
import { createThread, sendMessage } from '@/src/app/lib/chatApi';
import type { LangChainMessage } from '@assistant-ui/react-langgraph';
import React from 'react';
import { useLangGraphRuntime, useLangGraphInterruptState, useLangGraphSendCommand } from '@assistant-ui/react-langgraph';

// Mock all external UI components
jest.mock('@assistant-ui/react', () => ({
    Thread: ({
        runtime,
        components,
        assistantMessage,
    }: {
        runtime: any;
        components?: { MessagesFooter?: React.ComponentType };
        assistantMessage?: { components: Record<string, any> };
    }) => (
        <div role="complementary" data-error={runtime.isError || undefined}>
            <div data-testid="messages">
                {runtime.messages?.map((msg: LangChainMessage) => (
                    <div key={msg.id}>{typeof msg.content === 'string' ? msg.content : 'Complex content'}</div>
                ))}
            </div>
            <input
                role="textbox"
                type="text"
                onChange={(e) => { }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        const input = e.target as HTMLInputElement;
                        runtime.sendMessage([{
                            id: 'test-user-message',
                            content: input.value,
                            type: 'human'
                        }]);
                    }
                }}
            />
            {components?.MessagesFooter && <components.MessagesFooter />}
        </div>
    ),
    TextContentPartComponent: jest.fn(),
    CompositeAttachmentAdapter: jest.fn(),
    SimpleImageAttachmentAdapter: jest.fn(),
    SimpleTextAttachmentAdapter: jest.fn(),
}));

// Mock the markdown module
jest.mock('@assistant-ui/react-markdown', () => ({
    makeMarkdownText: () => () => null
}));

// Mock the langgraph module
jest.mock('@assistant-ui/react-langgraph', () => ({
    useLangGraphRuntime: jest.fn().mockReturnValue({
        messages: [{
            id: 'test-message-id',
            content: 'Hello, how can I help?',
            type: 'ai'
        }],
        isStreaming: false,
        isError: false,
        error: null,
        sendMessage: jest.fn().mockImplementation(async (messages) => {
            await createThread();
            return sendMessage({ threadId: 'test-thread-id', messages });
        }),
        switchToNewThread: jest.fn(),
        switchToThread: jest.fn(),
        clearThread: jest.fn(),
        interrupt: null,
    }),
    useLangGraphInterruptState: jest.fn().mockReturnValue(null),
    useLangGraphSendCommand: jest.fn(),
    LangChainMessage: jest.fn(),
}));

// Mock the auth0 hook
jest.mock('@auth0/nextjs-auth0/client', () => ({
    useUser: jest.fn().mockReturnValue({ user: null, error: null, isLoading: false }),
}));

// Mock the chat API functions
jest.mock('@/lib/chatApi', () => ({
    createThread: jest.fn(),
    sendMessage: jest.fn(),
    getThreadState: jest.fn(),
}));

describe('MyAssistant', () => {
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Setup default mock implementations
        (createThread as jest.Mock).mockResolvedValue({ thread_id: 'test-thread-id' });
        (sendMessage as jest.Mock).mockImplementation(async function* () {
            // Simulate metadata event
            yield {
                event: 'metadata',
                data: {
                    run_id: 'test-run-id',
                    attempt: 1,
                },
            };

            // Simulate message events
            yield {
                event: 'messages/partial',
                data: [{
                    content: 'Hello',
                    type: 'ai' as const,
                    id: 'test-message-id',
                }],
            };

            yield {
                event: 'messages/partial',
                data: [{
                    content: 'Hello, how can I help?',
                    type: 'ai' as const,
                    id: 'test-message-id',
                    response_metadata: {
                        finish_reason: 'stop',
                        model_name: 'gpt-4',
                    },
                }],
            };

            // Simulate updates event
            yield {
                event: 'updates',
                data: {
                    call_model: {
                        messages: [{
                            content: 'Hello, how can I help?',
                            type: 'ai' as const,
                            id: 'test-message-id',
                        }],
                    },
                },
            };
        });
    });

    it('renders without crashing', () => {
        render(<MyAssistant />);
        expect(screen.getByRole('complementary')).toBeInTheDocument();
        expect(screen.getByRole('complementary')).not.toHaveAttribute('data-error');
    });

    it('handles streaming messages correctly', async () => {
        const { container } = render(<MyAssistant />);

        // Send a test message
        const input = screen.getByRole('textbox') as HTMLInputElement;
        await act(async () => {
            input.focus();
            input.value = 'test message';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        });

        // Wait for streaming messages
        await waitFor(() => {
            const messageElement = screen.getByTestId('messages').textContent;
            expect(messageElement).toContain('Hello, how can I help?');
        }, { timeout: 1000 });
    });

    it('creates a new thread on first message', async () => {
        render(<MyAssistant />);

        // Send a test message
        const input = screen.getByRole('textbox') as HTMLInputElement;
        await act(async () => {
            input.focus();
            input.value = 'test message';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        });

        expect(createThread).toHaveBeenCalled();
    });

    describe('error handling', () => {
        it('shows error state when runtime has error', () => {
            (useLangGraphRuntime as jest.Mock).mockReturnValueOnce({
                messages: [],
                isStreaming: false,
                isError: true,
                error: new Error('Test error'),
                sendMessage: jest.fn(),
                switchToNewThread: jest.fn(),
                switchToThread: jest.fn(),
                clearThread: jest.fn(),
                interrupt: null,
            });

            render(<MyAssistant />);
            expect(screen.getByRole('complementary')).toHaveAttribute('data-error', 'true');
        });

        it('handles streaming errors gracefully', async () => {
            let runtimeMock = {
                messages: [],
                isStreaming: false,
                isError: false,
                error: null as Error | null,
                sendMessage: jest.fn().mockImplementation(async () => {
                    runtimeMock.isError = true;
                    runtimeMock.error = new Error('Stream error');
                }),
                switchToNewThread: jest.fn(),
                switchToThread: jest.fn(),
                clearThread: jest.fn(),
                interrupt: null,
            };

            (useLangGraphRuntime as jest.Mock).mockImplementation(() => runtimeMock);

            const { rerender } = render(<MyAssistant />);

            // Send a test message
            const input = screen.getByRole('textbox') as HTMLInputElement;
            await act(async () => {
                input.focus();
                input.value = 'test message';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            });

            // Force a re-render to reflect the error state
            rerender(<MyAssistant />);

            // Verify error handling
            expect(screen.getByRole('complementary')).toHaveAttribute('data-error', 'true');
        });
    });

    describe('InterruptUI', () => {
        it('renders InterruptUI when there is an interrupt', () => {
            (useLangGraphInterruptState as jest.Mock).mockReturnValue({
                value: 'Please authorize',
            });

            render(<MyAssistant />);

            expect(screen.getByText('Interrupt: Please authorize')).toBeInTheDocument();
        });

        it('calls sendCommand with "yes" when Confirm button is clicked', () => {
            const sendCommandMock = jest.fn();
            (useLangGraphInterruptState as jest.Mock).mockReturnValue({
                value: 'Please authorize',
            });
            (useLangGraphSendCommand as jest.Mock).mockReturnValue(sendCommandMock);

            render(<MyAssistant />);

            const confirmButton = screen.getByText('Yes');
            fireEvent.click(confirmButton);

            expect(sendCommandMock).toHaveBeenCalledWith({ resume: 'yes', type: 'authorization' });
        });

        it('calls sendCommand with "no" when Reject button is clicked', () => {
            const sendCommandMock = jest.fn();
            (useLangGraphInterruptState as jest.Mock).mockReturnValue({
                value: 'Please authorize',
            });
            (useLangGraphSendCommand as jest.Mock).mockReturnValue(sendCommandMock);

            render(<MyAssistant />);

            const rejectButton = screen.getByText('No');
            fireEvent.click(rejectButton);

            expect(sendCommandMock).toHaveBeenCalledWith({ resume: 'no', type: 'authorization' });
        });

        it('renders OAuth interrupt UI when there is an OAuth interrupt', () => {
            (useLangGraphInterruptState as jest.Mock).mockReturnValue({
                value: 'Please use the following link to authorize: https://accounts.google.com/o/oauth2/auth',
            });

            render(<MyAssistant />);

            expect(screen.getByText('Authorization Required')).toBeInTheDocument();
            expect(screen.getByText('Please visit this URL to authorize access:')).toBeInTheDocument();
            expect(screen.getByText('https://accounts.google.com/o/oauth2/auth')).toBeInTheDocument();
        });

        it('calls sendCommand with "no" when Cancel button is clicked in OAuth interrupt UI', () => {
            const sendCommandMock = jest.fn();
            (useLangGraphInterruptState as jest.Mock).mockReturnValue({
                value: 'Please use the following link to authorize: https://accounts.google.com/o/oauth2/auth',
            });
            (useLangGraphSendCommand as jest.Mock).mockReturnValue(sendCommandMock);

            render(<MyAssistant />);

            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            expect(sendCommandMock).toHaveBeenCalledWith({ resume: 'no', type: 'authorization' });
        });
    });
});

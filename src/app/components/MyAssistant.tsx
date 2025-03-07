"use client";

import { useRef, useEffect } from "react";
import { Thread } from "@assistant-ui/react";
import {
  LangChainMessage,
  useLangGraphInterruptState,
  useLangGraphRuntime,
  useLangGraphSendCommand,
} from "@assistant-ui/react-langgraph";
import {
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
} from "@assistant-ui/react";
import { Button } from "./ui/button";
import { createThread, getThreadState, sendMessage } from "@/src/app/lib/chatApi";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { Card } from "./ui/card";
import { useUser } from '@auth0/nextjs-auth0/client';

const MarkdownComponent = MarkdownTextPrimitive;

const InterruptUI = () => {
  const interrupt = useLangGraphInterruptState();
  const sendCommand = useLangGraphSendCommand();

  if (!interrupt) return null;

  // Only show custom UI for OAuth interrupts
  const isOAuthInterrupt = interrupt.value.includes('Please use the following link to authorize');
  if (!isOAuthInterrupt) {
    return (
      <div className="flex flex-col gap-2 p-4 border rounded-lg bg-gray-50">
        <div className="text-lg font-medium">Interrupt: {interrupt.value}</div>
        <div className="flex items-end gap-2">
          <Button onClick={() => sendCommand({ resume: "yes" })} variant="default">
            Yes
          </Button>
          <Button onClick={() => sendCommand({ resume: "no" })} variant="outline">
            No
          </Button>
        </div>
      </div>
    );
  }

  const urlMatch = interrupt.value.match(/https:\/\/accounts\.google\.com[^\s']*/);
  const authUrl = urlMatch ? urlMatch[0] : '';

  return (
    <div className="flex flex-col gap-2 p-4 border rounded-lg bg-gray-50">
      <div className="text-lg font-medium">Authorization Required</div>
      <div className="text-sm text-gray-600 mb-2">
        Please visit this URL to authorize access:
      </div>
      <div className="bg-gray-100 p-2 rounded break-all mb-2 font-mono text-sm">
        {authUrl}
      </div>
      <div className="flex items-end gap-2">
        <Button
          onClick={() => window.open(authUrl, '_blank', 'width=600,height=800')}
          variant="default"
        >
          Open URL
        </Button>
        <Button
          onClick={() => sendCommand({ resume: 'no' })}
          variant="outline"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export function MyAssistant() {
  const threadIdRef = useRef<string | undefined>(undefined);
  const { user } = useUser();
  const prevUserRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const currentUserId = user?.email || undefined;
    // If user changed (including login/logout), clear the thread
    if (prevUserRef.current !== currentUserId) {
      threadIdRef.current = undefined;
      prevUserRef.current = currentUserId;
    }
  }, [user]);

  const runtime = useLangGraphRuntime({
    threadId: threadIdRef.current,
    stream: async (messages, { command }) => {
      if (!threadIdRef.current) {
        const { thread_id } = await createThread();
        threadIdRef.current = thread_id;
      }
      const threadId = threadIdRef.current;
      const rawStream = await sendMessage({
        threadId,
        messages,
        command
      });

      // Transform the raw stream into a LangGraphMessagesEvent stream
      async function* transformStream() {
        for await (const chunk of rawStream) {
          if (chunk.value && typeof chunk.value === 'object') {
            // Assuming the chunk.value contains either a message or an update event
            yield {
              event: 'message',
              data: chunk.value as LangChainMessage
            };
          }
        }
      }

      return transformStream();
    },
    onSwitchToNewThread: async () => {
      const { thread_id } = await createThread();
      threadIdRef.current = thread_id;
    },
    onSwitchToThread: async (threadId) => {
      const state = await getThreadState(threadId);
      threadIdRef.current = threadId;
      return { messages: (state.values.messages as LangChainMessage[]) ?? [] };
    },
    adapters: {
      attachments: new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new SimpleTextAttachmentAdapter(),
      ]),
    },
  });

  return (
    <Card className="h-full z-50 bg-white/50 backdrop-blur-sm">
      <Thread
        runtime={runtime}
        components={{ MessagesFooter: InterruptUI }}
        assistantMessage={{
          components: {
            Text: ({ text, ...props }: { text: string } & React.ComponentProps<typeof MarkdownComponent>) => (
              <MarkdownComponent {...props}>{text}</MarkdownComponent>
            )
          }
        }}
      />
    </Card>
  );
}

export default MyAssistant;

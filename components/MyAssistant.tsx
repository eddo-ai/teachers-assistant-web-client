"use client";

import { useRef } from "react";
import { Thread, type TextContentPartComponent } from "@assistant-ui/react";
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
import { makeMarkdownText } from "@assistant-ui/react-markdown";
import { useUser } from "@auth0/nextjs-auth0/client";
import { Button } from "./ui/button";

import { createThread, getThreadState, sendMessage } from "@/lib/chatApi";
import { ToolFallback } from "./tools/ToolFallback";

const MarkdownComponent = makeMarkdownText() as unknown as TextContentPartComponent;

const InterruptUI = () => {
  const interrupt = useLangGraphInterruptState();
  const sendCommand = useLangGraphSendCommand();

  if (!interrupt) return null;

  const handleResponse = (response: "yes" | "no") => {
    sendCommand({ resume: response });
  };

  return (
    <div className="flex flex-col gap-2 p-4 border rounded-lg bg-gray-50">
      <div className="text-lg font-medium">Interrupt: {interrupt.value}</div>
      <div className="flex items-end gap-2">
        <Button onClick={() => handleResponse("yes")} variant="default">
          Yes
        </Button>
        <Button onClick={() => handleResponse("no")} variant="outline">
          No
        </Button>
      </div>
    </div>
  );
};

export function MyAssistant() {
  const threadIdRef = useRef<string | undefined>(undefined);
  const { user } = useUser();

  const runtime = useLangGraphRuntime({
    threadId: threadIdRef.current,
    stream: async (messages, { command }) => {
      if (!threadIdRef.current) {
        const { thread_id } = await createThread();
        threadIdRef.current = thread_id;
      }
      const threadId = threadIdRef.current;
      return sendMessage({
        threadId,
        messages,
        command,
      });
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
    <div className="flex flex-col h-full">
      <Thread
        runtime={runtime}
        components={{ MessagesFooter: InterruptUI }}
        assistantMessage={{ components: { Text: MarkdownComponent, ToolFallback } }}
      />
    </div>
  );
}
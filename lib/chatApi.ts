import { ThreadState, Client } from "@langchain/langgraph-sdk";
import {
  LangChainMessage,
  LangGraphCommand,
} from "@assistant-ui/react-langgraph";

// Custom error class for chat API errors
export class ChatApiError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'ChatApiError';
  }
}

const createClient = () => {
  const apiUrl =
    process.env["NEXT_PUBLIC_LANGGRAPH_API_URL"] ||
    new URL("/api", window.location.href).href;
  return new Client({
    apiUrl,
  });
};

export const createAssistant = async (graphId: string) => {
  const client = createClient();
  try {
    return await client.assistants.create({ graphId });
  } catch (error) {
    throw new ChatApiError('Failed to create assistant', error);
  }
};

export const createThread = async () => {
  const client = createClient();
  try {
    return await client.threads.create();
  } catch (error) {
    throw new ChatApiError('Failed to create thread', error);
  }
};

export const getThreadState = async (
  threadId: string,
): Promise<ThreadState<Record<string, unknown>>> => {
  const client = createClient();
  try {
    return await client.threads.getState(threadId);
  } catch (error) {
    throw new ChatApiError(`Failed to get thread state for thread ${threadId}`, error);
  }
};

export const updateState = async (
  threadId: string,
  fields: {
    newState: Record<string, unknown>;
    asNode?: string;
  },
) => {
  const client = createClient();
  try {
    return await client.threads.updateState(threadId, {
      values: fields.newState,
      asNode: fields.asNode!,
    });
  } catch (error) {
    throw new ChatApiError(`Failed to update state for thread ${threadId}`, error);
  }
};

export const sendMessage = async (params: {
  threadId: string;
  messages: LangChainMessage[];
  command?: LangGraphCommand | undefined;
}) => {
  const client = createClient();

  const input = params.messages.length
    ? { messages: params.messages }
    : undefined;

  const config = {
    configurable: {
      model_name: "openai",
    }
  };

  try {
    return await client.runs.stream(
      params.threadId,
      process.env["NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID"]!,
      {
        input,
        ...(params.command && { command: params.command }),
        config,
        streamMode: ["updates", "messages"],
      },
    );
  } catch (error: any) {
    // Enhanced error handling
    let errorMessage = `Failed to send message to thread ${params.threadId}`;

    if (error.response) {
      // Add status code and response data if available
      errorMessage += ` (Status ${error.response.status})`;
      if (error.response.data) {
        errorMessage += `: ${JSON.stringify(error.response.data)}`;
      }
    }

    throw new ChatApiError(errorMessage, error);
  }
};

export const authorize = async (state: any, config: any) => {
  const user_id = config["configurable"].get("user_id");
  for (const tool_call of state["messages"].slice(-1)[0].tool_calls) {
    const tool_name = tool_call["name"];
    if (!tool_manager.requires_auth(tool_name)) {
      continue;
    }
    const auth_response = tool_manager.authorize(tool_name, user_id);
    if (auth_response.status !== "completed") {
      console.log(`Visit the following URL to authorize: ${auth_response.url}`);
      tool_manager.wait_for_auth(auth_response.id);
      if (!tool_manager.is_authorized(auth_response.id)) {
        throw new Error("Authorization failed");
      }
    }
  }
  return { messages: [] };
};

export const sendCommand = async (command: any) => {
  const client = createClient();
  try {
    return await client.commands.send(command);
  } catch (error) {
    throw new ChatApiError('Failed to send command', error);
  }
};

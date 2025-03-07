import { Client } from "@langchain/langgraph-sdk";
import { ChatApiError } from "../chatApi";
import {
    createAssistant,
    createThread,
    getThreadState,
    updateState,
    sendMessage,
} from "../chatApi";

// Mock the LangGraph client
const mockClient = {
    assistants: {
        create: jest.fn(),
    },
    threads: {
        create: jest.fn(),
        getState: jest.fn(),
        updateState: jest.fn(),
    },
    runs: {
        stream: jest.fn(),
    },
};

jest.mock("@langchain/langgraph-sdk", () => ({
    Client: jest.fn().mockImplementation(() => mockClient),
}));

describe("chatApi", () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Reset environment variables
        process.env.NEXT_PUBLIC_LANGGRAPH_API_URL = "http://test-api";
        process.env.NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID = "test-assistant-id";

        // Set up default mock implementations
        mockClient.assistants.create.mockImplementation(async (params) => {
            if (params.graphId === "test-graph-id") {
                return { id: "test-assistant-id" };
            }
            throw new Error("API Error");
        });

        mockClient.threads.create.mockImplementation(async () => {
            return { id: "test-thread-id" };
        });

        mockClient.threads.getState.mockImplementation(async (threadId) => {
            if (threadId === "test-thread-id") {
                return { data: "test-state" };
            }
            throw new Error("API Error");
        });

        mockClient.threads.updateState.mockImplementation(async (threadId, params) => {
            if (threadId === "test-thread-id") {
                return { success: true };
            }
            throw new Error("API Error");
        });

        mockClient.runs.stream.mockImplementation(async function* (threadId, assistantId) {
            if (threadId === "test-thread-id" && assistantId === "test-assistant-id") {
                yield { event: "message", data: { id: "test-run-id" } };
            } else {
                throw new Error("API Error");
            }
        });
    });

    describe("createAssistant", () => {
        it("should successfully create an assistant", async () => {
            const result = await createAssistant("test-graph-id");

            expect(result).toEqual({ id: "test-assistant-id" });
            expect(mockClient.assistants.create).toHaveBeenCalledWith({
                graphId: "test-graph-id",
            });
        });

        it("should throw ChatApiError when creation fails", async () => {
            // Override the mock implementation for this test
            mockClient.assistants.create.mockImplementation(async () => {
                throw new Error("API Error");
            });

            await expect(createAssistant("invalid-graph-id")).rejects.toThrow(ChatApiError);
        });
    });

    describe("createThread", () => {
        it("should successfully create a thread", async () => {
            const result = await createThread();

            expect(result).toEqual({ id: "test-thread-id" });
            expect(mockClient.threads.create).toHaveBeenCalled();
        });

        it("should handle API errors with detailed error message", async () => {
            // Override the mock implementation for this test
            mockClient.threads.create.mockImplementation(async () => {
                throw new Error("API Error");
            });

            await expect(createThread()).rejects.toThrow(ChatApiError);
        });
    });

    describe("getThreadState", () => {
        it("should successfully get thread state", async () => {
            const result = await getThreadState("test-thread-id");

            expect(result).toEqual({ data: "test-state" });
            expect(mockClient.threads.getState).toHaveBeenCalledWith("test-thread-id");
        });

        it("should throw ChatApiError when getting state fails", async () => {
            // Override the mock implementation for this test
            mockClient.threads.getState.mockImplementation(async () => {
                throw new Error("API Error");
            });

            await expect(getThreadState("invalid-thread-id")).rejects.toThrow(ChatApiError);
        });
    });

    describe("updateState", () => {
        it("should successfully update thread state", async () => {
            const result = await updateState("test-thread-id", {
                newState: { key: "value" },
                asNode: "test-node",
            });

            expect(result).toEqual({ success: true });
            expect(mockClient.threads.updateState).toHaveBeenCalledWith(
                "test-thread-id",
                {
                    values: { key: "value" },
                    asNode: "test-node",
                }
            );
        });

        it("should throw ChatApiError when update fails", async () => {
            // Override the mock implementation for this test
            mockClient.threads.updateState.mockImplementation(async () => {
                throw new Error("API Error");
            });

            await expect(
                updateState("invalid-thread-id", {
                    newState: { key: "value" },
                    asNode: "test-node",
                })
            ).rejects.toThrow(ChatApiError);
        });
    });

    describe("sendMessage", () => {
        it("should successfully send a message", async () => {
            const result = await sendMessage({
                threadId: "test-thread-id",
                messages: [{ type: "human", content: "Hello" }],
            });

            // The result should be an async generator
            expect(result).toBeDefined();
            expect(mockClient.runs.stream).toHaveBeenCalledWith(
                "test-thread-id",
                "test-assistant-id",
                expect.objectContaining({
                    input: { messages: [{ type: "human", content: "Hello" }] },
                    config: {
                        configurable: {
                            user_id: undefined,
                            thread_id: "test-thread-id",
                            assistant_id: "test-assistant-id",
                        },
                    },
                })
            );
        });

        it("should include user ID when email is verified", async () => {
            await sendMessage({
                threadId: "test-thread-id",
                messages: [{ type: "human", content: "Hello" }],
                user: {
                    email: "test@example.com",
                    email_verified: true,
                },
            });

            expect(mockClient.runs.stream).toHaveBeenCalledWith(
                "test-thread-id",
                "test-assistant-id",
                expect.objectContaining({
                    config: {
                        configurable: {
                            user_id: "test@example.com",
                            thread_id: "test-thread-id",
                            assistant_id: "test-assistant-id",
                        },
                    },
                })
            );
        });

        it("should throw error when assistant ID is not set", async () => {
            process.env.NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID = "";

            await expect(
                sendMessage({
                    threadId: "test-thread-id",
                    messages: [{ type: "human", content: "Hello" }],
                })
            ).rejects.toThrow(ChatApiError);
        });

        it("should handle API errors with detailed error message", async () => {
            // Override the mock implementation for this test
            mockClient.runs.stream.mockImplementation(async function* () {
                throw new Error("API Error");
            });

            await expect(
                sendMessage({
                    threadId: "invalid-thread-id",
                    messages: [{ type: "human", content: "Hello" }],
                })
            ).rejects.toThrow(ChatApiError);
        });
    });
}); 
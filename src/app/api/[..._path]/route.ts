import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
}

async function handleRequest(req: NextRequest, method: string) {
  try {
    const path = req.nextUrl.pathname.replace(/^\/?api\//, "");
    const url = new URL(req.url);
    const searchParams = new URLSearchParams(url.search);
    searchParams.delete("_path");
    searchParams.delete("nxtP_path");
    const queryString = searchParams.toString()
      ? `?${searchParams.toString()}`
      : "";

    const apiKey = process.env["LANGSMITH_API_KEY"];
    const apiUrl = process.env["LANGGRAPH_API_URL"];

    if (!apiKey || !apiUrl) {
      throw new Error("Missing required environment variables");
    }

    const options: RequestInit = {
      method,
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
    };

    if (["POST", "PUT", "PATCH"].includes(method)) {
      options.body = await req.text();
    }

    // Sanitize logging to avoid exposing sensitive data
    console.log({
      path,
      method,
      hasBody: !!options.body,
    });

    const res = await fetch(
      `${apiUrl}/${path}${queryString}`,
      options
    );

    if (!res.ok) {
      const error = await res.text();
      console.error(`API Error: ${res.status} - ${error}`);
      throw new Error(`API request failed: ${res.statusText}`);
    }

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: {
        ...res.headers,
        ...getCorsHeaders(),
      },
    });
  } catch (e: unknown) {
    console.error("Request error:", e);
    return NextResponse.json(
      { error: "An error occurred processing your request" },
      { status: 500 }
    );
  }
}

export const GET = (req: NextRequest) => handleRequest(req, "GET");
export const POST = (req: NextRequest) => handleRequest(req, "POST");
export const PUT = (req: NextRequest) => handleRequest(req, "PUT");
export const PATCH = (req: NextRequest) => handleRequest(req, "PATCH");
export const DELETE = (req: NextRequest) => handleRequest(req, "DELETE");

// Add a new OPTIONS handler
export const OPTIONS = () => {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(),
    },
  });
};
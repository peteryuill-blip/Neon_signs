import Anthropic from "@anthropic-ai/sdk";

// ─── Type Exports (kept for call-site compatibility) ────────────────────────

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: { name: string };
};
export type ToolChoice = ToolChoicePrimitive | ToolChoiceByName | ToolChoiceExplicit;

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

// InvokeResult shape matches the OpenAI-compatible format used by all call sites
export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractTextContent(content: MessageContent | MessageContent[]): string {
  const parts = Array.isArray(content) ? content : [content];
  return parts
    .map(p => (typeof p === "string" ? p : p.type === "text" ? p.text : ""))
    .filter(Boolean)
    .join("\n");
}

// ─── Main invokeLLM ─────────────────────────────────────────────────────────

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[LLM] ANTHROPIC_API_KEY not set — returning placeholder");
    return {
      id: "placeholder",
      created: Date.now(),
      model: "none",
      choices: [{
        index: 0,
        message: { role: "assistant", content: "[LLM not configured]" },
        finish_reason: "stop",
      }],
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.LLM_MODEL || "claude-sonnet-4-20250514";

  // Split system message out from the messages array
  let systemPrompt: string | undefined;
  const userMessages: Anthropic.MessageParam[] = [];

  for (const msg of params.messages) {
    const text = extractTextContent(msg.content);
    if (msg.role === "system") {
      systemPrompt = systemPrompt ? `${systemPrompt}\n${text}` : text;
    } else if (msg.role === "user" || msg.role === "assistant") {
      userMessages.push({ role: msg.role, content: text });
    }
  }

  // Anthropic requires at least one user message
  if (userMessages.length === 0) {
    userMessages.push({ role: "user", content: "Begin." });
  }

  const maxTokens = params.maxTokens || params.max_tokens || 2048;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: userMessages,
  });

  // Map Anthropic response back to OpenAI-compatible InvokeResult
  const textBlock = response.content.find(b => b.type === "text");
  const textContent = textBlock && textBlock.type === "text" ? textBlock.text : "";

  return {
    id: response.id,
    created: Math.floor(Date.now() / 1000),
    model: response.model,
    choices: [{
      index: 0,
      message: { role: "assistant", content: textContent },
      finish_reason: response.stop_reason ?? "stop",
    }],
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}

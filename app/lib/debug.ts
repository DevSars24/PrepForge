export type ErrorKind =
  | "api_error"
  | "timeout"
  | "network_error"
  | "invalid_response"
  | "parsing_error"
  | "file_upload_error"
  | "pdf_scan_error"
  | "gemini_error"
  | "evaluation_error"
  | "render_error";

export type DebugError = {
  kind: ErrorKind;
  component: string;
  message: string;
  stack?: string;
  statusCode?: number;
  request?: Record<string, unknown>;
  response?: unknown;
  cause?: unknown;
};

export class PrepForgeError extends Error {
  kind: ErrorKind;
  component: string;
  statusCode?: number;
  request?: Record<string, unknown>;
  response?: unknown;

  constructor(params: Omit<DebugError, "stack">) {
    super(params.message);
    this.name = "PrepForgeError";
    this.kind = params.kind;
    this.component = params.component;
    this.statusCode = params.statusCode;
    this.request = params.request;
    this.response = params.response;
    if (params.cause) this.cause = params.cause;
  }
}

export function normalizeError(error: unknown, fallback: Pick<DebugError, "kind" | "component">): DebugError {
  if (error instanceof PrepForgeError) {
    return {
      kind: error.kind,
      component: error.component,
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      request: error.request,
      response: error.response,
      cause: serializeCause(error.cause),
    };
  }

  if (error instanceof Error) {
    return {
      ...fallback,
      message: error.message,
      stack: error.stack,
      cause: serializeCause(error.cause),
    };
  }

  return {
    ...fallback,
    message: typeof error === "string" ? error : "Unknown error",
    cause: serializeCause(error),
  };
}

export function logDebugError(error: DebugError) {
  console.error(`[PrepForge:${error.component}] ${error.kind}: ${error.message}`, {
    stack: error.stack,
    statusCode: error.statusCode,
    request: error.request,
    response: error.response,
    cause: error.cause,
  });
}

export function errorResponse(error: DebugError, status = 500) {
  logDebugError(error);
  return Response.json({ error: error.message, debug: error }, { status: error.statusCode || status });
}

export async function withTimeout<T>(
  operation: Promise<T>,
  ms: number,
  component: string,
  request?: Record<string, unknown>
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(
            new PrepForgeError({
              kind: "timeout",
              component,
              message: `${component} timed out after ${ms}ms`,
              statusCode: 504,
              request,
            })
          );
        }, ms);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function serializeCause(cause: unknown) {
  if (!cause) return undefined;
  if (cause instanceof Error) return { name: cause.name, message: cause.message, stack: cause.stack };
  return cause;
}

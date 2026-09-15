import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { ForbiddenError, UnauthenticatedError } from "./errors";

export function toErrorResponse(error: unknown): NextResponse {
  const requestId = randomUUID();

  if (error instanceof UnauthenticatedError) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: error.message, requestId } },
      { status: 401 }
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: error.message, requestId } },
      { status: 403 }
    );
  }

  console.error("[auth] unhandled route error", { requestId, error });
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong.", requestId } },
    { status: 500 }
  );
}

export class UnauthenticatedError extends Error {
  readonly code = "UNAUTHENTICATED" as const;
  constructor(message = "Sign in to continue.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends Error {
  readonly code = "FORBIDDEN" as const;
  constructor(message = "You cannot perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

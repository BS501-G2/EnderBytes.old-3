export type AuthenticationType = "password" | "token";

export type AuthenticationPayload = [type: "password", password: string];

export type ScanFolderSortType = "fileName" | "dateModified" | "contentSize";

export type FileThumbnailerStatusType =
  | "inQueue"
  | "inProgress"
  | "available"
  | "failed"
  | "notAvailable"
  | "notRunning";

export interface Authentication {
  userId: number;

  userSessionId: number;
  userSessionKey: string;
}

export interface PartialAuthenticationToken {
  userId: number;
  sessionId: number;
}

export type UserResolvePayload =
  | [type: "userId", id: number]
  | [type: "username", username: string];

export type ApiErrorType =
  | "Unknown"
  | "InvalidRequest"
  | "Unauthorized"
  | "Forbidden"
  | "Conflict"
  | "NotFound";

export class ApiError extends Error {
  public static throw(
    status: ApiErrorType,
    message?: string,
    { cause, stack }: ApiErrorOptions = {}
  ): never {
    throw new ApiError(status, cause?.message ?? message ?? `${status}`, {
      stack,
      cause,
    });
  }

  public static throwFrom(
    error: Error,
    status: ApiErrorType = "Unknown",
    message?: string
  ): never {
    return ApiError.throw(status, message, {
      cause: error,
      stack: error.stack,
    });
  }

  public constructor(
    status: ApiErrorType,
    message: string,
    { stack, cause }: ApiErrorOptions = {}
  ) {
    super(
      `${message} (code ${status}${message == status ? "" : ` ${status}`})`,
      { cause }
    );

    this.rawMessage = message;

    this.status = status;
    this.stack = stack;
  }

  public readonly rawMessage: string;
  public readonly status: ApiErrorType;
}

export interface ApiErrorOptions extends ErrorOptions {
  stack?: string;
  cause?: Error;
}

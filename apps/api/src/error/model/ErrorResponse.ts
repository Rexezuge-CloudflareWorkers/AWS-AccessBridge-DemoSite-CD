interface ErrorResponse {
  Exception?:
    | {
        Type?: string | undefined;
        Message?: string | undefined;
      }
    | undefined;
}

export type { ErrorResponse };

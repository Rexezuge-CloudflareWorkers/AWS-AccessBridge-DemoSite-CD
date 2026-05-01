import { BadRequestError, ForbiddenError, InternalServerError, UnauthorizedError, IServiceError, DatabaseError } from '@/error';
import type { ErrorResponse } from '@/error';

class ErrorDeserializationUtil {
  public static async deserializeError(response: Response): Promise<IServiceError> {
    try {
      const errorData: ErrorResponse = (await response.json()) as ErrorResponse;
      const errorType: string = errorData.Exception?.Type || 'InternalServerError';
      const errorMessage: string = errorData.Exception?.Message || 'Unknown error occurred';
      switch (errorType) {
        case 'BadRequest':
          return new BadRequestError(errorMessage);
        case 'Unauthorized':
          return new UnauthorizedError(errorMessage);
        case 'Forbidden':
          return new ForbiddenError(errorMessage);
        case 'DatabaseError':
          return new DatabaseError(errorMessage);
        case 'InternalServerError':
        default:
          return new InternalServerError(errorMessage);
      }
    } catch {
      return new InternalServerError(`HTTP ${response.status}: ${response.statusText}`);
    }
  }
}

export { ErrorDeserializationUtil };

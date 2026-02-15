import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
  requestId?: string;
}

@Catch()
export class CentralizedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CentralizedExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, body } = this.normalize(exception, request);
    this.logger.warn(
      `[${request.method}] ${request.url} -> ${statusCode} ${JSON.stringify(body)}`,
    );
    response.status(statusCode).json(body);
  }

  private normalize(
    exception: unknown,
    request: Request,
  ): { statusCode: number; body: ApiErrorResponse } {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const requestId = (request as Request & { id?: string }).id;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'object' && res !== null && 'message' in res
          ? (res as { message?: string | string[] }).message
          : exception.message;
      return {
        statusCode: status,
        body: {
          statusCode: status,
          error: exception.name,
          message: message ?? 'Unknown error',
          timestamp,
          path,
          requestId,
        },
      };
    }

    if (exception instanceof Error) {
      const status =
        exception.name === 'UnauthorizedError'
          ? HttpStatus.UNAUTHORIZED
          : HttpStatus.INTERNAL_SERVER_ERROR;
      return {
        statusCode: status,
        body: {
          statusCode: status,
          error: 'Internal Server Error',
          message:
            process.env.NODE_ENV === 'production'
              ? 'An unexpected error occurred.'
              : exception.message,
          timestamp,
          path,
          requestId,
        },
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred.',
        timestamp,
        path,
        requestId,
      },
    };
  }
}

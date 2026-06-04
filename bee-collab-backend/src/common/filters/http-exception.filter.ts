import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  success: false;
  error: string;
  statusCode: number;
  timestamp: string;
  path: string;
}

/**
 * Global HTTP Exception Filter
 *
 * Catches all thrown HttpExceptions and formats them into the same
 * ApiResponse envelope shape as the ResponseInterceptor.
 *
 * Demonstrates:
 *  - Single Responsibility: one class owns all error-response formatting
 *  - DRY: error shape is defined once, applied everywhere
 *  - Decorator Pattern: @Catch() marks it as an aspect over the request pipeline
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception.getResponse();
    const error =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as Record<string, unknown>).message ?? exception.message;

    const body: ErrorResponse = {
      success: false,
      error: Array.isArray(error) ? error.join(', ') : String(error),
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logger.warn(`[${statusCode}] ${request.method} ${request.url} — ${body.error}`);

    response.status(statusCode).json(body);
  }
}

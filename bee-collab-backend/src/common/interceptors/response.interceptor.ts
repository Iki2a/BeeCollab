import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  path: string;
}

/**
 * Global Response Interceptor — Decorator Pattern
 *
 * Wraps every successful HTTP response in a consistent ApiResponse envelope.
 * Applied once at the bootstrap level; no individual controller changes needed.
 *
 * Demonstrates:
 *  - Decorator Pattern: transparently augments response without touching controllers
 *  - Open/Closed Principle: add new fields here, zero controller changes required
 *  - Single Responsibility: one class owns the entire response-shaping concern
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        message: 'Success',
        timestamp: new Date().toISOString(),
        path: request.url,
      })),
    );
  }
}

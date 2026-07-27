import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // If headers already sent, let Express default handler deal with it
    if (response.headersSent) {
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Never expose stack traces in production
    if (process.env.NODE_ENV !== 'production') {
      this.logger.error(exception);
    }

    // Handle class-validator validation errors (array of messages)
    let message: string | string[];

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as any;

      if (Array.isArray(resp.message)) {
        message = resp.message;
      } else if (typeof resp.message === 'string') {
        message = resp.message;
      } else {
        message = 'Validation failed';
      }
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else {
      message = 'Internal server error';
    }

    // Safely extract path — avoid circular reference from request object
    let path = '';
    try {
      path = request?.url || '';
    } catch {
      path = '';
    }

    try {
      response.status(status).json({
        success: false,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path,
        message,
      });
    } catch (err) {
      // If JSON serialization fails, send a plain text fallback
      this.logger.error(`Failed to send error response: ${err.message}`);
      response.status(status).send(`Error ${status}: ${message}`);
    }
  }
}

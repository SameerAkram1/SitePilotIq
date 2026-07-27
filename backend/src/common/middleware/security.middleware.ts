import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Remove X-Powered-By from response (helmet also handles this)
    res.removeHeader('x-powered-by');
    next();
  }
}

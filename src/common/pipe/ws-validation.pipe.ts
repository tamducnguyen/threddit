import { ValidationPipe } from '@nestjs/common';
import { WsValidationException } from '../exception/ws-validation.exception';

export class WsValidation extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const messages = errors
          .map((error) => error.constraints)
          .filter((constraint) => constraint !== undefined)
          .flatMap((constraintNonUndefined) =>
            Object.values(constraintNonUndefined),
          );
        return new WsValidationException(messages);
      },
    });
  }
}

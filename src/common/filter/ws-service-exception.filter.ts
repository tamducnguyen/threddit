import { ArgumentsHost, Catch, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { WsBaseServiceException } from '../exception/ws-base-service.exception';
import { sendWsResponse } from '../helper/response.helper';
import { message } from '../helper/message.helper';
import { errorCode } from '../helper/errorcode.helper';
import { WsValidationException } from '../exception/ws-validation.exception';

@Catch()
export class WsServiceExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsServiceExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof WsBaseServiceException) {
      return super.catch(
        new WsException(
          sendWsResponse(
            false,
            exception.message,
            undefined,
            exception.errorCode,
          ),
        ),
        host,
      );
    }

    if (exception instanceof WsValidationException) {
      return super.catch(
        new WsException(sendWsResponse(false, exception.validationMessages)),
        host,
      );
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );

    return super.catch(
      new WsException(
        sendWsResponse(
          false,
          message.common.internal_server_error,
          undefined,
          errorCode.common.internal_server_error,
        ),
      ),
      host,
    );
  }
}

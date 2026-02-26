import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { message } from '../common/helper/message.helper';
import { sendResponse } from '../common/helper/response.helper';
import { ToxicResponse } from '../content/interface/toxicresponse.interface';
@Injectable()
export class HttpsService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}
  async checkToxic(content: string) {
    let data: ToxicResponse | undefined;
    try {
      const checkToxicResponse = await firstValueFrom(
        this.httpService.post(this.configService.getOrThrow('URL_AI'), {
          text: content,
        }),
      );
      data = checkToxicResponse.data as ToxicResponse;
    } catch (error) {
      data = undefined;
      console.log(error);
      throw new InternalServerErrorException(
        sendResponse(
          HttpStatus.INTERNAL_SERVER_ERROR,
          message.http.common.time_out,
        ),
      );
    }
    if (data && data.type !== 0) {
      throw new BadRequestException(
        sendResponse(HttpStatus.BAD_REQUEST, message.http.check_toxic.toxic),
      );
    }
  }
}

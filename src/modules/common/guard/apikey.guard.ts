import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const apiKeyActivation =
      this.configService.getOrThrow<string>('API_KEY_ACTIVATION');
    if (apiKeyActivation !== 'true') {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const apiKeyFromRequest = request.headers['x-api-key'] as string;
    const validApiKey = this.configService.getOrThrow<string>('API_KEY');
    if (apiKeyFromRequest !== validApiKey) {
      return false;
    }
    return true;
  }
}

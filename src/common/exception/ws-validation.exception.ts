export class WsValidationException extends Error {
  readonly status: false;
  readonly validationMessages: string[];
  constructor(validationMessages: string[]) {
    super();
    this.validationMessages = validationMessages;
  }
}

export abstract class WsBaseServiceException extends Error {
  abstract readonly errorCode?: string;
}

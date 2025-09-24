export class AuthUser {
  constructor(sub: string, email: string) {
    this.sub = sub;
    this.email = email;
  }
  sub: string;
  email: string;
}

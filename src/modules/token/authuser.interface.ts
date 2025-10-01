export class AuthUser {
  constructor(sub: string, email: string, username: string) {
    this.sub = sub;
    this.email = email;
    this.username = username;
  }
  sub: string;
  email: string;
  username: string;
}

export class AuthUser {
  constructor(sub: number, email: string, username: string) {
    this.sub = sub;
    this.email = email;
    this.username = username;
  }
  sub: number;
  email: string;
  username: string;
}

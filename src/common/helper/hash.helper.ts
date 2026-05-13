import * as bcrypt from 'bcrypt';
export class HashHelper {
  static async hash(string: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    const hashedResult = await bcrypt.hash(string, salt);
    return hashedResult;
  }
  static async compare(string: string, hashedOne: string): Promise<boolean> {
    return await bcrypt.compare(string, hashedOne);
  }
}

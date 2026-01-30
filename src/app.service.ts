import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /**
   * Возвращает строку приветствия.
   */
  getHello(): string {
    return 'Hello World!';
  }
}

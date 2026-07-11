import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticsApiService {
  getHello(): string {
    return 'Hello World!';
  }
}

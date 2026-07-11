import { Injectable } from '@nestjs/common';

@Injectable()
export class ProcessingEngineService {
  getHello(): string {
    return 'Hello World!';
  }
}

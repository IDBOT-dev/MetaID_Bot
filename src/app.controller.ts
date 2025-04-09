import { Controller, Get,Inject } from '@nestjs/common'
import { AppService } from './app.service'


@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {
   
  }
  
  @Get()
  async getHello(): Promise<string> {
  await this.appService.getHello()
   return 'hello'
  }

 
}

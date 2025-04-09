
export class AppService {
 
  
  async getHello(): Promise<any> {
 
    return 'Hello World!'
  }

  getVersion():string{
    
   return 'Hello version!'
  }
}

import {  Injectable } from '@nestjs/common'

@Injectable()
export class TaskQueue {
    queue:any[]
    isProcessing:boolean
    constructor() {
      
      this.queue = [];
      this.isProcessing = false; 
    }
  
   
    enqueue(task) {
      return new Promise((resolve, reject) => {
        this.queue.push({
          task,
          resolve,
          reject
        });
        this.process(); 
      });
    }
  
   
    async process() {
      if (this.isProcessing || this.queue.length === 0) {
        return; 
      }
  
      this.isProcessing = true;
      const currentTask = this.queue.shift(); 
  
      try {
       
        const result = await currentTask.task();
        currentTask.resolve(result); 
      } catch (error) {
        currentTask.reject(error); 
      } finally {
        this.isProcessing = false;
        this.process(); 
      }
    }
  
 
    clear() {
      this.queue = [];
    }
  
   
    get length() {
      return this.queue.length;
    }
  }
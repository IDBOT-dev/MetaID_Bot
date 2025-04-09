import { Module } from '@nestjs/common'
import { MetaidUpdate } from './metaid.update'
import { RandomNumberScene } from './scenes/random-number.scene'
import { MetaidWizard } from './wizard/metaid.wizard'
import { MetaidQuery } from 'src/metaid/metaid.query'
import { UserService } from 'src/user/user.service'
import { TxService } from 'src/transation/tx.service'
import { TaskQueue } from 'src/lib/tools/taskQueue'
// import { PrismaService } from 'src/prisma.service'
// import {UsersModule} from 'src/user/user.module'
@Module({
  
  providers: [
    MetaidUpdate,
    MetaidQuery,
    RandomNumberScene,
    MetaidWizard,
    UserService,
    TxService,
    TaskQueue
    
    
    // PrismaService,
  ],
})
export class MetaidModule {

}

import { Module } from '@nestjs/common'
import { TicketActions } from './ticket.actions'
import { UserService } from 'src/user/user.service'
// import { PrismaService } from 'src/prisma.service'
//import {UsersModule} from 'src/user/user.module'
@Module({

  providers: [TicketActions, UserService],
})
export class TicketModule {}

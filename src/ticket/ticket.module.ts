import { Module } from '@nestjs/common'
import { TicketActions } from './ticket.actions'
import { UserService } from 'src/user.service'
import { PrismaService } from 'src/prisma.service'

@Module({
  providers: [TicketActions, UserService, PrismaService],
})
export class TicketModule {}

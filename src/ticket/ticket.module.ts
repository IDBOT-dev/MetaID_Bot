import { Module } from '@nestjs/common'
import { TicketActions } from './ticket.actions'

@Module({
  providers: [TicketActions],
})
export class TicketModule {}

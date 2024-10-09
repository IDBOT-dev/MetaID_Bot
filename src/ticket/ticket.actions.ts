import { Command, Ctx, Update } from 'nestjs-telegraf'
import { FullContext } from '../interfaces/context.interface'
import { buyTicket } from 'src/lib/ticket'
import { getAddress } from 'src/lib/metaid'

@Update()
export class TicketActions {
  @Command('buyticket')
  async onBuyTicketCommand(@Ctx() ctx: FullContext): Promise<void> {
    const address = await getAddress()
    const res = await buyTicket(ctx.payload, address)

    await ctx.reply(res)
  }
}

import { Command, Ctx, Sender, Update } from 'nestjs-telegraf'
import { FullContext } from '../interfaces/context.interface'
import { buyTicket, sellTicket } from 'src/lib/ticket'
import { getAddress, getPublicKey, getSigner } from 'src/lib/metaid'
import { UserService } from 'src/user.service'
import { messages } from 'src/lib/messages'

@Update()
export class TicketActions {
  constructor(private readonly userService: UserService) {}

  @Command('buyticket')
  async onBuyTicketCommand(
    @Sender('id') tgid: number,
    @Ctx() ctx: FullContext,
  ): Promise<void> {
    const user = await this.userService.user({ tgid: String(tgid) })
    if (!user) {
      await ctx.reply(messages.LINK_FIRST)
      return
    }

    const address = getAddress(user.mneid, user.path)
    const publicKey = getPublicKey(user.mneid, user.path)
    const signer = getSigner(user.mneid, user.path)

    const res = await buyTicket(ctx.payload, address, publicKey, signer)

    await ctx.reply(res)
  }

  @Command('sellticket')
  async onSellTicketCommand(
    @Sender('id') tgid: number,
    @Ctx() ctx: FullContext,
  ): Promise<void> {
    const user = await this.userService.user({ tgid: String(tgid) })
    if (!user) {
      await ctx.reply(messages.LINK_FIRST)
      return
    }

    const address = getAddress(user.mneid, user.path)
    const publicKey = getPublicKey(user.mneid, user.path)
    const signer = getSigner(user.mneid, user.path)

    const res = await sellTicket(ctx.payload, address, publicKey, signer)

    await ctx.reply(res)
  }
}

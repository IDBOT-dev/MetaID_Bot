import { Command, Ctx, Sender, Update } from 'nestjs-telegraf'
import { FullContext } from '../interfaces/context.interface'
import { buyTicket, sellTicket } from 'src/lib/ticket'
import { getAddress, getCred, getPublicKey, getSigner } from 'src/lib/metaid'
import { UserService } from 'src/user.service'
import { messages } from 'src/lib/messages'
import { ticketMessage } from 'src/lib/util'

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

    const [tick, priceInBtc] = ctx.payload.split(' ')
    if (!tick || !priceInBtc) {
      await ctx.reply('Invalid')
      return
    }

    const address = getAddress(user.mneid, user.path)
    const publicKey = getPublicKey(user.mneid, user.path)
    const signer = getSigner(user.mneid, user.path)
    const cred = await getCred(user.mneid, user.path, ticketMessage)

    const res = await buyTicket(ctx.payload, address, publicKey, signer, cred)

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

    const [tick, priceInBtc] = ctx.payload.split(' ')
    if (!tick || !priceInBtc) {
      await ctx.reply('Invalid')
      return
    }

    const address = getAddress(user.mneid, user.path)
    const publicKey = getPublicKey(user.mneid, user.path)
    const signer = getSigner(user.mneid, user.path)
    const cred = await getCred(user.mneid, user.path, ticketMessage)

    const res = await sellTicket(ctx.payload, address, publicKey, signer, cred)

    await ctx.reply(res)
  }
}

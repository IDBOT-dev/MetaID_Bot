import { Command, Ctx, Update, Sender } from 'nestjs-telegraf'
import { FullContext } from '../interfaces/context.interface'
import { getAddress } from 'src/lib/metaid'
import { UserService } from 'src/user.service'
import { fetchBalance, fetchMetaid } from 'src/lib/services/metalet'
import { messages } from 'src/lib/messages'

@Update()
export class MetaidQuery {
  constructor(private readonly userService: UserService) {}

  @Command('getid')
  async onGetId(@Sender('id') id: number): Promise<string> {
    return String(id)
  }

  @Command('getname')
  async onGetNameCommand(
    @Sender('id') tgid: number,
    @Ctx() ctx: FullContext,
  ): Promise<void> {
    const user = await this.userService.user({ tgid: String(tgid) })
    if (!user) {
      await ctx.reply(messages.LINK_FIRST)
      return
    }

    const address = getAddress(user.mneid, user.path)
    const metaidInfo = await fetchMetaid(address)

    await ctx.reply(metaidInfo.name)
  }

  @Command('getmetaid')
  async onGetMetaidCommand(
    @Sender('id') tgid: number,
    @Ctx() ctx: FullContext,
  ): Promise<void> {
    const user = await this.userService.user({ tgid: String(tgid) })
    if (!user) {
      await ctx.reply(messages.LINK_FIRST)
      return
    }

    const address = getAddress(user.mneid, user.path)
    const metaidInfo = await fetchMetaid(address)

    if (!metaidInfo || !metaidInfo.metaid) {
      await ctx.reply(messages.LINK_FIRST)
    }

    await ctx.reply(metaidInfo.metaid)
  }

  @Command('getaddress')
  async onGetAddressCommand(
    @Sender('id') tgid: number,
    @Ctx() ctx: FullContext,
  ): Promise<void> {
    const user = await this.userService.user({ tgid: String(tgid) })
    if (!user) {
      await ctx.reply(messages.LINK_FIRST)
      return
    }

    const address = getAddress(user.mneid, user.path)

    await ctx.reply(address)
  }

  @Command('getbalance')
  async onGetBalanceCommand(
    @Sender('id') tgid: number,
    @Ctx() ctx: FullContext,
  ): Promise<void> {
    const user = await this.userService.user({ tgid: String(tgid) })
    if (!user) {
      await ctx.reply(messages.LINK_FIRST)
      return
    }

    const address = getAddress(user.mneid, user.path)
    const balance = await fetchBalance(address)

    await ctx.reply(balance + ' BTC')
  }
}

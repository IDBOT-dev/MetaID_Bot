import { Command, Ctx, Hears, Start, Update, Sender } from 'nestjs-telegraf'
import { Context, FullContext } from '../interfaces/context.interface'
import { editName, getAddress, getBalance, getName } from 'src/lib/metaid'

@Update()
export class MetaidQuery {
  @Command('getname')
  async onGetNameCommand(@Ctx() ctx: FullContext): Promise<void> {
    const name = await getName()

    await ctx.reply(name)
  }

  @Command('getaddress')
  async onGetAddressCommand(@Ctx() ctx: FullContext): Promise<void> {
    const address = await getAddress()

    await ctx.reply(address)
  }

  @Command('getbalance')
  async onGetBalanceCommand(@Ctx() ctx: FullContext): Promise<void> {
    const balance = await getBalance()

    await ctx.reply(balance + ' BTC')
  }
}

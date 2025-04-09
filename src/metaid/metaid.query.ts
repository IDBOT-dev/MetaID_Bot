import { Command, Ctx, Update, Sender } from 'nestjs-telegraf'
import { FullContext } from '../interfaces/context.interface'
import { getAddress,getAddressForTaproot } from 'src/lib/metaid'
import { UserService } from 'src/user/user.service'
import { fetchBalance,fetchBalanceForMvc, fetchMetaid } from 'src/lib/services/metalet'
import { messages } from 'src/lib/messages'
import {GetFreeExtra } from 'src/lib/services/assist-base'
import Decimal from 'decimal.js'
import { TxService } from 'src/transation/tx.service'
@Update()
export class MetaidQuery {
  constructor(private readonly userService: UserService,private readonly txService:TxService) {}

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
    try {
      
    const address = getAddress(user.mneid, user.path)
    const metaidInfo = await fetchMetaid(address)
    if(!metaidInfo){
      await ctx.reply(`The query name is empty. Please edit using /editname [name].`)
      return
    }
    await ctx.reply(metaidInfo.name)
    } catch (error) {
      await ctx.reply(error.message)
    }
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
      return
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

  @Command('topup')
  async onGetBtcAddressCommand(
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

    try {
      const isPrivateChat=ctx.message.chat.type == 'group' ? false : true
      if(isPrivateChat){
        const address = getAddress(user.mneid, user.path)
      
      const btcBalance = await fetchBalance(address)
      const mvcBalance = await fetchBalanceForMvc(address)
      const {balance,usedAmount}=await GetFreeExtra(address)
      const subsidyBalance=balance > 0 ?new Decimal(balance).sub(usedAmount).toNumber() : balance - usedAmount
      const htmlRes=`<i>Balance:</i>\n<b>BTC:</b> <i>${btcBalance}</i> <i>Btc</i>\n<b>MVC:</b> <i>${mvcBalance}</i> <i>Space</i>\n<b>Subsidy balance:</b> <i>${subsidyBalance}</i> <i>Space</i>`
      await ctx.replyWithHTML(htmlRes)
      return
      }else{
        await ctx.reply('getbalance command are only available in private chat.')
      }
    } catch (error) {
      await ctx.reply(`${error.message}`)
    }
    
  }


  @Command('buzzcount')
  async onGetBuzzCount( 
    @Sender('id') tgid: number,
  @Ctx() ctx: FullContext){
   try {
    const user = await this.userService.user({ tgid: String(tgid) })
    if (!user) {
      await ctx.reply(messages.LINK_FIRST)
      return
    }
    const address = getAddress(user.mneid, user.path)
    const count= await this.txService.getTxCountWithAddress({address})
    await ctx.replyWithHTML(`<b>Count:</b> <i>${count}</i>`)
   } catch (error) {
    await ctx.reply(`${error.message}`)
   }
  }
}



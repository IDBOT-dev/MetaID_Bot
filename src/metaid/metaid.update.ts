import { Command, Ctx, Hears, Start, Update, Sender } from 'nestjs-telegraf'
import { UpdateType as TelegrafUpdateType } from 'telegraf/typings/telegram-types'
import { FullContext } from '../interfaces/context.interface'
import { UpdateType } from '../common/decorators/update-type.decorator'
import { createBuzz } from 'src/lib/buzz'
import { editName, getAddress, getPublicKey, getSigner } from 'src/lib/metaid'
import { UserService } from 'src/user.service'
import { messages } from 'src/lib/messages'
import { fetchMetaid } from 'src/lib/services/metalet'

@Update()
export class MetaidUpdate {
  constructor(private readonly userService: UserService) {}

  @Start()
  onStart(): string {
    return 'Say hello to me'
  }

  @Hears(['hi', 'hello', 'hey', 'qq'])
  onGreetings(
    @UpdateType() updateType: TelegrafUpdateType,
    @Sender('first_name') firstName: string,
  ): string {
    return `Hey ${firstName}`
  }

  @Command('createmetaid')
  async onCreateMetaidCommand(
    @Sender('id') tgid: number,
    @Ctx() ctx: FullContext,
  ): Promise<void> {
    let user = await this.userService.user({ tgid: String(tgid) })
    if (user) {
      await ctx.reply('You already have a MetaID.')
      return
    }

    // 创建用户记录
    const mneid = 1
    // 查询 path 最大的用户记录，新用户的 path = max(path) + 1

    const biggestPathUser = (
      await this.userService.users({ orderBy: { path: 'desc' }, take: 1 })
    )[0]
    const path = biggestPathUser ? biggestPathUser.path + 1 : 1

    user = await this.userService.createUser({
      tgid: String(tgid),
      mneid,
      path,
    })
    // 导出地址
    const address = getAddress(mneid, path)

    // 查询 metaid
    const metaidInfo = await fetchMetaid(address)

    // 如果 metaid 不存在，提示用户充值
    if (!metaidInfo || !metaidInfo.name) {
      await ctx.reply(
        `You have successfully linked your account. Your address is: ${address}. Your metaID is: ${metaidInfo.metaid}. Next, please top up your address with some BTC in order to create your MetaID profile.`,
      )
      return
    }

    // 如果 metaid 存在，直接返回 metaid
    await ctx.reply(
      `You have successfully linked your account. Your MetaID is: ${metaidInfo.metaid}`,
    )
  }

  @Command('editname')
  async onEditNameCommand(
    @Sender('id') tgid: number,
    @Ctx() ctx: FullContext,
  ): Promise<void> {
    if (!ctx.payload) {
      await ctx.reply('Please enter your new name')
      return
    }

    const user = await this.userService.user({ tgid: String(tgid) })
    if (!user) {
      await ctx.reply(messages.LINK_FIRST)
      return
    }

    const res = await editName(user.mneid, user.path, ctx.payload)

    await ctx.reply(res)
  }

  // 这个/buzz 命令需要有参数，形如/buzz hello
  // 通过正则表达式匹配参数
  @Command(/buzz/)
  async onBuzzCommand(
    @Sender('id') tgid: number,
    @Ctx() ctx: FullContext,
  ): Promise<void> {
    if (!ctx.payload) {
      await ctx.reply('Please enter your new name')
      return
    }

    const user = await this.userService.user({ tgid: String(tgid) })
    if (!user) {
      await ctx.reply(messages.LINK_FIRST)
      return
    }

    const address = getAddress(user.mneid, user.path)
    const publicKey = getPublicKey(user.mneid, user.path)
    const signer = getSigner(user.mneid, user.path)

    const res = await createBuzz(address, publicKey, signer, ctx.payload)

    await ctx.reply(res)
  }
}

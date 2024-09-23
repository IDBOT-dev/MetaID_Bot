import { Command, Ctx, Hears, Start, Update, Sender } from 'nestjs-telegraf'
import {
  CommandContextExtn,
  UpdateType as TelegrafUpdateType,
} from 'telegraf/typings/telegram-types'
import { Context, FullContext } from '../interfaces/context.interface'
import { HELLO_SCENE_ID, WIZARD_SCENE_ID } from '../app.constants'
import { UpdateType } from '../common/decorators/update-type.decorator'

@Update()
export class MetaidUpdate {
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

  @Command('scene')
  async onSceneCommand(@Ctx() ctx: Context): Promise<void> {
    await ctx.scene.enter(HELLO_SCENE_ID)
  }

  @Command('wizard')
  async onWizardCommand(@Ctx() ctx: Context): Promise<void> {
    await ctx.scene.enter(WIZARD_SCENE_ID)
  }

  @Command('createmetaid')
  async onCreateMetaIdCommand(@Ctx() ctx: Context): Promise<void> {
    await ctx.reply('Please enter your MetaID')
  }

  // 这个/buzz 命令需要有参数，形如/buzz hello
  // 通过正则表达式匹配参数
  @Command(/buzz/)
  async onBuzzCommand(@Ctx() ctx: FullContext): Promise<void> {
    console.log(ctx.payload)
    await ctx.reply(ctx.payload)
    // await ctx.reply(`You said: ${value}`)
  }
}

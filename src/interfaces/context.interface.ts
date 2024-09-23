import { Scenes } from 'telegraf'
import { CommandContextExtn } from 'telegraf/typings/telegram-types'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Context extends Scenes.SceneContext {}

export interface FullContext extends Scenes.SceneContext, CommandContextExtn {}

import { Module } from '@nestjs/common'
import { TelegrafModule } from 'nestjs-telegraf'
import { EchoModule } from './echo/echo.module'
import { GreeterModule } from './greeter/greeter.module'
import { sessionMiddleware } from './middleware/session.middleware'
import { GreeterBotName, MetaidBotName } from './app.constants'
import { MetaidModule } from 'src/metaid/metaid.module'

@Module({
  imports: [
    TelegrafModule.forRoot({
      token: '7937310890:AAHu6tA1zzbzHybcg5Vr6udW8l46TrPioWs',
      include: [EchoModule],
    }),

    TelegrafModule.forRootAsync({
      botName: GreeterBotName,
      useFactory: () => ({
        token: '7240682139:AAGvuEtlmLxCJ9wfBibTCXLqWjzmWPBvI2o',
        middlewares: [sessionMiddleware],
        include: [GreeterModule],
      }),
    }),

    TelegrafModule.forRootAsync({
      botName: MetaidBotName,
      useFactory: () => ({
        token: '8066046070:AAEpmWYsak50AkvJYGRySySLnJRfiJFtyq4',
        middlewares: [sessionMiddleware],
        include: [MetaidModule],
      }),
    }),
    EchoModule,
    GreeterModule,
    MetaidModule,
  ],
})
export class AppModule {}

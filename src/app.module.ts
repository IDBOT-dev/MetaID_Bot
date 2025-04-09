import { Module } from '@nestjs/common'
import { TelegrafModule } from 'nestjs-telegraf'
import { EchoModule } from './echo/echo.module'
import { GreeterModule } from './greeter/greeter.module'
import { sessionMiddleware } from './middleware/session.middleware'
import { GreeterBotName, MetaidBotName } from './app.constants'
import { MetaidModule } from 'src/metaid/metaid.module'
import { TicketModule } from 'src/ticket/ticket.module'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm'
import { User } from 'src/user/user.entity';
import { UsersModule } from 'src/user/user.module'
import { TxsModule } from 'src/transation/tx.module'
import {AppController} from './app.controller'
import { AppService } from './app.service'
@Module({
  imports: [
   
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      
      imports: [ConfigModule],
     useFactory:(configService:ConfigService)=>({
      type: configService.get('DB_TYPE'),
      host: configService.get('DB_HOST'),
      port: configService.get('DB_PORT'),
      username: configService.get('DB_USERNAME'),
      password: configService.get('DB_PASSWORD'),
      database: configService.get('DB_DATABASE'),
      //entities: [User],
      autoLoadEntities: Boolean(configService.get('DB_AUTOLOAD',false)),
      synchronize: Boolean(configService.get('DB_SYNC',false)),
     }) as TypeOrmModuleOptions,
     inject:[ConfigService],
     
    }),
    TypeOrmModule.forFeature([User]),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService:ConfigService) => ({
        token:configService.get('ECHO_TOKEN'),
        include: [EchoModule],
      }),
      inject:[ConfigService],
      
     
    }),

    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      botName: GreeterBotName,
      useFactory: (configService:ConfigService) => ({
        token: configService.get('GREETER_TOKEN'),
        middlewares: [sessionMiddleware],
        include: [GreeterModule],
      }),
      inject:[ConfigService],
    }),

    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      botName: MetaidBotName,
      useFactory: (configService:ConfigService) => ({
        token:configService.get('BOT_TOKEN'),
        middlewares: [sessionMiddleware],
        include: [MetaidModule, TicketModule],
      }),
      inject:[ConfigService],
    }),
    EchoModule,
    UsersModule,
    TxsModule,
    GreeterModule,
    MetaidModule,
    TicketModule,
   
  ],
  controllers:[AppController],
  providers:[AppService]
})
export class AppModule {}

import { Module } from '@nestjs/common'
import { MetaidUpdate } from './metaid.update'
import { RandomNumberScene } from './scenes/random-number.scene'
import { MetaidWizard } from './wizard/metaid.wizard'
import { MetaidQuery } from 'src/metaid/metaid.query'
import { UserService } from 'src/user.service'
import { PrismaService } from 'src/prisma.service'

@Module({
  providers: [
    MetaidUpdate,
    MetaidQuery,
    RandomNumberScene,
    MetaidWizard,
    UserService,
    PrismaService,
  ],
})
export class MetaidModule {}

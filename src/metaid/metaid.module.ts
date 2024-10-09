import { Module } from '@nestjs/common'
import { MetaidUpdate } from './metaid.update'
import { RandomNumberScene } from './scenes/random-number.scene'
import { MetaidWizard } from './wizard/metaid.wizard'
import { MetaidQuery } from 'src/metaid/metaid.query'

@Module({
  providers: [MetaidUpdate, MetaidQuery, RandomNumberScene, MetaidWizard],
})
export class MetaidModule {}

import { Module } from '@nestjs/common'
import { MetaidUpdate } from './metaid.update'
import { RandomNumberScene } from './scenes/random-number.scene'
import { MetaidWizard } from './wizard/metaid.wizard'

@Module({
  providers: [MetaidUpdate, RandomNumberScene, MetaidWizard],
})
export class MetaidModule {}

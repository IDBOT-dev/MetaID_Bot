import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TxService } from './tx.service';
import { Tx } from './tx.entity';
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Tx])],
  providers: [TxService],
  exports:[TypeOrmModule]
})
export class TxsModule {}
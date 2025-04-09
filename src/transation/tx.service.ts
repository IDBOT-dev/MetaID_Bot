
import {  Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {Tx} from 'src/transation/tx.entity'
@Injectable()
export class TxService {
  constructor(
    @InjectRepository(Tx)
    private txRepository:Repository<Tx>
  ) {
   
  }

  async tx(
    params:{
      txid:string
    }
  ): Promise<Tx | null> {
    const {txid}=params
    return this.txRepository.findOne({
      where:{
        txid
      }
    })
  }

  async getTxWithAddress(params:{
    address:string
    skip?: number
    take?: number
    order?:any
  }): Promise<Tx[]> {
    const { address} = params
    return this.txRepository.findBy({
        address
      })
  }

  async getTxCountWithAddress(params:{
    address:string
  }) :Promise<number>{
    const { address} = params
    return this.txRepository.countBy({
        address
      })
  }

  async insertTx(params:Partial<Tx>): Promise<void> {
    const tx=this.txRepository.create(params)
    await this.txRepository.save(tx)
  }

  async deleteTx(txid): Promise<void> {
    await this.txRepository.delete(txid)
  }
}

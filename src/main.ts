import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import 'dotenv/config'
import {getPrivateKey,getSigner,getAddress,getPublicKey,getAddressForTaproot,getPublicKeyForTaproot,getSignerForTaproot} from 'src/lib/metaid'
import { createBuzz,createBuzzForBTC } from 'src/lib/buzz'
import {MvcWallet} from 'src/lib/mvc/wallet'
import {API_NET,API_TARGET} from 'meta-contract'
import {MVC_FEE} from 'src/app.constants'
import {formatHTML} from 'src/lib/util'
import {editName,transferForBTC} from 'src/lib/metaid'
import {mvc} from 'meta-contract'
import {GetUtxoInitReq,GetFreeExtra} from 'src/lib/services/assist-base'
async function bootstrap() {
 
  const app = await NestFactory.create(AppModule)
 
  await app.listen(3001)

 
}
bootstrap()

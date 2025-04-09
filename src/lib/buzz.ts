import * as ecc from 'tiny-secp256k1'
import { initEccLib, payments, Psbt, Signer } from 'bitcoinjs-lib'
import {getPrivateKey} from 'src/lib/metaid'
import {
  isTestnet,
  LEAF_VERSION_TAPSCRIPT,
  sleep,
  toXOnly,
  typedNetwork,
  literalNetwork
} from 'src/lib/util'
// import * as bitcore from 'bitcore-lib'
 import *  as bitcoin from 'bitcoinjs-lib';
import { broadcast, fetchFeeRate, fetchUtxos ,fetchUtxosRaw} from 'src/lib/services/metalet'
import { MetaIdData,Attachment } from 'src/lib/types'
import { createScript } from 'src/lib/pin'
// import { toOutputScript } from 'bitcoinjs-lib/src/address'
import {type ECPairInterface}  from 'ecpair'
import {MvcWallet} from 'src/lib/mvc/wallet'
import {API_NET,API_TARGET} from 'meta-contract'
import {MVC_FEE,HOST} from 'src/app.constants'

    
export async function createBuzz(
  mneid:number,
  path:number,
  content: string,
  freeOnMvc:boolean,
  attachments?:Attachment[]
) {
 try {
  const network=literalNetwork == 'testnet' ? API_NET.TEST : API_NET.MAIN
  const walletInstance=new MvcWallet({
    wif:getPrivateKey(mneid,path),
    network:network,
    feeb:MVC_FEE,
    apiTarget:API_TARGET.CYBER3
  })

  let hasFreeUtxo=freeOnMvc ? await walletInstance.checkFreeDetail() : []
  let utxo
  const body={
    content:content,
    contentType:'text/plain',
    
  }
 

    const metaidData: MetaIdData = {
      body: JSON.stringify(body),
      path: `${HOST}:/protocols/simplebuzz`,
      flag: 'metaid',
      version: '1.0.0',
      operation: 'create',
      contentType: 'text/plain',
      encryption: '0',
      encoding: 'utf-8',
    }
  if(hasFreeUtxo.length){
    utxo=hasFreeUtxo
  }else{
    utxo=await walletInstance.getUseableUtxos()
  }

   if(!utxo.length){
    throw new Error(`Insufficient balance. You can use the /getaddress command to get the MVC address for recharging and continue operations.`)
   }

   const bitbuzzHost = isTestnet ? 'testnet.bitbuzz.io' : 'bitbuzz.io'
   if(hasFreeUtxo){
    const {txId}=await walletInstance.createPinForFree(metaidData,utxo)
    if(!txId){
      throw new Error(`Broadcast failed`)
     }
    return {
      address:walletInstance.rootAddress,
      txid:txId,
      pinid:`${txId}i0`,
      chain:'mvc'
    }  
   }else{
    const {txid}=await walletInstance.createPin(metaidData,utxo)
   if(!txid){
    throw new Error(`Broadcast failed`)
   }
   return {
    address:walletInstance.rootAddress,
    txid:txid,
    pinid:`${txid}i0`,
    chain:'mvc'
  }  
   }

 } catch (error) {
  throw new Error(error)
 }
   
  

}

export async function createBuzzForBTC(
  legacyInfo:{
    address: string,
  publicKey: string,
  signer: ECPairInterface
  },
  taprootInfo:{
    taprootAddress: string,
    taprootPublicKey: string,
    taprootSigner: Signer,
  },
  content: string,
  attachments?:Attachment[]
) {
 try {
  initEccLib(ecc)
  const {address,signer}=legacyInfo
  const {taprootSigner}=taprootInfo
 
  const tweakedPubkey = taprootSigner.publicKey
  const tweakedXOnly = toXOnly(tweakedPubkey)
  // const output = toOutputScript(address, typedNetwork)
  const utxos = await fetchUtxos(address)
  if(!utxos.length){
    throw new Error(`Insufficient balance. You can use the /topup command to get the BTC address for recharging and continue operations.`)
  }
  const body={
    content:content,
    contentType:'text/plain',
    
  }
 
  const metaidData: MetaIdData = {
    body: JSON.stringify(body),
    path: `${HOST}:/protocols/simplebuzz`,
    flag: 'metaid',
    version: '1.0.0',
    operation: 'create',
    contentType: 'text/plain',
    encryption: '0',
    encoding: 'utf-8',
  }
  const pinScript = createScript(metaidData, tweakedXOnly)

  
  const redeem = {
    output: pinScript,
    redeemVersion: LEAF_VERSION_TAPSCRIPT,
  }
  const scriptTree = { output: pinScript }

  const { witness, output: pinOutputScript } = payments.p2tr({
    redeem,
    scriptTree,
    internalPubkey: tweakedXOnly,
    network: typedNetwork,
  })
  
  const preTxRaw=await fetchUtxosRaw(utxos[0].txId, literalNetwork)
  const preTx=bitcoin.Transaction.fromHex(preTxRaw)
  

  const commitFakePsbt = new Psbt({ network: typedNetwork })
  commitFakePsbt.addInput({
    hash: utxos[0].txId,
    index: utxos[0].vout,
    nonWitnessUtxo:preTx.toBuffer(),
    // witnessUtxo: {
    //   script: output,
    //   value: utxos[0].satoshi,
    // },
  })
  commitFakePsbt.addOutput({
    address:address, //address,
    value: 546,
  })
  // // change
  commitFakePsbt.addOutput({
    address: address,
    value: 546,
  })
  commitFakePsbt.signInput(0, {
    publicKey: Buffer.from(signer.publicKey),
    sign:(hash)=>{
      const signature = signer.sign(hash);
      return Buffer.from(signature); 
    }
  }).finalizeAllInputs()
   const commitFakeTx = commitFakePsbt.extractTransaction(true)
  // // get size of the transaction
   const commitFakeTxSize = commitFakeTx.virtualSize()

  
  const feeRate = await fetchFeeRate()
  const fee = feeRate > 1 ? feeRate * commitFakeTxSize : commitFakeTxSize + 1 // prevent fee rate too low
    const changeValue = utxos[0].satoshi - 546 - fee


  const commitPsbt = new Psbt({ network: typedNetwork })
  commitPsbt.addInput({
    hash: utxos[0].txId,
    index: utxos[0].vout,
    nonWitnessUtxo:preTx.toBuffer(),
   
  })
  commitPsbt.addOutput({
    script: pinOutputScript,
    value: 546,
  })

  if (changeValue < 546) {
    throw new Error('change value is too small')
  }

  if (changeValue >= 546) {
    commitPsbt.addOutput({
      address:address, 
      value: changeValue,
    })
  }


  commitPsbt.signInput(0,{
    publicKey: Buffer.from(signer.publicKey),
    sign:(hash)=>{
      const signature = signer.sign(hash);
      return Buffer.from(signature); 
    }
  }).finalizeAllInputs()
   const commitTx = commitPsbt.extractTransaction()

   const commitTxid = commitTx.getId()

   const tx1 = await broadcast(commitTx.toHex(),'btc')

   await sleep(1000)
   const preCommitTxRaw=await fetchUtxosRaw(tx1, literalNetwork)
   const preCommitTx=bitcoin.Transaction.fromHex(preCommitTxRaw)


  const revealFakePsbt = new Psbt({ network: typedNetwork })
  revealFakePsbt.addInput({
    hash: commitTxid,
    index: 0,
    witnessUtxo: {
      script: pinOutputScript,
      value: 546,
    },
    tapLeafScript: [
      {
        leafVersion: LEAF_VERSION_TAPSCRIPT,
        script: pinScript,
        controlBlock: witness[witness.length - 1],
      },
    ],
  })


 
  revealFakePsbt.addInput({
    hash: commitTxid,
    index: 1,
    nonWitnessUtxo:preCommitTx.toBuffer()
  })

  
  revealFakePsbt.addOutput({
    address,
    value: 546,
  })
  const revealPsbt = revealFakePsbt.clone()
  revealFakePsbt.addOutput({
    address,
    value: 546,
  })
  revealFakePsbt.signInput(0,taprootSigner)
  revealFakePsbt.signInput(1,{
    publicKey: Buffer.from(signer.publicKey),
    sign:(hash)=>{
      const signature = signer.sign(hash);
      return Buffer.from(signature); 
    }
  })
  revealFakePsbt.finalizeAllInputs()
  const revealFakeTx = revealFakePsbt.extractTransaction(true)
 
  const revealFakeTxSize = revealFakeTx.virtualSize()
  const revealFee = feeRate * revealFakeTxSize
  const revealChangeValue = changeValue - revealFee
  if (changeValue >= 546) {
    revealPsbt.addOutput({
      address: address,
      value: revealChangeValue,
    })
  }

 revealPsbt.signInput(0,taprootSigner)
 revealPsbt.signInput(1,{
  publicKey: Buffer.from(signer.publicKey),
  sign:(hash)=>{
    const signature = signer.sign(hash);
    return Buffer.from(signature); 
  }
})
 revealPsbt.finalizeAllInputs()
const revealTx = revealPsbt.extractTransaction()
const tx2 = await broadcast(revealTx.toHex(),'btc')
if(!tx2){
  throw new Error(`Broadcast failed`)
 }
 return {
  address:address,
  txid:tx2,
  pinid:`${tx2}i0`,
  chain:'btc'
 }

 } catch (error) {
  throw new Error(error)
 }
}







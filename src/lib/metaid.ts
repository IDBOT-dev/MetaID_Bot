import * as bip39 from 'bip39'
import BIP32Factory from 'bip32'
import {ECPairFactory}  from 'ecpair'
import * as ecc from 'tiny-secp256k1'
import * as bitcore from 'bitcore-lib'
import *  as bitcoin from 'bitcoinjs-lib';
import { payments, initEccLib, Psbt, crypto,Signer } from 'bitcoinjs-lib'

import {
  isTestnet,
  LEAF_VERSION_TAPSCRIPT,
  manHost,
  sleep,
  toXOnly,
  typedNetwork,
  literalNetwork,
  selectUTXOs,
  getTotalSatoshi
} from 'src/lib/util'
import {
  broadcast,
  fetchFeeRate,
  fetchMetaid,
  fetchUtxos,
  fetchUtxosRaw
} from 'src/lib/services/metalet'
import { Cred, MetaIdData } from 'src/lib/types'
import { createScript } from 'src/lib/pin'
import {AddressType,TaprootAddressType} from 'src/app.constants'
import {MvcWallet} from 'src/lib/mvc/wallet'
import {API_NET,API_TARGET} from 'meta-contract'
import {MVC_FEE} from 'src/app.constants'
import {type ECPairInterface}  from 'ecpair'
export function getAddress(mneid: number, path: number) {
  initEccLib(ecc)
  const bip32 = BIP32Factory(ecc)

  const mnemonic = process.env.MNEMONIC

 
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const rootNode = bip32.fromSeed(seed, typedNetwork)

  const childNode = rootNode.derivePath(`m/${AddressType.prefix}'/${AddressType.flag}'/0'/0/${path}`)
 
  const { address } =payments.p2pkh({
    pubkey:childNode.publicKey,
    network: typedNetwork,
  })
  
  return address
 
}

export function getAddressForTaproot(mneid: number, path: number) {
  initEccLib(ecc)
  const bip32 = BIP32Factory(ecc)

  const mnemonic = process.env.MNEMONIC

 
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const rootNode = bip32.fromSeed(seed, typedNetwork)

  const childNode = rootNode.derivePath(`m/${TaprootAddressType.prefix}'/${TaprootAddressType.flag}'/0'/0/${path}`)
  const internalPubkey = toXOnly(childNode.publicKey)
  const { address } =payments.p2tr({
    internalPubkey,
    network: typedNetwork,
  })
  
  return address
 
}

async function checkNameExists(address: string): Promise<boolean> {
  const metaidInfo = await fetchMetaid(address)
  return !!metaidInfo.name
}

export function getPublicKey(mneid: number, path: number) {
  initEccLib(ecc)
  const bip32 = BIP32Factory(ecc)

  const mnemonic = process.env.MNEMONIC
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const rootNode = bip32.fromSeed(seed, typedNetwork)

  const childNode = rootNode.derivePath(`m/${AddressType.prefix}'/${AddressType.flag}'/0'/0/${path}`)

  return childNode.publicKey.toString('hex')
}

export function getPrivateKey(mneid: number, path: number) {
  initEccLib(ecc)
  const bip32 = BIP32Factory(ecc)

  const mnemonic = process.env.MNEMONIC
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const rootNode = bip32.fromSeed(seed, typedNetwork)

  const childNode = rootNode.derivePath(`m/${AddressType.prefix}'/${AddressType.flag}'/0'/0/${path}`)

  return childNode.toWIF()
}

export function getPublicKeyForTaproot(mneid: number, path: number) {
  initEccLib(ecc)
  const bip32 = BIP32Factory(ecc)

  const mnemonic = process.env.MNEMONIC
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const rootNode = bip32.fromSeed(seed, typedNetwork)

  const childNode = rootNode.derivePath(`m/${TaprootAddressType.prefix}'/${TaprootAddressType.flag}'/0'/0/${path}`)

  return childNode.publicKey.toString('hex')
}

export function getSigner(mneid: number, path: number) {
  initEccLib(ecc)
  const bip32 = BIP32Factory(ecc)
  const ecpairInstance = ECPairFactory(ecc)
  const mnemonic = process.env.MNEMONIC
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const rootNode = bip32.fromSeed(seed, typedNetwork)

  const childNode = rootNode.derivePath(`m/${AddressType.prefix}'/${AddressType.flag}'/0'/0/${path}`)
 
  const privateKey=childNode.toWIF()
   
   return ecpairInstance.fromWIF(privateKey,typedNetwork)
}

export function getSignerForTaproot(mneid: number, path: number) {
  initEccLib(ecc)
  const bip32 = BIP32Factory(ecc)

  const mnemonic = process.env.MNEMONIC
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const rootNode = bip32.fromSeed(seed, typedNetwork)

  const childNode = rootNode.derivePath(`m/${TaprootAddressType.prefix}'/${TaprootAddressType.flag}'/0'/0/${path}`)
 
  const internalPubkey = toXOnly(childNode.publicKey)
  const tweakedSigner = childNode.tweak(
    crypto.taggedHash('TapTweak', internalPubkey),
  )

  return tweakedSigner
}

export async function getCred(
  mneid: number,
  path: number,
  message: string,
): Promise<Cred> {
  initEccLib(ecc)
  const bip32 = BIP32Factory(ecc)

  const mnemonic = process.env.MNEMONIC
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const rootNode = bip32.fromSeed(seed, typedNetwork)

  const childNode = rootNode.derivePath(`m/${AddressType.prefix}'/${AddressType.flag}'/0'/0/${path}`)
  const wif = childNode.toWIF()
  // @ts-ignore
  const privateKey = bitcore.PrivateKey.fromWIF(wif)
  const pubkey = childNode.publicKey.toString('hex')
  const messageObj = new bitcore.Message(message)
  const signature = messageObj.sign(privateKey)

  return {
    'X-Signature': signature,
    'X-Public-Key': pubkey,
  }
}

export async function editName(
  mneid: number,
  path: number,
  name: string,
  freeOnMvc:boolean
):Promise<string>{
  
 try {
  const network=literalNetwork == 'testnet' ? API_NET.TEST : API_NET.MAIN
  const walletInstance=new MvcWallet({
    wif:getPrivateKey(mneid,path),
    network:network,
    feeb:MVC_FEE,
    apiTarget:API_TARGET.CYBER3
  })
  const address=walletInstance.rootAddress
  const hasName = await checkNameExists(address)
  console.log("hasName",hasName)
  const operation = hasName ? 'modify' : 'create'
  const metaidData: MetaIdData = {
  body: name,
  path: '/info/name',
  flag: 'metaid',
  version: '1.0.0',
  operation,
  contentType: 'text/plain',
  encryption: '0',
  encoding: 'utf-8',
}
let hasFreeUtxo=freeOnMvc ? await walletInstance.checkFreeDetail() : []
let utxo
if(hasFreeUtxo.length){
  utxo=hasFreeUtxo
}else{
  utxo=await walletInstance.getUseableUtxos()
  console.log('utxo',utxo)
}



 if(!utxo.length){
  throw new Error(`Insufficient balance. You can use the /getaddress command to get the receiver for recharging and continue operations.`)
 }
   const bitbuzzHost = isTestnet ? 'https://test.mvcscan.com' : 'https://www.mvcscan.com'
 if(hasFreeUtxo.length){
  const {txId}=await walletInstance.createPinForFree(metaidData,utxo)
  if(!txId){
    throw new Error(`Broadcast failed`)
  }
  return `${bitbuzzHost}/tx/${txId}`
 }else{
  const {txid}=await walletInstance.createPin(metaidData,utxo)
  if(!txid){
    throw new Error(`Broadcast failed`)
  }
  return `${bitbuzzHost}/tx/${txid}`
 }
 } catch (error) {
  throw new Error(error)
 }
    
  
}

export async function editNameForBTC(
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
  name: string,
) {
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
  const hasName = await checkNameExists(address)
  console.log("hasName",hasName)
  const operation = hasName ? 'modify' : 'create'
 
 
  const metaidData: MetaIdData = {
    body: name,
    path: '/info/name',
    flag: 'metaid',
    version: '1.0.0',
    operation,
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
    // witnessUtxo: {
    //   script: output,
    //   value: utxos[0].satoshi,
    // },
    // tapInternalKey: internalPubkey,
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
  // get size of the transaction
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
const mempoolHost= isTestnet ? `https://mempool.space/testnet` : `https://mempool.space`
return `${mempoolHost}/tx/${tx2}`
}


export async function transferForBTC(
  legacyInfo:{
    address: string,
  publicKey: string,
  signer: ECPairInterface
  },
  receiver:{
    address:string,
    amount:number
  }
) {
  try {
    initEccLib(ecc)
    const {address,signer}=legacyInfo
    const {amount,address:receiverAddress}=receiver
    const utxos = await fetchUtxos(address)
    if(!utxos.length){
      throw new Error(`Insufficient balance. You can use the /topup command to get the BTC address for recharging and continue operations.`)
    }

    // const utxos= selectUTXOs(queryUtxo,amount)
    const totalBalance=getTotalSatoshi(utxos)
   

    for(let utxo of utxos){
    const preTxRaw=await fetchUtxosRaw(utxo.txId, literalNetwork)
    const preTx=bitcoin.Transaction.fromHex(preTxRaw)
          utxo.preTx=preTx
    }

    
    // 
    const commitFakePsbt = new Psbt({ network: typedNetwork })
    for(let utxo of utxos){
      commitFakePsbt.addInput({
        hash: utxo.txId,
        index: utxo.vout,
        nonWitnessUtxo:utxo.preTx.toBuffer(),
       
      })
    }
  
    commitFakePsbt.addOutput({
      address:receiverAddress, //address,
      value: amount,
    })
    // // change
    commitFakePsbt.addOutput({
      address: address,
      value: 546,
    })

    commitFakePsbt.signAllInputs({
      publicKey: Buffer.from(signer.publicKey),
      sign:(hash)=>{
        const signature = signer.sign(hash);
        return Buffer.from(signature); 
      }
    }).finalizeAllInputs()
    // commitFakePsbt.signInput(0, {
    //   publicKey: Buffer.from(signer.publicKey),
    //   sign:(hash)=>{
    //     const signature = signer.sign(hash);
    //     return Buffer.from(signature); 
    //   }
    // })
     const commitFakeTx = commitFakePsbt.extractTransaction(true)
    // // get size of the transaction
     const commitFakeTxSize = commitFakeTx.virtualSize()
  

    const feeRate = await fetchFeeRate()
    const fee = feeRate > 1 ? feeRate * commitFakeTxSize : commitFakeTxSize + 1 // prevent fee rate too low
      const changeValue = +totalBalance - amount - fee
     
    
  
    const commitPsbt = new Psbt({ network: typedNetwork })
    // commitPsbt.addInput({
    //   hash: utxos[0].txId,
    //   index: utxos[0].vout,
    //   nonWitnessUtxo:preTx.toBuffer(),
    //   // witnessUtxo: {
    //   //   script: output,
    //   //   value: utxos[0].satoshi,
    //   // },
    //   // tapInternalKey: internalPubkey,
    // })

    for(let utxo of utxos){
      commitPsbt.addInput({
        hash: utxo.txId,
        index: utxo.vout,
        nonWitnessUtxo:utxo.preTx.toBuffer(),
       
      })
    }

    commitPsbt.addOutput({
      address:receiverAddress, //address,
      value: amount,
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
    console.log("commitPsbt",commitPsbt)
    
    commitPsbt.signAllInputs({
      publicKey: Buffer.from(signer.publicKey),
      sign:(hash)=>{
        const signature = signer.sign(hash);
        return Buffer.from(signature); 
      }
    }).finalizeAllInputs()
    // commitPsbt.signInput(0,{
    //   publicKey: Buffer.from(signer.publicKey),
    //   sign:(hash)=>{
    //     const signature = signer.sign(hash);
    //     return Buffer.from(signature); 
    //   }
    // }).finalizeAllInputs()
     const commitTx = commitPsbt.extractTransaction()
     
     const tx = await broadcast(commitTx.toHex(),'btc')
    if(tx){
       const mempoolHost= isTestnet ? `https://mempool.space/testnet` : `https://mempool.space`
  return `${mempoolHost}/tx/${tx}`
    }else{
      throw new Error(`Broadcast failed`)
    }

  } catch (error) {
      throw new Error(error)
  }
}


export async function createName(
  mneid: number,
  path: number,
  name: string,
):Promise<string>{
  
    const network=isTestnet ? API_NET.TEST : API_NET.MAIN
    const walletInstance=new MvcWallet({
      wif:getPrivateKey(mneid,path),
      network:network,
      feeb:MVC_FEE,
      apiTarget:API_TARGET.CYBER3
    })
    
    const metaidData: MetaIdData = {
    body: name,
    path: '/info/name',
    flag: 'metaid',
    version: '1.0.0',
    operation:'create',
    contentType: 'text/plain',
    encryption: '0',
    encoding: 'utf-8',
  }
  
    const hasFreeUtxo= await walletInstance.checkFreeDetail()
    if(hasFreeUtxo.length){
      const {txId}=await walletInstance.createPinForFree(metaidData,hasFreeUtxo)
      
      return txId
    }else{
      return ''
    }
   
}


export async function buildFreeGasTx(mneid: number,path: number,metaidData:MetaIdData){
  try {
    const network=isTestnet ? API_NET.TEST : API_NET.MAIN
    const walletInstance=new MvcWallet({
      wif:getPrivateKey(mneid,path),
      network:network,
      feeb:MVC_FEE,
      apiTarget:API_TARGET.CYBER3
    })
  } catch (error) {
    
  }
}

export async function transfer(mneid: number,path:number,receiver:{address:string,amount:number}){
  try {
    const network=isTestnet ? API_NET.TEST : API_NET.MAIN
    const walletInstance=new MvcWallet({
      wif:getPrivateKey(mneid,path),
      network:network,
      feeb:MVC_FEE,
      apiTarget:API_TARGET.CYBER3
    })
    const {address,amount}=receiver
    const {txId} =await walletInstance.send(address,amount)
    const ScanHost = isTestnet ? 'https://test.mvcscan.com' : 'https://www.mvcscan.com'
    if(txId){
      return `${ScanHost}/tx/${txId}`
    }else{
      throw new Error(`Broadcast failed`)
    }
  } catch (error) {
    throw new Error(error)
  }
}



export async function createMetaidRoot(
  mneid: number,
  path: number,
  name: string,
): Promise<string> {
  initEccLib(ecc)
  const bip32 = BIP32Factory(ecc)

  const mnemonic = process.env.MNEMONIC
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const rootNode = bip32.fromSeed(seed, typedNetwork)

  const childNode = rootNode.derivePath(`m/${AddressType.prefix}'/${AddressType.flag}'/0'/0/${path}`)
  const internalPubkey =childNode.publicKey
  const tweakedSigner = childNode.tweak(
    crypto.taggedHash('TapTweak', internalPubkey),
  )
  const tweakedPubkey = tweakedSigner.publicKey
  const tweakedXOnly = toXOnly(tweakedPubkey)

  const { address, output } = payments.p2pkh({
    pubkey:internalPubkey,
    network: typedNetwork,
  })

  const utxos = await fetchUtxos(address)
  console.log({ utxos })


  const hasName = await checkNameExists(address)
  const operation = hasName ? 'modify' : 'create'
  const userName=`tg_user_NO.${mneid}`
  const metaidData: MetaIdData = {
    body: userName,
    path: '/info/name',
    flag: 'metaid',
    version: '1.0.0',
    operation,
    contentType: 'text/plain',
    encryption: '0',
    encoding: 'utf-8',
  }
  const pinScript = createScript(metaidData, internalPubkey)
  const redeem = {
    output: pinScript,
    redeemVersion: LEAF_VERSION_TAPSCRIPT,
  }
  const scriptTree = { output: pinScript }

  const { witness, output: pinOutputScript } = payments.p2pkh({
    redeem,
    scriptTree,
    pubkey: internalPubkey,
    network: typedNetwork,
  })


  const commitFakePsbt = new Psbt({ network: typedNetwork })
  commitFakePsbt.addInput({
    hash: utxos[0].txId,
    index: utxos[0].vout,
    witnessUtxo: {
      script: output,
      value: utxos[0].satoshi,
    },
    tapInternalKey: internalPubkey,
  })
  commitFakePsbt.addOutput({
    address: address,
    value: 546,
  })
  // change
  commitFakePsbt.addOutput({
    address: address,
    value: 546,
  })
  commitFakePsbt.signInput(0, tweakedSigner).finalizeAllInputs()
  const commitFakeTx = commitFakePsbt.extractTransaction(true)
  // get size of the transaction
  const commitFakeTxSize = commitFakeTx.virtualSize()


  const feeRate = await fetchFeeRate()
  const fee = feeRate > 1 ? feeRate * commitFakeTxSize : commitFakeTxSize + 1 // prevent fee rate too low
  const changeValue = utxos[0].satoshi - 546 - fee

 
  const commitPsbt = new Psbt({ network: typedNetwork })
  commitPsbt.addInput({
    hash: utxos[0].txId,
    index: utxos[0].vout,
    witnessUtxo: {
      script: output,
      value: utxos[0].satoshi,
    },
    tapInternalKey: internalPubkey,
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
      address: address,
      value: changeValue,
    })
  }


  commitPsbt.signInput(0, tweakedSigner).finalizeAllInputs()
  const commitTx = commitPsbt.extractTransaction()
  const commitTxid = commitTx.getId()


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
    witnessUtxo: {
      script: output,
      value: changeValue,
    },
    tapInternalKey: internalPubkey,
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
  revealFakePsbt
    .signInput(0, tweakedSigner)
    .signInput(1, tweakedSigner)
    .finalizeAllInputs()
  const revealFakeTx = revealFakePsbt.extractTransaction(true)
  // get size of the transaction
  const revealFakeTxSize = revealFakeTx.virtualSize()

  console.log({ feeRate, commitFakeTxSize, revealFakeTxSize })

  const revealFee = feeRate * revealFakeTxSize
  const revealChangeValue = changeValue - revealFee

  if (changeValue >= 546) {
    revealPsbt.addOutput({
      address: address,
      value: revealChangeValue,
    })
  }

  revealPsbt
    .signInput(0, tweakedSigner)
    .signInput(1, tweakedSigner)
    .finalizeAllInputs()
  const revealTx = revealPsbt.extractTransaction()

  const tx1 = await broadcast(commitTx.toHex())
  await sleep(1000)
  const tx2 = await broadcast(revealTx.toHex())

  return `${manHost}/pin/${tx2}i0`
}

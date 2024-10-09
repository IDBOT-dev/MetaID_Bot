import * as bip39 from 'bip39'
import BIP32Factory from 'bip32'
import * as ecc from 'tiny-secp256k1'
import * as bitcore from 'bitcore-lib'
import { payments, initEccLib, Psbt, crypto } from 'bitcoinjs-lib'
import {
  isTestnet,
  LEAF_VERSION_TAPSCRIPT,
  manHost,
  sleep,
  toXOnly,
  typedNetwork,
} from 'src/lib/util'
import {
  broadcast,
  fetchFeeRate,
  fetchMetaid,
  fetchUtxos,
} from 'src/lib/services/metalet'
import { Cred, MetaIdData } from 'src/lib/types'
import { createScript } from 'src/lib/pin'

export function getAddress(mneid: number, path: number) {
  initEccLib(ecc)
  const bip32 = BIP32Factory(ecc)

  const mnemonic = process.env.MNEMONIC
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const rootNode = bip32.fromSeed(seed, typedNetwork)

  const childNode = rootNode.derivePath(`m/86'/0'/0'/0/${path}`)
  const internalPubkey = toXOnly(childNode.publicKey)

  const { address } = payments.p2tr({
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

  const childNode = rootNode.derivePath(`m/86'/0'/0'/0/${path}`)

  return childNode.publicKey.toString('hex')
}

export function getSigner(mneid: number, path: number) {
  initEccLib(ecc)
  const bip32 = BIP32Factory(ecc)

  const mnemonic = process.env.MNEMONIC
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const rootNode = bip32.fromSeed(seed, typedNetwork)

  const childNode = rootNode.derivePath(`m/86'/0'/0'/0/${path}`)

  const internalPubkey = toXOnly(childNode.publicKey)
  const tweakedSigner = childNode.tweak(
    crypto.taggedHash('TapTweak', internalPubkey),
  )

  return tweakedSigner
}

export async function getCred(message: string): Promise<Cred> {
  initEccLib(ecc)
  const bip32 = BIP32Factory(ecc)

  const mnemonic = process.env.MNEMONIC
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const rootNode = bip32.fromSeed(seed, typedNetwork)

  const childNode = rootNode.derivePath("m/86'/0'/0'/0/1")
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
): Promise<string> {
  initEccLib(ecc)
  const bip32 = BIP32Factory(ecc)

  const mnemonic = process.env.MNEMONIC
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const rootNode = bip32.fromSeed(seed, typedNetwork)

  const childNode = rootNode.derivePath(`m/86'/0'/0'/0/${path}`)
  const internalPubkey = toXOnly(childNode.publicKey)
  const tweakedSigner = childNode.tweak(
    crypto.taggedHash('TapTweak', internalPubkey),
  )
  const tweakedPubkey = tweakedSigner.publicKey
  const tweakedXOnly = toXOnly(tweakedPubkey)

  const { address, output } = payments.p2tr({
    internalPubkey,
    network: typedNetwork,
  })

  const utxos = await fetchUtxos(address)
  console.log({ utxos })

  // 写名字
  const hasName = await checkNameExists(address)
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

  // 拿一个 utxo 创建 546 sat 的交易
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

  // 获取费率，计算手续费
  const feeRate = await fetchFeeRate()
  const fee = feeRate > 1 ? feeRate * commitFakeTxSize : commitFakeTxSize + 1 // prevent fee rate too low
  const changeValue = utxos[0].satoshi - 546 - fee

  // 构建真正交易
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

  // 签名
  commitPsbt.signInput(0, tweakedSigner).finalizeAllInputs()
  const commitTx = commitPsbt.extractTransaction()
  const commitTxid = commitTx.getId()

  // 构造假 reveal 交易
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

  // 添加钱 Input
  revealFakePsbt.addInput({
    hash: commitTxid,
    index: 1,
    witnessUtxo: {
      script: output,
      value: changeValue,
    },
    tapInternalKey: internalPubkey,
  })

  // 添加铭刻 output
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

  const childNode = rootNode.derivePath(`m/86'/0'/0'/0/${path}`)
  const internalPubkey = toXOnly(childNode.publicKey)
  const tweakedSigner = childNode.tweak(
    crypto.taggedHash('TapTweak', internalPubkey),
  )
  const tweakedPubkey = tweakedSigner.publicKey
  const tweakedXOnly = toXOnly(tweakedPubkey)

  const { address, output } = payments.p2tr({
    internalPubkey,
    network: typedNetwork,
  })

  const utxos = await fetchUtxos(address)
  console.log({ utxos })

  // 写名字
  const hasName = await checkNameExists(address)
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

  // 拿一个 utxo 创建 546 sat 的交易
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

  // 获取费率，计算手续费
  const feeRate = await fetchFeeRate()
  const fee = feeRate > 1 ? feeRate * commitFakeTxSize : commitFakeTxSize + 1 // prevent fee rate too low
  const changeValue = utxos[0].satoshi - 546 - fee

  // 构建真正交易
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

  // 签名
  commitPsbt.signInput(0, tweakedSigner).finalizeAllInputs()
  const commitTx = commitPsbt.extractTransaction()
  const commitTxid = commitTx.getId()

  // 构造假 reveal 交易
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

  // 添加钱 Input
  revealFakePsbt.addInput({
    hash: commitTxid,
    index: 1,
    witnessUtxo: {
      script: output,
      value: changeValue,
    },
    tapInternalKey: internalPubkey,
  })

  // 添加铭刻 output
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

import * as bip39 from 'bip39'
import BIP32Factory from 'bip32'
import * as ecc from 'tiny-secp256k1'
import {
  payments,
  networks,
  initEccLib,
  Psbt,
  script,
  crypto,
} from 'bitcoinjs-lib'
import { LEAF_VERSION_TAPSCRIPT, toXOnly, typedNetwork } from 'src/lib/util'
import { broadcast, getFeeRate, getUtxos } from 'src/lib/service'
import { toOutputScript } from 'bitcoinjs-lib/src/address'
import { MetaIdData } from 'src/lib/types'
import { createScript, pubkeyInScript } from 'src/lib/pin'

export async function createBuzz(content: string) {
  initEccLib(ecc)
  const bip32 = BIP32Factory(ecc)

  const mnemonic = process.env.MNEMONIC
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const rootNode = bip32.fromSeed(seed)

  const childNode = rootNode.derivePath("m/86'/0'/0'/0/0")
  const internalPubkey = toXOnly(childNode.publicKey)
  const tweakedSigner = childNode.tweak(
    crypto.taggedHash('TapTweak', internalPubkey),
  )

  const { address, output } = payments.p2tr({
    internalPubkey,
    network: typedNetwork,
  })
  const utxos = await getUtxos(address)

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
  const feeRate = await getFeeRate()
  const fee = feeRate * commitFakeTxSize
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
    address: address,
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

  // 写数据
  const metaidData: MetaIdData = {
    body: content,
    path: '/protocols/simplebuzz',
    flag: 'metaid',
    version: '1.0.0',
    revealAddr: address,
    operation: 'create',
    contentType: 'text/plain',
    encoding: 'utf-8',
  }
  const pinScript = createScript(metaidData, internalPubkey)
  const redeem = {
    output: pinScript,
    redeemVersion: LEAF_VERSION_TAPSCRIPT,
  }
  const scriptTree = { output: pinScript }

  const {
    witness,
    output: pinOutputScript,
    address: testAddress,
  } = payments.p2tr({
    redeem,
    scriptTree,
    internalPubkey,
    network: typedNetwork,
  })
  console.log({ testAddress, address: address })
  console.log({ original: childNode.publicKey.toString('hex') })
  console.log({ check: pubkeyInScript(internalPubkey, pinScript) })

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
  // const revealPsbt = revealFakePsbt.clone()
  revealFakePsbt.addOutput({
    address,
    value: 546,
  })
  revealFakePsbt
    .signInput(0, childNode)
    .signInput(1, tweakedSigner)
    .finalizeAllInputs()
  const revealFakeTx = revealFakePsbt.extractTransaction(true)
  // get size of the transaction
  const revealFakeTxSize = revealFakeTx.virtualSize()

  console.log({ feeRate, commitFakeTxSize, revealFakeTxSize })
  // const tx = await broadcast(commitPsbt.extractTransaction().toHex())
  // console.log({ tx })

  return '1'
}

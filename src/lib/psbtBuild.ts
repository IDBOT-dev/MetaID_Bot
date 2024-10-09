import { Decimal } from 'decimal.js'
import {
  Psbt,
  Transaction,
  address as libAddress,
  payments,
} from 'bitcoinjs-lib'
import mempoolJS from '@mempool/mempool.js'
import { isTaprootInput } from 'bitcoinjs-lib/src/psbt/bip371'
import { Buffer } from 'buffer'
import {
  determineAddressInfo,
  isTestnet,
  literalNetwork,
  typedNetwork,
} from './util'
import { Tx, Utxo } from 'src/lib/types'
import { fetchUtxos } from 'src/lib/services/metalet'
import { getAddress } from 'src/lib/metaid'

const TX_EMPTY_SIZE = 4 + 1 + 1 + 4
const TX_INPUT_BASE = 32 + 4 + 1 + 4 // 41
const TX_INPUT_PUBKEYHASH = 107
const TX_INPUT_SEGWIT = 27
const TX_INPUT_TAPROOT = 17 // round up 16.5 bytes
const TX_OUTPUT_BASE = 8 + 1
const TX_OUTPUT_PUBKEYHASH = 25
const TX_OUTPUT_SCRIPTHASH = 23
const TX_OUTPUT_SEGWIT = 22
const TX_OUTPUT_SEGWIT_SCRIPTHASH = 34
const TX_INPUT_SCRIPT_BASE = 0

function selectUTXOs(utxos: Utxo[], targetAmount: Decimal) {
  let totalAmount = new Decimal(0)
  const selectedUtxos: typeof utxos = []
  for (const utxo of utxos) {
    selectedUtxos.push(utxo)
    totalAmount = totalAmount.add(utxo.satoshis)

    if (totalAmount.gte(targetAmount)) {
      break
    }
  }

  if (totalAmount.lt(targetAmount)) {
    throw new Error('Insufficient funds to reach the target amount')
  }

  return selectedUtxos
}

function getTotalSatoshi(utxos: Utxo[]) {
  return utxos.reduce((total, utxo) => total.add(utxo.satoshis), new Decimal(0))
}
type PsbtInput = (typeof Psbt.prototype.data.inputs)[0]
export interface TransactionOutput {
  script: Buffer
  value: number
}
export interface PsbtTxOutput extends TransactionOutput {
  address: string | undefined
}

function inputBytes(input: PsbtInput) {
  // todo: script length

  if (isTaprootInput(input)) {
    return TX_INPUT_BASE + TX_INPUT_TAPROOT
  }
  if (input.redeemScript) return TX_INPUT_BASE + input.redeemScript.length
  if (input.nonWitnessUtxo) return TX_INPUT_BASE + TX_INPUT_PUBKEYHASH
  if (input.witnessUtxo) return TX_INPUT_BASE + TX_INPUT_SEGWIT

  return TX_INPUT_BASE + TX_INPUT_PUBKEYHASH
}

function outputBytes(output: PsbtTxOutput) {
  // if output is op-return, use it's buffer size

  return (
    TX_OUTPUT_BASE +
    (output.script
      ? output.script.length
      : output.address?.startsWith('bc1') || output.address?.startsWith('tb1')
        ? output.address?.length === 42 // TODO: looks like something wrong here
          ? TX_OUTPUT_SEGWIT
          : TX_OUTPUT_SEGWIT_SCRIPTHASH
        : output.address?.startsWith('3') || output.address?.startsWith('2')
          ? TX_OUTPUT_SCRIPTHASH
          : TX_OUTPUT_PUBKEYHASH)
  )
}
function transactionBytes(inputs: PsbtInput[], outputs: PsbtTxOutput[]) {
  const inputsSize = inputs.reduce(function (a, x) {
    return a + inputBytes(x)
  }, 0)
  const outputsSize = outputs.reduce(function (a, x, index) {
    return a + outputBytes(x)
  }, 0)

  console.log({
    inputsSize,
    outputsSize,
    TX_EMPTY_SIZE,
  })
  return TX_EMPTY_SIZE + inputsSize + outputsSize
}

export function calcFee(psbt: Psbt, feeRate: number) {
  const inputs = psbt.data.inputs
  const outputs = psbt.txOutputs

  const bytes = transactionBytes(inputs, outputs)

  return new Decimal(bytes).mul(feeRate)
}

export async function buildTx<T>(
  utxos: Utxo[],
  amount: Decimal,
  feeRate: number,
  buildPsbtParams: T,
  address: string,
  buildPsbt: (
    buildPsbtParams: T,
    selectedUTXOs: Utxo[],
    change: Decimal,
    needChange: boolean,
    signPsbt: boolean,
  ) => Promise<Psbt>,
  extract: boolean = false,
  signPsbt: boolean = true,
): Promise<{
  psbt: Psbt
  fee: string
  txId: string
  rawTx: string
  txInputs: Tx[]
  txOutputs: Tx[]
}> {
  let selectedUTXOs = selectUTXOs(utxos, amount)
  let total = getTotalSatoshi(selectedUTXOs)
  let psbt = await buildPsbt(
    buildPsbtParams,
    selectedUTXOs,
    total.minus(amount),
    true,
    false,
  )
  let estimatedFee = calcFee(psbt, feeRate)
  while (total.lt(amount.add(estimatedFee))) {
    if (selectedUTXOs.length === utxos.length) {
      throw new Error('Insufficient funds')
    }
    selectedUTXOs = selectUTXOs(utxos, amount.add(estimatedFee))
    total = getTotalSatoshi(selectedUTXOs)
    psbt = await buildPsbt(
      buildPsbtParams,
      selectedUTXOs,
      total.minus(amount.add(estimatedFee)),
      true,
      false,
    )
    estimatedFee = calcFee(psbt, feeRate)
  }

  psbt = await buildPsbt(
    buildPsbtParams,
    selectedUTXOs,
    total.minus(amount.add(estimatedFee)),
    false,
    signPsbt,
  )
  console.log(psbt, 'psbt in buildTx')

  return {
    psbt,
    fee: total
      .minus(psbt.txOutputs.reduce((acc, cur) => acc + Number(cur.value), 0))
      .toString(),
    txId: !extract ? '' : psbt.extractTransaction().getId(),
    rawTx: !extract ? psbt.toHex() : psbt.extractTransaction().toHex(),
    txInputs: selectedUTXOs.map((utxo) => ({
      address,
      value: utxo.satoshis,
    })),
    txOutputs: psbt.txOutputs.map((out) => ({
      address: out.address || '',
      value: out.value,
    })),
  }
}

export async function createPsbtInput({
  utxo,
  addressType,
  publicKey,
  script,
}: {
  utxo: Utxo
  publicKey: Buffer
  script: Buffer
  addressType: string
}) {
  const payInput: any = {
    hash: utxo.txId,
    index: utxo.vout,

    sequence: 0xffffffff, // These are defaults. This line is not needed.
  }
  if (['P2TR'].includes(addressType)) {
    payInput['tapInternalKey'] = publicKey.subarray(1)
    payInput['witnessUtxo'] = { value: utxo.satoshi, script }
  }
  if (['P2WPKH'].includes(addressType)) {
    payInput['witnessUtxo'] = { value: utxo.satoshi, script }
  }
  if (['P2PKH'].includes(addressType)) {
    if (utxo.rawTx) {
      const tx = Transaction.fromHex(utxo.rawTx)
      payInput['nonWitnessUtxo'] = tx.toBuffer()
    } else {
      const mempoolReturn = mempoolJS({
        hostname: 'mempool.space',
        network: isTestnet ? 'testnet' : 'main',
      })
      const rawTx = await mempoolReturn.bitcoin.transactions.getTxHex({
        txid: utxo.txId,
      })
      const tx = Transaction.fromHex(rawTx)
      payInput['nonWitnessUtxo'] = tx.toBuffer()
    }
  }
  if (['P2SH'].includes(addressType)) {
    const { redeem } = payments.p2sh({
      redeem: payments.p2wpkh({
        pubkey: publicKey,
        network: typedNetwork,
      }),
      network: typedNetwork,
    })
    if (!redeem) throw new Error('redeemScript')
    payInput.redeemScript = redeem.output
    payInput['witnessUtxo'] = { value: utxo.satoshi, script }
  }
  return payInput
}

export async function fillInternalKey({
  publicKey,
  addressType,
}: {
  publicKey: Buffer
  addressType: string
}) {
  const payInput: any = {}
  if (['P2TR'].includes(addressType)) {
    payInput['tapInternalKey'] = publicKey.subarray(1)
  }
  if (['P2SH'].includes(addressType)) {
    console.log('input.tapInternalKey')
    const { redeem } = payments.p2sh({
      redeem: payments.p2wpkh({
        pubkey: publicKey,
        network: typedNetwork,
      }),
      network: typedNetwork,
    })
    if (!redeem) throw new Error('redeemScript')
    payInput.redeemScript = redeem.output
  }
  return payInput
}

export const getUtxos = async (address: string) => {
  const utxos = await fetchUtxos(address)

  return utxos
}

export function toXOnly(pubKey: Buffer) {
  return pubKey.length === 32 ? pubKey : pubKey.slice(1, 33)
}

export async function updateInputKey({
  publicKey,
  addressType,
}: {
  publicKey: Buffer
  addressType: string
}) {
  const payInput: any = {}
  if (['P2TR'].includes(addressType)) {
    const tapInternalKey = toXOnly(publicKey)
    payInput['tapInternalKey'] = tapInternalKey
  }
  if (['P2SH'].includes(addressType)) {
    console.log('input.tapInternalKey')
    const { redeem } = payments.p2sh({
      redeem: payments.p2wpkh({
        pubkey: publicKey,
        network: typedNetwork,
      }),
      network: typedNetwork,
    })
    if (!redeem) throw new Error('redeemScript')
    payInput.redeemScript = redeem.output
  }
  return payInput
}

export const getUtxoBalance = async (address: string) => {
  const utxos = await getUtxos(address)
  return utxos.reduce((acc, cur) => acc + cur.satoshis, 0)
}

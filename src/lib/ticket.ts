import { getCred } from 'src/lib/metaid'
import { fetchFeeRate } from 'src/lib/services/metalet'
import {
  buyClubTicketCommit,
  buyClubTicketPre,
  fetchAssetUtxos,
  fetchClubTicketDetail,
  sellClubTicketCommit,
  sellClubTicketPre,
} from 'src/lib/services/ticket'
import { ticketMessage } from 'src/lib/util'

import {
  BuildBuyClubTicketPsbtParams,
  BuildSellClubTicketPsbtParams,
  BuyClubTicketPreRes,
  ClubTicketInfo,
  MRC20Utxo,
  MRC20UtxoChild,
  SellClubTicketPreRes,
  Utxo,
} from 'src/lib/types'
import {
  AES_KEY,
  determineAddressInfo,
  DUST_SIZE,
  SIGHASH_ALL,
  ticketHost,
  typedNetwork,
} from 'src/lib/util'
import { initEccLib, Psbt, Signer } from 'bitcoinjs-lib'
import * as ecc from 'tiny-secp256k1'
import { fetchUtxos } from 'src/lib/services/metalet'
import { toOutputScript } from 'bitcoinjs-lib/src/address'
import Decimal from 'decimal.js'
import { buildTx, createPsbtInput, updateInputKey } from 'src/lib/psbtBuild'

export async function buyTicket(
  payload: string,
  address: string,
  publicKey: string,
  signer: Signer,
): Promise<string> {
  const [tick, priceInBtc] = payload.split(' ')
  if (!tick || !priceInBtc) {
    return 'Invalid'
  }

  const ticketDetail = await fetchClubTicketDetail(tick)

  const feeRate = await fetchFeeRate()
  const cred = await getCred(ticketMessage)

  // 1
  const preOrder = await buyClubTicketPre(
    {
      address,
      networkFeeRate: feeRate,
      ticketId: ticketDetail.ticketId,
      priceAmount: priceInBtc,
    },
    cred,
  )
  console.log({ preOrder })

  // 3
  const { rawTx } = await buildBuyClubTicketPsbt(
    preOrder,
    address,
    publicKey,
    signer,
    feeRate,
  )

  const commitRes = await buyClubTicketCommit(
    {
      orderId: preOrder.orderId,
      commitTxOutIndex: 0,
      commitTxRaw: rawTx,
    },
    cred,
  )
  console.log({ commitRes })

  return 'Ticket bought'
}

export const buildBuyClubTicketPsbt = async (
  order: BuyClubTicketPreRes,
  address: string,
  publicKey: string,
  signer: Signer,
  feeRate: number,

  extract: boolean = true,
  signPsbt: boolean = true,
) => {
  initEccLib(ecc)
  const { minerFee } = order
  const utxos = (await fetchUtxos(address)).sort(
    (a, b) => b.satoshi - a.satoshi,
  )
  const addressType = determineAddressInfo(address).toUpperCase()
  const script = toOutputScript(address, typedNetwork)

  const ret = await buildTx<BuildBuyClubTicketPsbtParams>(
    utxos,
    new Decimal(minerFee),
    feeRate,
    {
      addressType,
      address,
      publicKey: Buffer.from(publicKey, 'hex'),
      script,
      ...order,
      signer,
    },
    address,
    _buildBuyClubTicketPsbt,
    extract,
    signPsbt,
  )

  return ret
}

const _buildBuyClubTicketPsbt = async (
  buildBuyClubTicketPsbtParams: BuildBuyClubTicketPsbtParams,
  selectedUTXOs: Utxo[],
  change: Decimal,
  needChange: boolean,
  signPsbt: boolean,
) => {
  const {
    addressType,
    address,
    publicKey,
    script,
    receiveAddress,
    totalAmount,
    minerFee,
    signer,
  } = buildBuyClubTicketPsbtParams
  const psbt = new Psbt({ network: typedNetwork })
  for (const utxo of selectedUTXOs) {
    const psbtInput = await createPsbtInput({
      utxo,
      addressType,
      publicKey,
      script,
    })
    psbtInput.sighashType = SIGHASH_ALL
    psbt.addInput(psbtInput)
  }
  psbt.addOutput({
    address: receiveAddress,
    value: minerFee,
  })
  if (needChange || change.gt(DUST_SIZE)) {
    psbt.addOutput({
      address: address,
      value: change.toNumber(),
    })
  }
  if (!signPsbt) return psbt

  // 签名
  const signed = psbt.signAllInputs(signer, [SIGHASH_ALL]).finalizeAllInputs()

  return signed
}

export async function sellTicket(
  payload: string,
  address: string,
  publicKey: string,
  signer: Signer,
): Promise<string> {
  const [tick, priceInBtc] = payload.split(' ')
  if (!tick || !priceInBtc) {
    return 'Invalid'
  }

  const ticketDetail = await fetchClubTicketDetail(tick)

  const feeRate = await fetchFeeRate()
  const cred = await getCred(ticketMessage)

  // 1

  const assetUtxoIds = []
  const assetUtxos = await fetchAssetUtxos(
    {
      address,
      tickId: ticketDetail.ticketId,
    },
    cred,
  )
  assetUtxos.forEach((item: MRC20Utxo) => {
    item.mrc20s.forEach((mrc20: MRC20UtxoChild) => {
      assetUtxoIds.push({
        ...mrc20,
        fromAddress: item.fromAddress,
        blockHeight: item.blockHeight,
      })
    })
  })

  const preOrder = await sellClubTicketPre(
    {
      address,
      networkFeeRate: feeRate,
      ticketId: ticketDetail.ticketId,
      priceAmount: priceInBtc,
      assetUtxoIds: assetUtxoIds.map((item) => item.txPoint.replace(':', '_')),
    },
    cred,
  )
  console.log({ preOrder })

  // 3
  const { commitTxRaw, revealPrePsbtRaw } = await buildSellClubTicketPsbt(
    preOrder,
    address,
    publicKey,
    signer,
    feeRate,
  )

  const commitRes = await sellClubTicketCommit(
    {
      orderId: preOrder.orderId,
      commitTxRaw,
      commitTxOutIndex: 0,
      revealPrePsbtRaw,
    },
    cred,
  )

  console.log({ commitRes })

  return 'Ticket sold'
}

export const buildSellClubTicketPsbt = async (
  order: SellClubTicketPreRes,
  address: string,
  publicKey: string,
  signer: Signer,
  feeRate: number,
  extract: boolean = true,
  signPsbt: boolean = true,
) => {
  initEccLib(ecc)
  const { minerFee, revealInputIndex, psbtRaw } = order
  const utxos = (await fetchUtxos(address)).sort(
    (a, b) => b.satoshi - a.satoshi,
  )
  const addressType = determineAddressInfo(address).toUpperCase()
  const script = toOutputScript(address, typedNetwork)

  const commitTx = await buildTx<BuildSellClubTicketPsbtParams>(
    utxos,
    new Decimal(minerFee),
    feeRate,
    {
      addressType,
      address,
      publicKey: Buffer.from(publicKey, 'hex'),
      signer,
      script,
      ...order,
    },
    address,
    _buildSellClubTicketCommitPsbt,
    extract,
    signPsbt,
  )
  const { rawTx: commitTxRaw, txId, fee } = commitTx
  const psbt = Psbt.fromHex(psbtRaw, {
    network: typedNetwork,
  })
  // @ts-ignore
  psbt.data.globalMap.unsignedTx.tx.ins[revealInputIndex].hash = Buffer.from(
    txId,
    'hex',
  ).reverse()
  // @ts-ignore
  psbt.data.globalMap.unsignedTx.tx.ins[revealInputIndex].index = 0

  const toSignInputs = []
  for (let i = 0; i < revealInputIndex; i++) {
    psbt.updateInput(
      i,
      await updateInputKey({
        publicKey: Buffer.from(publicKey, 'hex'),
        addressType,
      }),
    )
    toSignInputs.push({
      index: i,
      address: address,
      sighashTypes: [SIGHASH_ALL],
    })
  }
  if (signPsbt) {
    const signed = psbt.signAllInputs(signer, [SIGHASH_ALL])

    return { commitTxRaw, revealPrePsbtRaw: signed.toHex(), fee }
  }
  return { commitTxRaw, revealPrePsbtRaw: psbt.toHex(), fee }
}

const _buildSellClubTicketCommitPsbt = async (
  params: BuildSellClubTicketPsbtParams,
  selectedUTXOs: Utxo[],
  change: Decimal,
  needChange: boolean,
  signPsbt: boolean,
) => {
  const {
    addressType,
    publicKey,
    script,
    signer,
    receiveAddress,
    totalAmount,
    address,
  } = params
  const psbt = new Psbt({ network: typedNetwork })
  for (const utxo of selectedUTXOs) {
    const psbtInput = await createPsbtInput({
      utxo,
      addressType,
      publicKey,
      script,
    })
    psbtInput.sighashType = SIGHASH_ALL
    psbt.addInput(psbtInput)
  }
  psbt.addOutput({
    address: receiveAddress,
    value: totalAmount,
  })
  if (needChange || change.gt(DUST_SIZE)) {
    psbt.addOutput({
      address: address,
      value: change.toNumber(),
    })
  }
  if (!signPsbt) return psbt

  const signed = psbt.signAllInputs(signer, [SIGHASH_ALL]).finalizeAllInputs()
  return signed
}

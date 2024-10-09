import {
  BuyClubTicketPreRes,
  ClubTicketInfo,
  Cred,
  MRC20Utxo,
  SellClubTicketPreRes,
} from 'src/lib/types'
import { AES_KEY, log, ticketHost } from 'src/lib/util'
import * as CryptoJS from 'crypto-js'

async function decodeData({ data, e, ws }) {
  if (!e || !ws) {
    return data
  }

  const { wordListMap, wordSortListMap } = await getAesWord()
  if (!wordListMap || !wordSortListMap) {
    throw new Error('wordListMap or wordSortListMap is null')
  }

  if (wordListMap[e] && wordSortListMap[ws]) {
    const passphrase = `${wordListMap[e][wordSortListMap[ws][0]]} ${wordListMap[e][wordSortListMap[ws][1]]} ${wordListMap[e][wordSortListMap[ws][2]]} ${wordListMap[e][wordSortListMap[ws][3]]} ${wordListMap[e][wordSortListMap[ws][4]]} ${wordListMap[e][wordSortListMap[ws][5]]}`
    const _data = decrypt(data, passphrase)

    return JSON.parse(_data)
  }
}

const getAesWord = async () => {
  const { data } = await fetch(`${ticketHost}/api/v1/common/word`, {
    method: 'GET',
  }).then((res) => res.json())

  if (data) {
    const _data = JSON.parse(decrypt(data, '', AES_KEY))

    return _data
  }
}

function decrypt(
  cryptoText: string,
  passphrase: string,
  _key?: string,
): string {
  const key = _key
    ? CryptoJS.enc.Hex.parse(_key)
    : generateKeyFromPassphrase(passphrase)
  // 解码Base64
  const encryptedData = CryptoJS.enc.Base64.parse(cryptoText)
  // 提取IV
  const iv = key.clone()
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: encryptedData } as any,
    key,
    {
      iv: iv,
      mode: CryptoJS.mode.CFB,
      padding: CryptoJS.pad.NoPadding,
    },
  )
  return decrypted.toString(CryptoJS.enc.Utf8)
}

function generateKeyFromPassphrase(passphrase: string): CryptoJS.lib.WordArray {
  const hash = CryptoJS.SHA256(passphrase)
  const key = CryptoJS.lib.WordArray.create(hash.words.slice(0, 4))
  return key
}

export const buyClubTicketPre = async (
  params: {
    address: string
    networkFeeRate: number
    ticketId: string
    priceAmount?: string
  },
  options?: { [key: string]: any },
): Promise<BuyClubTicketPreRes> => {
  const response = await fetch(
    `${ticketHost}/api/v1/ticket/club/trade/buy/pre`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options || {}),
      },
      body: JSON.stringify(params),
    },
  )
    .then((res) => res.json())
    .then(({ data, e, ws }) => decodeData({ data, e, ws }))

  return response
}

export async function fetchClubTicketDetail(
  tick: string,
): Promise<ClubTicketInfo> {
  const response = await fetch(
    `${ticketHost}/api/v1/ticket/club/info?` + new URLSearchParams({ tick }),
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
    .then((res) => res.json())
    .then(({ data, e, ws }) => decodeData({ data, e, ws }))

  return response
}

export const buyClubTicketCommit = async (
  params: {
    orderId: string
    commitTxOutIndex: number
    commitTxRaw: string
  },
  options?: { [key: string]: any },
): Promise<{
  commitTxId: string
  orderId: string
  revealTxId: string
  ticketId: string
  txId: string
}> => {
  const response = await fetch(
    `${ticketHost}/api/v1/ticket/club/trade/buy/commit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options || {}),
      },
      body: JSON.stringify(params),
    },
  )
    .then((res) => res.json())
    .then(({ data, e, ws }) => decodeData({ data, e, ws }))

  return response
}

export const sellClubTicketPre = async (
  params: {
    address: string
    networkFeeRate: number
    ticketId: string
    assetAmount?: string
    priceAmount?: string
    assetUtxoIds: string[]
  },
  options?: { [key: string]: any },
): Promise<SellClubTicketPreRes> => {
  const response = await fetch(
    `${ticketHost}/api/v1/ticket/club/trade/sell/pre`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options || {}),
      },
      body: JSON.stringify(params),
    },
  )
    .then((res) => res.json())
    .then(({ data, e, ws }) => decodeData({ data, e, ws }))

  return response
}

export const fetchAssetUtxos = async (
  params: {
    address?: string
    tickId?: string
  },
  cred: Cred,
): Promise<MRC20Utxo[]> => {
  const response = await fetch(
    `${ticketHost}/api/v1/common/mrc20/address/utxo?` +
      new URLSearchParams({ ...params, cursor: '0', size: '100' }),
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': cred['X-Signature'],
        'X-Public-Key': cred['X-Public-Key'],
      },
    },
  )
    .then((res) => res.json())
    .then(({ data, e, ws }) => decodeData({ data, e, ws }))
    .then(({ list }) => list)
  return response
}

export const sellClubTicketCommit = async (
  params: {
    orderId: string
    commitTxRaw: string
    commitTxOutIndex: number
    revealPrePsbtRaw: string
  },
  options?: { [key: string]: any },
): Promise<{
  orderId: string
  txId: string
  commitTxId: string
  revealTxId: string
  ticketId: string
}> => {
  const response = await fetch(
    `${ticketHost}/api/v1/ticket/club/trade/sell/commit`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options || {}),
      },
      body: JSON.stringify(params),
    },
  )
    .then((res) => res.json())
    .then(log)
    .then(({ data, e, ws }) => decodeData({ data, e, ws }))

  return response
}

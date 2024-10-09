import {
  BuildBuyClubTicketPsbtParams,
  BuyClubTicketPreRes,
  ClubTicketInfo,
} from 'src/lib/types'
import {
  AES_KEY,
  determineAddressInfo,
  ticketHost,
  typedNetwork,
} from 'src/lib/util'
import * as CryptoJS from 'crypto-js'
import { initEccLib } from 'bitcoinjs-lib'
import * as ecc from 'tiny-secp256k1'
import { fetchUtxos } from 'src/lib/services/metalet'
import { getPublicKey } from 'src/lib/metaid'
import { toOutputScript } from 'bitcoinjs-lib/src/address'
import Decimal from 'decimal.js'

async function decodeData({ data, e, ws }) {
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

export const buildBuyClubTicketPsbt = async (
  order: BuyClubTicketPreRes,
  address: string,
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
  const publicKey = await getPublicKey()
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
    },
    address,
    _buildBuyClubTicketPsbt,
    extract,
    signPsbt,
  )
  return ret
}

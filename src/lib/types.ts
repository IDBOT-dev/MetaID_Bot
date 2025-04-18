import type { Signer } from 'bitcoinjs-lib'

export type Utxo = {
  confirmed: boolean
  inscriptions: null | string // Assuming inscriptions could be a string or null
  satoshi: number
  txId: string
  vout: number
  outputIndex: number
  satoshis: number
  rawTx?: string
  preTx?:any
}

export type MetaFlag = 'metaid' | 'testid'
export type Operation = 'init' | 'create' | 'modify' | 'revoke' | 'hide'
export type Encryption = '0' | '1' | '2'

export type MetaIdData = {
  body?: string
  path?: string
  flag?: MetaFlag
  version?: string
  operation: Operation
  contentType?: string
  encryption?: Encryption
  encoding?: BufferEncoding
}

export type BuyClubTicketPreRes = {
  minerFee: number
  orderId: string
  orderType: number
  priceAmount: number
  psbtRaw: string
  receiveAddress: string
  serviceFee: number
  totalAmount: number
  totalFee: number
  minerGas: number
  minerOutValue: number
}

export type ClubTicketInfo = {
  blockHeight: number
  confirmationState: number
  cover: string
  decimals: string
  deployPinId: string
  description: string
  detail: string
  detailJson: {
    [key: string]: string
  }
  issuerAddress: string
  issuerMetaId: string
  issuerUser: {
    avatar: string
    name: string
  }
  marketCap: number
  memberCount: number
  orderId: string
  percents?: string
  poolCompletedPercent: string
  supply: string
  tick: string
  ticketId: string
  ticketPrice: number
  ticketPriceStr: string
  timestamp: number
  tokenName: string
  remainingSupply: string
  totalAmount: number
  balance?: string
  change?: string
  finalMarketCap?: string
  autoState: number
  tradeState?: number
}

export type Cred = {
  'X-Signature': string
  'X-Public-Key': string
}

export type BuildBuyClubTicketPsbtParams = BaseBuildParams & BuyClubTicketPreRes

type BaseBuildParams = {
  addressType: string
  address: string
  publicKey: Buffer
  script: Buffer
  signer: Signer
}

export type Tx = {
  address: string
  value: number
}

export type SellClubTicketPreRes = {
  minerFee: number
  orderId: string
  orderType: number
  priceAmount: number
  psbtRaw: string
  receiveAddress: string
  revealInputIndex: number
  serviceFee: number
  totalAmount: number
  totalFee: number
  minerGas: number
  minerOutValue: number
}

export type MRC20Utxo = {
  chain: 'btc'
  blockHeight: number
  address: string
  satoshi: number
  satoshis: number
  scriptPk: string
  txId: string
  vout: number
  outputIndex: number
  mrc20s: MRC20UtxoChild[]
  timestamp: number
  fromAddress: string
}

export type MRC20UtxoChild = {
  tick: string
  mrc20Id: string
  txPoint: string
  amount: string
  decimals: string
  fromAddress?: string
  blockHeight?: number
}

export type BuildSellClubTicketPsbtParams = BaseBuildParams &
  SellClubTicketPreRes

export type MetaidDetail = {
  chainName: 'btc'
  number: number
  metaid: string
  name: string
  nameId: string
  address: string
  avatar: string
  avatarId: string
  bio: string
  bioId: string
  soulbondToken: string
  isInit: boolean
  followCount: number
  pdv: number
  fdv: number
  unconfirmed: string
}

export type Attachment={
  file_id: string,
  file_unique_id:string,
  file_size:number
  width:number
  height:number
  url?:string
}

import { networks } from 'bitcoinjs-lib'

export const literalNetwork = process.env.NETWORK || 'testnet'
export const isTestnet = literalNetwork === 'testnet'
export const typedNetwork =
  process.env.NETWORK === 'livenet' ? networks.bitcoin : networks.testnet

export const OP_DATA_1 = 1
export const DUST_SIZE = 546
export const DefaultTxVersion = 2
export const LEAF_VERSION_TAPSCRIPT = 0xc0
export const DefaultSequenceNum = 0xfffffffd
export const MaxStandardTxWeight = 4000000 / 10

export function toXOnly(pubkey: Buffer): Buffer {
  return pubkey.length === 32 ? pubkey : pubkey.slice(1, 33)
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const ticketHost = isTestnet
  ? 'https://api.ticket.fans/ticket-api-testnet'
  : 'https://api.ticket.fans/ticket-api'

export const manHost = isTestnet
  ? 'https://man-test.metaid.io'
  : 'https://man.metaid.io'

export const ticketMessage = 'ticket.fans'

export const AES_KEY = isTestnet
  ? '3560d934fc3e7fcaf115a53eddff60484c2082ca334af56382ba34f392680f42'
  : '9e09058386b738d694d8a2dee061cb57905351a6916e1df41e0ffc9e34540771'

export function determineAddressInfo(address: string): string {
  if (address.startsWith('bc1q')) {
    return 'p2wpkh'
  }
  if (address.startsWith('tb1q')) {
    return 'p2wpkh'
  }

  if (address.startsWith('bc1p')) {
    return 'p2tr'
  }

  if (address.startsWith('tb1p')) {
    return 'p2tr'
  }

  if (address.startsWith('1')) {
    return 'p2pkh'
  }
  if (address.startsWith('3') || address.startsWith('2')) {
    return 'p2sh'
  }
  if (address.startsWith('m') || address.startsWith('n')) {
    return 'p2pkh'
  }
  return 'unknown'
}

export const MESSAGE = 'ticket.fans'
export const SIGHASH_ALL = 0x01
export const FLAG = 'metaid'
export const SERVICE_FEE = '1999'
export const CREATE_THRESHOLD_POINTS = 100
export const PAGE_SIZE = 14
export const MEMPOOL_HOST = 'https://mempool.space'
export const MAX_MARKET_CAP = '1.25 BTC'
export const TG_LINK = 'https://t.me/Ticketdotfans'
export const TWITTER_LINK = 'https://x.com/ticketdotfans'
export const TUTORIAL_LINK = 'https://ticket-fans.gitbook.io/ticket.fans'

export function log(things: any) {
  console.log(things)

  return things
}

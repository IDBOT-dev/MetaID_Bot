import { networks } from 'bitcoinjs-lib'

export const literalNetwork = process.env.NETWORK || 'testnet'
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

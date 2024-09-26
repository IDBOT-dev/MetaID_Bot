import { networks } from 'bitcoinjs-lib'

export const literalNetwork = process.env.NETWORK || 'testnet'
export const typedNetwork =
  process.env.NETWORK === 'livenet' ? networks.bitcoin : networks.testnet

export function toXOnly(pubkey: Uint8Array): Uint8Array {
  return pubkey.length === 32 ? pubkey : pubkey.slice(1, 33)
}

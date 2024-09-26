import * as bip39 from 'bip39'
import BIP32Factory from 'bip32'
import * as ecc from 'tiny-secp256k1'
import { payments, networks, initEccLib } from 'bitcoinjs-lib'
import { toXOnly, typedNetwork } from 'src/lib/util'
import { getUtxos } from 'src/lib/service'

export async function createBuzz(content: string) {
  initEccLib(ecc)
  const bip32 = BIP32Factory(ecc)

  const mnemonic = process.env.MNEMONIC
  const seed = bip39.mnemonicToSeedSync(mnemonic)
  const node = bip32.fromSeed(seed)
  const internalPubkey = toXOnly(node.derivePath("m/86'/0'/0'/0/0").publicKey)

  const address = payments.p2tr({
    internalPubkey,
    network: typedNetwork,
  }).address!
  const utxos = await getUtxos(address)
  console.log(utxos)

  return address
}

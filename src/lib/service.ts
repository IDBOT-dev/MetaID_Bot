import { Utxo } from 'src/lib/types'
import { literalNetwork } from 'src/lib/util'

export async function getUtxos(address: string): Promise<Utxo[]> {
  return await fetch(
    `https://www.metalet.space/wallet-api/v3/address/btc-utxo?net=${literalNetwork}&address=${address}`,
  ).then((res) => res.json())
}

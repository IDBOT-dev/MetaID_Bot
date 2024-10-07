import { Utxo } from 'src/lib/types'
import { literalNetwork } from 'src/lib/util'

export async function getUtxos(address: string): Promise<Utxo[]> {
  return await fetch(
    `https://www.metalet.space/wallet-api/v3/address/btc-utxo?net=${literalNetwork}&address=${address}`,
  )
    .then((res) => res.json())
    .then(({ data }) => data)
}

export async function getFeeRate(): Promise<number> {
  return await fetch(
    `https://www.metalet.space/wallet-api/v3/btc/fee/summary?net=${literalNetwork}`,
  )
    .then((res) => res.json())
    .then(({ data: { list } }) => list)
    .then((list) => list.find((item) => item.title === 'Fast')!.feeRate)
}

export async function broadcast(tx: string): Promise<any> {
  const body = JSON.stringify({ rawTx: tx, net: literalNetwork, chain: 'btc' })
  console.log({ body })
  return await fetch(`https://www.metalet.space/wallet-api/v3/tx/broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  })
    .then((res) => res.json())
    .then(({ data }) => data)
}

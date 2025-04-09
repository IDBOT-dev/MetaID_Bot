import Decimal from 'decimal.js'
import { MetaidDetail, Utxo } from 'src/lib/types'
import { literalNetwork, manHost } from 'src/lib/util'

export async function fetchUtxos(address: string): Promise<Utxo[]> {
  return await fetch(
    `https://www.metalet.space/wallet-api/v3/address/btc-utxo?net=${literalNetwork}&address=${address}&unconfirmed=1`,
  )
    .then((res) => res.json())
    .then(({ data }) => data)
}

export async function fetchUtxosRaw(txid:string,network:string): Promise<string> {
  if(network == 'mainnet') network = 'livenet'
  const prefix=process.env.ORDERS_PREFIX
  return await fetch(
    `https://www.orders.exchange/${prefix}/common/tx/raw?net=${network}&txId=${txid}`,
  )
    .then((res) => res.json())
    .then(({ data }) => data.rawTx)
}

export async function fetchFeeRate(): Promise<number> {
  return await fetch(
    `https://www.metalet.space/wallet-api/v3/btc/fee/summary?net=${literalNetwork}`,
  )
    .then((res) => res.json())
    .then(({ data: { list } }) => list)
    .then((list) => list.find((item) => item.title === 'Avg')!.feeRate)
    .then((feeRate) => Math.max(feeRate, 2))
}

export async function broadcast(tx: string,chain?:string,net?:string): Promise<any> {
    
  const network = chain == 'btc' ? literalNetwork : net

  console.log("network",network)
  console.log("chain",chain)
  const body = JSON.stringify({ rawTx: tx, net: network, chain: chain })
  return await fetch(`https://www.metalet.space/wallet-api/v3/tx/broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  })
    .then((res) => res.json())
    .then((res) => {
      console.log({ res })
      return res
    })
    .then(({ data }) => data)
}

export async function fetchMetaid(address: string): Promise<MetaidDetail> {
  return await fetch(`${manHost}/api/info/address/${address}`)
    .then((res) => res.json())
    .then(({ data }) => data)
}

export async function fetchBalance(address: string): Promise<string> {
  return await fetch(
    `https://www.metalet.space/wallet-api/v3/address/btc-balance?net=${literalNetwork}&address=${address}`,
  )
    .then((res) => res.json())
    .then(({ data: { balance } }) => String(balance))
}

export async function fetchBalanceForMvc(address: string): Promise<string> {
 
  return await fetch(
    `https://www.metalet.space/wallet-api/v4/mvc/address/balance-info?net=${literalNetwork}&address=${address}`,
  )
    .then((res) => res.json())
    .then(({ data: { confirmed,unconfirmed } }) => {
       if(confirmed){
        return new Decimal(confirmed).add(unconfirmed).div(10**8).toString()
       }else if(unconfirmed){
        return new Decimal(unconfirmed).add(confirmed).div(10**8).toString()
       }else{
        return String(confirmed + unconfirmed)
       }
        
    }
    
    )
}

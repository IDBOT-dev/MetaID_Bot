import Decimal from 'decimal.js'
import { isTestnet } from 'src/lib/util'

export async function GetUtxoInitReq(address: string,gasChain:string='mvc'): Promise<{
    address: string,
    txId: string,
    index: number,
    amount: number
}> {
const body=JSON.stringify({
    address,
    gasChain
})
const host=process.env.ASSIST_HOST
  return await fetch(
    `${host}/v1/assist/gas/mvc/address-init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      }
  )
    .then((res) => res.json())
    .then(({data}) => data)
}

export async function GetGasPreReq(params:{
    address: string,
    txHex
}): Promise<{
        minerFee: number,
        orderId: string,
        txHex: string,
        txSize: number
}> {
const body=JSON.stringify(params)
const host=process.env.ASSIST_HOST
  return await fetch(
    `${host}/v1/assist/gas/mvc/pre`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      }
  )
    .then((res) => res.json())
    .then(({data}) => data)
}

export async function GetGasCommitReq(params:{
    orderId: string,
    txHex:string
}): Promise<{
    txId:string,
    txSize: number,
    minerFee: number
}> {
const body=JSON.stringify(params)
const host=process.env.ASSIST_HOST
  return await fetch(
    `${host}/v1/assist/gas/mvc/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      }
  )
    .then((res) => res.json())
    .then(({data}) => data)
}

export async function GetFreeExtra(address:string): Promise<{

    balance: number,
    rewardAmount:number,
    usedAmount:number
}> {

const host=process.env.ASSIST_HOST
  return await fetch(
    `${host}/v1/assist/gas/address/info?address=${address}&gasChain=mvc`
  )
    .then((res) => res.json())
    .then(({data}) => {
        console.log("data",data)
        return {
           
            balance:data.balance > 0 ? new Decimal(data.balance).div(10**8).toNumber() : 0,
            rewardAmount:data.rewardAmount > 0 ? new Decimal(data.rewardAmount).div(10 ** 8).toNumber() : 0,
            usedAmount:data.usedAmount > 0 ? new Decimal(data.usedAmount).div(10 ** 8).toNumber() : 0,
        }
    })
}
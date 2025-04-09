import { networks } from 'bitcoinjs-lib'
import Decimal from 'decimal.js'
import {MEDIA_TYPE} from 'src/app.constants'
import { Attachment } from './types'
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

export function formatHTML(list:Array<{command:string,desc:string,value?:string,}>,optional?:Array<{command:string,desc:string,}>){
   let htmlRes=`Commands:\n`
    for(let i of list){
          const value = i.value ?? ''
          const str=`${i.command}   ${value}   ${i.desc}\n\n`
       
          htmlRes +=`${str}` 
    }
    if(optional.length){
      htmlRes +=`Options:\n`
      for(let j of optional){
        const str=`${j.command}   ${j.desc}\n\n` 
        htmlRes +=`${str}`
  }
    }
    console.log("htmlRes",htmlRes)
    return htmlRes

}

export const ticketHost = process.env.TICKET_HOST

export const manHost = process.env.MAN_HOST

export const ticketMessage = 'ticket.fans'

export const AES_KEY = process.env.AES_KEY

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

export function mediaType(message:Object){
    const isPhoto = message.hasOwnProperty(MEDIA_TYPE.PHOTO) 
    const isVideo = message.hasOwnProperty(MEDIA_TYPE.VIDEO)
    const isAudio = message.hasOwnProperty(MEDIA_TYPE.AUDIO)
    if(isPhoto){
      return MEDIA_TYPE.PHOTO
    }else if(isVideo){
      return MEDIA_TYPE.VIDEO
    }else if(isAudio){
      return MEDIA_TYPE.AUDIO
    }else{
      return MEDIA_TYPE.UNKNOW
    }


}

export async function getImgData(picPath:string){
  try {
      const res= await fetch(picPath)
      const result=await res.arrayBuffer()
      const blob=await res.blob()
      const data=new Uint8Array(result)
      return {
        data:data,
        mime:blob.type
      }
  } catch (error) {
    throw new Error(error.messsage)
    
  }
}


export function selectUTXOs(utxos, targetAmount) {
  let totalAmount = new Decimal(0)
  const selectedUtxos = []
  for (const utxo of utxos) {
    selectedUtxos.push(utxo)
    totalAmount = totalAmount.add(utxo.satoshis)

    if (totalAmount.gte(targetAmount)) {
      break
    }
  }

  if (totalAmount.lt(targetAmount)) {
    throw new Error('Insufficient funds to reach the target amount')
  }

  return selectedUtxos
}

export function getTotalSatoshi(utxos) {
  return utxos.reduce(
    (total, utxo) => total.add(utxo.satoshis),
    new Decimal(0),
  )
}

export function inputIsAddress(str:string){
    const isAddress=str.startsWith('m') || str.startsWith('n') || str.startsWith('bc1p') || str.startsWith('tb1p') || str.length == 33 || str.length == 34
    return isAddress
  }



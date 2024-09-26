export type Utxo = {
  confirmed: boolean
  inscriptions: null | string // Assuming inscriptions could be a string or null
  satoshi: number
  txId: string
  vout: number
  outputIndex: number
  satoshis: number
}

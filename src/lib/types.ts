export type Utxo = {
  confirmed: boolean
  inscriptions: null | string // Assuming inscriptions could be a string or null
  satoshi: number
  txId: string
  vout: number
  outputIndex: number
  satoshis: number
}

export type MetaFlag = 'metaid' | 'testid'
export type Operation = 'init' | 'create' | 'modify' | 'revoke' | 'hide'
export type Encryption = '0' | '1' | '2'

export type MetaIdData = {
  body?: string
  path?: string
  flag?: MetaFlag
  version?: string
  revealAddr: string
  operation: Operation
  contentType?: string
  encryption?: Encryption
  encoding?: BufferEncoding
}

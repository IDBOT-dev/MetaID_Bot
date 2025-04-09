import { payments, script } from 'bitcoinjs-lib'
import { hash160 } from 'bitcoinjs-lib/src/crypto'
import { decompile } from 'bitcoinjs-lib/src/script'
import { isNull } from 'meta-contract/dist/common/utils'

export function createScript(metaidData: any, internalPubkey: Buffer) {
  const ops = script.OPS
  const inscriptionBuilder: payments.StackElement[] = []

  inscriptionBuilder.push(internalPubkey)
  inscriptionBuilder.push(ops.OP_CHECKSIG)
  inscriptionBuilder.push(ops.OP_FALSE)
  inscriptionBuilder.push(ops.OP_IF)
  inscriptionBuilder.push(Buffer.from('metaid'))
  inscriptionBuilder.push(Buffer.from(metaidData.operation))

  if (!['init', 'revoke'].includes(metaidData.operation)) {
    inscriptionBuilder.push(Buffer.from(metaidData.path!))
    inscriptionBuilder.push(Buffer.from(metaidData?.encryption ?? '0'))
    inscriptionBuilder.push(Buffer.from(metaidData?.version ?? '1.0.0'))
    inscriptionBuilder.push(
      Buffer.from(metaidData?.contentType ?? 'application/json'),
    )

    const body = Buffer.from(metaidData.body!, metaidData?.encoding ?? 'utf8')

    const maxChunkSize = 520
    const bodySize = body.length
    for (let i = 0; i < bodySize; i += maxChunkSize) {
      let end = i + maxChunkSize
      if (end > bodySize) {
        end = bodySize
      }
      inscriptionBuilder.push(body.subarray(i, end))
    }
  } else if (metaidData.operation === 'revoke') {
    inscriptionBuilder.push(Buffer.from(metaidData.path!))
    inscriptionBuilder.push(ops.OP_0)
    inscriptionBuilder.push(ops.OP_0)
    inscriptionBuilder.push(ops.OP_0)
    inscriptionBuilder.push(ops.OP_0)
  }

  inscriptionBuilder.push(ops.OP_ENDIF)

  return script.compile(inscriptionBuilder)
}


export function createScriptForMvc(metaidData: any) {
  const res1 = ['metaid',metaidData.operation]
  let res2 = []
  if (metaidData.operation !== 'init') {
    res2.push(metaidData.path)
    res2.push(metaidData.encryption ?? '0')
    res2.push(metaidData.version ?? '1.0.0')
    res2.push(metaidData.contentType ?? 'text/plain;utf-8')
    const body = isNull(metaidData.body)
      ? undefined
      : Buffer.isBuffer(metaidData.body)
        ? metaidData.body
        : Buffer.from(metaidData.body, metaidData?.encoding ?? 'utf-8')
    // res2.push(body)
      const maxChunkSize = 520
      const bodySize = (body as Buffer).length
      for (let i = 0; i < bodySize; i += maxChunkSize) {
        let end = i + maxChunkSize
        if (end > bodySize) {
          end = bodySize
        }
        res2.push((body as Buffer).subarray(i, end))
      }

  }
  return [...res1,...res2] 

}
export function pubkeyPositionInScript(pubkey: Buffer, script: Buffer): number {
  const pubkeyHash = hash160(pubkey)
  const pubkeyXOnly = pubkey.slice(1, 33) // slice before calling?

  const decompiled = decompile(script)
  if (decompiled === null) throw new Error('Unknown script error')

  return decompiled.findIndex((element) => {
    if (typeof element === 'number') return false
    console.log(element.toString('hex'), pubkey.toString('hex'))
    return (
      element.equals(pubkey) ||
      element.equals(pubkeyHash) ||
      element.equals(pubkeyXOnly)
    )
  })
}

export function pubkeyInScript(pubkey: Buffer, script: Buffer): boolean {
  return pubkeyPositionInScript(pubkey, script) !== -1
}

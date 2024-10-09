import { getCred } from 'src/lib/metaid'
import { fetchFeeRate } from 'src/lib/services/metalet'
import {
  buildBuyClubTicketPsbt,
  buyClubTicketPre,
  fetchClubTicketDetail,
} from 'src/lib/services/ticket'
import { ticketMessage } from 'src/lib/util'

export async function buyTicket(
  payload: string,
  address: string,
): Promise<string> {
  const [tick, priceInBtc] = payload.split(' ')
  if (!tick || !priceInBtc) {
    return 'Invalid'
  }

  const ticketDetail = await fetchClubTicketDetail(tick)

  const feeRate = await fetchFeeRate()
  const cred = await getCred(ticketMessage)

  // 1
  const preOrder = await buyClubTicketPre(
    {
      address,
      networkFeeRate: feeRate,
      ticketId: ticketDetail.ticketId,
      priceAmount: priceInBtc,
    },
    cred,
  )
  console.log({ preOrder })

  // 3
  const { rawTx } = await buildBuyClubTicketPsbt(preOrder, address, feeRate)

  const commitRes = await buyClubTicketCommit(
    {
      orderId: preOrder.orderId,
      commitTxOutIndex: 0,
      commitTxRaw: rawTx,
    },
    {
      'X-Signature': signature,
      'X-Public-Key': pubkey,
    },
  )
  if (commitRes.code !== 0) throw new Error(commitRes.message)
  await addUtxoSafe(address, [{ txId: commitRes.data.commitTxId, vout: 1 }])

  return 'Ticket bought'
}

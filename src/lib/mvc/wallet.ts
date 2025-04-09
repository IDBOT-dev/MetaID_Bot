import { API_NET, API_TARGET, Wallet,TxComposer,mvc, } from 'meta-contract'
import { MetaIdData,Utxo } from 'src/lib/types'
import { createScript,createScriptForMvc } from 'src/lib/pin'
import { broadcast} from 'src/lib/services/metalet'
import {MVC_FEE,P2PKH_UNLOCK_SIZE} from 'src/app.constants'
import { SA_utxo } from 'meta-contract/dist/api'
import {GetGasPreReq,GetGasCommitReq,GetFreeExtra,GetUtxoInitReq} from 'src/lib/services/assist-base'
export interface InternalTransaction{
    txComposer: TxComposer,
    message: string,
}

export class MvcWallet extends Wallet{
 
    constructor(parmas:{
        wif: string, 
        network?: API_NET, 
        feeb?: number, 
        apiTarget?: API_TARGET, 
        apiUrl?: string
    }){
        const {wif,network,feeb,apiTarget}=parmas
        super(wif,network,feeb,apiTarget)
        
    }

    get rootAddress(){
        return this.address.toString()
    }

    get publicKey(){
        return this.privateKey.toPublicKey().toBuffer()
    }

   

    private getPrivateKey(){
        return this.privateKey
    }

    async getUseableUtxos(){
      const res=await this.getUtxos()
      console.log('res',res)
      return res.filter((utxo)=>utxo.satoshis != 600)
    }



    async checkFreeDetail() {
      const initUtxo=await GetUtxoInitReq(this.rootAddress)

     
      let utxo=[]
      if(!initUtxo){
        const res = await this.getUtxos()
        utxo=res.filter((utxo)=>utxo.satoshis == 600)
      }else{
        const useableBalance=await GetFreeExtra(this.rootAddress)
        if(useableBalance.balance  > 0){
          utxo.push({
            txId: initUtxo.txId,
            outputIndex: initUtxo.index,
            satoshis: initUtxo.amount,
            address: initUtxo.address,
            height: null,
            flag: ''
          })
        }
       
      }

      return utxo
    }

    async createPin(
        metaidData:any,
        utxo:SA_utxo[],
     
    ){  
        
        try {
          const transactions=[]
        const pinTxComposer = new TxComposer()
        pinTxComposer.appendP2PKHOutput({
            address: this.address,
            satoshis: 1,
          })
        const pinScript = createScriptForMvc(metaidData)
   
        pinTxComposer.appendOpReturnOutput(pinScript)
   
        transactions.push({
            txComposer: pinTxComposer,
            message: 'Create Pin',
          })
          const { 
            currentFee,
            payedTransactions,
            nextUtxo
          }  = await this.pay({
            transactions,
            utxo
          })
         
          const txIDs =  await this.txBroadcast(payedTransactions[0],true)
          return {
            hex:txIDs.hex,
            txid:txIDs.txid,
            txFee:currentFee,
            nextUtxo:nextUtxo
          }
        } catch (error) {
          throw new Error(error)
        }


    }

    async createPinForFree(
        metaidData:any,
        utxo:SA_utxo[]
    ){
        try {
          const transactions=[]
        const pinTxComposer = new TxComposer()
        pinTxComposer.appendP2PKHOutput({
            address: this.address,
            satoshis: 1,
          })
        const pinScript = createScriptForMvc(metaidData)
   
        pinTxComposer.appendOpReturnOutput(pinScript)
          
        pinTxComposer.appendP2PKHOutput({
            address: this.address,
            satoshis: utxo[0].satoshis,
          })
        transactions.push({
            txComposer: pinTxComposer,
            message: 'Create Pin',
          })
         
          const { 
            payedTransactions,
            inputsOutput
          }  = await this.payBehalf({
            transactions,
            utxo
          })
         const {orderId,txHex}= await GetGasPreReq({
            address:this.rootAddress,
            txHex:payedTransactions[0].getRawHex()
         })
        const tx= new mvc.Transaction(txHex)
        inputsOutput.forEach((out,index)=>{
            tx.inputs[index].output=out
        })
        const newComposer= new TxComposer(tx)
        
        newComposer.unlockP2PKHInput(this.privateKey,0)
      
        const data= await GetGasCommitReq({
        orderId,
        txHex:newComposer.getRawHex()
        })
         return {
            ...data
         }
        } catch (error) {
          throw new Error(error)
        }
       
    }

    async pay(parmas:{
        transactions:InternalTransaction[],
        utxo:SA_utxo[]
    }){
        const address = this.rootAddress
        const {utxo,transactions}=parmas
        let currentFee
        let usableUtxos 
        let nextUtxo=[]
        const payedTransactions:string[] = []
        if(utxo.length){
            usableUtxos=utxo
           
          }else{
            usableUtxos = (await this.getUseableUtxos()).map((u) => {
              return {
               ...u
              }
            })
            
          }

            // first we gather all txids using a map for future mutations
        const txids = new Map()
        transactions.forEach(({ txComposer }) => {
        
          const txid = txComposer.getTxId()
          txids.set(txid, txid)
        })

        for (let i = 0; i < transactions.length; i++) {
            const toPayTransaction = transactions[i]
            // record current txid
            const txComposer = toPayTransaction.txComposer
            const currentTxid = toPayTransaction.txComposer.getTxId()
      
            const tx = txComposer.tx
      
            // make sure that every input has an output
            const inputs = tx.inputs
            const existingInputsLength = tx.inputs.length
            for (let i = 0; i < inputs.length; i++) {
          
              if (!inputs[i].output) {
  
                throw new Error('The output of every input of the transaction must be provided')
              }
            }
      
            // update metaid metadata
      
            const { messages: metaIdMessages, outputIndex } = this.parseLocalTransaction(tx)
           
            if (outputIndex !== null) {
              // find out if any of the messages contains the wrong txid
              // how to find out the wrong txid?
              // it's the keys of txids Map
              const prevTxids = Array.from(txids.keys())
      
              // we use a nested loops here to find out the wrong txid
              for (let i = 0; i < metaIdMessages.length; i++) {
                for (let j = 0; j < prevTxids.length; j++) {
                  if (typeof metaIdMessages[i] !== 'string') continue
      
                  if (metaIdMessages[i].includes(prevTxids[j])) {
                    metaIdMessages[i] = (metaIdMessages[i] ).replace(prevTxids[j], txids.get(prevTxids[j]))
                  }
                }
              }
      
              // update the OP_RETURN
              const opReturnOutput = new mvc.Transaction.Output({
                script: mvc.Script.buildSafeDataOut(metaIdMessages),
                satoshis: 0,
              })

             
      
              // update the OP_RETURN output in tx
              tx.outputs[outputIndex] = opReturnOutput
            }
      
            const addressObj =this.address //new mvc.Address(address, MVC_NETWORK)
       
            // find out the total amount of the transaction (total output minus total input)
            const totalOutput = tx.outputs.reduce((acc, output) => acc + output.satoshis, 0)
            const totalInput = tx.inputs.reduce((acc, input) => acc + input.output.satoshis, 0)
            const currentSize = tx.toBuffer().length
      
            currentFee = MVC_FEE * currentSize
            const difference = totalOutput - totalInput + currentFee
            
           
            const pickedUtxos = this.pickUtxos(usableUtxos, difference,utxo)
      
            // append inputs
            for (let i = 0; i < pickedUtxos.length; i++) {
              const utxo = pickedUtxos[i]
              txComposer.appendP2PKHInput({
                address: addressObj,
                txId: utxo.txId,
                outputIndex: utxo.outputIndex,
                satoshis: utxo.satoshis,
              })
            
              // remove it from usableUtxos
              usableUtxos = usableUtxos.filter((u) => {
                return u.txId !== utxo.txId || u.outputIndex !== utxo.outputIndex
              })
            }
  
            
            
            const changeIndex = txComposer.appendChangeOutput(addressObj, MVC_FEE)
            const changeOutput = txComposer.getOutput(changeIndex)
      
            // // sign
            // const mneObj = mvc.Mnemonic.fromString(this.mnemonic)
            // const hdpk = mneObj.toHDPrivateKey('', MVC_NETWORK)
      
            // const rootPath = this.basePath
            // const basePrivateKey = hdpk.deriveChild(rootPath)
            // const rootPrivateKey = hdpk.deriveChild(`${rootPath}/0/0`).privateKey
      
            // we have to find out the private key of existing inputs
         
            const toUsePrivateKeys = new Map()
  
            for (let i = 0; i < existingInputsLength; i++) {
              const input = txComposer.getInput(i)
              // gotta change the prevTxId of the input to the correct one, if there's some kind of dependency to previous txs
              const prevTxId = input.prevTxId.toString('hex')
              if (txids.has(prevTxId)) {
                input.prevTxId = Buffer.from(txids.get(prevTxId), 'hex')
              }
      
              // find out the path corresponding to this input's prev output's address
            
            //   const inputAddress = mvc.Address.fromString(input.output.script.toAddress(this.network).toString(), this.network).toString()
            //   let deriver = 0
              let toUsePrivateKey=this.privateKey
           
            //   while (deriver < DERIVE_MAX_DEPTH) {
            //     const childPk = basePrivateKey.deriveChild(0).deriveChild(deriver)
            //     const childAddress = childPk.publicKey.toAddress(MVC_NETWORK).toString()
      
            //     if (childAddress === inputAddress.toString()) {
            //       toUsePrivateKey = childPk.privateKey
            //       break
            //     }
      
            //     deriver++
            //   }
      
              if (!toUsePrivateKey) {
                throw new Error(`Cannot find the private key of index #${i} input`)
              }
      
              // record the private key
              toUsePrivateKeys.set(i, toUsePrivateKey)
            }
      
            // sign the existing inputs
            toUsePrivateKeys.forEach((privateKey, index) => {
              txComposer.unlockP2PKHInput(privateKey, index)
            })
      
            // then we use root private key to sign the new inputs (those we just added to pay)
            pickedUtxos.forEach((v, index) => {
              txComposer.unlockP2PKHInput(this.privateKey, index + existingInputsLength)
            })
      
            // change txids map to reflect the new txid
            const txid = txComposer.getTxId()
            txids.set(currentTxid, txid)
      
            // return the payed transactions
            payedTransactions.push(txComposer.serialize())
      
            // add changeOutput to usableUtxos
            if (changeIndex >= 0) {
              usableUtxos.push({
                txId: txComposer.getTxId(),
                outputIndex: changeIndex,
                satoshis: changeOutput.satoshis,
                address,
                height: -1,
              })
              nextUtxo.push({
                txId: txComposer.getTxId(),
                outputIndex: changeIndex,
                satoshis: changeOutput.satoshis,
                address,
                height: -1,
              })
            }
          }

          return {
            currentFee,
            payedTransactions,
            nextUtxo
          }
    }


  

    async payBehalf(parmas:{
        transactions:InternalTransaction[],
        utxo:SA_utxo[],
     
    }){
        
        const {utxo,transactions}=parmas
        const inputsOutput=[]
        let usableUtxos 
       
        const payedTransactions:TxComposer[] = []
        if(utxo.length){
            usableUtxos=utxo
           console.log("usableUtxos",usableUtxos)
          }else{
            usableUtxos = (await this.getUseableUtxos()).map((u) => {
              return {
               ...u
              }
            })
            
          }

            // first we gather all txids using a map for future mutations
        const txids = new Map()
        transactions.forEach(({ txComposer }) => {
        
          const txid = txComposer.getTxId()
          console.log("txComposer",txid)
          txids.set(txid, txid)
        })

        for (let i = 0; i < transactions.length; i++) {
            const toPayTransaction = transactions[i]
            // record current txid
            const txComposer = toPayTransaction.txComposer
            const currentTxid = toPayTransaction.txComposer.getTxId()
      
            const tx = txComposer.tx
      
            // make sure that every input has an output
            const inputs = tx.inputs
            const existingInputsLength = tx.inputs.length

            for (let i = 0; i < inputs.length; i++) {
          
              if (!inputs[i].output) {
  
                throw new Error('The output of every input of the transaction must be provided')
              }
            }
      
            // update metaid metadata
      
            const { messages: metaIdMessages, outputIndex } = this.parseLocalTransaction(tx)
           
            if (outputIndex !== null) {
              // find out if any of the messages contains the wrong txid
              // how to find out the wrong txid?
              // it's the keys of txids Map
              const prevTxids = Array.from(txids.keys())
      
              // we use a nested loops here to find out the wrong txid
              for (let i = 0; i < metaIdMessages.length; i++) {
                for (let j = 0; j < prevTxids.length; j++) {
                  if (typeof metaIdMessages[i] !== 'string') continue
      
                  if (metaIdMessages[i].includes(prevTxids[j])) {
                    metaIdMessages[i] = (metaIdMessages[i] ).replace(prevTxids[j], txids.get(prevTxids[j]))
                  }
                }
              }
      
              // update the OP_RETURN
              const opReturnOutput = new mvc.Transaction.Output({
                script: mvc.Script.buildSafeDataOut(metaIdMessages),
                satoshis: 0,
              })

             
      
              // update the OP_RETURN output in tx
              tx.outputs[outputIndex] = opReturnOutput
            }
      
            const addressObj =this.address
       
            // append inputs
             for (let i = 0; i < usableUtxos.length; i++) {
              const utxo = usableUtxos[i]
              txComposer.appendP2PKHInput({
                address: addressObj,
                txId: utxo.txId,
                outputIndex: utxo.outputIndex,
                satoshis: utxo.satoshis,
                
              })
              inputsOutput.push(txComposer.tx.inputs[i].output)
            }

            // return the payed transactions
            payedTransactions.push(txComposer)
         
          }

          return {
            payedTransactions,
            inputsOutput
          }
    }

    async txBroadcast( txComposer:string, isBroadcast:boolean=false){
        const txComposerObj=TxComposer.deserialize(txComposer)
        const txHex = txComposerObj.getTx().toString()
        let txid,hex
        if(isBroadcast){
            txid=await broadcast(txHex,'mvc',this.network)
        }else{
            txid=txComposerObj.getTxId()
            hex=txComposerObj.getRawHex()
        }

        return {
            txid,
            hex
        }


    }

    // async createPinForFress(
    //     metaidData:any
    // ){
    //     const transactions=[]
    //     const pinTxComposer = new TxComposer()
    //     pinTxComposer.appendP2PKHOutput({
    //         address: this.address,
    //         satoshis: 1,
    //       })
    //     const pinScript = createScriptForMvc(metaidData)
   
    //     pinTxComposer.appendOpReturnOutput(pinScript)
   
    //     transactions.push({
    //         txComposer: pinTxComposer,
    //         message: 'Create Pin',
    //       })

          
    //       const { 
    //         currentFee,
    //         payedTransactions,
    //         nextUtxo
    //       }  = await this.pay({
    //         transactions,
    //         utxo
    //       })
         
    //       const txIDs =  await this.txBroadcast(payedTransactions[0],true)
    //       return {
    //         hex:txIDs.hex,
    //         txid:txIDs.txid,
    //         txFee:currentFee,
    //         nextUtxo:nextUtxo
    //       }


    // }

    parseLocalTransaction(transaction){
      
        // loop through all outputs and find the one with OP_RETURN
        const outputs = transaction.outputs
   
        const outputIndex = outputs.findIndex((output) => output.script.toASM().includes('OP_RETURN'))
      
        if (outputIndex === -1)
          return {
            messages: [],
            outputIndex: null,
          }
      
        const outputAsm = outputs[outputIndex].script.toASM()
   

        const asmFractions = outputAsm.split('OP_RETURN')[1].trim().split(' ')
        let messages = asmFractions.map((fraction) => {
           
            return Buffer.from(fraction, 'hex').toString()
            
        })
      
        // // if data type is binary, revert data to buffer
         messages[6] = Buffer.from(asmFractions[6], 'hex')
      
        return {
          messages,
          outputIndex,
        }
      }

     pickUtxos(utxos, amount,selectedUtxo) {
    // amount + 2 outputs + buffer
    let requiredAmount = amount + 34 * 2 * MVC_FEE + 100
  
    if (requiredAmount <= 0) {
      return []
    }
  
    // if the sum of utxos is less than requiredAmount, throw error
    const sum = utxos.reduce((acc, utxo) => acc + utxo.satoshis, 0)
    if (sum < requiredAmount) {
      throw new Error('Not enough balance')
    }
  
    const candidateUtxos = []
    // split utxo to confirmed and unconfirmed and shuffle them
    //Math.random() - 0.5
    let arr=utxos.map((utxo)=>{
      return utxo.satoshis
    })
    const maxValue=Math.max(...arr)
    const confirmedUtxos = utxos
      .filter((utxo) => {
        if(selectedUtxo.length){
          return utxo.height > 0 && utxo.txId == selectedUtxo[0].txId
        }else{
          return utxo.height > 0 && utxo.satoshis == maxValue
        }
        
      })

     
    const unconfirmedUtxos = utxos
      .filter((utxo) => {
        if(selectedUtxo.length){
          return utxo.height <= 0 && utxo.txId == selectedUtxo[0].txId
        }else{
          return utxo.height <= 0  && utxo.satoshis == maxValue
        }
        
      })
     
    let current = 0
    // use confirmed first
    for (let utxo of confirmedUtxos) {
      current += utxo.satoshis
      // add input fee
      requiredAmount += MVC_FEE * P2PKH_UNLOCK_SIZE
      candidateUtxos.push(utxo)
      if (current > requiredAmount) {
        return candidateUtxos
      }
    }
    for (let utxo of unconfirmedUtxos) {
      current += utxo.satoshis
      // add input fee
      requiredAmount += MVC_FEE * P2PKH_UNLOCK_SIZE
      candidateUtxos.push(utxo)
      if (current > requiredAmount) {
        return candidateUtxos
      }
    }
    return candidateUtxos
  }





}

 
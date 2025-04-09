import { Command, Ctx, Hears, Start, Update, Sender,On,Message,Use} from 'nestjs-telegraf'
import { UpdateType as TelegrafUpdateType } from 'telegraf/typings/telegram-types'
import { FullContext } from '../interfaces/context.interface'
import { UpdateType } from '../common/decorators/update-type.decorator'
import { createBuzz,createBuzzForBTC } from 'src/lib/buzz'
import {getPrivateKey, editName,createName, getAddress, getPublicKey, getSigner,getAddressForTaproot,getPublicKeyForTaproot,getSignerForTaproot } from 'src/lib/metaid'
import { UserService } from 'src/user/user.service'
import { TxService } from 'src/transation/tx.service'
import { messages } from 'src/lib/messages'
import { fetchMetaid } from 'src/lib/services/metalet'
import {formatHTML,mediaType, sleep,inputIsAddress,isTestnet} from 'src/lib/util'
import {Forwarded} from 'src/common/decorators/custom.decorator'
import {BtcRegex,MvcRegex,FreeReg,MEDIA_TYPE,FILE_SIZE_LIMIT,DELAY_TIME,SymbolBtcReg,SymbolMvcReg} from 'src/app.constants'
import {editNameForBTC,transfer,transferForBTC} from 'src/lib/metaid'
import { TaskQueue } from 'src/lib/tools/taskQueue'
import { Attachment } from 'src/lib/types'

import { Decimal } from 'decimal.js'
function debounce(func, delay) {
  let timeoutId;
  
  return function(...args) {
    // 清除之前的定时器
    clearTimeout(timeoutId);
    // 设置新的定时器
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

function formatHelp(){
  let message =`🌟 Welcome to MetaID Bot!\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📝 Basic Commands:\n`;
    message += `• /createmetaid - Create wallet account and MetaID\n`;
    message += `• /editname [name] - Modify your MetaID nickname\n`;
    message += `• /buzz [content] - Send content to blockchain\n`;
    message += `• /send [receiver_address || receiver_amount] [receiver_address || receiver_amount] - Transfer to target address (BTC | SPACE) \n\n`;
    
    message += `🔍 Query Commands:\n`;
    message += `• /getname - Get your MetaID name\n`;
    message += `• /getmetaid - Get your MetaID\n`;
    message += `• /getaddress - Get your wallet address\n`;
    message += `• /getbalance - Get wallet balance (Private Chat Only)\n`;
    message += `• /topup - Get your deposit address\n`;
    message += `• /help - Get full command list\n\n`;
    
    message += `⚙️ Network Options:\n`;
    message += `• --btc - Use BTC network for transaction\n`;
    message += `• --mvc - Use MVC network for transaction (Default)\n\n`;

    message += `⚙️ Common Options:\n`;
    message += `• --free - Each MetaID user can initially receive a subsidy limit of 0.1 SPACE. When adding the --free option, the subsidy limit can be used for transactions, and this operation is limited to the MVC network\n\n`;
    
    message += `💡 Examples:\n`;
    message += `• Create MetaID: /createmetaid\n`;
    message += `• Edit name: /editname YourName\n`;
    message += `• Send to chain: /buzz hello MetaID\n`;
    message += `• Use BTC network: /buzz hello --btc\n`;
    message += `• Get BTC deposit address: /topup --btc\n`;
    message += `• How to use the subsidy limit for transactions:/buzz hello MetaID --free\n`;
    message += `• How to check the remaining subsidy limit:/getbalance (Only available in private chat)\n`;
    message += `• How to Initiate a Transfer to a Wallet Address:/send 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa (Example with Satoshi's address) 1btc Or /send 1space 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa\n\n`
    
    message += `📌 Note:\n`;
    message += `• Some commands like /getbalance are only available in private chat\n`
    message += `• The --free option only works with transaction commands (/buzz, /editname, etc.)\n`
    message += `• The --free option is only effective for transactions sent to the MVC network\n`

    return message
}



type Task={content:string,attachments:Attachment[],timestamp:Date,name?:string}



@Update()
export class MetaidUpdate {
  private mediaGroupCache = new Map<string, any[]>();
  private mediaIdCache=new Map<number,Task>();
  constructor(private readonly userService: UserService,private readonly txService:TxService, private readonly queue:TaskQueue) {
     
  }

  _task(user:Task){
    if(user.attachments.length){
      for(let attachment of user.attachments){

      }
    }else{

    }
  }

   handlerTask(tgid:number){
    const user=this.mediaIdCache.get(tgid)
    
    if(user.attachments.length > 1 ){
      return
    }else{
      this.queue.enqueue(this._task(user))
    }
    
    
  }

  
  @Start()
  async onStart(@Ctx() ctx: FullContext): Promise<void> {
    let message = formatHelp()

    await ctx.reply(message);
  }

  @Hears(['hi', 'hello', 'hey', 'qq'])
  onGreetings(
    @UpdateType() updateType: TelegrafUpdateType,
    @Sender('first_name') firstName: string,
  ): string {
    return `Hey ${firstName}`
  }

  @Command('help')
  async onSysHelo(@Ctx() ctx: FullContext):Promise<void>{
    let message = formatHelp()

    await ctx.reply(message);
   
  }

  @Command('createmetaid')
  async onCreateMetaidCommand(
    @Sender('id') tgid: number,
    @Ctx() ctx: FullContext,
  ): Promise<void> {
    try {
      let user = await this.userService.user({ tgid: String(tgid) })
      if (user) {
        await ctx.reply('You already have a MetaID.')
        return
      }
  
      // 创建用户记录
      const mneid = 1
      // 查询 path 最大的用户记录，新用户的 path = max(path) + 1
  
      const biggestPathUser = (
        await this.userService.users({ order: { path: 'desc' }, take: 1 })
      )[0]
      const path = biggestPathUser ? biggestPathUser.path + 1 : 1
  
      user = await this.userService.createUser({
        tgid: String(tgid),
        mneid,
        path,
      })
      // 导出地址
      const address = getAddress(mneid, path)
  
      // 查询 metaid
      const metaidInfo = await fetchMetaid(address)
  
      const username=ctx.message.from.username
      const txid=await createName(mneid, path,username)
      if(txid){
        await ctx.reply(
          `You have successfully linked your account. Your MetaID is: ${metaidInfo.metaid}`,
        )
        return
      }else{
            await ctx.reply(
          `MetaID Username create failed,Please re-enter /editname [your name] --free to set your MetaID nickname.`,
        )
     
      }
    } catch (error) {
      await ctx.reply(
        `${error.message}`,
      )
    }
    // 如果 metaid 不存在，提示用户充值
    // if (!metaidInfo || !metaidInfo.name) {
    //   await ctx.reply(
    //     `You have successfully linked your account. Your address is: ${address}. Your metaID is: ${metaidInfo.metaid}. Next, please top up your address with some BTC in order to create your MetaID profile.`,
    //   )
    //   return
    // }

    // 如果 metaid 存在，直接返回 metaid
   
  }

  @Command('editname')
  async onEditNameCommand(
    @Sender('id') tgid: number,
    @Ctx() ctx: FullContext,
  ): Promise<void> {
   
    if (!ctx.payload) {
      
       await ctx.reply('Please enter your new name')
       return
    }

    

    const user = await this.userService.user({ tgid: String(tgid) })
    if (!user) {
      await ctx.reply(messages.LINK_FIRST)
      return
    }
    try {
      
    const sendBuzzOnBtc = BtcRegex.test(ctx.text)
    const sendBuzzOnMvc=MvcRegex.test(ctx.text)
    //const freeOnMvc=FreeReg.test(ctx.text)
    const freeOnMvc=FreeReg.test(ctx.text)
    if(sendBuzzOnBtc){
      if(freeOnMvc){
        await ctx.reply(`Proxy payment operations are currently not supported on the BTC network.`)
        return
      }
      const legacyInfo={
        address:getAddress(user.mneid, user.path),
        publicKey:getPublicKey(user.mneid, user.path),
        signer:getSigner(user.mneid, user.path)
      }
      const taprootInfo={
        taprootAddress:getAddressForTaproot(user.mneid, user.path),
        taprootPublicKey:getPublicKeyForTaproot(user.mneid, user.path),
        taprootSigner:getSignerForTaproot(user.mneid, user.path)
      }
    const name=ctx.payload.replaceAll(BtcRegex,'').trim()
    const res = await editNameForBTC(legacyInfo, taprootInfo, name)
    await ctx.reply(res)
    return
    }else if(sendBuzzOnMvc || !sendBuzzOnBtc){
      const name=ctx.payload.replaceAll(MvcRegex,'').replaceAll(FreeReg,'').trim()
      const res = await editName(user.mneid, user.path,name,freeOnMvc)
      console.log("res",res)
      await ctx.reply(res)
      
    }
    } catch (error) {
      await ctx.reply(error.message)
    }
   
  }

 
  @Command(/^buzz$/ig)
  async onBuzzCommand(
    @Sender('id') tgid: number,
    @Ctx() ctx: FullContext,
   
  ): Promise<void> {
    try {
     
      if (!ctx.payload) {
        await ctx.reply('Please enter your buzz content')
        return
      }
  
      const user = await this.userService.user({ tgid: String(tgid) })
      if (!user) {
        await ctx.reply(messages.LINK_FIRST)
        return
      }

     
      const sendBuzzOnBtc = BtcRegex.test(ctx.text)
      const sendBuzzOnMvc=MvcRegex.test(ctx.text)
      const freeOnMvc=FreeReg.test(ctx.text)
      const bitbuzzHost = isTestnet ? 'testnet.bitbuzz.io' : 'bitbuzz.io'
      if(sendBuzzOnBtc){
        if(freeOnMvc){
          await ctx.reply(`Proxy payment operations are currently not supported on the BTC network.`)
          return
        }
        const legacyInfo={
          address:getAddress(user.mneid, user.path),
          publicKey:getPublicKey(user.mneid, user.path),
          signer:getSigner(user.mneid, user.path)
        }
        const taprootInfo={
          taprootAddress:getAddressForTaproot(user.mneid, user.path),
          taprootPublicKey:getPublicKeyForTaproot(user.mneid, user.path),
          taprootSigner:getSignerForTaproot(user.mneid, user.path)
        }
      const content=ctx.payload.replaceAll(BtcRegex,'').trim()
      const res = await createBuzzForBTC(legacyInfo, taprootInfo, content)
      await this.txService.insertTx({...res,tgid:String(tgid)})
      await ctx.reply(`https://${bitbuzzHost}/buzz/${res.txid}i0`)
      return
      }else if(sendBuzzOnMvc || !sendBuzzOnBtc){
        const content=ctx.payload.replaceAll(MvcRegex,'').replaceAll(FreeReg,'').trim()
        const res = await createBuzz(user.mneid,user.path,content,freeOnMvc)
        await this.txService.insertTx({...res,tgid:String(tgid)})
        await ctx.reply(`https://${bitbuzzHost}/buzz/${res.txid}i0`)
        
      }
      
    } catch (error) {
      await ctx.reply(error.message)
    }
   
  }



  @Command(/config/)
  async composer( @Sender('id') tgid: number,
  @Ctx() ctx: any ) : Promise<void>{
    try {
      const content=ctx.payload
      ctx.session.userData={
        host:`${content}`
      }
      console.log("session",ctx.session)
      //ctx.telegram.getFileLink()
      const userConfig=ctx.session.userData || {}

     await ctx.reply(`${userConfig.host}`)
    } catch (error) {
      await ctx.reply("composer")
    }
  }

  @Command(/send/ig)
  async send( @Sender('id') tgid: number,
  @Ctx() ctx: FullContext ) : Promise<void>{
    try {
      if (!ctx.payload) {
        await ctx.reply('Please enter the unit for the transfer operation')
        return
      }
      


      const user = await this.userService.user({ tgid: String(tgid) })
      if (!user) {
        await ctx.reply(messages.LINK_FIRST)
        return
      }
      const isSendBtc=SymbolBtcReg.test(ctx.payload) 
      const isSendMvc=SymbolMvcReg.test(ctx.payload) 
      const group=ctx.payload.split(' ')
      let address
      let amount
      if((inputIsAddress(group[0]))){
        address=group[0]
        const matches=group[1].match(/\d+\.?\d*/g)
        amount=new Decimal(matches[0]).mul(10**8).toNumber()
       
      }else{
        address=group[1]
        const matches=group[0].match(/\d+\.?\d*/g)
        amount=new Decimal(matches[0]).mul(10**8).toNumber()
      }

      if(amount <= 0){
        await ctx.reply('Please enter transfer amount')
        return
      }



      if(isSendMvc){
      
       
        const res= await transfer(user.mneid,user.path,{address,amount})
        await ctx.reply(res)
        return
      }else if(isSendBtc){
        const legacyInfo={
          address:getAddress(user.mneid, user.path),
          publicKey:getPublicKey(user.mneid, user.path),
          signer:getSigner(user.mneid, user.path)
        }

        const res=  await transferForBTC(legacyInfo,{address,amount})
        await ctx.reply(res)
      }
      
    } catch (error) {
      await ctx.reply(error.message)
    }
  }

  




 @On(['photo','video','audio'])
async onMedia( 
  @Sender('id') tgid: number,
  @Ctx() ctx: any,
) : Promise<void>{
  try {
    console.log("photo1",ctx.message)
    // console.log(" ctx.update", ctx.update)
   
    const mediaGroupId = ctx.update.message.media_group_id;
    const currentPhotos = ctx.update.message.photo;
    
    const messageGroup=this.mediaIdCache.get(tgid)

    if(messageGroup?.timestamp !== ctx.message.date){
      this.mediaIdCache.delete(tgid)
    }

    if(!this.mediaIdCache.has(tgid)){
      this.mediaIdCache.set(tgid,{
        content:ctx.message?.caption ?? '',
        attachments:[],
        timestamp:ctx.message.date
      })
    }

    
    
    
    // if(this.mediaIdCache.size > 1){
    //   await ctx.reply(`Sending 2 or more images by users is not supported.`)
    //   this.mediaIdCache.clear()
    //   return
    // }

    // 将当前消息添加到缓存
    if (!this.mediaGroupCache.has(mediaGroupId)) {
      this.mediaGroupCache.set(mediaGroupId,[]);
    }

   
    
     const groupMessages = this.mediaGroupCache.get(mediaGroupId);
     groupMessages.push(ctx.update.message);
    
    // 设置超时，假设500ms内不再收到同一媒体组的新消息

      if (this.mediaGroupCache.has(mediaGroupId)) {
        //const allMessages = this.mediaGroupCache.get(mediaGroupId);
        this.mediaGroupCache.delete(mediaGroupId);
        
        //const allPhotos = allMessages.flatMap(msg => msg.photo);
        //allPhotos
        const sortedPhotos= currentPhotos.filter((item)=>item.file_size <= FILE_SIZE_LIMIT).toSorted((a,b)=>b.file_size - a.file_size)
        console.log("sortedPhotos",sortedPhotos)
        //只拿第一张图片
        if(this.mediaIdCache.has(tgid)){
          const user=this.mediaIdCache.get(tgid)
          if(user.timestamp == ctx.message.date){
            const url=await ctx.telegram.getFileLink(sortedPhotos[0].file_id)
            user.attachments.push({...sortedPhotos[0],url})
          }

     
          console.log("user",user)
          // this.mediaIdCache[tgid].attachments.push(sortedPhotos[0])
          // console.log('photo',this.mediaIdCache[tgid].attachments)
        }

        // 
        // for (const photo of sortedPhotos) {
        //   const fileId = photo.file_id;
        //   // 这里可以下载或处理图片
        // }
        
        //await ctx.reply(`成功接收 ${sortedPhotos.length} 张图片的媒体组`);
      }

      //return this.handlerTask(tgid)

      
     



    // setTimeout(() => {
    //   const user=this.mediaIdCache.get(tgid)
    //   console.log("this.mediaIdCache[tgid].attachments",user)
    //   this.mediaIdCache.delete(tgid)
    // }, 3000);

   

    


    

    // console.log("temp",temp)

    // for(let item of temp){
    //   const fileUrl= await ctx.telegram.getFileLink(item.file_id)
    //   item.url=fileUrl
     
    // }

   
    // if (this.mediaGroupCache.has(mediaGroupId)) {
    //   const allMessages = this.mediaGroupCache.get(mediaGroupId);
    //   this.mediaGroupCache.delete(mediaGroupId);
      
    //   const allPhotos = allMessages.flatMap(msg => msg.photo);
      
    //   const sortPhotoList=allPhotos.filter((item)=>item.file_size <  FILE_SIZE_LIMIT).toSorted((a,b)=>{
    //     return a.file_size - b.file_size 
    //   })
      
    //   console.log("sortPhotoList",sortPhotoList)
    //   // 处理所有图片
    //   const fileIdList=new Set()
    //   const fileIdArr=[]
    //   for (const photo of sortPhotoList) {
    //     fileIdList.add(photo.file_id)
    //   }

    //   for (const photo of sortPhotoList) {
    //       if(!fileIdList.has(photo.file_id)){
    //         fileIdArr.push(photo)
    //       }
        
    //   }

      
    // }


 



   
    return


    
    
   
    const user = await this.userService.user({ tgid: String(tgid) })
    if (!user) {
      await ctx.reply(messages.LINK_FIRST)
      return
    }
    const content=ctx.message.caption ?? ''
    const sourceType=mediaType(ctx.message)

    switch (sourceType) {
      case MEDIA_TYPE.PHOTO:



     
      break
      case MEDIA_TYPE.VIDEO:
        
   
      break
      case MEDIA_TYPE.AUDIO:
     
      break
      default:
        
      break;
    
  }
return
    const sendBuzzOnBtc = BtcRegex.test(content)
    const sendBuzzOnMvc=MvcRegex.test(content)
    const freeOnMvc=FreeReg.test(content)
      if(sendBuzzOnBtc){
        if(freeOnMvc){
          await ctx.reply(`Proxy payment operations are currently not supported on the BTC network.`)
          return
        }
        const legacyInfo={
          address:getAddress(user.mneid, user.path),
          publicKey:getPublicKey(user.mneid, user.path),
          signer:getSigner(user.mneid, user.path)
        }
        const taprootInfo={
          taprootAddress:getAddressForTaproot(user.mneid, user.path),
          taprootPublicKey:getPublicKeyForTaproot(user.mneid, user.path),
          taprootSigner:getSignerForTaproot(user.mneid, user.path)
        }
      const content=ctx.payload.replaceAll(BtcRegex,'').trim()
      const res = await createBuzzForBTC(legacyInfo, taprootInfo, content)
      await ctx.reply(res)
      return
      }else if(sendBuzzOnMvc){
        const content=ctx.payload.replaceAll(MvcRegex,'').replaceAll(FreeReg,'').trim()
        const res = await createBuzz(user.mneid,user.path,content,freeOnMvc)
        await ctx.reply(res)
        return
      }else{
        const content=ctx.payload.replaceAll(FreeReg,'').trim()
        const res = await createBuzz(user.mneid,user.path,content,freeOnMvc)
        await ctx.reply(res)

      }


    
     
  
  
    // const fileLink =await ctx.telegram.getFileLink(ctx.message.photo[3].file_id)
    // console.log("photo4",fileLink)
  

  
  } catch (error) {
    console.log('error',error)
    await ctx.reply(error)
  }
}
}



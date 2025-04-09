
import { createParamDecorator } from '@nestjs/common'
import { Context } from 'telegraf';
import {HOST} from 'src/app.constants'
export const Forwarded = createParamDecorator((data, ctx: Context) => {
    const message = ctx.message as any;
    return {
      isForwarded: !!(message.forward_from || message.forward_from_chat),
      originalSender: message.forward_from || message.forward_from_chat,
      forwardDate: message.forward_date,
      content: message.text || message.caption || 'null'
    };
  });


 


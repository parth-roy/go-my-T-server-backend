import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@shared/utils/response';
import * as chatService from './workforce.chat.service';

export async function getHirerConversations(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.id;
    const conversations = await chatService.getHirerConversations(userId);
    sendSuccess(res, conversations);
  } catch (err) {
    next(err);
  }
}

export async function getConversationMessages(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.id;
    const gigId = Array.isArray(req.params.gigId) ? req.params.gigId[0] : req.params.gigId;
    const result = await chatService.getConversationMessages(userId, gigId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function sendGigMessage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user!.id;
    const gigId = Array.isArray(req.params.gigId) ? req.params.gigId[0] : req.params.gigId;
    const { content, clientMessageId, attachmentUrl } = req.body;
    const message = await chatService.sendGigMessage(userId, gigId, {
      content,
      clientMessageId,
      attachmentUrl,
    });
    sendSuccess(res, message, 'Message sent successfully');
  } catch (err) {
    next(err);
  }
}

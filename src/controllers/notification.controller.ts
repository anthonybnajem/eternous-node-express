import type { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import * as fcmService from '../services/notifications/fcm.service.js';
import { addEmailJob } from '../queues/index.js';

type EmailBody = { to: string; subject: string; text?: string; html?: string };
type PushBody = { token: string; title: string; body: string; data?: Record<string, string> };
type MulticastBody = { tokens: string[]; title: string; body: string; data?: Record<string, string> };
type TopicBody = { topic: string; title: string; body: string; data?: Record<string, string> };
type TopicSubscriptionBody = { tokens: string[]; topic: string };

const sendEmail = catchAsync<Record<string, never>, unknown, EmailBody>(async (req, res: Response): Promise<void> => {
  const { to, subject, text, html } = req.body;
  await addEmailJob({ to, subject, text, html, priority: 10 });
  res.status(httpStatus.OK).send({ message: 'Email queued successfully' });
});

const sendPushNotification = catchAsync<Record<string, never>, unknown, PushBody>(
  async (req, res: Response): Promise<void> => {
    const { token, title, body, data } = req.body;
    const result = await fcmService.sendPushNotification(token, { title, body, data });
    res.status(httpStatus.OK).send(result);
  }
);

const sendMulticastNotification = catchAsync<Record<string, never>, unknown, MulticastBody>(
  async (req, res: Response): Promise<void> => {
    const { tokens, title, body, data } = req.body;
    const result = await fcmService.sendMulticastNotification(tokens, { title, body, data });
    res.status(httpStatus.OK).send(result);
  }
);

const sendTopicNotification = catchAsync<Record<string, never>, unknown, TopicBody>(
  async (req, res: Response): Promise<void> => {
    const { topic, title, body, data } = req.body;
    const result = await fcmService.sendTopicNotification(topic, { title, body, data });
    res.status(httpStatus.OK).send(result);
  }
);

const subscribeToTopic = catchAsync<Record<string, never>, unknown, TopicSubscriptionBody>(
  async (req, res: Response): Promise<void> => {
    const { tokens, topic } = req.body;
    const result = await fcmService.subscribeToTopic(tokens, topic);
    res.status(httpStatus.OK).send(result);
  }
);

const unsubscribeFromTopic = catchAsync<Record<string, never>, unknown, TopicSubscriptionBody>(
  async (req, res: Response): Promise<void> => {
    const { tokens, topic } = req.body;
    const result = await fcmService.unsubscribeFromTopic(tokens, topic);
    res.status(httpStatus.OK).send(result);
  }
);

export default {
  sendEmail,
  sendPushNotification,
  sendMulticastNotification,
  sendTopicNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
};

export {
  sendEmail,
  sendPushNotification,
  sendMulticastNotification,
  sendTopicNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
};

import type { Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.ts';
import * as fcmService from '../services/notifications/fcm.service.ts';
import { activityService } from '../services/index.ts';
import { addEmailJob } from '../queues/index.ts';

type EmailBody = { to: string; subject: string; text?: string; html?: string };
type PushBody = { token: string; title: string; body: string; data?: Record<string, string> };
type MulticastBody = { tokens: string[]; title: string; body: string; data?: Record<string, string> };
type TopicBody = { topic: string; title: string; body: string; data?: Record<string, string> };
type TopicSubscriptionBody = { tokens: string[]; topic: string };

const sendEmail = catchAsync<Record<string, never>, unknown, EmailBody>(async (req, res: Response): Promise<void> => {
  const { to, subject, text, html } = req.body;
  await addEmailJob({ to, subject, text, html, priority: 10 });
  await activityService.recordAdminAction(req, 'notification_email', `Queued email to ${to}`, { to, subject });
  res.status(httpStatus.OK).send({ message: 'Email queued successfully' });
});

const sendPushNotification = catchAsync<Record<string, never>, unknown, PushBody>(
  async (req, res: Response): Promise<void> => {
    const { token, title, body, data } = req.body;
    const result = await fcmService.sendPushNotification(token, { title, body, data });
    await activityService.recordAdminAction(req, 'notification_push', `Sent push notification "${title}"`, { title, token });
    res.status(httpStatus.OK).send(result);
  }
);

const sendMulticastNotification = catchAsync<Record<string, never>, unknown, MulticastBody>(
  async (req, res: Response): Promise<void> => {
    const { tokens, title, body, data } = req.body;
    const result = await fcmService.sendMulticastNotification(tokens, { title, body, data });
    await activityService.recordAdminAction(req, 'notification_push_multicast', `Sent multicast push "${title}"`, {
      title,
      recipientCount: tokens.length,
    });
    res.status(httpStatus.OK).send(result);
  }
);

const sendTopicNotification = catchAsync<Record<string, never>, unknown, TopicBody>(
  async (req, res: Response): Promise<void> => {
    const { topic, title, body, data } = req.body;
    const result = await fcmService.sendTopicNotification(topic, { title, body, data });
    await activityService.recordAdminAction(req, 'notification_push_topic', `Sent topic push "${title}" to ${topic}`, {
      title,
      topic,
    });
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

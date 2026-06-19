import type { Request, Response } from 'express';
import { Webhook } from 'svix';
import { getConfig } from '../config';
import { UnauthorizedError } from '../errors';
import { getLogger } from '../utils/logger';
import * as userService from '../services/userService';

interface ClerkWebhookEvent {
  type: string;
  data: {
    id?: string;
  };
}

export async function handleClerkWebhook(req: Request, res: Response): Promise<void> {
  const { clerk } = getConfig();
  const signingSecret = clerk.webhookSigningSecret;

  if (!signingSecret) {
    res.status(503).json({
      error: {
        code: 'WEBHOOK_NOT_CONFIGURED',
        message: 'CLERK_WEBHOOK_SIGNING_SECRET is not configured',
      },
    });
    return;
  }

  const svixId = req.headers['svix-id'];
  const svixTimestamp = req.headers['svix-timestamp'];
  const svixSignature = req.headers['svix-signature'];

  if (
    typeof svixId !== 'string' ||
    typeof svixTimestamp !== 'string' ||
    typeof svixSignature !== 'string'
  ) {
    throw new UnauthorizedError('Missing webhook signature headers');
  }

  const payload = req.body;
  if (!Buffer.isBuffer(payload)) {
    throw new UnauthorizedError('Invalid webhook payload');
  }

  let event: ClerkWebhookEvent;
  try {
    const wh = new Webhook(signingSecret);
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    throw new UnauthorizedError('Invalid webhook signature');
  }

  if (event.type === 'user.deleted') {
    const clerkUserId = event.data.id;
    if (clerkUserId) {
      await userService.deleteUserByClerkId(clerkUserId);
      getLogger().info(
        { clerkUserId, requestId: req.requestId, eventType: 'user.deleted' },
        'Clerk webhook: user.deleted (cleanup for deleted Clerk account)',
      );
    }
  }

  res.status(200).json({ received: true });
}

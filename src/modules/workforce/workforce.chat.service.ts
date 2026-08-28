import { prisma } from '@shared/db/prisma';
import { AppError } from '@shared/errors/AppError';
import { getSocketInstance } from '@shared/socket/socket.instance';
import { logger } from '@shared/logger';
import { notificationService } from '@modules/notifications/notification.service';

export interface SendGigMessageInput {
  content: string;
  clientMessageId?: string;
  attachmentUrl?: string;
}

export async function getUserConversations(userId: string) {
  try {
    const gigs = await prisma.gigJob.findMany({
      where: {
        OR: [
          { customerId: userId },
          { assignments: { some: { worker: { userId: userId } } } },
        ],
        assignments: {
          some: {}, // Has at least one assignment
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            profileImageUrl: true,
          },
        },
        assignments: {
          include: {
            worker: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    profileImageUrl: true,
                  },
                },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const conversations = await Promise.all(
      gigs.map(async (gig) => {
        const isHirer = gig.customerId === userId;

        const activeAssignment =
          gig.assignments.find((a) =>
            ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(a.status),
          ) ||
          gig.assignments.find((a) => a.status === 'COMPLETED') ||
          gig.assignments[0];

        const workerUser = activeAssignment?.worker?.user;
        const customerUser = gig.customer;

        const unreadCount = await prisma.gigMessage.count({
          where: {
            gigId: gig.id,
            senderUserId: { not: userId },
            isRead: false,
          },
        });

        const lastMsg = gig.messages[0] || null;

        const workerData = workerUser
          ? {
              id: activeAssignment.workerId,
              userId: workerUser.id,
              name: workerUser.name || 'Worker Partner',
              phone: workerUser.phone || '',
              avatarUrl: workerUser.profileImageUrl || '',
              assignmentStatus: activeAssignment.status,
              rating: 4.9,
            }
          : null;

        const hirerData = customerUser
          ? {
              id: customerUser.id,
              userId: customerUser.id,
              name: customerUser.name || 'Hirer Partner',
              phone: customerUser.phone || '',
              avatarUrl: customerUser.profileImageUrl || '',
              rating: 5.0,
            }
          : null;

        const counterparty = isHirer ? workerData : hirerData;

        return {
          gigId: gig.id,
          jobNumber: gig.jobNumber,
          gigCategory: gig.gigCategory || gig.gigType,
          status: gig.status,
          completionOtp: gig.completionOtp,
          locationAddress: gig.locationAddress,
          scheduledSlot: gig.scheduledSlot,
          createdAt: gig.createdAt,
          updatedAt: gig.updatedAt,
          isHirer,
          worker: workerData,
          hirer: hirerData,
          counterparty,
          lastMessage: lastMsg
            ? {
                id: lastMsg.id,
                content: lastMsg.content,
                attachmentUrl: lastMsg.attachmentUrl,
                isRead: lastMsg.isRead,
                isMe: lastMsg.senderUserId === userId,
                createdAt: lastMsg.createdAt,
              }
            : null,
          unreadCount,
        };
      }),
    );

    return conversations;
  } catch (error: any) {
    logger.error(`[getUserConversations] Error: ${error.message}`, { error });
    throw error;
  }
}

export async function getConversationMessages(userId: string, gigId: string) {
  const gig = await prisma.gigJob.findUnique({
    where: { id: gigId },
    include: {
      customer: {
        select: { id: true, name: true, phone: true, profileImageUrl: true },
      },
      assignments: {
        include: {
          worker: {
            include: {
              user: {
                select: { id: true, name: true, phone: true, profileImageUrl: true },
              },
            },
          },
        },
      },
    },
  });

  if (!gig) {
    throw AppError.notFound('Job booking not found');
  }

  const isCustomer = gig.customerId === userId;
  const isAssignedWorker = gig.assignments.some(
    (a) => a.worker?.userId === userId,
  );

  if (!isCustomer && !isAssignedWorker) {
    throw AppError.forbidden('You can only message counterparties assigned to your bookings');
  }

  // Mark unread messages from counterparty as read
  const updatedCount = await prisma.gigMessage.updateMany({
    where: {
      gigId,
      senderUserId: { not: userId },
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  if (updatedCount.count > 0) {
    const io = getSocketInstance();
    if (io) {
      io.of('/workforce').to(`gig:${gigId}`).emit('gig_messages_read', {
        gigId,
        readByUserId: userId,
      });
      io.of('/tracking').to(`gig:${gigId}`).emit('gig_messages_read', {
        gigId,
        readByUserId: userId,
      });
    }
  }

  const messages = await prisma.gigMessage.findMany({
    where: { gigId },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          profileImageUrl: true,
        },
      },
    },
  });

  const activeAssignment =
    gig.assignments.find((a) =>
      ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(a.status),
    ) ||
    gig.assignments.find((a) => a.status === 'COMPLETED') ||
    gig.assignments[0];

  const workerUser = activeAssignment?.worker?.user;
  const customerUser = gig.customer;

  const workerData = workerUser
    ? {
        id: activeAssignment.workerId,
        userId: workerUser.id,
        name: workerUser.name || 'Worker Partner',
        phone: workerUser.phone || '',
        avatarUrl: workerUser.profileImageUrl || '',
        assignmentStatus: activeAssignment.status,
      }
    : null;

  const hirerData = customerUser
    ? {
        id: customerUser.id,
        userId: customerUser.id,
        name: customerUser.name || 'Hirer Partner',
        phone: customerUser.phone || '',
        avatarUrl: customerUser.profileImageUrl || '',
      }
    : null;

  return {
    currentUserId: userId,
    gig: {
      id: gig.id,
      jobNumber: gig.jobNumber,
      gigCategory: gig.gigCategory || gig.gigType,
      status: gig.status,
      completionOtp: gig.completionOtp,
      locationAddress: gig.locationAddress,
      scheduledSlot: gig.scheduledSlot,
      isHirer: isCustomer,
      worker: workerData,
      hirer: hirerData,
      counterparty: isCustomer ? workerData : hirerData,
    },
    messages: messages.map((m) => ({
      id: m.id,
      gigId: m.gigId,
      senderUserId: m.senderUserId,
      isMe: m.senderUserId === userId,
      senderName: m.sender.name || 'User',
      senderAvatar: m.sender.profileImageUrl || '',
      content: m.content,
      attachmentUrl: m.attachmentUrl,
      isRead: m.isRead,
      createdAt: m.createdAt,
    })),
  };
}

export async function sendGigMessage(
  userId: string,
  gigId: string,
  input: SendGigMessageInput,
) {
  if (!input.content || input.content.trim().length === 0) {
    throw AppError.badRequest('Message content cannot be empty');
  }

  const gig = await prisma.gigJob.findUnique({
    where: { id: gigId },
    include: {
      assignments: {
        include: {
          worker: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  if (!gig) {
    throw AppError.notFound('Job booking not found');
  }

  const isCustomer = gig.customerId === userId;
  const isAssignedWorker = gig.assignments.some(
    (a) => a.worker?.userId === userId,
  );

  if (!isCustomer && !isAssignedWorker) {
    throw AppError.forbidden('You can only message counterparties assigned to your bookings');
  }

  // Save message in PostgreSQL
  const message = await prisma.gigMessage.create({
    data: {
      gigId,
      senderUserId: userId,
      clientMessageId: input.clientMessageId,
      content: input.content.trim(),
      attachmentUrl: input.attachmentUrl,
      isRead: false,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          profileImageUrl: true,
        },
      },
    },
  });

  const payload = {
    id: message.id,
    gigId: message.gigId,
    senderUserId: message.senderUserId,
    senderName: message.sender.name || 'User',
    senderAvatar: message.sender.profileImageUrl || '',
    content: message.content,
    attachmentUrl: message.attachmentUrl,
    isRead: message.isRead,
    createdAt: message.createdAt,
  };

  // Emit real-time message to socket room
  const io = getSocketInstance();
  if (io) {
    io.of('/workforce').to(`gig:${gigId}`).emit('gig_message', payload);
    io.of('/tracking').to(`gig:${gigId}`).emit('gig_message', payload);
  }

  // Send FCM Push Notification to recipient
  const senderName = message.sender.name || (isCustomer ? 'Hirer' : 'Worker');
  const pushBody =
    message.content.length > 90
      ? message.content.substring(0, 87) + '...'
      : message.content;

  if (isCustomer) {
    // Customer sent message -> Notify assigned worker(s)
    const workerTokens = gig.assignments
      .map((a) => a.worker?.user?.fcmToken)
      .filter((token): token is string => Boolean(token));

    for (const token of workerTokens) {
      notificationService
        .sendToDevice(token, {
          title: `💬 ${senderName}`,
          body: pushBody,
          data: {
            type: 'GIG_CHAT_MESSAGE',
            gigId,
            senderUserId: userId,
            senderName,
          },
        })
        .catch((err) =>
          logger.error('[WorkforceChat] FCM push to worker failed:', err),
        );
    }
  } else {
    // Worker sent message -> Notify customer
    const customerUser = await prisma.user.findUnique({
      where: { id: gig.customerId },
      select: { fcmToken: true },
    });

    if (customerUser?.fcmToken) {
      notificationService
        .sendToDevice(customerUser.fcmToken, {
          title: `💬 ${senderName}`,
          body: pushBody,
          data: {
            type: 'GIG_CHAT_MESSAGE',
            gigId,
            senderUserId: userId,
            senderName,
          },
        })
        .catch((err) =>
          logger.error('[WorkforceChat] FCM push to customer failed:', err),
        );
    }
  }

  return {
    id: message.id,
    gigId: message.gigId,
    senderUserId: message.senderUserId,
    isMe: true,
    senderName: message.sender.name || 'User',
    senderAvatar: message.sender.profileImageUrl || '',
    content: message.content,
    attachmentUrl: message.attachmentUrl,
    isRead: message.isRead,
    createdAt: message.createdAt,
  };
}

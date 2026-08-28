import { prisma } from '@shared/db/prisma';
import { AppError } from '@shared/errors/AppError';
import { getSocketInstance } from '@shared/socket/socket.instance';
import { logger } from '@shared/logger';

export interface SendGigMessageInput {
  content: string;
  clientMessageId?: string;
  attachmentUrl?: string;
}

export async function getHirerConversations(userId: string) {
  try {
    const gigs = await prisma.gigJob.findMany({
      where: {
        customerId: userId,
        assignments: {
          some: {}, // Has at least one assignment (past or present)
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
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
        const activeAssignment =
          gig.assignments.find((a) =>
            ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(a.status),
          ) ||
          gig.assignments.find((a) => a.status === 'COMPLETED') ||
          gig.assignments[0];

        const workerUser = activeAssignment?.worker?.user;

        const unreadCount = await prisma.gigMessage.count({
          where: {
            gigId: gig.id,
            senderUserId: { not: userId },
            isRead: false,
          },
        });

        const lastMsg = gig.messages[0] || null;

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
          worker: workerUser
            ? {
                id: activeAssignment.workerId,
                userId: workerUser.id,
                name: workerUser.name || 'Worker Partner',
                phone: workerUser.phone || '',
                avatarUrl: workerUser.profileImageUrl || '',
                assignmentStatus: activeAssignment.status,
                rating: 4.9, // Default aggregate rating for worker display
              }
            : null,
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
    logger.error(`[getHirerConversations] Error: ${error.message}`, { error });
    throw error;
  }
}

export async function getConversationMessages(userId: string, gigId: string) {
  const gig = await prisma.gigJob.findUnique({
    where: { id: gigId },
    include: {
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
    throw AppError.forbidden('You can only message workers assigned to your bookings');
  }

  // Mark unread messages from counterparty as read
  await prisma.gigMessage.updateMany({
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

  return {
    gig: {
      id: gig.id,
      jobNumber: gig.jobNumber,
      gigCategory: gig.gigCategory || gig.gigType,
      status: gig.status,
      completionOtp: gig.completionOtp,
      locationAddress: gig.locationAddress,
      scheduledSlot: gig.scheduledSlot,
      worker: workerUser
        ? {
            id: activeAssignment.workerId,
            userId: workerUser.id,
            name: workerUser.name || 'Worker Partner',
            phone: workerUser.phone || '',
            avatarUrl: workerUser.profileImageUrl || '',
            assignmentStatus: activeAssignment.status,
          }
        : null,
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
    throw AppError.forbidden('You can only message workers assigned to your bookings');
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

  // Emit real-time message to socket room
  const io = getSocketInstance();
  if (io) {
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

    io.of('/workforce').to(`gig:${gigId}`).emit('gig_message', payload);
    io.of('/tracking').to(`gig:${gigId}`).emit('gig_message', payload);
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

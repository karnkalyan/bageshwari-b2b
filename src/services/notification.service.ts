import "server-only";

import { prisma } from "@/lib/db";
import { NotificationChannel, NotificationStatus } from "@prisma/client";

export interface SendNotificationInput {
  sellerId?: string | null;
  targetUserIds?: string[];
  targetRoles?: string[];
  targetDealerId?: string | null;
  title: string;
  message: string;
  linkUrl?: string | null;
  excludeUserId?: string | null;
}

/**
 * Dispatches targeted in-app notifications to staff roles, specific users, or dealer members.
 */
export async function sendWorkflowNotification(input: SendNotificationInput) {
  try {
    const userIds = new Set<string>(input.targetUserIds || []);

    // 1. If target roles specified, fetch users with those roles
    if (input.targetRoles && input.targetRoles.length > 0) {
      const userRoles = await prisma.userRole.findMany({
        where: {
          role: { code: { in: input.targetRoles } },
          ...(input.sellerId ? { OR: [{ sellerId: input.sellerId }, { sellerId: null }] } : {}),
        },
        select: { userId: true },
      });
      userRoles.forEach((ur) => userIds.add(ur.userId));
    }

    // 2. If target dealer specified, fetch active dealer employees / memberships
    if (input.targetDealerId) {
      const memberships = await prisma.userSellerMembership.findMany({
        where: {
          dealerId: input.targetDealerId,
          status: "active",
          ...(input.sellerId ? { sellerId: input.sellerId } : {}),
        },
        select: { userId: true },
      });
      memberships.forEach((m) => userIds.add(m.userId));
    }

    // 3. Exclude the user who triggered the event
    if (input.excludeUserId) {
      userIds.delete(input.excludeUserId);
    }

    const recipientList = Array.from(userIds);
    if (recipientList.length === 0) return { count: 0 };

    const records = recipientList.map((userId) => ({
      sellerId: input.sellerId || null,
      userId,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.PENDING,
      title: input.title,
      message: input.message,
      linkUrl: input.linkUrl || null,
    }));

    const result = await prisma.notification.createMany({
      data: records,
    });

    return { count: result.count };
  } catch (error) {
    console.error("Failed to send workflow notifications:", error);
    return { count: 0 };
  }
}

/**
 * Fetches notifications for a given user with unread count.
 */
export async function getUserNotifications(userId: string, limit = 30) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({
      where: { userId, status: "PENDING" },
    }),
  ]);

  return { items, unreadCount };
}

/**
 * Marks a specific notification as read.
 */
export async function markNotificationAsRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { status: "READ", readAt: new Date() },
  });
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, status: "PENDING" },
    data: { status: "READ", readAt: new Date() },
  });
}

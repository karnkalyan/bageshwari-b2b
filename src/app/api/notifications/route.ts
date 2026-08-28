import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getUserNotifications } from "@/services/notification.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { items, unreadCount } = await getUserNotifications(session.user.id);

  return apiSuccess({
    notifications: items,
    unreadCount,
  });
}

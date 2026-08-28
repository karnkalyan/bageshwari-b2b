import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { markAllNotificationsAsRead } from "@/services/notification.service";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  await markAllNotificationsAsRead(session.user.id);

  return apiSuccess({ success: true });
}

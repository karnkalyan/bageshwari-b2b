import { auth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { markNotificationAsRead } from "@/services/notification.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }

  const { id } = await params;
  await markNotificationAsRead(id, session.user.id);

  return apiSuccess({ success: true });
}

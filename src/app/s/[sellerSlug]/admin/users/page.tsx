import { prisma } from "@/lib/db";
import { getTenantContext, hasRole } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserCog,
  Shield,
  UserPlus,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Lock,
  MoreVertical,
  Search,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface UsersPageProps {
  params: Promise<{ sellerSlug: string }>;
}

export default async function AdminUsersPage({ params }: UsersPageProps) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);

  if (!hasRole(ctx, "SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "ADMIN", "STAFF")) {
    redirect("/admin");
  }

  // Server Action: Create New Staff Member
  async function createStaffUserAction(formData: FormData) {
    "use server";
    const actionCtx = await getTenantContext(sellerSlug);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const phone = String(formData.get("phone") || "").trim();
    const password = String(formData.get("password") || "").trim();
    const roleCode = String(formData.get("roleCode") || "STAFF").trim();

    if (!name || !email || !password) return;

    try {
      const passwordHash = await bcrypt.hash(password, 10);

      await prisma.$transaction(async (tx) => {
        // 1. Create or find user
        let user = await tx.user.findUnique({ where: { email } });
        if (!user) {
          user = await tx.user.create({
            data: {
              name,
              email,
              phone: phone || null,
              passwordHash,
              status: "ACTIVE",
              emailVerified: new Date(),
            },
          });
        }

        // 2. Link Seller Membership
        await tx.userSellerMembership.upsert({
          where: {
            userId_sellerId: {
              userId: user.id,
              sellerId: actionCtx.sellerId,
            },
          },
          update: { status: "ACTIVE" },
          create: {
            userId: user.id,
            sellerId: actionCtx.sellerId,
            status: "ACTIVE",
          },
        });

        // 3. Find or create Role
        let role = await tx.role.findFirst({
          where: { code: roleCode, OR: [{ sellerId: actionCtx.sellerId }, { sellerId: null }] },
        });

        if (!role) {
          role = await tx.role.create({
            data: {
              code: roleCode,
              name: roleCode.replace(/_/g, " "),
              sellerId: actionCtx.sellerId,
              systemRole: false,
            },
          });
        }

        // 4. Assign UserRole
        await tx.userRole.upsert({
          where: {
            userId_roleId_sellerId: {
              userId: user.id,
              roleId: role.id,
              sellerId: actionCtx.sellerId,
            },
          },
          update: {},
          create: {
            userId: user.id,
            roleId: role.id,
            sellerId: actionCtx.sellerId,
          },
        });
      });
    } catch (err) {
      console.error("Create staff user error:", err);
    }

    revalidatePath(`/s/${sellerSlug}/admin/users`);
  }

  // Server Action: Toggle User Status
  async function toggleStatusAction(formData: FormData) {
    "use server";
    const userId = String(formData.get("userId") || "");
    const newStatus = String(formData.get("newStatus") || "ACTIVE") as any;
    if (!userId) return;

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { status: newStatus },
      });
    } catch (err) {
      console.error("Toggle status error:", err);
    }

    revalidatePath(`/s/${sellerSlug}/admin/users`);
  }

  const [users, availableRoles] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { memberships: { some: { sellerId: ctx.sellerId } } },
          { userRoles: { some: { sellerId: ctx.sellerId } } },
        ],
      },
      include: {
        userRoles: {
          where: { OR: [{ sellerId: ctx.sellerId }, { sellerId: null }] },
          include: { role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.role.findMany({
      where: { OR: [{ sellerId: ctx.sellerId }, { sellerId: null }] },
      orderBy: { name: "asc" },
    }),
  ]);

  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const adminCount = users.filter((u) =>
    u.userRoles.some((ur) => ["SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN", "SELLER_OWNER"].includes(ur.role.code))
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="section-kicker">Access Control & Security</div>
          <h1 className="text-2xl font-black text-foreground">Staff & User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage organizational staff members, role assignments, security credentials, and login permissions.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Total Staff & Users</span>
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <UserCog className="h-4 w-4 text-indigo-500" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground mt-2">{users.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Enrolled system accounts</div>
        </div>

        <div className="glass-card p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Active Accounts</span>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground mt-2">{activeCount}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Authorized for portal access</div>
        </div>

        <div className="glass-card p-4 border-l-4 border-l-cyan-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-500 uppercase tracking-wider">Configured Roles</span>
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Shield className="h-4 w-4 text-cyan-500" />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground mt-2">{availableRoles.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">System & seller security profiles</div>
        </div>
      </div>

      {/* Main Grid: Users Table + Add User Form */}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* Users Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border font-bold text-sm bg-muted/40 text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-indigo-500" /> Staff & User Directory ({users.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase border-b border-border text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3">User & Contact</th>
                  <th className="px-4 py-3">Assigned Roles</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      No staff users registered yet.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const rolesList = u.userRoles.map((ur) => ur.role.name || ur.role.code);
                    return (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-foreground text-sm">{u.name || "Unnamed User"}</div>
                          <div className="text-muted-foreground text-[11px] flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" /> {u.email}
                          </div>
                          {u.phone && (
                            <div className="text-muted-foreground text-[10px] flex items-center gap-1">
                              <Phone className="h-2.5 w-2.5" /> {u.phone}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {rolesList.length > 0 ? (
                              rolesList.map((r) => (
                                <Badge
                                  key={r}
                                  className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-[10px]"
                                >
                                  {r}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-[11px]">Staff Member</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge
                            className={`text-[10px] ${
                              u.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                            }`}
                          >
                            {u.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{formatDate(u.createdAt)}</td>
                        <td className="px-4 py-3.5 text-right">
                          <form action={toggleStatusAction} className="inline-block">
                            <input type="hidden" name="userId" value={u.id} />
                            <input
                              type="hidden"
                              name="newStatus"
                              value={u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"}
                            />
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              className={`h-7 text-xs ${
                                u.status === "ACTIVE"
                                  ? "text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/30"
                                  : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30"
                              }`}
                            >
                              {u.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            </Button>
                          </form>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add New Staff Form */}
        <div className="glass-card p-5 h-fit">
          <div className="border-b border-border pb-3 mb-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-indigo-500" /> Create New Staff Account
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Create an internal user account and assign operational role permissions.
            </p>
          </div>

          <form action={createStaffUserAction} className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-foreground">Full Name *</label>
              <Input
                name="name"
                placeholder="e.g. Ramesh Karki"
                required
                className="mt-1 h-9 text-xs bg-background"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Email Address (Login ID) *</label>
              <Input
                name="email"
                type="email"
                placeholder="e.g. ramesh@bageshwari.com.np"
                required
                className="mt-1 h-9 text-xs bg-background"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Phone Number</label>
              <Input
                name="phone"
                placeholder="e.g. 9812345678"
                className="mt-1 h-9 text-xs bg-background"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Password *</label>
              <Input
                name="password"
                type="password"
                placeholder="Set secure password"
                required
                className="mt-1 h-9 text-xs bg-background"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Role Assignment *</label>
              <select
                name="roleCode"
                defaultValue="SALESPERSON"
                className="mt-1 w-full h-9 text-xs border border-border rounded-lg px-2.5 bg-card text-foreground font-medium outline-none"
              >
                <option value="ADMIN">ADMIN (Full Seller Administration)</option>
                <option value="ACCOUNTS_MANAGER">ACCOUNTS_MANAGER (Invoices, Tax & Payments)</option>
                <option value="ACCOUNTANT">ACCOUNTANT (Finance & Bookkeeping)</option>
                <option value="WAREHOUSE_MANAGER">WAREHOUSE_MANAGER (Picking & Packaging)</option>
                <option value="WAREHOUSE_USER">WAREHOUSE_USER (Order Picking)</option>
                <option value="DISPATCH_USER">DISPATCH_USER (Logistics & Delivery Challans)</option>
                <option value="SALES_MANAGER">SALES_MANAGER (Sales Pipeline & Quotas)</option>
                <option value="SALESPERSON">SALESPERSON (Order Placement & Dealers)</option>
                <option value="PRODUCT_MANAGER">PRODUCT_MANAGER (Catalog & Inventory)</option>
                <option value="STAFF">STAFF (General Read-Only Workspace)</option>
              </select>
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 shadow-xs mt-2"
            >
              <UserPlus className="h-4 w-4 mr-1.5" /> Create Staff Member
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

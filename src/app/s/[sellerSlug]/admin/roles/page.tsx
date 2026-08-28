import { prisma } from "@/lib/db";
import { getTenantContext, hasRole } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  KeyRound,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Users,
  Lock,
  Plus,
  Layers,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface RolesPageProps {
  params: Promise<{ sellerSlug: string }>;
}

export default async function AdminRolesPage({ params }: RolesPageProps) {
  const { sellerSlug } = await params;
  const ctx = await getTenantContext(sellerSlug);

  if (!hasRole(ctx, "SUPER_ADMIN", "PLATFORM_ADMIN", "SELLER_OWNER", "ADMIN", "STAFF")) {
    redirect("/admin");
  }

  // Server Action: Create Custom Role
  async function createRoleAction(formData: FormData) {
    "use server";
    const actionCtx = await getTenantContext(sellerSlug);
    const code = String(formData.get("code") || "").trim().toUpperCase().replace(/\s+/g, "_");
    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();

    if (!code || !name) return;

    try {
      await prisma.role.create({
        data: {
          code,
          name,
          description: description || null,
          sellerId: actionCtx.sellerId,
          scope: "SELLER",
          systemRole: false,
        },
      });
    } catch (err) {
      console.error("Create role error:", err);
    }

    revalidatePath(`/s/${sellerSlug}/admin/roles`);
  }

  const [roles, permissions, usersWithRoles] = await Promise.all([
    prisma.role.findMany({
      where: { OR: [{ sellerId: ctx.sellerId }, { sellerId: null }] },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: [{ systemRole: "desc" }, { name: "asc" }],
    }),
    prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { code: "asc" }],
    }),
    prisma.userRole.groupBy({
      by: ["roleId"],
      where: { OR: [{ sellerId: ctx.sellerId }, { sellerId: null }] },
      _count: { userId: true },
    }),
  ]);

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, typeof permissions>);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-7">
      {/* Header */}
      <div>
        <div className="section-kicker">Access Control & Permissions</div>
        <h1 className="text-2xl font-black text-foreground">Roles & Security Matrix</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage system security roles, permission matrices, module authorizations, and user access levels.
        </p>
      </div>

      {/* Roles Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((r) => {
          const userCount = r._count.userRoles;
          const permCount = r.permissions.length;

          return (
            <div key={r.id} className="glass-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <Badge className="bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 text-[10px] font-mono font-bold">
                    {r.code}
                  </Badge>
                  {r.systemRole ? (
                    <Badge variant="outline" className="text-[9px] text-muted-foreground border-border">
                      System Role
                    </Badge>
                  ) : (
                    <Badge className="bg-purple-500/10 text-purple-500 border border-purple-500/20 text-[9px]">
                      Custom Role
                    </Badge>
                  )}
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-foreground text-base">{r.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {r.description || `Security profile governing ${r.name.toLowerCase()} operational activities.`}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Users className="h-3.5 w-3.5 text-indigo-500" />
                  <span>{userCount} Active Users</span>
                </div>
                <div className="text-muted-foreground text-[11px]">
                  {permCount > 0 ? `${permCount} Permissions` : "Full Scope Access"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Permissions Directory by Module */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border font-bold text-sm bg-muted/40 text-foreground flex items-center justify-between">
          <span className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-cyan-500" /> Module Permission Map ({permissions.length} total keys)
          </span>
          <span className="text-xs text-muted-foreground font-normal">RBAC Enforcement Active</span>
        </div>

        <div className="p-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(permissionsByModule).map(([moduleName, perms]) => (
            <div key={moduleName} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  {moduleName} Module
                </span>
                <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                  {perms.length} actions
                </Badge>
              </div>

              <div className="space-y-2">
                {perms.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-2 text-xs">
                    <div>
                      <div className="font-semibold text-foreground">{p.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{p.code}</div>
                    </div>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

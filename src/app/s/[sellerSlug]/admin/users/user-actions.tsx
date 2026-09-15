"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Shield, X, Pencil, UserCog, AlertCircle } from "lucide-react";
import { updatePasswordAction, updateRolesAction, updateUserAction } from "./actions";

interface Role {
  id: string;
  code: string;
  name: string;
}

interface UserActionsProps {
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  userStatus?: string;
  sellerId: string;
  sellerSlug: string;
  currentRoles: string[];
  availableRoles: Role[];
  canEditUser?: boolean;
}

export function UserActions({
  userId,
  userName,
  userEmail = "",
  userPhone = "",
  userStatus = "ACTIVE",
  sellerId,
  sellerSlug,
  currentRoles,
  availableRoles,
  canEditUser = true,
}: UserActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isRolesOpen, setIsRolesOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center justify-end gap-1.5">
      {/* Edit User Button & Modal */}
      {canEditUser && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs text-sky-600 border-sky-500/30 hover:bg-sky-500/10"
          onClick={() => {
            setErrorMessage(null);
            setIsEditOpen(true);
          }}
        >
          <Pencil className="h-3 w-3 mr-1" /> Edit
        </Button>
      )}

      {/* Change Password Button & Modal */}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
        onClick={() => setIsPasswordOpen(true)}
      >
        <KeyRound className="h-3 w-3 mr-1" /> Password
      </Button>

      {/* Edit Roles Button & Modal */}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/10"
        onClick={() => setIsRolesOpen(true)}
      >
        <Shield className="h-3 w-3 mr-1" /> Roles
      </Button>

      {/* Edit User Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card text-foreground rounded-xl w-full max-w-md shadow-xl overflow-hidden border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-sky-500" />
                <h3 className="font-bold text-sm">Edit User Details</h3>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              action={async (formData) => {
                setIsSubmitting(true);
                setErrorMessage(null);
                formData.append("userId", userId);
                const res = await updateUserAction(formData, sellerSlug);
                setIsSubmitting(false);
                if (res?.success) {
                  setIsEditOpen(false);
                } else if (res?.error) {
                  setErrorMessage(res.error);
                }
              }}
              className="p-4 space-y-3.5"
            >
              {errorMessage && (
                <div className="p-2.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-foreground">Full Name *</label>
                <Input
                  name="name"
                  defaultValue={userName}
                  required
                  className="mt-1 h-9 text-xs bg-background"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Email Address (Login ID) *</label>
                <Input
                  name="email"
                  type="email"
                  defaultValue={userEmail}
                  required
                  className="mt-1 h-9 text-xs bg-background"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Phone Number</label>
                <Input
                  name="phone"
                  defaultValue={userPhone}
                  placeholder="e.g. 9812345678"
                  className="mt-1 h-9 text-xs bg-background"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Account Status *</label>
                <select
                  name="status"
                  defaultValue={userStatus}
                  className="mt-1 w-full h-9 text-xs border border-border rounded-lg px-2.5 bg-card text-foreground font-medium outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Can log in & perform operations)</option>
                  <option value="SUSPENDED">SUSPENDED (Access locked)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card text-foreground rounded-xl w-full max-w-sm shadow-xl overflow-hidden border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm">Change Password</h3>
              <button onClick={() => setIsPasswordOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              action={async (formData) => {
                setIsSubmitting(true);
                formData.append("userId", userId);
                await updatePasswordAction(formData, sellerSlug);
                setIsSubmitting(false);
                setIsPasswordOpen(false);
              }}
              className="p-4 space-y-4"
            >
              <div className="text-xs text-muted-foreground mb-2">Updating password for {userName}</div>
              <div>
                <label className="text-xs font-semibold">New Password</label>
                <Input name="password" type="password" required className="mt-1 h-9 text-xs" placeholder="Enter new password" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsPasswordOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>Update</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Roles Modal */}
      {isRolesOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card text-foreground rounded-xl w-full max-w-sm shadow-xl overflow-hidden border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-sm">Assign Roles</h3>
              <button onClick={() => setIsRolesOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              action={async (formData) => {
                setIsSubmitting(true);
                formData.append("userId", userId);
                formData.append("sellerId", sellerId);
                await updateRolesAction(formData, sellerSlug);
                setIsSubmitting(false);
                setIsRolesOpen(false);
              }}
              className="p-4 space-y-3 max-h-[60vh] overflow-y-auto"
            >
              <div className="text-xs text-muted-foreground mb-2">Assigning roles to {userName}</div>
              {availableRoles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-xs border p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                  <input
                    type="checkbox"
                    name="roles"
                    value={role.id}
                    defaultChecked={currentRoles.includes(role.id)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <div>
                    <div className="font-bold">{role.code}</div>
                    <div className="text-[10px] text-muted-foreground">{role.name}</div>
                  </div>
                </label>
              ))}
              <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-card py-2 border-t mt-4">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsRolesOpen(false)}>Cancel</Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>Save Roles</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Shield, X } from "lucide-react";
import { updatePasswordAction, updateRolesAction } from "./actions";

interface Role {
  id: string;
  code: string;
  name: string;
}

interface UserActionsProps {
  userId: string;
  userName: string;
  sellerId: string;
  sellerSlug: string;
  currentRoles: string[];
  availableRoles: Role[];
}

export function UserActions({ userId, userName, sellerId, sellerSlug, currentRoles, availableRoles }: UserActionsProps) {
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isRolesOpen, setIsRolesOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="flex items-center justify-end gap-2">
      {/* Change Password Button & Modal */}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
        onClick={() => setIsPasswordOpen(true)}
      >
        <KeyRound className="h-3 w-3 mr-1" /> Password
      </Button>

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

      {/* Edit Roles Button & Modal */}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/10"
        onClick={() => setIsRolesOpen(true)}
      >
        <Shield className="h-3 w-3 mr-1" /> Roles
      </Button>

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

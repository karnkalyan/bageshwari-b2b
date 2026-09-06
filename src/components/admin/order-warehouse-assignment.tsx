"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Warehouse,
  UserCheck,
  UserX,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  ChevronDown,
} from "lucide-react";

export interface WarehouseStaffOption {
  id: string;
  name?: string | null;
  email: string;
}

export interface OrderWarehouseAssignmentProps {
  orderId: string;
  orderNumber: string;
  sellerSlug: string;
  assignedUser?: {
    id: string;
    name?: string | null;
    email: string;
  } | null;
  pickListNumber?: string | null;
  pickListStatus?: string | null;
  orderStatus: string;
  isLocked?: boolean;
  canAssign?: boolean;
  warehouseStaff: WarehouseStaffOption[];
  variant?: "card" | "header-compact";
  action: (formData: FormData) => Promise<void>;
}

export function OrderWarehouseAssignment({
  orderId,
  orderNumber,
  sellerSlug,
  assignedUser,
  pickListNumber,
  pickListStatus,
  orderStatus,
  isLocked = false,
  canAssign = true,
  warehouseStaff,
  variant = "card",
  action,
}: OrderWarehouseAssignmentProps) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(assignedUser?.id || "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (assignedUser?.id) {
      setSelectedUserId(assignedUser.id);
    }
  }, [assignedUser?.id]);

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setErrorMessage("Please choose a warehouse staff member.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("orderId", orderId);
        formData.append("sellerSlug", sellerSlug);
        formData.append("assignedWarehouseUserId", selectedUserId);
        formData.append(
          "notes",
          assignedUser
            ? `Re-assigned from ${assignedUser.name || assignedUser.email} by Accounts`
            : "Assigned by Accounts"
        );
        await action(formData);
        setSuccessMessage("Warehouse user assigned successfully.");
        setIsEditing(false);
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to assign warehouse user.");
      }
    });
  };

  // 1. Compact Header Variant (renders in the top header action bar)
  if (variant === "header-compact") {
    if (isLocked) {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
          <Lock className="h-3.5 w-3.5 text-slate-500" />
          <span>Warehouse: {assignedUser ? (assignedUser.name || assignedUser.email) : "Unassigned"}</span>
          <Badge variant="outline" className="text-[10px] bg-white text-slate-600">Locked</Badge>
        </div>
      );
    }

    if (!isEditing) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-xs">
          <UserCheck className="h-3.5 w-3.5 text-purple-600 shrink-0" />
          <span className="font-semibold">
            Picker: {assignedUser ? (assignedUser.name || assignedUser.email) : "Unassigned"}
          </span>
          {canAssign && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-6 px-1.5 text-[11px] text-purple-700 hover:text-purple-900 hover:bg-purple-100 font-bold ml-1"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              {assignedUser ? "Change" : "Assign"}
            </Button>
          )}
        </div>
      );
    }

    return (
      <form onSubmit={handleAssign} className="inline-flex items-center gap-1.5 p-1 bg-purple-50 rounded-lg border border-purple-300">
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="h-7 text-xs border border-purple-300 rounded px-2 bg-white text-purple-950 font-semibold outline-none"
          disabled={isPending}
          required
        >
          <option value="" disabled>Select Warehouse User...</option>
          {warehouseStaff.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name || ws.email} (Warehouse)
            </option>
          ))}
        </select>
        <Button
          type="submit"
          size="sm"
          disabled={isPending || !selectedUserId}
          className="h-7 px-2.5 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold"
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(false)}
          disabled={isPending}
          className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Button>
      </form>
    );
  }

  // 2. Full Card Variant (renders in PickList tab / Fulfillment section)
  return (
    <div className="p-4 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/60 to-indigo-50/40 text-xs space-y-3 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200 pb-2.5">
        <div className="flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-purple-700" />
          <span className="font-bold text-sm text-purple-950">Warehouse Picker Assignment</span>
          {pickListNumber && (
            <Badge variant="outline" className="text-[10px] font-mono bg-white text-purple-700 border-purple-300">
              {pickListNumber}
            </Badge>
          )}
        </div>
        <div>
          {isLocked ? (
            <Badge className="bg-slate-200 text-slate-700 border-slate-300 font-semibold gap-1">
              <Lock className="h-3 w-3" /> Fulfillment Locked (Packing Completed)
            </Badge>
          ) : (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold gap-1">
              <CheckCircle2 className="h-3 w-3" /> Re-assignment Allowed (Prior to Packing)
            </Badge>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-1.5 text-xs">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1.5 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Currently Assigned Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="p-3 bg-white rounded-lg border border-purple-100 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
            Currently Assigned Staff
          </span>
          {assignedUser ? (
            <div className="flex items-center gap-2 pt-0.5">
              <div className="h-7 w-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                {(assignedUser.name || assignedUser.email || "W").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs">{assignedUser.name || assignedUser.email}</div>
                <div className="text-[10px] text-slate-500">{assignedUser.email}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-700 font-semibold pt-1">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span>No warehouse picker assigned yet</span>
            </div>
          )}
        </div>

        <div className="p-3 bg-white rounded-lg border border-purple-100 space-y-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
            Picking Status & Role Access
          </span>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 font-bold">
              {pickListStatus || "READY_FOR_WAREHOUSE"}
            </Badge>
            <span className="text-[11px] text-slate-500">
              {isLocked
                ? "Items already packed; picker locked"
                : "Accounts can re-assign anytime before packing"}
            </span>
          </div>
        </div>
      </div>

      {/* Action / Re-assignment Form */}
      {canAssign && !isLocked && (
        <div className="pt-2 border-t border-purple-100">
          {!isEditing ? (
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-slate-600">
                Need to assign or change the warehouse picker for this order?
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="bg-white border-purple-300 text-purple-800 hover:bg-purple-100 font-bold text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                {assignedUser ? "Change Assigned Picker" : "Assign Warehouse Picker"}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAssign} className="space-y-3 p-3 bg-white rounded-lg border border-purple-300">
              <div className="font-bold text-slate-900 text-xs">
                {assignedUser ? "Change Assigned Warehouse User" : "Assign Warehouse User"}
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex-1 h-9 text-xs border border-slate-300 rounded-lg px-3 bg-card text-foreground font-semibold outline-none focus:border-purple-500"
                  disabled={isPending}
                  required
                >
                  <option value="" disabled>Select Warehouse Staff Member...</option>
                  {warehouseStaff.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name || ws.email} ({ws.email})
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isPending || !selectedUserId}
                    className="h-9 px-4 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  >
                    {isPending ? "Updating Assignment..." : assignedUser ? "Confirm New Picker" : "Assign Picker"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedUserId(assignedUser?.id || "");
                    }}
                    disabled={isPending}
                    className="h-9 px-3 text-xs text-slate-600"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                The assigned warehouse user will receive an in-app notification immediately and will see this order in their picking console.
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

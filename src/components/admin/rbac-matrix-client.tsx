"use client";

import * as React from "react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Shield,
  ShieldCheck,
  KeyRound,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  Save,
  Search,
  Layers,
  Lock,
  Trash2,
  RefreshCw,
  Info,
} from "lucide-react";

export interface SerializedRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  systemRole: boolean;
  userCount: number;
  permissionIds: string[];
}

export interface SerializedPermission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
}

interface RbacMatrixClientProps {
  initialRoles: SerializedRole[];
  permissions: SerializedPermission[];
  sellerSlug: string;
}

export function RbacMatrixClient({
  initialRoles,
  permissions,
  sellerSlug,
}: RbacMatrixClientProps) {
  const [roles, setRoles] = useState<SerializedRole[]>(initialRoles);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    initialRoles[0]?.id || ""
  );
  const [rolePermissions, setRolePermissions] = useState<Record<string, Set<string>>>(() => {
    const map: Record<string, Set<string>> = {};
    for (const r of initialRoles) {
      map[r.id] = new Set(r.permissionIds);
    }
    return map;
  });

  const [filterModule, setFilterModule] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<Record<string, boolean>>({});
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  // Create Role Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoleCode, setNewRoleCode] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Group permissions by module
  const modules = React.useMemo(() => {
    const set = new Set<string>();
    permissions.forEach((p) => set.add(p.module));
    return Array.from(set).sort();
  }, [permissions]);

  const activeRole = roles.find((r) => r.id === selectedRoleId) || roles[0];
  const activePermSet = activeRole ? (rolePermissions[activeRole.id] || new Set()) : new Set();

  const togglePermission = (roleId: string, permissionId: string) => {
    setRolePermissions((prev) => {
      const current = new Set(prev[roleId] || []);
      if (current.has(permissionId)) {
        current.delete(permissionId);
      } else {
        current.add(permissionId);
      }
      return { ...prev, [roleId]: current };
    });
    setHasUnsavedChanges((prev) => ({ ...prev, [roleId]: true }));
  };

  const toggleAllInModule = (roleId: string, moduleName: string, enable: boolean) => {
    const modulePerms = permissions.filter((p) => p.module === moduleName);
    setRolePermissions((prev) => {
      const current = new Set(prev[roleId] || []);
      modulePerms.forEach((p) => {
        if (enable) {
          current.add(p.id);
        } else {
          current.delete(p.id);
        }
      });
      return { ...prev, [roleId]: current };
    });
    setHasUnsavedChanges((prev) => ({ ...prev, [roleId]: true }));
  };

  const handleSaveRolePermissions = async (roleId: string) => {
    setIsSaving(true);
    setSaveNotification(null);
    try {
      const permIds = Array.from(rolePermissions[roleId] || []);
      const res = await fetch(`/api/admin/roles/${roleId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: permIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveNotification(data.error || "Failed to save permissions.");
      } else {
        setHasUnsavedChanges((prev) => ({ ...prev, [roleId]: false }));
        setSaveNotification("Permissions updated successfully!");
        setTimeout(() => setSaveNotification(null), 3000);
      }
    } catch {
      setSaveNotification("Network error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newRoleCode.trim() || !newRoleName.trim()) {
      setCreateError("Role code and name are required.");
      return;
    }

    setIsCreatingRole(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newRoleCode.trim(),
          name: newRoleName.trim(),
          description: newRoleDescription.trim() || undefined,
          permissionIds: [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create role.");
      } else {
        const created = data.data.role;
        const newRoleObj: SerializedRole = {
          id: created.id,
          code: created.code,
          name: created.name,
          description: created.description,
          systemRole: false,
          userCount: 0,
          permissionIds: [],
        };
        setRoles((prev) => [...prev, newRoleObj]);
        setSelectedRoleId(created.id);
        setRolePermissions((prev) => ({ ...prev, [created.id]: new Set() }));
        setIsCreateModalOpen(false);
        setNewRoleCode("");
        setNewRoleName("");
        setNewRoleDescription("");
      }
    } catch (err: any) {
      setCreateError(err.message || "Failed to create role.");
    } finally {
      setIsCreatingRole(false);
    }
  };

  const handleDeleteCustomRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete the custom role "${roleName}"?`)) return;
    try {
      const res = await fetch(`/api/admin/roles/${roleId}/permissions`, {
        method: "DELETE",
      });
      if (res.ok) {
        setRoles((prev) => prev.filter((r) => r.id !== roleId));
        if (selectedRoleId === roleId) {
          const remaining = roles.filter((r) => r.id !== roleId);
          setSelectedRoleId(remaining[0]?.id || "");
        }
      } else {
        alert("Failed to delete role.");
      }
    } catch {
      alert("Error deleting role.");
    }
  };

  // Filtered permissions
  const filteredPermissions = React.useMemo(() => {
    return permissions.filter((p) => {
      if (filterModule !== "ALL" && p.module !== filterModule) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.module.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [permissions, filterModule, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-primary uppercase tracking-wider">Access Control & Security</div>
          <h2 className="text-xl font-black text-slate-900">Role-Based Access Control (RBAC) Matrix</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure granular permissions per module for all system user types and custom operational roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="font-bold gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Plus className="h-4 w-4" /> Create Custom User Role
          </Button>
        </div>
      </div>

      {/* Roles Selector Tabs / Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {roles.map((r) => {
          const isSelected = r.id === activeRole?.id;
          const assignedCount = (rolePermissions[r.id] || new Set()).size;
          const isUnsaved = hasUnsavedChanges[r.id];

          return (
            <button
              key={r.id}
              onClick={() => setSelectedRoleId(r.id)}
              className={`p-3 rounded-xl border text-left transition-all relative ${
                isSelected
                  ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-primary/30"
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
              }`}
            >
              {isUnsaved && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono font-bold uppercase truncate ${
                  isSelected ? "text-slate-300" : "text-slate-400"
                }`}>
                  {r.code}
                </span>
                {r.systemRole ? (
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${
                    isSelected ? "border-slate-700 text-slate-300" : ""
                  }`}>
                    Default
                  </Badge>
                ) : (
                  <Badge className="text-[9px] px-1 py-0 h-4 bg-purple-100 text-purple-800 border-purple-200">
                    Custom
                  </Badge>
                )}
              </div>
              <div className="font-bold text-xs mt-1.5 truncate">{r.name}</div>
              <div className={`text-[10px] mt-1 flex items-center justify-between ${
                isSelected ? "text-slate-400" : "text-slate-500"
              }`}>
                <span>{assignedCount} perms</span>
                <span>{r.userCount} users</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Role Matrix Inspector */}
      {activeRole && (
        <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
          {/* Active Role Bar */}
          <div className="p-4 border-b bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base">{activeRole.name}</h3>
                <Badge variant="secondary" className="font-mono text-[10px]">{activeRole.code}</Badge>
                {activeRole.systemRole ? (
                  <Badge variant="outline" className="text-[10px] text-slate-500">System Role</Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCustomRole(activeRole.id, activeRole.name)}
                    className="h-6 px-2 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> Delete Role
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeRole.description || `Configuring module capabilities and actions for ${activeRole.name}.`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {saveNotification && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-pulse">
                  {saveNotification}
                </span>
              )}
              <Button
                size="sm"
                onClick={() => handleSaveRolePermissions(activeRole.id)}
                disabled={isSaving || !hasUnsavedChanges[activeRole.id]}
                className={`font-bold gap-1.5 text-xs shadow-sm ${
                  hasUnsavedChanges[activeRole.id]
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-bounce"
                    : "bg-slate-800 hover:bg-slate-900 text-white"
                }`}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Filter / Search Bar */}
          <div className="p-3 border-b bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Filter permissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-slate-50 border-slate-200"
                />
              </div>
              <select
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                className="h-8 text-xs rounded-md border border-slate-200 bg-slate-50 px-2 text-slate-700 font-medium"
              >
                <option value="ALL">All Modules ({modules.length})</option>
                {modules.map((m) => (
                  <option key={m} value={m}>
                    {m.toUpperCase()} Module
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] text-slate-500 font-medium self-end sm:self-auto">
              Selected: <span className="font-bold text-slate-800">{activePermSet.size}</span> of {permissions.length} total keys
            </div>
          </div>

          {/* Module-by-Module Permission Matrix */}
          <div className="divide-y">
            {modules
              .filter((m) => filterModule === "ALL" || filterModule === m)
              .map((moduleName) => {
                const modulePerms = permissions.filter((p) => {
                  if (p.module !== moduleName) return false;
                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase().trim();
                    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
                  }
                  return true;
                });

                if (modulePerms.length === 0) return null;

                const allModuleGranted = modulePerms.every((p) => activePermSet.has(p.id));
                const someModuleGranted = modulePerms.some((p) => activePermSet.has(p.id));

                return (
                  <div key={moduleName} className="p-4 bg-white">
                    {/* Module Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-900">
                          {moduleName} Module
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {modulePerms.filter((p) => activePermSet.has(p.id)).length} / {modulePerms.length} enabled
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleAllInModule(activeRole.id, moduleName, true)}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                        >
                          Enable All
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => toggleAllInModule(activeRole.id, moduleName, false)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:underline"
                        >
                          Disable All
                        </button>
                      </div>
                    </div>

                    {/* Permissions Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {modulePerms.map((perm) => {
                        const isChecked = activePermSet.has(perm.id);

                        return (
                          <div
                            key={perm.id}
                            onClick={() => togglePermission(activeRole.id, perm.id)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors flex items-start justify-between gap-2 select-none ${
                              isChecked
                                ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                                : "bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100/70"
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold line-clamp-1">{perm.name}</div>
                              <div className="font-mono text-[10px] text-slate-400">{perm.code}</div>
                              {perm.description && (
                                <div className="text-[10px] text-slate-500 line-clamp-1">
                                  {perm.description}
                                </div>
                              )}
                            </div>
                            <div className="shrink-0 mt-0.5">
                              {isChecked ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <div className="h-4 w-4 rounded border border-slate-300 bg-white" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Modal: Create Custom Role */}
      <Dialog open={isCreateModalOpen} onOpenChange={(open) => !open && setIsCreateModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
              <Shield className="h-5 w-5 text-primary" /> Create Custom User Role
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Define a new business role and configure its operational module capabilities.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRole} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Role Code Identifier</Label>
              <Input
                placeholder="e.g. AUDIT_OFFICER or JUNIOR_ACCOUNTANT"
                value={newRoleCode}
                onChange={(e) => setNewRoleCode(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                className="text-xs font-mono"
                required
              />
              <div className="text-[10px] text-slate-400">Unique uppercase identifier with underscores.</div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Display Name</Label>
              <Input
                placeholder="e.g. Audit Officer or Junior Accountant"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Description</Label>
              <Input
                placeholder="e.g. Responsible for quarterly VAT audit and stock verification"
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                className="text-xs"
              />
            </div>

            {createError && (
              <div className="p-2 rounded bg-red-50 border border-red-200 text-xs text-red-800">
                {createError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isCreatingRole}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isCreatingRole} className="font-bold">
                {isCreatingRole ? "Creating..." : "Create Role"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

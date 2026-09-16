"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  toggleRolePermissionAction,
  resetRoleToPresetAction,
  updateUserRoleAction,
  updateUserNameAction,
  toggleUserActiveAction,
  deleteUserAction,
  inviteStaffAction,
} from "@/lib/rbac-actions";
import { useAdminT } from "./admin-i18n";

export type RoleDTO = {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  description: string;
  memberCount: number;
};
export type StaffDTO = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleKey: string;
  isActive: boolean;
  lastLoginAt: string | null;
};
export type PermRow = { perm: string; label: string; highlight?: boolean };

export function RolesManager({
  roles,
  staff,
  permRows,
  canEditPerms,
  actorRoleKey,
  actorId,
}: {
  roles: RoleDTO[];
  staff: StaffDTO[];
  permRows: PermRow[];
  canEditPerms: boolean;
  actorRoleKey: string;
  actorId: string;
}) {
  const [pending, start] = useTransition();
  const t = useAdminT();
  const [flash, setFlash] = useState<{ msg: string; err?: boolean } | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  function notify(msg: string, err?: boolean) {
    setFlash({ msg, err });
    setTimeout(() => setFlash(null), 3500);
  }
  function run(p: Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    start(async () => {
      const r = await p;
      notify(r.ok ? okMsg : r.error ?? t("common.error"), !r.ok);
    });
  }

  const editableRoles = roles.filter(
    (r) => r.key !== "super_admin" && r.key !== "customer",
  );

  return (
    <>
      {flash && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 text-white text-[13px] px-4 py-2.5 rounded-lg shadow-lg ${
            flash.err ? "bg-sale" : "bg-foreground"
          }`}
        >
          {flash.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">
            {t("roles.title")}
          </h1>
          <p className="text-[13px] text-muted mt-1">
            {editableRoles.length + 1} {t("roles.rolesCount")} · {staff.length} {t("roles.accountsCount")}
            {!canEditPerms && ` · ${t("roles.onlyRoleHint")}`}
          </p>
        </div>
        <button
          onClick={() => setShowInvite((s) => !s)}
          className="h-9 px-4 bg-bloom text-white hover:bg-bloom-ink rounded-lg text-[13px] font-semibold"
        >
          {showInvite ? t("common.close") : t("roles.invite")}
        </button>
      </div>

      {showInvite && (
        <InviteForm
          roles={roles.filter((r) => r.key !== "customer")}
          actorRoleKey={actorRoleKey}
          onDone={() => {
            setShowInvite(false);
            notify(t("roles.accountCreated"));
          }}
        />
      )}

      {/* role cards */}
      <div className="grid md:grid-cols-3 gap-3.5 mb-4">
        <RoleCard name="Super Admin" count={roles.find((r) => r.key === "super_admin")?.memberCount ?? 0} desc={t("roles.superAdminDesc")} />
        {editableRoles.map((r) => (
          <RoleCard key={r.id} name={r.name} count={r.memberCount} desc={r.description} />
        ))}
      </div>

      {/* matrix */}
      <div className="bg-white border border-line rounded-card overflow-hidden mb-4">
        <div className="p-4 flex items-center justify-between">
          <div className="text-sm font-bold">{t("roles.matrix")}</div>
          {!canEditPerms && (
            <span className="text-[11.5px] text-muted-2">{t("roles.onlySuperAdmin")}</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[820px] text-center">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-2">
                <th className="px-3 py-3 text-left border-b border-[#F0F0EC]">
                  {t("roles.func")}
                </th>
                <th className="px-3 py-3 border-b border-[#F0F0EC]">Super Admin</th>
                {editableRoles.map((r) => (
                  <th key={r.id} className="px-3 py-3 border-b border-[#F0F0EC]">
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permRows.map((row) => (
                <tr key={row.perm} className={row.highlight ? "bg-[#FBFBF9]" : ""}>
                  <td className="px-3 py-2.5 text-left text-[12.5px] font-medium border-t border-[#F0F0EC]">
                    {row.highlight ? <b>{row.label}</b> : row.label}
                  </td>
                  <td className="px-3 py-2.5 border-t border-[#F0F0EC]">
                    <Dot on disabled />
                  </td>
                  {editableRoles.map((r) => {
                    const on = r.permissions.includes(row.perm);
                    return (
                      <td key={r.id} className="px-3 py-2.5 border-t border-[#F0F0EC]">
                        <Dot
                          on={on}
                          disabled={!canEditPerms || pending}
                          onClick={() =>
                            run(
                              toggleRolePermissionAction(r.id, row.perm, !on),
                              `${row.label} · ${r.name} · ${!on ? t("common.on") : t("common.off")}`,
                            )
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {canEditPerms && (
          <div className="p-3 border-t border-[#F0F0EC] flex flex-wrap gap-2">
            {editableRoles.map((r) => (
              <button
                key={r.id}
                disabled={pending}
                onClick={() =>
                  run(resetRoleToPresetAction(r.id), `${r.name}: ${t("roles.resetDone")}`)
                }
                className="text-[11.5px] border border-line rounded-md px-2.5 py-1.5 text-muted hover:text-foreground"
              >
                ↺ {r.name} {t("roles.resetBtn")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* staff table */}
      <div className="bg-white border border-line rounded-card overflow-hidden">
        <div className="p-4 text-sm font-bold">{t("roles.staffAccounts")}</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[720px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-2 text-left">
                <th className="px-4 py-3 border-b border-[#F0F0EC]">{t("roles.staff")}</th>
                <th className="px-4 py-3 border-b border-[#F0F0EC]">{t("roles.role")}</th>
                <th className="px-4 py-3 border-b border-[#F0F0EC]">{t("orders.status")}</th>
                <th className="px-4 py-3 border-b border-[#F0F0EC]">{t("roles.lastLogin")}</th>
                <th className="px-4 py-3 border-b border-[#F0F0EC]" />
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => {
                const isSelf = u.id === actorId;
                const lockRole =
                  isSelf ||
                  (actorRoleKey === "manager" && u.roleKey === "super_admin");
                const canEditName = !(
                  actorRoleKey === "manager" && u.roleKey === "super_admin"
                );
                return (
                  <tr key={u.id} className="border-b border-[#F4F4F0]">
                    <td className="px-4 py-3 text-[13px]">
                      <div className="flex items-center gap-1.5">
                        <EditableName
                          value={u.name}
                          canEdit={canEditName && !pending}
                          onSave={(name) =>
                            run(
                              updateUserNameAction(u.id, name),
                              t("roles.nameChanged"),
                            )
                          }
                        />
                        {isSelf && (
                          <span className="text-[11px] text-bloom">{t("roles.you")}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-2">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.roleId}
                        disabled={lockRole || pending}
                        onChange={(e) =>
                          run(
                            updateUserRoleAction(u.id, e.target.value),
                            t("roles.roleChanged"),
                          )
                        }
                        className="text-[12px] font-semibold px-2 py-1.5 rounded-md border border-line bg-white outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {roles
                          .filter((r) => r.key !== "customer")
                          .filter(
                            (r) =>
                              actorRoleKey === "super_admin" ||
                              r.key !== "super_admin",
                          )
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={isSelf || pending}
                        onClick={() =>
                          run(
                            toggleUserActiveAction(u.id, !u.isActive),
                            u.isActive ? t("roles.locked2") : t("roles.unlocked"),
                          )
                        }
                        className={`text-[11px] font-semibold px-2 py-1 rounded-full disabled:opacity-60 ${
                          u.isActive
                            ? "bg-[#E7F1FA] text-success"
                            : "bg-[#FBF3E6] text-warning"
                        }`}
                      >
                        {u.isActive ? t("roles.active") : t("roles.locked")}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-[12.5px] text-muted">
                      {u.lastLoginAt ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        disabled={isSelf || lockRole || pending}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `${t("roles.deleteQ")} "${u.name}" (${u.email})?\n${t("roles.deleteConfirm")}`,
                            )
                          )
                            return;
                          run(deleteUserAction(u.id), t("roles.deleted"));
                        }}
                        className="text-[11.5px] font-semibold text-sale hover:text-sale/80 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {t("common.delete")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function EditableName({
  value,
  canEdit,
  onSave,
}: {
  value: string;
  canEdit: boolean;
  onSave: (name: string) => void;
}) {
  const t = useAdminT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={`font-medium text-left ${
          canEdit
            ? "border-b border-dashed border-[#C9C9C2] hover:border-bloom"
            : "cursor-default"
        }`}
        title={canEdit ? t("roles.editNameHint") : undefined}
      >
        {value}
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          setEditing(false);
          if (draft.trim() && draft.trim() !== value) onSave(draft);
        }
        if (e.key === "Escape") setEditing(false);
      }}
      onBlur={() => {
        setEditing(false);
        if (draft.trim() && draft.trim() !== value) onSave(draft);
      }}
      className="h-8 w-[180px] border-[1.5px] border-bloom rounded-md px-2 text-[13px] font-medium outline-none"
    />
  );
}

function Dot({
  on,
  disabled,
  onClick,
}: {
  on: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${
        disabled ? "cursor-default" : "cursor-pointer hover:opacity-80"
      }`}
      aria-pressed={on}
    >
      {on ? (
        <span className="w-4 h-4 rounded-[5px] bg-bloom flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </span>
      ) : (
        <span className="w-4 h-4 rounded-[5px] border-[1.5px] border-[#D0D0CA]" />
      )}
    </button>
  );
}

function RoleCard({
  name,
  count,
  desc,
}: {
  name: string;
  count: number;
  desc: string;
}) {
  return (
    <div className="bg-white border border-line rounded-card p-4">
      <div className="flex justify-between">
        <b className="text-[13.5px]">{name}</b>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#E7F1FA] text-bloom">
          {count}
        </span>
      </div>
      <p className="text-[12px] text-muted leading-relaxed mt-2">{desc}</p>
    </div>
  );
}

function InviteSubmit() {
  const { pending } = useFormStatus();
  const t = useAdminT();
  return (
    <button
      disabled={pending}
      className="h-10 px-5 bg-bloom text-white hover:bg-bloom-ink rounded-lg text-[13px] font-semibold disabled:opacity-60"
    >
      {pending ? t("common.creating") : t("roles.createAccount")}
    </button>
  );
}

function InviteForm({
  roles,
  actorRoleKey,
  onDone,
}: {
  roles: RoleDTO[];
  actorRoleKey: string;
  onDone: () => void;
}) {
  const t = useAdminT();
  const [state, formAction] = useActionState(inviteStaffAction, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
  return (
    <form
      action={formAction}
      className="bg-white border border-line rounded-card p-5 mb-4 grid sm:grid-cols-2 gap-3.5"
    >
      <label className="block">
        <span className="text-[12px] font-semibold text-[#4A4A4A] mb-1 block">
          {t("field.fullName")}
        </span>
        <input
          name="name"
          required
          className="w-full h-10 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-bloom"
        />
      </label>
      <label className="block">
        <span className="text-[12px] font-semibold text-[#4A4A4A] mb-1 block">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          className="w-full h-10 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-bloom"
        />
      </label>
      <label className="block">
        <span className="text-[12px] font-semibold text-[#4A4A4A] mb-1 block">
          {t("roles.tempPassword")}
        </span>
        <input
          name="password"
          type="text"
          required
          minLength={6}
          className="w-full h-10 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-bloom"
        />
      </label>
      <label className="block">
        <span className="text-[12px] font-semibold text-[#4A4A4A] mb-1 block">
          {t("roles.role")}
        </span>
        <select
          name="roleKey"
          required
          defaultValue=""
          className="w-full h-10 border border-line rounded-lg px-3 text-[13px] outline-none focus:border-bloom bg-white"
        >
          <option value="" disabled>
            — {t("roles.role")} —
          </option>
          {roles
            .filter(
              (r) => actorRoleKey === "super_admin" || r.key !== "super_admin",
            )
            .map((r) => (
              <option key={r.id} value={r.key}>
                {r.name}
              </option>
            ))}
        </select>
      </label>
      <div className="sm:col-span-2 flex items-center gap-3">
        <InviteSubmit />
        {state?.error && (
          <span className="text-[12px] text-sale">{state.error}</span>
        )}
      </div>
    </form>
  );
}

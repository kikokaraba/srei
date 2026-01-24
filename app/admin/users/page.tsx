"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Shield,
  Crown,
  User,
  X,
  Check,
} from "lucide-react";

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    savedProperties: number;
    sessions: number;
  };
  preferences: {
    onboardingCompleted: boolean;
    primaryCity: string | null;
    investmentType: string | null;
  } | null;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  PREMIUM_INVESTOR: "Premium",
  FREE_USER: "Free",
};

const ROLES = ["ADMIN", "PREMIUM_INVESTOR", "FREE_USER"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
    });
    if (search) params.append("search", search);
    if (roleFilter) params.append("role", roleFilter);

    try {
      const res = await fetch(`/api/v1/admin/users?${params}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setEditRole(user.role);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSaving(true);

    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingUser.id,
          role: editRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingUser(null);
        fetchUsers();
      }
    } catch (error) {
      console.error("Error updating user:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Naozaj chcete vymazať tohto používateľa? Táto akcia je nevratná.")) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/users?userId=${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Shield className="w-4 h-4 text-red-400" />;
      case "PREMIUM_INVESTOR":
        return <Crown className="w-4 h-4 text-yellow-400" />;
      default:
        return <User className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2 flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-400" />
          Správa používateľov
        </h1>
        <p className="text-slate-400">Prehľad a správa všetkých registrovaných používateľov</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Hľadať podľa emailu alebo mena..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-red-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-red-500"
          >
            <option value="">Všetky role</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
          >
            Hľadať
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Žiadni používatelia</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Používateľ</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Rola</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Onboarding</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Uložené</th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-400">Registrácia</th>
                  <th className="text-right py-3 px-6 text-sm font-medium text-slate-400">Akcie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/30">
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-medium text-slate-100">{user.email}</div>
                        <div className="text-sm text-slate-400">{user.name || "Bez mena"}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === "ADMIN" ? "bg-red-500/20 text-red-400" :
                          user.role === "PREMIUM_INVESTOR" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-slate-700 text-slate-300"
                        }`}>
                          {ROLE_LABELS[user.role]}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {user.preferences?.onboardingCompleted ? (
                        <span className="text-emerald-400">Dokončený</span>
                      ) : (
                        <span className="text-slate-500">Nedokončený</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-300">{user._count.savedProperties}</td>
                    <td className="py-4 px-6 text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString("sk-SK")}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                          title="Upraviť"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                          title="Vymazať"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 p-4 border-t border-slate-800">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Predchádzajúca
            </button>
            <span className="text-slate-400">
              Strana {page} z {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 disabled:opacity-50"
            >
              Ďalšia
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-md">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-100">Upraviť používateľa</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Email</label>
                <div className="text-slate-100">{editingUser.email}</div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Rola</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role}
                      onClick={() => setEditRole(role)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        editRole === role
                          ? "bg-red-500/20 border-red-500/50 text-red-400"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex justify-center mb-1">{getRoleIcon(role)}</div>
                      <div className="text-sm font-medium">{ROLE_LABELS[role]}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={handleSaveUser}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Uložiť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

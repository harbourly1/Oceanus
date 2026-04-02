'use client';

import { useState } from 'react';
import { useAllUsers, useCreateUser, useUpdateUser, useResetPassword } from '@/hooks/use-api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { ROLE_CONFIG } from '@oceanus/shared';
import { UserCog, Plus, Pencil, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'SALES_EXEC', label: 'Sales Executive' },
  { value: 'SALES_ADMIN', label: 'Sales Admin' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'UNDERWRITER', label: 'Underwriter' },
  { value: 'UW_MANAGER', label: 'UW Manager' },
  { value: 'ADMIN', label: 'Admin' },
];

const DEPT_OPTIONS = [
  { value: 'SALES', label: 'Sales' },
  { value: 'ACCOUNTS', label: 'Accounts' },
  { value: 'UNDERWRITING', label: 'Underwriting' },
  { value: 'ADMIN', label: 'Admin' },
];

const LANG_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Arabic' },
];

const ROLE_COLORS = ROLE_CONFIG;

export default function UserManagementPage() {
  const { data: users, isLoading, error, refetch } = useAllUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const resetPassword = useResetPassword();

  const [createModal, setCreateModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [resetPwUser, setResetPwUser] = useState<any>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    name: '', email: '', password: '', role: 'SALES_EXEC', department: 'SALES', language: 'en',
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    name: '', email: '', role: '', department: '', language: '', isActive: true,
  });

  // Reset password form
  const [newPassword, setNewPassword] = useState('');

  const openCreate = () => {
    setCreateForm({ name: '', email: '', password: '', role: 'SALES_EXEC', department: 'SALES', language: 'en' });
    setCreateModal(true);
  };

  const openEdit = (user: any) => {
    setEditForm({
      name: user.name, email: user.email, role: user.role,
      department: user.department, language: user.language || 'en', isActive: user.isActive,
    });
    setEditUser(user);
  };

  const openResetPw = (user: any) => {
    setNewPassword('');
    setResetPwUser(user);
  };

  const handleCreate = async () => {
    await createUser.mutateAsync(createForm);
    setCreateModal(false);
    refetch();
  };

  const handleEdit = async () => {
    if (!editUser) return;
    await updateUser.mutateAsync({ id: editUser.id, ...editForm });
    setEditUser(null);
    refetch();
  };

  const handleResetPassword = async () => {
    if (!resetPwUser || !newPassword) return;
    await resetPassword.mutateAsync({ id: resetPwUser.id, password: newPassword });
    setResetPwUser(null);
  };

  const handleToggleActive = async (user: any) => {
    await updateUser.mutateAsync({ id: user.id, isActive: !user.isActive });
    refetch();
  };

  if (isLoading) return <LoadingState message="Loading users..." />;
  if (error) return <ErrorState message={(error as Error).message} />;

  const allUsers = users || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            User Management
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Create, edit, and manage system users
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={14} className="mr-1" /> Create User
        </Button>
      </div>

      {allUsers.length === 0 ? (
        <EmptyState
          icon={<UserCog size={32} />}
          title="No users"
          message="No users found in the system"
          action={<Button variant="primary" onClick={openCreate}>Create First User</Button>}
        />
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                  {['Name', 'Role', 'Department', 'Status', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u: any) => {
                  const rc = ROLE_COLORS[u.role] || { label: u.role, color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                            {u.name}
                          </span>
                          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{u.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ color: rc.color, background: rc.bg }}
                        >
                          {rc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {u.department}
                      </td>
                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: '#22c55e', background: 'rgba(34,197,94,0.12)' }}>
                            Active
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.12)' }}>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 rounded-md hover:opacity-80"
                            style={{ background: 'var(--color-bg-hover)' }}
                            title="Edit user"
                          >
                            <Pencil size={14} style={{ color: 'var(--color-text-secondary)' }} />
                          </button>
                          <button
                            onClick={() => openResetPw(u)}
                            className="p-1.5 rounded-md hover:opacity-80"
                            style={{ background: 'var(--color-bg-hover)' }}
                            title="Reset password"
                          >
                            <KeyRound size={14} style={{ color: 'var(--color-text-secondary)' }} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(u)}
                            className="p-1.5 rounded-md hover:opacity-80"
                            style={{ background: u.isActive ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' }}
                            title={u.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {u.isActive ? (
                              <ShieldOff size={14} style={{ color: 'var(--color-accent-red)' }} />
                            ) : (
                              <ShieldCheck size={14} style={{ color: 'var(--color-accent-green)' }} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create User Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create New User">
        <div className="space-y-4">
          <Input label="Name" required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
          <Input label="Email" type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
          <Input label="Password" type="password" required value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
          <Select label="Role" options={ROLE_OPTIONS} value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })} />
          <Select label="Department" options={DEPT_OPTIONS} value={createForm.department} onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })} />
          <Select label="Language" options={LANG_OPTIONS} value={createForm.language} onChange={(e) => setCreateForm({ ...createForm, language: e.target.value })} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button variant="primary" loading={createUser.isPending} onClick={handleCreate}>Create User</Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit User — ${editUser?.name || ''}`}>
        <div className="space-y-4">
          <Input label="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          <Select label="Role" options={ROLE_OPTIONS} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} />
          <Select label="Department" options={DEPT_OPTIONS} value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} />
          <Select label="Language" options={LANG_OPTIONS} value={editForm.language} onChange={(e) => setEditForm({ ...editForm, language: e.target.value })} />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={editForm.isActive}
              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
            />
            <label htmlFor="isActive" className="text-sm" style={{ color: 'var(--color-text-primary)' }}>Active</label>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button variant="primary" loading={updateUser.isPending} onClick={handleEdit}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!resetPwUser} onClose={() => setResetPwUser(null)} title={`Reset Password — ${resetPwUser?.name || ''}`}>
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Enter a new password for this user. They will need to use this password on their next login.
          </p>
          <Input
            label="New Password"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setResetPwUser(null)}>Cancel</Button>
            <Button variant="danger" loading={resetPassword.isPending} onClick={handleResetPassword}>Reset Password</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

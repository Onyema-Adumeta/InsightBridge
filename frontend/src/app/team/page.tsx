"use client";

import React, { useState, useEffect, ReactNode } from 'react';
import { useUser } from "@clerk/nextjs";
import { 
  UserPlus, 
  Shield, 
  Edit3, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  X,
  Users as UsersIcon
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// --- TypeScript Interfaces ---
type UserRole = 'owner' | 'manager' | 'accountant' | 'viewer';
type UserStatus = 'active' | 'pending' | 'inactive';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  role: UserRole;
  last_login: string | null;
  invited_at: string;
  invited_by?: string;
  permissions?: string[];
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

// --- Modal Component ---
const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Status Badge Component ---
const StatusBadge = ({ status }: { status: UserStatus }) => {
  const config = {
    active: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
    inactive: { bg: 'bg-slate-100', text: 'text-slate-600', icon: AlertCircle }
  };
  
  const { bg, text, icon: Icon } = config[status];
  
  return (
    <span className={`px-3 py-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full ${bg} ${text}`}>
      <Icon className="w-3.5 h-3.5" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// --- Role Badge Component ---
const RoleBadge = ({ role }: { role: UserRole }) => {
  const config = {
    owner: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    manager: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    accountant: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
    viewer: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' }
  };
  
  const { bg, text, border } = config[role];
  
  return (
    <span className={`px-3 py-1 inline-flex text-xs font-medium rounded-full border ${bg} ${text} ${border}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
};

// --- Main Component ---
export default function TeamManagementPage() {
  const { user } = useUser();
  
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('viewer');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<UserStatus | 'all'>('all');
  
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('accountant');
  const [inviteName, setInviteName] = useState('');

  // Permission checks
  const canManageTeam = currentUserRole === 'owner' || currentUserRole === 'manager';
  const canInvite = canManageTeam;
  const canEditRoles = currentUserRole === 'owner';
  const canDelete = currentUserRole === 'owner';

  // Fetch team data
  const fetchTeamData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/team/users`, {
        headers: {
          'X-User-Id': user?.id || '',
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch team data');
      
      const data = await response.json();
      setTeamMembers(data);
      
      // Determine current user's role
      const currentUser = data.find((m: TeamMember) => m.email === user?.primaryEmailAddress?.emailAddress);
      if (currentUser) {
        setCurrentUserRole(currentUser.role);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTeamData();
    }
  }, [user]);

  // Auto-dismiss messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle invite
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/api/team/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id || '',
        },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          role: inviteRole,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send invitation');
      }
      
      setSuccessMessage(`Invitation sent to ${inviteEmail}`);
      await fetchTeamData();
      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('accountant');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/team/users/${selectedMember.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user?.id || '',
        },
        body: JSON.stringify({ role: selectedMember.role }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update member');
      }
      
      setSuccessMessage(`${selectedMember.name}'s role updated successfully`);
      await fetchTeamData();
      setEditModalOpen(false);
      setSelectedMember(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedMember) return;
    
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/team/users/${selectedMember.id}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': user?.id || '',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to remove member');
      }
      
      setSuccessMessage(`${selectedMember.name} removed from team`);
      await fetchTeamData();
      setDeleteModalOpen(false);
      setSelectedMember(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filter members
  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Access denied view
  if (!canManageTeam && !isLoading) {
    return (
      <div className="ml-64 flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm text-center max-w-md">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-600">You don't have permission to manage team members.</p>
          <p className="text-sm text-slate-500 mt-2">Contact your team owner for access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-64 min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <UsersIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
                <p className="text-sm text-slate-600">Manage your team members and their permissions</p>
              </div>
            </div>
            
            {canInvite && (
              <button 
                onClick={() => setInviteModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Invite Member
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-900">{successMessage}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <p className="text-slate-600 text-sm">Total Members</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{teamMembers.length}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <p className="text-slate-600 text-sm">Active</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {teamMembers.filter(m => m.status === 'active').length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <p className="text-slate-600 text-sm">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {teamMembers.filter(m => m.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <p className="text-slate-600 text-sm">Owners</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {teamMembers.filter(m => m.role === 'owner').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
              className="bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="accountant">Accountant</option>
              <option value="viewer">Viewer</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as UserStatus | 'all')}
              className="bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Team Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <p className="text-slate-600">Loading team members...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No team members found
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm text-white">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{member.name}</div>
                            <div className="text-sm text-slate-500">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={member.status} />
                      </td>
                      <td className="px-6 py-4">
                        <RoleBadge role={member.role} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {member.last_login 
                          ? new Date(member.last_login).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canEditRoles && (
                            <button
                              onClick={() => {
                                setSelectedMember(member);
                                setEditModalOpen(true);
                              }}
                              className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit role"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && member.role !== 'owner' && (
                            <button
                              onClick={() => {
                                setSelectedMember(member);
                                setDeleteModalOpen(true);
                              }}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Invite Team Member">
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              required
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="john@company.com"
            />
          </div>
          
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-2">
              Role
            </label>
            <select
              id="role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="viewer">Viewer - View only access</option>
              <option value="accountant">Accountant - View and analyze</option>
              <option value="manager">Manager - Full access except team management</option>
              {canEditRoles && <option value="owner">Owner - Full system access</option>}
            </select>
          </div>
          
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-sm"
          >
            Send Invitation
          </button>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title={`Edit ${selectedMember?.name}`}>
        {selectedMember && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <p className="text-slate-600 bg-slate-50 rounded-lg px-4 py-2.5">{selectedMember.email}</p>
            </div>
            
            <div>
              <label htmlFor="edit-role" className="block text-sm font-medium text-slate-700 mb-2">
                Role
              </label>
              <select
                id="edit-role"
                value={selectedMember.role}
                onChange={(e) => setSelectedMember({...selectedMember, role: e.target.value as UserRole})}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="viewer">Viewer</option>
                <option value="accountant">Accountant</option>
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Remove Team Member">
        <div className="space-y-4">
          <p className="text-slate-700">
            Are you sure you want to remove <span className="font-semibold text-slate-900">{selectedMember?.name}</span> from the team?
          </p>
          <p className="text-sm text-slate-600">
            This action cannot be undone. They will lose access to all team resources.
          </p>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
            >
              Remove Member
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
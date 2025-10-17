"use client";

import React from 'react';

/**
 * Displays the audit trail in real-time.
 * It shows an access denied message if the user's role lacks permission.
 * @param {{ logs: any[], hasPermission: boolean }} props
 */
const AuditTrail = ({ logs, hasPermission }) => {
    // If the user's role does not have the 'view_audit_trail' permission, show a helpful message.
    if (!hasPermission) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6 mt-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Audit Trail</h2>
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md" role="alert">
                    <p className="font-bold">Access Denied</p>
                    <p>Your current role does not have permission to view the audit trail.</p>
                </div>
            </div>
        );
    }

  // If the user has permission, render the table with the audit logs.
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Audit Trail</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {/* If there are no logs, display a placeholder row */}
            {logs.length === 0 ? (
                <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No auditable actions have been recorded yet.</td>
                </tr>
            ) : (
                // Otherwise, map over the logs and create a table row for each one.
                logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {/* Format the Firestore timestamp into a readable local string */}
                  {log.timestamp ? new Date(log.timestamp.toDate()).toLocaleString() : 'Just now'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono" title={log.userId}>{log.userId.substring(0, 15)}...</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{log.role}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.action}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.details}</td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditTrail;
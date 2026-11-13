import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-surface-container border-b border-surface-stroke px-8 py-4 flex items-center justify-between">
        <h1 className="text-on-surface font-headline-md">AeroFleet Admin</h1>
        <div className="flex items-center gap-4">
          <span className="text-on-surface-variant font-body-sm">Welcome, {user?.name}</span>
          <button 
            onClick={handleLogout}
            className="text-electric-blue hover:text-secondary-container transition-colors font-label-md"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="flex-1 p-8">
        <div className="bg-surface-container border border-surface-stroke rounded-xl p-6 shadow-sm">
          <h2 className="text-on-surface font-headline-sm mb-4">All Bookings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-stroke">
                  <th className="p-4 text-on-surface-variant font-label-md uppercase">Customer</th>
                  <th className="p-4 text-on-surface-variant font-label-md uppercase">Service</th>
                  <th className="p-4 text-on-surface-variant font-label-md uppercase">Date</th>
                  <th className="p-4 text-on-surface-variant font-label-md uppercase">Status</th>
                  <th className="p-4 text-on-surface-variant font-label-md uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {/* Dummy data for now */}
                <tr className="border-b border-surface-stroke hover:bg-surface-container-high transition-colors">
                  <td className="p-4 text-on-surface font-body-sm">John Doe</td>
                  <td className="p-4 text-on-surface font-body-sm">Full Service</td>
                  <td className="p-4 text-on-surface font-body-sm">Oct 12, 2026</td>
                  <td className="p-4"><span className="bg-error/20 text-error px-2 py-1 rounded-full text-label-md">Pending</span></td>
                  <td className="p-4">
                    <button className="text-electric-blue hover:underline font-label-md">Update</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

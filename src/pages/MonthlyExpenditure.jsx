import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import AppFooter from '../components/AppFooter';
import BrandLogo from '../components/BrandLogo';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';

import { API_BASE as API } from '../config/api.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MANUAL_CATEGORIES = [
  'Fuel',
  'Repairs',
  'Maintenance',
  'Insurance',
  'Tyres',
  'Other'
];

const ALL_FILTER_CATEGORIES = [
  'All',
  'Service Package',
  'Extra Services',
  'Fuel',
  'Repairs',
  'Maintenance',
  'Insurance',
  'Tyres',
  'Other'
];

const CATEGORY_COLORS = {
  'Service Package': { bg: 'rgba(37, 99, 235, 0.12)', text: '#3b82f6', border: 'rgba(37, 99, 235, 0.25)' },
  'Extra Services':  { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: 'rgba(16, 185, 129, 0.25)' },
  'Fuel':            { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.25)' },
  'Repairs':         { bg: 'rgba(239, 68, 68, 0.12)',  text: '#ef4444', border: 'rgba(239, 68, 68, 0.25)' },
  'Maintenance':     { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6', border: 'rgba(139, 92, 246, 0.25)' },
  'Insurance':       { bg: 'rgba(236, 72, 153, 0.12)', text: '#ec4899', border: 'rgba(236, 72, 153, 0.25)' },
  'Tyres':           { bg: 'rgba(20, 184, 166, 0.12)', text: '#14b8a6', border: 'rgba(20, 184, 166, 0.25)' },
  'Other':           { bg: 'rgba(107, 114, 128, 0.12)',text: '#9ca3af', border: 'rgba(107, 114, 128, 0.25)' },
};

function formatINR(amount) {
  return '₹' + Math.round(amount || 0).toLocaleString('en-IN');
}

export default function MonthlyExpenditure() {
  const { user } = useContext(AuthContext);
  const { dark } = useTheme();
  const socket = useSocket();
  const navigate = useNavigate();

  // Primary dataset states
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [manualExpenses, setManualExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state (Defaults to current local month and year: Nov 2026)
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());   // e.g. 2026
  const [selectedVehicle, setSelectedVehicle] = useState('All');         // 'All' or vehicle._id
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQ, setSearchQ] = useState('');
  const [sortField, setSortField] = useState('date');                    // 'date' | 'amount'
  const [sortDir, setSortDir] = useState('desc');

  // UI state
  const [expandedCarId, setExpandedCarId] = useState(null);
  const [hoveredMonthBar, setHoveredMonthBar] = useState(null);

  // Modals
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState(null);
  const [bookingDetailsModal, setBookingDetailsModal] = useState(null);

  // Form state for Add/Edit Expense
  const [formVehicleId, setFormVehicleId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formCategory, setFormCategory] = useState('Maintenance');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const headers = useMemo(() => ({
    Authorization: `Bearer ${user?.token}`,
    'Content-Type': 'application/json'
  }), [user?.token]);

  /* ── Fetch Data ── */
  const fetchData = async () => {
    if (!user?.token) return;
    try {
      const [vRes, bRes, eRes] = await Promise.all([
        fetch(`${API}/api/vehicles`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${API}/api/bookings`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${API}/api/expenses`, { headers }).then(r => r.json()).catch(() => []),
      ]);

      setVehicles(Array.isArray(vRes) ? vRes : []);
      setBookings(Array.isArray(bRes) ? bRes : []);

      let expensesList = Array.isArray(eRes) ? eRes : [];
      try {
        const localSaved = localStorage.getItem(`aerofleet_expenses_${user._id}`);
        if (localSaved && expensesList.length === 0) {
          expensesList = JSON.parse(localSaved);
        }
      } catch (err) {}
      setManualExpenses(expensesList);
    } catch (err) {
      console.error('Data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.token]);

  /* ── Real-Time Socket.IO Updates ── */
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchData();
    };

    socket.on('expenditure:updated', handleUpdate);
    socket.on('service:updated', handleUpdate);
    socket.on('reconnect', handleUpdate);

    return () => {
      socket.off('expenditure:updated', handleUpdate);
      socket.off('service:updated', handleUpdate);
      socket.off('reconnect', handleUpdate);
    };
  }, [socket]);

  /* ── Save manual expenses to local storage backup ── */
  const syncManualExpensesLocal = (list) => {
    try {
      if (user?._id) {
        localStorage.setItem(`aerofleet_expenses_${user._id}`, JSON.stringify(list));
      }
    } catch (err) {}
  };

  /* ── Open Add Expense Modal ── */
  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setFormVehicleId(vehicles.length > 0 ? vehicles[0]._id : '');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormCategory('Maintenance');
    setFormDescription('');
    setFormAmount('');
    setFormNotes('');
    setFormError('');
    setExpenseModalOpen(true);
  };

  /* ── Open Edit Expense Modal ── */
  const handleOpenEditModal = (expense) => {
    setEditingExpense(expense);
    const vId = expense.vehicleId?._id || expense.vehicleId || (vehicles[0]?._id || '');
    setFormVehicleId(vId);
    const dStr = expense.date ? new Date(expense.date).toISOString().slice(0, 10) : '';
    setFormDate(dStr);
    setFormCategory(expense.category || 'Maintenance');
    setFormDescription(expense.description || '');
    setFormAmount(expense.amount ? String(expense.amount) : '');
    setFormNotes(expense.notes || '');
    setFormError('');
    setExpenseModalOpen(true);
  };

  /* ── Submit Add / Edit Expense ── */
  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formVehicleId) {
      setFormError('Please select a vehicle');
      return;
    }
    if (!formDate) {
      setFormError('Expense date is required');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Please enter a description');
      return;
    }
    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid amount greater than ₹0');
      return;
    }

    setFormSubmitting(true);
    const payload = {
      vehicleId: formVehicleId,
      date: formDate,
      category: formCategory,
      description: formDescription.trim(),
      amount: parsedAmount,
      notes: formNotes.trim(),
    };

    try {
      if (editingExpense) {
        let updatedItem = null;
        try {
          const res = await fetch(`${API}/api/expenses/${editingExpense._id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            updatedItem = await res.json();
          }
        } catch (err) {}

        const matchedVehicle = vehicles.find(v => v._id === formVehicleId);
        const resolvedUpdated = updatedItem || {
          ...editingExpense,
          ...payload,
          vehicleId: matchedVehicle || formVehicleId,
          updatedAt: new Date().toISOString()
        };

        const updatedList = manualExpenses.map(item => item._id === editingExpense._id ? resolvedUpdated : item);
        setManualExpenses(updatedList);
        syncManualExpensesLocal(updatedList);
        showToast('Expense record updated successfully');
      } else {
        let createdItem = null;
        try {
          const res = await fetch(`${API}/api/expenses`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            createdItem = await res.json();
          }
        } catch (err) {}

        const matchedVehicle = vehicles.find(v => v._id === formVehicleId);
        const resolvedCreated = createdItem || {
          _id: 'exp_' + Date.now(),
          ...payload,
          vehicleId: matchedVehicle || formVehicleId,
          source: 'manual',
          createdAt: new Date().toISOString()
        };

        const updatedList = [resolvedCreated, ...manualExpenses];
        setManualExpenses(updatedList);
        syncManualExpensesLocal(updatedList);
        showToast('Expense record added successfully');
      }
      setExpenseModalOpen(false);
    } catch (err) {
      setFormError('Failed to save expense. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  /* ── Delete Expense ── */
  const handleConfirmDelete = async () => {
    if (!deleteConfirmExpense) return;
    try {
      fetch(`${API}/api/expenses/${deleteConfirmExpense._id}`, {
        method: 'DELETE',
        headers
      }).catch(() => {});

      const updatedList = manualExpenses.filter(e => e._id !== deleteConfirmExpense._id);
      setManualExpenses(updatedList);
      syncManualExpensesLocal(updatedList);
      showToast('Expense record deleted successfully');
    } catch (err) {
      showToast('Error removing expense', 'error');
    } finally {
      setDeleteConfirmExpense(null);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     UNIFIED EXPENSE RECORDS GENERATION
     STRICT REQUIREMENT: Service expenses are added ONLY when a
     service is marked "Completed" with finalized pricing.
     Scheduled, Pending, and Rescheduled bookings have ₹0 expenditure.
     ───────────────────────────────────────────────────────────── */
  const allExpenseRecords = useMemo(() => {
    const list = [];

    // 1. Service bookings (COMPLETED ONLY)
    bookings.forEach(b => {
      // Must strictly be Completed. Exclude Scheduled, Pending, In Progress, Cancelled
      if (b.status !== 'Completed') return;

      // Completion date determines the reporting expenditure month
      const completionDate = b.completedAt ? new Date(b.completedAt) : new Date(b.date);

      const pkgCost = b.finalPricing?.packageCost || b.packageSubtotal || b.packagePrice || 0;
      const extrasCost = b.finalPricing?.extraServicesCost || b.extraServicesSubtotal || (Array.isArray(b.extraServices) ? b.extraServices.reduce((s, ex) => s + (ex.price || 0), 0) : 0);

      list.push({
        _id: `booking_pkg_${b._id}`,
        bookingId: b._id,
        rawBooking: b,
        source: 'service_booking',
        isCompleted: true,
        vehicleId: b.vehicleId,
        date: completionDate,
        category: 'Service Package',
        description: `${b.packageName || 'Aero'} Service Package (${b.serviceQuantity ? (b.serviceQuantity === 1 ? '1st Service' : b.serviceQuantity === 2 ? '2nd Service' : b.serviceQuantity === 3 ? '3rd Service' : `${b.serviceQuantity}th Service`) : 'Completed'})`,
        amount: pkgCost,
        status: 'Completed',
        notes: b.garage?.name ? `Garage: ${b.garage.name}` : '',
      });

      if (extrasCost > 0) {
        const extraNames = Array.isArray(b.extraServices) && b.extraServices.length > 0
          ? b.extraServices.map(e => e.label).join(', ')
          : 'Additional Services';

        list.push({
          _id: `booking_extra_${b._id}`,
          bookingId: b._id,
          rawBooking: b,
          source: 'service_booking',
          isCompleted: true,
          vehicleId: b.vehicleId,
          date: completionDate,
          category: 'Extra Services',
          description: `Extra Services (${extraNames})`,
          amount: extrasCost,
          status: 'Completed',
          notes: `Completed booking #${b._id?.slice(-6).toUpperCase()}`,
        });
      }
    });

    // 2. Manual expenses (filter out any linked service_booking to prevent duplicates)
    manualExpenses
      .filter(m => m.source !== 'service_booking' && !m.bookingId)
      .forEach(m => {
        list.push({
          _id: m._id,
          rawManual: m,
          source: 'manual',
          isCompleted: true,
          vehicleId: m.vehicleId,
          date: new Date(m.date),
          category: m.category || 'Maintenance',
          description: m.description,
          amount: m.amount || 0,
          status: 'Recorded',
          notes: m.notes || '',
        });
      });

    return list;
  }, [bookings, manualExpenses]);

  /* ─────────────────────────────────────────────────────────────
     FILTERING & DATA SLICING
     ───────────────────────────────────────────────────────────── */
  const filteredRecords = useMemo(() => {
    return allExpenseRecords.filter(item => {
      const d = item.date;
      if (!(d instanceof Date) || isNaN(d)) return false;

      if (selectedYear !== 'All') {
        if (d.getFullYear() !== parseInt(selectedYear, 10)) return false;
      }

      if (selectedMonth !== 'All') {
        if (d.getMonth() + 1 !== parseInt(selectedMonth, 10)) return false;
      }

      if (selectedVehicle !== 'All') {
        const vId = item.vehicleId?._id || item.vehicleId;
        if (vId !== selectedVehicle) return false;
      }

      if (selectedCategory !== 'All') {
        if (item.category !== selectedCategory) return false;
      }

      if (searchQ.trim()) {
        const q = searchQ.toLowerCase();
        const v = typeof item.vehicleId === 'object' ? item.vehicleId : vehicles.find(veh => veh._id === item.vehicleId);
        const vText = `${v?.make || ''} ${v?.model || ''} ${v?.licensePlate || ''}`.toLowerCase();
        const descText = (item.description || '').toLowerCase();
        const notesText = (item.notes || '').toLowerCase();
        const catText = (item.category || '').toLowerCase();
        if (!vText.includes(q) && !descText.includes(q) && !notesText.includes(q) && !catText.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [allExpenseRecords, selectedYear, selectedMonth, selectedVehicle, selectedCategory, searchQ, vehicles]);

  const sortedHistoryRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      if (sortField === 'amount') {
        return sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      return sortDir === 'asc' ? a.date - b.date : b.date - a.date;
    });
    return list;
  }, [filteredRecords, sortField, sortDir]);

  /* ─────────────────────────────────────────────────────────────
     4 SUMMARY KPI CARDS
     ───────────────────────────────────────────────────────────── */
  const summaryMetrics = useMemo(() => {
    let totalExpenditure = 0;
    let totalServicePackage = 0;
    let totalExtraServices = 0;
    let otherExpenses = 0;
    const servicedVehicleIds = new Set();

    filteredRecords.forEach(rec => {
      totalExpenditure += rec.amount;

      if (rec.category === 'Service Package') {
        totalServicePackage += rec.amount;
      } else if (rec.category === 'Extra Services') {
        totalExtraServices += rec.amount;
      } else {
        otherExpenses += rec.amount;
      }

      const vId = rec.vehicleId?._id || rec.vehicleId;
      if (vId) servicedVehicleIds.add(String(vId));
    });

    return {
      totalExpenditure,
      totalServicePackage,
      totalExtraServices,
      otherExpenses,
      vehiclesServicedCount: servicedVehicleIds.size,
    };
  }, [filteredRecords]);

  /* ─────────────────────────────────────────────────────────────
     VEHICLE-BY-VEHICLE EXPENDITURE BREAKDOWN
     ───────────────────────────────────────────────────────────── */
  const vehicleExpenditureTable = useMemo(() => {
    return vehicles.map(v => {
      const vRecords = filteredRecords.filter(r => {
        const vId = r.vehicleId?._id || r.vehicleId;
        return vId === v._id;
      });

      const totalMonthlyExpenditure = vRecords.reduce((sum, r) => sum + r.amount, 0);
      const servicePackageExpenses = vRecords
        .filter(r => r.category === 'Service Package')
        .reduce((sum, r) => sum + r.amount, 0);
      const extraServiceExpenses = vRecords
        .filter(r => r.category === 'Extra Services')
        .reduce((sum, r) => sum + r.amount, 0);
      const manualCategoryExpenses = vRecords
        .filter(r => r.source === 'manual')
        .reduce((sum, r) => sum + r.amount, 0);

      const completedServicesCount = bookings.filter(b => {
        const vId = b.vehicleId?._id || b.vehicleId;
        if (vId !== v._id) return false;
        if (b.status !== 'Completed') return false;
        const d = b.completedAt ? new Date(b.completedAt) : new Date(b.date);
        if (selectedYear !== 'All' && d.getFullYear() !== parseInt(selectedYear, 10)) return false;
        if (selectedMonth !== 'All' && d.getMonth() + 1 !== parseInt(selectedMonth, 10)) return false;
        return true;
      }).length;

      return {
        vehicle: v,
        totalMonthlyExpenditure,
        servicePackageExpenses,
        extraServiceExpenses,
        manualCategoryExpenses,
        completedServicesCount,
        records: vRecords,
      };
    });
  }, [vehicles, filteredRecords, bookings, selectedYear, selectedMonth]);

  const combinedVehicleTotals = useMemo(() => {
    return vehicleExpenditureTable.reduce((acc, row) => ({
      totalMonthlyExpenditure: acc.totalMonthlyExpenditure + row.totalMonthlyExpenditure,
      servicePackageExpenses: acc.servicePackageExpenses + row.servicePackageExpenses,
      extraServiceExpenses: acc.extraServiceExpenses + row.extraServiceExpenses,
      manualCategoryExpenses: acc.manualCategoryExpenses + row.manualCategoryExpenses,
      completedServicesCount: acc.completedServicesCount + row.completedServicesCount,
    }), {
      totalMonthlyExpenditure: 0,
      servicePackageExpenses: 0,
      extraServiceExpenses: 0,
      manualCategoryExpenses: 0,
      completedServicesCount: 0,
    });
  }, [vehicleExpenditureTable]);

  /* ─────────────────────────────────────────────────────────────
     ANALYTICS DATA
     ───────────────────────────────────────────────────────────── */
  const monthly12Trend = useMemo(() => {
    const yr = selectedYear !== 'All' ? parseInt(selectedYear, 10) : now.getFullYear();
    const monthsData = [];

    for (let m = 1; m <= 12; m++) {
      let pkgSum = 0;
      let extraSum = 0;
      let manualSum = 0;

      allExpenseRecords.forEach(r => {
        const d = r.date;
        if (d instanceof Date && !isNaN(d) && d.getFullYear() === yr && (d.getMonth() + 1) === m) {
          if (selectedVehicle !== 'All') {
            const vId = r.vehicleId?._id || r.vehicleId;
            if (vId !== selectedVehicle) return;
          }
          if (r.category === 'Service Package') pkgSum += r.amount;
          else if (r.category === 'Extra Services') extraSum += r.amount;
          else manualSum += r.amount;
        }
      });

      const total = pkgSum + extraSum + manualSum;
      monthsData.push({
        monthNum: m,
        monthName: MONTH_SHORT[m - 1],
        fullMonth: MONTH_NAMES[m - 1],
        total,
        pkgSum,
        extraSum,
        manualSum,
        year: yr
      });
    }

    const maxVal = Math.max(...monthsData.map(d => d.total), 1);
    return { monthsData, maxVal, year: yr };
  }, [allExpenseRecords, selectedYear, selectedVehicle]);

  const vehicleComparisonData = useMemo(() => {
    const total = summaryMetrics.totalExpenditure || 1;
    return vehicleExpenditureTable
      .filter(row => row.totalMonthlyExpenditure > 0)
      .sort((a, b) => b.totalMonthlyExpenditure - a.totalMonthlyExpenditure)
      .map(row => ({
        id: row.vehicle._id,
        name: `${row.vehicle.make} ${row.vehicle.model}`,
        plate: row.vehicle.licensePlate,
        make: row.vehicle.make,
        amount: row.totalMonthlyExpenditure,
        pct: Math.round((row.totalMonthlyExpenditure / total) * 100),
      }));
  }, [vehicleExpenditureTable, summaryMetrics.totalExpenditure]);

  const categoryBreakdownList = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      const cat = r.category || 'Other';
      map[cat] = (map[cat] || 0) + r.amount;
    });

    const total = summaryMetrics.totalExpenditure || 1;
    return Object.entries(map)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        pct: Math.round((amt / total) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredRecords, summaryMetrics.totalExpenditure]);

  /* ── Export CSV Handler ── */
  const handleExportCSV = () => {
    const headers = ['Date', 'Vehicle', 'License Plate', 'Description', 'Category', 'Source', 'Amount (INR)', 'Status', 'Notes'];
    const rows = sortedHistoryRecords.map(r => {
      const v = typeof r.vehicleId === 'object' ? r.vehicleId : vehicles.find(veh => veh._id === r.vehicleId);
      const vName = v ? `${v.make} ${v.model}` : 'Unknown Vehicle';
      const vPlate = v?.licensePlate || '';
      const dStr = r.date instanceof Date && !isNaN(r.date) ? r.date.toLocaleDateString('en-IN') : '';
      return [
        `"${dStr}"`,
        `"${vName}"`,
        `"${vPlate}"`,
        `"${(r.description || '').replace(/"/g, '""')}"`,
        `"${r.category}"`,
        `"${r.source === 'service_booking' ? 'Service Booking' : 'Manual Entry'}"`,
        r.amount,
        `"${r.status}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const mStr = selectedMonth !== 'All' ? MONTH_NAMES[selectedMonth - 1] : 'FullYear';
    link.setAttribute('download', `AeroFleet_Expenditure_${mStr}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Expenditure report exported to CSV');
  };

  /* ─────────────────────────────────────────────────────────────
     RENDER
     ───────────────────────────────────────────────────────────── */
  return (
    <div className="r-page-wrap">
      <Sidebar />

      <div className="r-content" style={{ background: dark ? '#0a0a0a' : '#f1f5f9' }}>
        <Topbar onSearch={setSearchQ} />

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px 32px 32px', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 100px)' }}>

            {/* ── Page Header ── */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              marginBottom: 20
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h1 style={{
                    fontSize: 28,
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    margin: 0,
                    color: dark ? '#f0f0f0' : '#0f172a'
                  }}>
                    Monthly Expenditure
                  </h1>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: dark ? 'rgba(37,99,235,0.2)' : '#dbeafe',
                    color: dark ? '#93c5fd' : '#1d4ed8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {selectedMonth !== 'All' ? MONTH_NAMES[selectedMonth - 1] : 'All Months'} {selectedYear}
                  </span>
                </div>
                <p style={{
                  fontSize: 13,
                  color: dark ? '#6b7280' : '#64748b',
                  margin: '4px 0 0',
                }}>
                  Track, analyze, and manage service and maintenance costs across all added vehicles in your fleet.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={handleExportCSV}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 15px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    background: dark ? '#111111' : '#ffffff',
                    color: dark ? '#e4e4e7' : '#334155',
                    border: `1px solid ${dark ? '#1c1c1c' : '#cbd5e1'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#2563eb'}
                  onMouseOut={e => e.currentTarget.style.borderColor = dark ? '#1c1c1c' : '#cbd5e1'}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M2.5 10.5v3a1 1 0 001 1h9a1 1 0 001-1v-3M8 1.5v9M4.5 7.5L8 11l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Export CSV
                </button>

                <button
                  onClick={handleOpenAddModal}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '9px 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                    transition: 'background 0.15s, transform 0.1s',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#1d4ed8'}
                  onMouseOut={e => e.currentTarget.style.background = '#2563eb'}
                >
                  <span style={{ fontSize: 16, lineHeight: 1, fontWeight: 700 }}>+</span>
                  Add Expense
                </button>
              </div>
            </div>

            {/* ── Filters Bar ── */}
            <div style={{
              background: dark ? '#111111' : '#ffffff',
              borderRadius: 14,
              border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              padding: '14px 20px',
              marginBottom: 20,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, flex: 1 }}>
                {/* Month Filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.08em' }}>
                    Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value === 'All' ? 'All' : parseInt(e.target.value, 10))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      background: dark ? '#161616' : '#f8fafc',
                      color: dark ? '#f0f0f0' : '#0f172a',
                      border: `1px solid ${dark ? '#222226' : '#cbd5e1'}`,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="All">All Months</option>
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={name} value={idx + 1}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Year Filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.08em' }}>
                    Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(e.target.value === 'All' ? 'All' : parseInt(e.target.value, 10))}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      background: dark ? '#161616' : '#f8fafc',
                      color: dark ? '#f0f0f0' : '#0f172a',
                      border: `1px solid ${dark ? '#222226' : '#cbd5e1'}`,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                    <option value={2024}>2024</option>
                    <option value="All">All Years</option>
                  </select>
                </div>

                {/* Vehicle Filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.08em' }}>
                    Vehicle
                  </label>
                  <select
                    value={selectedVehicle}
                    onChange={e => setSelectedVehicle(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      background: dark ? '#161616' : '#f8fafc',
                      color: dark ? '#f0f0f0' : '#0f172a',
                      border: `1px solid ${dark ? '#222226' : '#cbd5e1'}`,
                      outline: 'none',
                      cursor: 'pointer',
                      maxWidth: 240,
                    }}
                  >
                    <option value="All">All Vehicles ({vehicles.length})</option>
                    {vehicles.map(v => (
                      <option key={v._id} value={v._id}>
                        {v.make} {v.model} ({v.licensePlate})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.08em' }}>
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      background: dark ? '#161616' : '#f8fafc',
                      color: dark ? '#f0f0f0' : '#0f172a',
                      border: `1px solid ${dark ? '#222226' : '#cbd5e1'}`,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {ALL_FILTER_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reset Filters */}
              {(selectedMonth !== now.getMonth() + 1 || selectedYear !== now.getFullYear() || selectedVehicle !== 'All' || selectedCategory !== 'All') && (
                <button
                  onClick={() => {
                    setSelectedMonth(now.getMonth() + 1);
                    setSelectedYear(now.getFullYear());
                    setSelectedVehicle('All');
                    setSelectedCategory('All');
                  }}
                  style={{
                    padding: '7px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'none',
                    border: `1px dashed ${dark ? '#3f3f46' : '#94a3b8'}`,
                    color: dark ? '#a1a1aa' : '#64748b',
                    borderRadius: 6,
                    cursor: 'pointer',
                    alignSelf: 'flex-end',
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* ── 4 Summary Stat Cards ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              marginBottom: 24
            }}>
              {/* Card 1: Total Monthly Expenditure */}
              <div style={{
                background: dark ? '#111111' : '#ffffff',
                border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                borderRadius: 14,
                padding: '22px 24px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: 'linear-gradient(90deg, #2563eb, #60a5fa)'
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.14em' }}>
                    TOTAL MONTHLY EXPENDITURE
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                      <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="#3b82f6" strokeWidth="1.4"/>
                      <circle cx="8" cy="8" r="2.2" stroke="#3b82f6" strokeWidth="1.4"/>
                      <path d="M4 8h1M11 8h1" stroke="#3b82f6" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                <div style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: dark ? '#f0f0f0' : '#0f172a',
                  letterSpacing: '-0.03em',
                  lineHeight: 1
                }}>
                  {loading ? '...' : formatINR(summaryMetrics.totalExpenditure)}
                </div>
                <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8', marginTop: 8 }}>
                  Across {vehicles.length} registered {vehicles.length === 1 ? 'vehicle' : 'vehicles'} in fleet
                </div>
              </div>

              {/* Card 2: Total Service Expenses */}
              <div style={{
                background: dark ? '#111111' : '#ffffff',
                border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                borderRadius: 14,
                padding: '22px 24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.14em' }}>
                    SERVICE PACKAGE EXPENSES
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6.5" stroke="#3b82f6" strokeWidth="1.4"/>
                      <path d="M8 4.5V8l2.5 2" stroke="#3b82f6" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                <div style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: dark ? '#f0f0f0' : '#0f172a',
                  letterSpacing: '-0.03em',
                  lineHeight: 1
                }}>
                  {loading ? '...' : formatINR(summaryMetrics.totalServicePackage)}
                </div>
                <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8', marginTop: 8 }}>
                  Periodic Aero, Pro, and Elite service packages
                </div>
              </div>

              {/* Card 3: Extra Service Expenses */}
              <div style={{
                background: dark ? '#111111' : '#ffffff',
                border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                borderRadius: 14,
                padding: '22px 24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.14em' }}>
                    EXTRA SERVICE EXPENSES
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2v12M2 8h12" stroke="#10b981" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                <div style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: dark ? '#f0f0f0' : '#0f172a',
                  letterSpacing: '-0.03em',
                  lineHeight: 1
                }}>
                  {loading ? '...' : formatINR(summaryMetrics.totalExtraServices)}
                </div>
                <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8', marginTop: 8 }}>
                  Car wash, alignment, deep cleaning & diagnostics
                </div>
              </div>

              {/* Card 4: Vehicles Serviced */}
              <div style={{
                background: dark ? '#111111' : '#ffffff',
                border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                borderRadius: 14,
                padding: '22px 24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', letterSpacing: '0.14em' }}>
                    VEHICLES SERVICED
                  </div>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                      <path d="M2 14V8a2 2 0 012-2h9a2 2 0 012 2v6" stroke="#f59e0b" strokeWidth="1.6"/>
                      <path d="M15 10h2.5l2.5 2.5V14h-5V10z" stroke="#f59e0b" strokeWidth="1.6" strokeLinejoin="round"/>
                      <circle cx="6"  cy="15.5" r="1.8" stroke="#f59e0b" strokeWidth="1.6"/>
                      <circle cx="16" cy="15.5" r="1.8" stroke="#f59e0b" strokeWidth="1.6"/>
                    </svg>
                  </div>
                </div>
                <div style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: dark ? '#f0f0f0' : '#0f172a',
                  letterSpacing: '-0.03em',
                  lineHeight: 1
                }}>
                  {loading ? '...' : `${summaryMetrics.vehiclesServicedCount} / ${vehicles.length}`}
                </div>
                <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8', marginTop: 8 }}>
                  Unique vehicles with recorded costs in this period
                </div>
              </div>
            </div>

            {/* ── Analytics Section ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 20,
              marginBottom: 24
            }}>
              {/* Chart 1: Monthly Trend Bar Chart */}
              <div style={{
                background: dark ? '#111111' : '#ffffff',
                borderRadius: 14,
                padding: '20px 22px',
                border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: dark ? '#f0f0f0' : '#0f172a' }}>
                      12-Month Expenditure Trend
                    </h3>
                    <span style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b' }}>
                      Click any month bar to filter dashboard
                    </span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>
                    Year {monthly12Trend.year}
                  </span>
                </div>

                <div style={{ flex: 1, minHeight: 170, display: 'flex', alignItems: 'flex-end', gap: 6, paddingTop: 16 }}>
                  {monthly12Trend.monthsData.map((mObj) => {
                    const isSelected = selectedMonth === mObj.monthNum;
                    const heightPercent = Math.max(8, Math.round((mObj.total / monthly12Trend.maxVal) * 100));
                    const isHovered = hoveredMonthBar === mObj.monthNum;

                    return (
                      <div
                        key={mObj.monthNum}
                        onClick={() => setSelectedMonth(mObj.monthNum)}
                        onMouseEnter={() => setHoveredMonthBar(mObj.monthNum)}
                        onMouseLeave={() => setHoveredMonthBar(null)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                      >
                        {isHovered && (
                          <div style={{
                            position: 'absolute',
                            bottom: '100%',
                            marginBottom: 8,
                            background: dark ? '#1f2937' : '#0f172a',
                            color: '#ffffff',
                            padding: '6px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            zIndex: 20,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                            pointerEvents: 'none'
                          }}>
                            <div>{mObj.fullMonth}: {formatINR(mObj.total)}</div>
                            <div style={{ fontSize: 9, opacity: 0.8, marginTop: 2 }}>
                              Pkg: {formatINR(mObj.pkgSum)} · Extras: {formatINR(mObj.extraSum)}
                            </div>
                          </div>
                        )}

                        <div style={{
                          width: '100%',
                          height: `${heightPercent}%`,
                          background: isSelected
                            ? 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)'
                            : mObj.total > 0
                              ? (dark ? '#27272a' : '#cbd5e1')
                              : (dark ? '#1c1c1f' : '#f1f5f9'),
                          borderRadius: '4px 4px 2px 2px',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          border: isSelected ? '1px solid #60a5fa' : 'none'
                        }} />

                        <span style={{
                          fontSize: 10,
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? '#3b82f6' : (dark ? '#6b7280' : '#94a3b8'),
                          letterSpacing: '0.02em'
                        }}>
                          {mObj.monthName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 2: Vehicle-Wise Expenditure Share */}
              <div style={{
                background: dark ? '#111111' : '#ffffff',
                borderRadius: 14,
                padding: '20px 22px',
                border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: dark ? '#f0f0f0' : '#0f172a' }}>
                      Vehicle-Wise Expenditure
                    </h3>
                    <span style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b' }}>
                      Cost distribution across fleet for this period
                    </span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: dark ? '#6b7280' : '#64748b' }}>
                    {vehicleComparisonData.length} active {vehicleComparisonData.length === 1 ? 'car' : 'cars'}
                  </span>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
                  {vehicleComparisonData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13 }}>
                      No recorded vehicle expenses for this period.
                    </div>
                  ) : (
                    vehicleComparisonData.slice(0, 5).map(item => (
                      <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                          <span style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <BrandLogo brand={item.make} size={16} />
                            {item.name}
                            <span style={{ fontSize: 10, color: dark ? '#6b7280' : '#94a3b8', fontFamily: 'monospace' }}>
                              {item.plate}
                            </span>
                          </span>
                          <span style={{ fontWeight: 700, color: dark ? '#e4e4e7' : '#1e293b' }}>
                            {formatINR(item.amount)} <span style={{ fontSize: 11, fontWeight: 500, color: '#3b82f6' }}>({item.pct}%)</span>
                          </span>
                        </div>
                        <div style={{
                          width: '100%',
                          height: 7,
                          background: dark ? '#1c1c1f' : '#f1f5f9',
                          borderRadius: 4,
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${item.pct}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
                            borderRadius: 4
                          }} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Chart 3: Category Breakdown */}
              <div style={{
                background: dark ? '#111111' : '#ffffff',
                borderRadius: 14,
                padding: '20px 22px',
                border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: dark ? '#f0f0f0' : '#0f172a' }}>
                      Expense Categories
                    </h3>
                    <span style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b' }}>
                      Packages, add-ons & maintenance
                    </span>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                  {categoryBreakdownList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13 }}>
                      No categorized expenses recorded yet.
                    </div>
                  ) : (
                    categoryBreakdownList.map(catItem => {
                      const styling = CATEGORY_COLORS[catItem.category] || CATEGORY_COLORS['Other'];
                      return (
                        <div key={catItem.category} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 10px',
                          borderRadius: 6,
                          background: dark ? '#161616' : '#f8fafc',
                          border: `1px solid ${dark ? '#222226' : '#e2e8f0'}`
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              padding: '2px 7px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              background: styling.bg,
                              color: styling.text,
                              border: `1px solid ${styling.border}`
                            }}>
                              {catItem.category}
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                              {formatINR(catItem.amount)}
                            </span>
                            <span style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8', marginLeft: 6 }}>
                              ({catItem.pct}%)
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ── Vehicle Breakdown Table ── */}
            <div style={{
              background: dark ? '#111111' : '#ffffff',
              borderRadius: 14,
              border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              overflow: 'hidden',
              marginBottom: 24,
            }}>
              <div style={{
                padding: '16px 22px',
                borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                background: dark ? '#0f0f0f' : '#f8fafc',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12
              }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: dark ? '#f0f0f0' : '#0f172a' }}>
                    Fleet Vehicle Breakdown
                  </h2>
                  <p style={{ fontSize: 12, color: dark ? '#6b7280' : '#64748b', margin: '2px 0 0' }}>
                    Total expenditure tracked separately for every added car in your fleet
                  </p>
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: dark ? '#1c1c1c' : '#f1f5f9',
                  color: dark ? '#93c5fd' : '#2563eb'
                }}>
                  {vehicles.length} Vehicles
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{
                      background: dark ? '#161616' : '#f8fafc',
                      borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                      color: dark ? '#6b7280' : '#94a3b8',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase'
                    }}>
                      <th style={{ padding: '12px 20px' }}>Vehicle</th>
                      <th style={{ padding: '12px 16px' }}>Registration</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Service Packages</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Extra Services</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Completed Services</th>
                      <th style={{ padding: '12px 20px', textAlign: 'right' }}>Monthly Expenditure</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicleExpenditureTable.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '32px 20px', textAlign: 'center', color: dark ? '#6b7280' : '#94a3b8' }}>
                          No vehicles added yet. Please add a vehicle to track expenditure.
                        </td>
                      </tr>
                    ) : (
                      vehicleExpenditureTable.map((row) => {
                        const isExpanded = expandedCarId === row.vehicle._id;
                        return (
                          <React.Fragment key={row.vehicle._id}>
                            <tr
                              style={{
                                borderBottom: `1px solid ${dark ? '#181818' : '#f1f5f9'}`,
                                background: isExpanded ? (dark ? '#161616' : '#f8fafc') : 'transparent',
                                transition: 'background 0.15s'
                              }}
                            >
                              <td style={{ padding: '14px 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <BrandLogo brand={row.vehicle.make} size={32} />
                                  <div>
                                    <div style={{ fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                                      {row.vehicle.make} {row.vehicle.model}
                                    </div>
                                    <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>
                                      {row.vehicle.year || '2023'} {row.vehicle.variant ? `· ${row.vehicle.variant}` : ''}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td style={{ padding: '14px 16px' }}>
                                <span style={{
                                  fontFamily: 'monospace',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: 4,
                                  background: dark ? '#1c1c1c' : '#e2e8f0',
                                  color: dark ? '#e4e4e7' : '#1e293b',
                                  letterSpacing: '0.05em'
                                }}>
                                  {row.vehicle.licensePlate || 'N/A'}
                                </span>
                              </td>

                              <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: dark ? '#d4d4d8' : '#334155' }}>
                                {formatINR(row.servicePackageExpenses)}
                              </td>

                              <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: dark ? '#d4d4d8' : '#334155' }}>
                                {formatINR(row.extraServiceExpenses)}
                              </td>

                              <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: 10,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: row.completedServicesCount > 0 ? (dark ? 'rgba(16,185,129,0.15)' : '#ecfdf5') : (dark ? '#1c1c1c' : '#f1f5f9'),
                                  color: row.completedServicesCount > 0 ? '#10b981' : (dark ? '#6b7280' : '#94a3b8')
                                }}>
                                  {row.completedServicesCount}
                                </span>
                              </td>

                              <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                <span style={{
                                  fontSize: 15,
                                  fontWeight: 800,
                                  color: dark ? '#f0f0f0' : '#0f172a',
                                  letterSpacing: '-0.02em'
                                }}>
                                  {formatINR(row.totalMonthlyExpenditure)}
                                </span>
                              </td>

                              <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                <button
                                  onClick={() => setExpandedCarId(isExpanded ? null : row.vehicle._id)}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background: isExpanded ? '#2563eb' : (dark ? '#1c1c1c' : '#e2e8f0'),
                                    color: isExpanded ? '#ffffff' : (dark ? '#d4d4d8' : '#334155'),
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  {isExpanded ? 'Hide Items' : `View (${row.records.length})`}
                                </button>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr style={{ background: dark ? '#131313' : '#f8fafc' }}>
                                <td colSpan={7} style={{ padding: '16px 24px', borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}` }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: dark ? '#9ca3af' : '#64748b' }}>
                                    Itemized Expense Records for {row.vehicle.make} {row.vehicle.model} ({row.vehicle.licensePlate}):
                                  </div>
                                  {row.records.length === 0 ? (
                                    <div style={{ fontSize: 12, color: dark ? '#6b7280' : '#94a3b8', fontStyle: 'italic' }}>
                                      No expense records found for the selected period.
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                      {row.records.map(rec => (
                                        <div
                                          key={rec._id}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            borderRadius: 6,
                                            background: dark ? '#181818' : '#ffffff',
                                            border: `1px solid ${dark ? '#222226' : '#e2e8f0'}`,
                                            fontSize: 12
                                          }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ color: dark ? '#6b7280' : '#94a3b8', fontFamily: 'monospace' }}>
                                              {rec.date.toLocaleDateString('en-IN')}
                                            </span>
                                            <span style={{
                                              padding: '2px 6px',
                                              borderRadius: 4,
                                              fontSize: 10,
                                              fontWeight: 600,
                                              background: (CATEGORY_COLORS[rec.category] || CATEGORY_COLORS['Other']).bg,
                                              color: (CATEGORY_COLORS[rec.category] || CATEGORY_COLORS['Other']).text
                                            }}>
                                              {rec.category}
                                            </span>
                                            <span style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                                              {rec.description}
                                            </span>
                                            {rec.notes && (
                                              <span style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>
                                                ({rec.notes})
                                              </span>
                                            )}
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                                              {formatINR(rec.amount)}
                                            </span>
                                            {rec.source === 'service_booking' && (
                                              <button
                                                onClick={() => setBookingDetailsModal(rec.rawBooking)}
                                                style={{
                                                  fontSize: 10, padding: '2px 6px', borderRadius: 4,
                                                  background: 'none', border: `1px solid ${dark ? '#2e2e32' : '#cbd5e1'}`,
                                                  color: '#3b82f6', cursor: 'pointer'
                                                }}
                                              >
                                                Booking Info
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}

                    {/* Combined Total Row */}
                    <tr style={{
                      background: dark ? '#141414' : '#f1f5f9',
                      borderTop: `2px solid ${dark ? '#222226' : '#cbd5e1'}`,
                      fontWeight: 800
                    }}>
                      <td style={{ padding: '16px 20px', color: dark ? '#ffffff' : '#0f172a', fontSize: 14 }}>
                        Total Fleet Expenditure
                      </td>
                      <td style={{ padding: '16px 16px', color: dark ? '#9ca3af' : '#64748b', fontSize: 12 }}>
                        {vehicles.length} Cars Combined
                      </td>
                      <td style={{ padding: '16px 16px', textAlign: 'right', color: dark ? '#e4e4e7' : '#1e293b' }}>
                        {formatINR(combinedVehicleTotals.servicePackageExpenses)}
                      </td>
                      <td style={{ padding: '16px 16px', textAlign: 'right', color: dark ? '#e4e4e7' : '#1e293b' }}>
                        {formatINR(combinedVehicleTotals.extraServiceExpenses)}
                      </td>
                      <td style={{ padding: '16px 16px', textAlign: 'center', color: '#10b981' }}>
                        {combinedVehicleTotals.completedServicesCount}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right', fontSize: 17, color: dark ? '#ffffff' : '#0f172a' }}>
                        {formatINR(combinedVehicleTotals.totalMonthlyExpenditure)}
                      </td>
                      <td style={{ padding: '16px 16px' }} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Expense Ledger Table ── */}
            <div style={{
              background: dark ? '#111111' : '#ffffff',
              borderRadius: 14,
              border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '16px 22px',
                borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                background: dark ? '#0f0f0f' : '#f8fafc',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12
              }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: dark ? '#f0f0f0' : '#0f172a' }}>
                    Expense History & Ledger
                  </h2>
                  <p style={{ fontSize: 12, color: dark ? '#6b7280' : '#64748b', margin: '2px 0 0' }}>
                    All completed service bookings and manual maintenance expenses
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Search vehicle, category, desc..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      background: dark ? '#161616' : '#f8fafc',
                      color: dark ? '#f0f0f0' : '#0f172a',
                      border: `1px solid ${dark ? '#222226' : '#cbd5e1'}`,
                      outline: 'none',
                      width: 220
                    }}
                  />

                  <select
                    value={`${sortField}-${sortDir}`}
                    onChange={e => {
                      const [f, d] = e.target.value.split('-');
                      setSortField(f);
                      setSortDir(d);
                    }}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 8,
                      fontSize: 12,
                      background: dark ? '#161616' : '#f8fafc',
                      color: dark ? '#f0f0f0' : '#0f172a',
                      border: `1px solid ${dark ? '#222226' : '#cbd5e1'}`,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="date-desc">Newest Date First</option>
                    <option value="date-asc">Oldest Date First</option>
                    <option value="amount-desc">Highest Amount</option>
                    <option value="amount-asc">Lowest Amount</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{
                      background: dark ? '#161616' : '#f8fafc',
                      borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                      color: dark ? '#6b7280' : '#94a3b8',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase'
                    }}>
                      <th style={{ padding: '12px 20px' }}>Date</th>
                      <th style={{ padding: '12px 16px' }}>Vehicle</th>
                      <th style={{ padding: '12px 16px' }}>Service / Item</th>
                      <th style={{ padding: '12px 16px' }}>Category</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '12px 16px' }}>Status / Source</th>
                      <th style={{ padding: '12px 20px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHistoryRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '32px 20px', textAlign: 'center', color: dark ? '#6b7280' : '#94a3b8' }}>
                          No expense records match your current filters.
                        </td>
                      </tr>
                    ) : (
                      sortedHistoryRecords.map(rec => {
                        const v = typeof rec.vehicleId === 'object' ? rec.vehicleId : vehicles.find(veh => veh._id === rec.vehicleId);
                        const styling = CATEGORY_COLORS[rec.category] || CATEGORY_COLORS['Other'];

                        return (
                          <tr
                            key={rec._id}
                            style={{
                              borderBottom: `1px solid ${dark ? '#181818' : '#f1f5f9'}`,
                              transition: 'background 0.15s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = dark ? '#161616' : '#f8fafc'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '12px 20px', whiteSpace: 'nowrap', color: dark ? '#d4d4d8' : '#334155' }}>
                              {rec.date instanceof Date && !isNaN(rec.date)
                                ? rec.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                : 'N/A'}
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              {v ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <BrandLogo brand={v.make} size={24} />
                                  <div>
                                    <div style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a', fontSize: 13 }}>
                                      {v.make} {v.model}
                                    </div>
                                    <div style={{ fontSize: 10, color: dark ? '#6b7280' : '#94a3b8', fontFamily: 'monospace' }}>
                                      {v.licensePlate}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: dark ? '#6b7280' : '#94a3b8' }}>Fleet Vehicle</span>
                              )}
                            </td>

                            <td style={{ padding: '12px 16px', maxWidth: 260 }}>
                              <div style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                                {rec.description}
                              </div>
                              {rec.notes && (
                                <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8', marginTop: 2 }}>
                                  {rec.notes}
                                </div>
                              )}
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                padding: '2px 7px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                background: styling.bg,
                                color: styling.text,
                                border: `1px solid ${styling.border}`,
                                whiteSpace: 'nowrap'
                              }}>
                                {rec.category}
                              </span>
                            </td>

                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, fontSize: 14, color: dark ? '#f0f0f0' : '#0f172a' }}>
                              {formatINR(rec.amount)}
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  alignSelf: 'flex-start',
                                  background: rec.isCompleted
                                    ? (dark ? 'rgba(16,185,129,0.15)' : '#ecfdf5')
                                    : (dark ? 'rgba(245,158,11,0.15)' : '#fffbeb'),
                                  color: rec.isCompleted ? '#10b981' : '#f59e0b',
                                }}>
                                  {rec.isCompleted ? 'Completed' : (rec.status || 'Pending')}
                                </span>
                                <span style={{ fontSize: 9, color: dark ? '#6b7280' : '#94a3b8', textTransform: 'uppercase' }}>
                                  {rec.source === 'service_booking' ? 'Service Booking' : 'Manual Entry'}
                                </span>
                              </div>
                            </td>

                            <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                              {rec.source === 'service_booking' ? (
                                <button
                                  onClick={() => setBookingDetailsModal(rec.rawBooking)}
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background: dark ? '#181818' : '#f1f5f9',
                                    color: '#3b82f6',
                                    border: `1px solid ${dark ? '#27272a' : '#cbd5e1'}`,
                                    cursor: 'pointer'
                                  }}
                                >
                                  View Details
                                </button>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                  <button
                                    onClick={() => handleOpenEditModal(rec.rawManual || rec)}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      background: dark ? '#1c1c1c' : '#e2e8f0',
                                      color: dark ? '#e4e4e7' : '#334155',
                                      border: 'none',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmExpense(rec.rawManual || rec)}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: 4,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      background: 'rgba(239, 68, 68, 0.15)',
                                      color: '#ef4444',
                                      border: 'none',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
          <AppFooter />
        </div>
      </div>

      {/* ── MODAL: ADD / EDIT EXPENSE ── */}
      {expenseModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 16
        }}>
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            borderRadius: 14,
            width: '100%',
            maxWidth: 480,
            border: `1px solid ${dark ? '#222226' : '#e2e8f0'}`,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                {editingExpense ? 'Edit Manual Expense' : 'Add Maintenance Expense'}
              </h3>
              <button
                onClick={() => setExpenseModalOpen(false)}
                style={{
                  background: 'none', border: 'none', fontSize: 18,
                  color: dark ? '#6b7280' : '#94a3b8', cursor: 'pointer', lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {formError && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  fontSize: 12,
                  fontWeight: 600
                }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: dark ? '#6b7280' : '#64748b' }}>
                  Select Vehicle *
                </label>
                <select
                  value={formVehicleId}
                  onChange={e => setFormVehicleId(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    background: dark ? '#161616' : '#f8fafc',
                    color: dark ? '#f0f0f0' : '#0f172a',
                    border: `1px solid ${dark ? '#222226' : '#cbd5e1'}`,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                  required
                >
                  <option value="" disabled>Choose a vehicle from your fleet</option>
                  {vehicles.map(v => (
                    <option key={v._id} value={v._id}>
                      {v.make} {v.model} · {v.licensePlate}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: dark ? '#6b7280' : '#64748b' }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      background: dark ? '#161616' : '#f8fafc',
                      color: dark ? '#f0f0f0' : '#0f172a',
                      border: `1px solid ${dark ? '#222226' : '#cbd5e1'}`,
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: dark ? '#6b7280' : '#64748b' }}>
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 13,
                      background: dark ? '#161616' : '#f8fafc',
                      color: dark ? '#f0f0f0' : '#0f172a',
                      border: `1px solid ${dark ? '#222226' : '#cbd5e1'}`,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {MANUAL_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: dark ? '#6b7280' : '#64748b' }}>
                  Description *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fuel Refill, Front Brake Replacement, Comprehensive Insurance"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    background: dark ? '#161616' : '#f8fafc',
                    color: dark ? '#f0f0f0' : '#0f172a',
                    border: `1px solid ${dark ? '#222226' : '#cbd5e1'}`,
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: dark ? '#6b7280' : '#64748b' }}>
                  Amount in ₹ *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 700,
                    color: dark ? '#6b7280' : '#94a3b8'
                  }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    style={{
                      padding: '9px 12px 9px 28px',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      background: dark ? '#161616' : '#f8fafc',
                      color: dark ? '#f0f0f0' : '#0f172a',
                      border: `1px solid ${dark ? '#222226' : '#cbd5e1'}`,
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: dark ? '#6b7280' : '#64748b' }}>
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Receipt number, workshop name, or specific part details..."
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    background: dark ? '#161616' : '#f8fafc',
                    color: dark ? '#f0f0f0' : '#0f172a',
                    border: `1px solid ${dark ? '#222226' : '#cbd5e1'}`,
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    background: dark ? '#1c1c1c' : '#e2e8f0',
                    color: dark ? '#e4e4e7' : '#334155',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    cursor: formSubmitting ? 'not-allowed' : 'pointer',
                    opacity: formSubmitting ? 0.7 : 1
                  }}
                >
                  {formSubmitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRM DELETE ── */}
      {deleteConfirmExpense && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 16
        }}>
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            borderRadius: 14,
            width: '100%',
            maxWidth: 400,
            padding: 24,
            border: `1px solid ${dark ? '#222226' : '#e2e8f0'}`,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            textAlign: 'center'
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              margin: '0 auto 16px'
            }}>
              ⚠
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
              Delete Expense Record?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: dark ? '#6b7280' : '#64748b' }}>
              Are you sure you want to remove "{deleteConfirmExpense.description}" ({formatINR(deleteConfirmExpense.amount)})? This will adjust your monthly total.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteConfirmExpense(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  background: dark ? '#1c1c1c' : '#e2e8f0',
                  color: dark ? '#e4e4e7' : '#334155',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: BOOKING DETAILS ── */}
      {bookingDetailsModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 16
        }}>
          <div style={{
            background: dark ? '#111111' : '#ffffff',
            borderRadius: 14,
            width: '100%',
            maxWidth: 500,
            border: `1px solid ${dark ? '#222226' : '#e2e8f0'}`,
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                  Service Booking Details
                </h3>
                <span style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8', fontFamily: 'monospace' }}>
                  ID: #{bookingDetailsModal._id?.slice(-8).toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setBookingDetailsModal(null)}
                style={{
                  background: 'none', border: 'none', fontSize: 18,
                  color: dark ? '#6b7280' : '#94a3b8', cursor: 'pointer', lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: dark ? '#6b7280' : '#64748b' }}>Vehicle:</span>
                <span style={{ fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                  {bookingDetailsModal.vehicleId?.make} {bookingDetailsModal.vehicleId?.model} ({bookingDetailsModal.vehicleId?.licensePlate})
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: dark ? '#6b7280' : '#64748b' }}>Package & Periodic Level:</span>
                <span style={{ fontWeight: 600, color: '#3b82f6' }}>
                  {bookingDetailsModal.packageName || 'Aero'} · Level {bookingDetailsModal.serviceQuantity || 1}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: dark ? '#6b7280' : '#64748b' }}>Status:</span>
                <span style={{
                  padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                  background: bookingDetailsModal.status === 'Completed' ? 'rgba(16,185,129,0.15)' : 'rgba(37,99,235,0.15)',
                  color: bookingDetailsModal.status === 'Completed' ? '#10b981' : '#3b82f6'
                }}>
                  {bookingDetailsModal.status}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: dark ? '#6b7280' : '#64748b' }}>Scheduled Date & Time:</span>
                <span style={{ color: dark ? '#f0f0f0' : '#0f172a' }}>
                  {new Date(bookingDetailsModal.date).toLocaleDateString('en-IN')} at {bookingDetailsModal.time}
                </span>
              </div>

              {bookingDetailsModal.completedAt && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: dark ? '#6b7280' : '#64748b' }}>Completed Date:</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>
                    {new Date(bookingDetailsModal.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}

              {bookingDetailsModal.garage && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: dark ? '#6b7280' : '#64748b' }}>Workshop:</span>
                  <span style={{ color: dark ? '#f0f0f0' : '#0f172a' }}>
                    {bookingDetailsModal.garage.name} ({bookingDetailsModal.garage.city})
                  </span>
                </div>
              )}

              {Array.isArray(bookingDetailsModal.extraServices) && bookingDetailsModal.extraServices.length > 0 && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: dark ? '#161616' : '#f8fafc',
                  border: `1px solid ${dark ? '#222226' : '#e2e8f0'}`
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: dark ? '#6b7280' : '#94a3b8', marginBottom: 6 }}>
                    EXTRA SERVICES INCLUDED:
                  </div>
                  {bookingDetailsModal.extraServices.map(ex => (
                    <div key={ex.id || ex.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, margin: '2px 0' }}>
                      <span>{ex.label}</span>
                      <span style={{ fontWeight: 600 }}>{formatINR(ex.price)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Finalized Pricing Breakdown */}
              <div style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: dark ? '#161616' : '#f8fafc',
                border: `1px solid ${dark ? '#222226' : '#e2e8f0'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: 12
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                  Finalized Pricing Summary
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: dark ? '#9ca3af' : '#64748b' }}>
                  <span>Package Base Price ({bookingDetailsModal.packageName}):</span>
                  <span>{formatINR(bookingDetailsModal.packagePrice || 1499)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: dark ? '#9ca3af' : '#64748b' }}>
                  <span>Completed Service Package Cost:</span>
                  <span style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                    {formatINR(bookingDetailsModal.finalPricing?.packageCost || bookingDetailsModal.packageSubtotal || bookingDetailsModal.packagePrice || 0)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: dark ? '#9ca3af' : '#64748b' }}>
                  <span>Extra Services & Add-ons:</span>
                  <span>{formatINR(bookingDetailsModal.finalPricing?.extraServicesCost || bookingDetailsModal.extraServicesSubtotal || 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: dark ? '#9ca3af' : '#64748b' }}>
                  <span>Applicable Taxes:</span>
                  <span>{formatINR(bookingDetailsModal.finalPricing?.tax || bookingDetailsModal.tax || 0)}</span>
                </div>
              </div>

              <div style={{
                marginTop: 2,
                paddingTop: 12,
                borderTop: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                    Final Incurred Expenditure:
                  </span>
                  <div style={{ fontSize: 10, color: '#10b981', marginTop: 2 }}>
                    ✓ Recorded upon service completion
                  </div>
                </div>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>
                  {formatINR(bookingDetailsModal.finalPricing?.finalCost || bookingDetailsModal.cost || (bookingDetailsModal.packageSubtotal + (bookingDetailsModal.extraServicesSubtotal || 0)))}
                </span>
              </div>
            </div>

            <div style={{ padding: '14px 24px', background: dark ? '#161616' : '#f8fafc', textAlign: 'right' }}>
              <button
                onClick={() => setBookingDetailsModal(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST FEEDBACK ── */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          padding: '12px 20px',
          borderRadius: 8,
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: 13,
          boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>{toast.type === 'error' ? '✕' : '✓'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

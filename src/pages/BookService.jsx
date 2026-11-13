import React, { useState, useEffect, useContext } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import AppFooter from '../components/AppFooter';
import BrandLogo from '../components/BrandLogo';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
  SERVICE_PACKAGES,
  SERVICE_LEVELS,
  getPackagePriceForLevel,
  EXTRA_SERVICES,
  TIME_SLOTS,
} from '../data/servicePackages';
import GARAGE_LOCATIONS from '../data/garageLocations';

import { API_BASE as API } from '../config/api.js';

const STEPS = [
  { num: 1, label: 'Vehicle' },
  { num: 2, label: 'Service Level' },
  { num: 3, label: 'Package' },
  { num: 4, label: 'Extras' },
  { num: 5, label: 'Schedule' },
  { num: 6, label: 'Confirm' },
];

export default function BookService() {
  const { user } = useContext(AuthContext);
  const { dark } = useTheme();
  const navigate = useNavigate();

  /* ── Booking Form State ── */
  const [currentStep, setCurrentStep] = useState(1);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // Step 1: Vehicle
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');

  // Step 2: Service Milestone Level (1st, 2nd, 3rd, 4th, 5th, 6th+)
  const [serviceQuantity, setServiceQuantity] = useState(1);

  // Step 3: Package (Aero, Pro, Elite)
  const [selectedPackageId, setSelectedPackageId] = useState('Pro');

  // Step 4: Extra services (Set of IDs)
  const [selectedExtras, setSelectedExtras] = useState(new Set());

  // Step 5: Scheduling
  const [selectedGarageId, setSelectedGarageId] = useState(GARAGE_LOCATIONS[0]?.id || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  // Submission & Results
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [booked, setBooked] = useState(null);

  const headers = { Authorization: `Bearer ${user?.token}`, 'Content-Type': 'application/json' };

  /* ── Fetch User Vehicles ── */
  useEffect(() => {
    if (user?.token) {
      setLoadingVehicles(true);
      fetch(`${API}/api/vehicles`, { headers })
        .then(r => r.json())
        .then(data => {
          const list = Array.isArray(data) ? data : [];
          setVehicles(list);
          if (list.length > 0 && !selectedVehicleId) {
            setSelectedVehicleId(list[0]._id);
          }
        })
        .catch(() => setVehicles([]))
        .finally(() => setLoadingVehicles(false));
    }
  }, [user]);

  /* ── Computed Values & Pricing based on Service Milestone Level ── */
  const selectedVehicle = vehicles.find(v => v._id === selectedVehicleId);
  const selectedServiceLevelObj = SERVICE_LEVELS.find(l => l.num === serviceQuantity) || SERVICE_LEVELS[0];
  const selectedPackage = SERVICE_PACKAGES.find(p => p.id === selectedPackageId) || SERVICE_PACKAGES[1];
  const selectedGarage = GARAGE_LOCATIONS.find(g => g.id === selectedGarageId) || GARAGE_LOCATIONS[0];

  // Price dynamically calculated for the selected service milestone level
  const packagePrice = getPackagePriceForLevel(selectedPackage.basePrice, serviceQuantity);
  const packageSubtotal = packagePrice;

  const extraServicesList = EXTRA_SERVICES.filter(e => selectedExtras.has(e.id));
  const extraServicesSubtotal = extraServicesList.reduce((sum, item) => sum + item.price, 0);

  const applicableTaxes = 0;
  const finalTotal = packageSubtotal + extraServicesSubtotal + applicableTaxes;

  // Minimum date = tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  /* ── Extra Service Toggle ── */
  const toggleExtra = (id) => {
    setSelectedExtras(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Step Navigation & Validation ── */
  const validateStep = (step) => {
    setError('');
    if (step === 1) {
      if (!selectedVehicleId) {
        setError('Please select a vehicle before proceeding.');
        return false;
      }
    }
    if (step === 2) {
      if (!serviceQuantity) {
        setError('Please select a periodic service milestone.');
        return false;
      }
    }
    if (step === 3) {
      if (!selectedPackageId) {
        setError('Please select a service package.');
        return false;
      }
    }
    if (step === 5) {
      if (!selectedGarageId) {
        setError('Please select an AeroFleet garage location.');
        return false;
      }
      if (!date) {
        setError('Please select your preferred service date.');
        return false;
      }
      if (!time) {
        setError('Please choose your preferred time slot.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(s => Math.min(s + 1, 6));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const jumpToStep = (target) => {
    if (target < currentStep) {
      setError('');
      setCurrentStep(target);
    } else {
      let valid = true;
      for (let s = currentStep; s < target; s++) {
        if (!validateStep(s)) {
          valid = false;
          break;
        }
      }
      if (valid) setCurrentStep(target);
    }
  };

  /* ── Submit Booking ── */
  const handleConfirmBooking = async () => {
    if (!validateStep(1) || !validateStep(5)) return;

    setSubmitting(true);
    setError('');

    const payload = {
      vehicleId: selectedVehicleId,
      packageName: selectedPackage.id,
      serviceQuantity, // level milestone (1, 2, 3...)
      packageSubtotal,
      extraServices: extraServicesList.map(e => ({ id: e.id, label: e.label, price: e.price })),
      extraServicesSubtotal,
      garage: {
        id: selectedGarage.id,
        name: selectedGarage.name,
        city: selectedGarage.city,
        address: selectedGarage.address,
      },
      date,
      time,
      notes,
      serviceType: `${selectedPackage.name} – ${selectedServiceLevelObj.title}${extraServicesList.length > 0 ? ' + ' + extraServicesList.map(e => e.label).join(', ') : ''}`,
    };

    try {
      const res = await fetch(`${API}/api/bookings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setBooked(data);
      } else {
        setError(data.message || 'Booking submission failed. Please try again.');
      }
    } catch {
      setError('Connection error. Please verify backend is running.');
    }
    setSubmitting(false);
  };

  const handleReset = () => {
    setBooked(null);
    setCurrentStep(1);
    setServiceQuantity(1);
    setSelectedPackageId('Pro');
    setSelectedExtras(new Set());
    setDate('');
    setTime('');
    setNotes('');
    setError('');
  };

  /* ─────────────────────────────────────────────────────────── */
  /* SUCCESS SCREEN                                              */
  /* ─────────────────────────────────────────────────────────── */
  if (booked) {
    return (
      <div className="r-page-wrap">
        <Sidebar />
        <div className="r-content" style={{ background: dark ? '#0a0a0a' : '#f1f5f9' }}>
          <Topbar />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
            <div style={{
              maxWidth: 580,
              width: '100%',
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              borderRadius: 16,
              padding: '36px 32px',
              textAlign: 'center',
              boxShadow: dark ? '0 20px 50px rgba(0,0,0,0.6)' : '0 20px 40px rgba(0,0,0,0.08)',
            }}>
              <div style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: 30,
                color: '#22c55e',
              }}>
                ✓
              </div>

              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#22c55e',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                Booking Confirmed
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', margin: '0 0 8px' }}>
                {selectedPackage?.name} – {selectedServiceLevelObj.title}
              </h2>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 20,
                background: 'rgba(59,130,246,0.12)',
                border: '1px solid rgba(59,130,246,0.25)',
                color: '#3b82f6',
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 24,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />
                Status: Pending Confirmation
              </div>

              {/* Booking Summary Box */}
              <div style={{
                background: dark ? '#0d0d0d' : '#f8fafc',
                border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                borderRadius: 12,
                padding: '18px 20px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                marginBottom: 24,
              }}>
                <RowItem label="Booking Reference" value={booked._id} monospace={true} dark={dark} />
                <RowItem label="Vehicle" value={selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.licensePlate})` : '—'} dark={dark} />
                <RowItem label="Service Milestone" value={selectedServiceLevelObj.title} dark={dark} />
                <RowItem label="Service Package" value={`${selectedPackage.name} (${selectedPackage.badge})`} dark={dark} />
                <RowItem label="Workshop Garage" value={selectedGarage?.name} dark={dark} />
                <RowItem label="Scheduled Date & Time" value={`${new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at ${time}`} dark={dark} />
                {extraServicesList.length > 0 && (
                  <RowItem label="Extra Services" value={extraServicesList.map(e => e.label).join(', ')} dark={dark} />
                )}
                <div style={{ height: 1, background: dark ? '#1c1c1c' : '#e2e8f0', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>Total Amount:</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>₹{finalTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleReset}
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    background: '#2563eb',
                    border: 'none',
                    borderRadius: 8,
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#3b82f6'}
                  onMouseOut={e => e.currentTarget.style.background = '#2563eb'}
                >
                  Book Another Service
                </button>
                <button
                  onClick={() => navigate('/service-history')}
                  style={{
                    flex: 1,
                    padding: '12px 18px',
                    background: 'transparent',
                    border: `1px solid ${dark ? '#2a2b30' : '#cbd5e1'}`,
                    borderRadius: 8,
                    color: dark ? '#f0f0f0' : '#0f172a',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  View Service History
                </button>
              </div>
            </div>
          </div>
          <AppFooter />
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────── */
  /* MAIN STEPPER INTERFACE                                      */
  /* ─────────────────────────────────────────────────────────── */
  return (
    <div className="r-page-wrap">
      <Sidebar />
      <div className="r-content" style={{ background: dark ? '#0a0a0a' : '#f1f5f9' }}>
        <Topbar />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ padding: '24px 32px 12px' }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              Book Service
            </h1>
          </div>

          {/* Stepper Progress Bar */}
          <div style={{ padding: '0 32px 24px' }}>
            <div style={{
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              borderRadius: 12,
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              overflowX: 'auto',
            }}>
              {STEPS.map((step, idx) => {
                const isCurrent = currentStep === step.num;
                const isPassed = currentStep > step.num;
                return (
                  <React.Fragment key={step.num}>
                    <div
                      onClick={() => jumpToStep(step.num)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer',
                        flexShrink: 0,
                        opacity: isCurrent ? 1 : isPassed ? 0.9 : 0.45,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: isCurrent ? '#2563eb' : isPassed ? 'rgba(34,197,94,0.15)' : (dark ? '#1c1c1c' : '#f1f5f9'),
                        border: isCurrent ? 'none' : isPassed ? '1px solid rgba(34,197,94,0.4)' : `1px solid ${dark ? '#2a2b30' : '#cbd5e1'}`,
                        color: isCurrent ? '#fff' : isPassed ? '#22c55e' : (dark ? '#9ca3af' : '#64748b'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                      }}>
                        {isPassed ? '✓' : step.num}
                      </div>
                      <div style={{
                        fontSize: 13,
                        fontWeight: isCurrent ? 700 : 500,
                        color: isCurrent ? (dark ? '#f0f0f0' : '#0f172a') : (dark ? '#9ca3af' : '#64748b'),
                        whiteSpace: 'nowrap',
                      }}>
                        {step.label}
                      </div>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div style={{
                        flex: 1,
                        height: 2,
                        background: isPassed ? '#22c55e' : (dark ? '#1c1c1c' : '#e2e8f0'),
                        margin: '0 12px',
                        minWidth: 16,
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Step Content Container */}
          <div style={{ padding: '0 32px 32px' }}>
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444',
                padding: '12px 18px',
                borderRadius: 10,
                fontSize: 13,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span>⚠</span> {error}
              </div>
            )}

            <div style={{
              background: dark ? '#111111' : '#ffffff',
              border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
              borderRadius: 14,
              padding: '28px',
              minHeight: 460,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: dark ? '0 8px 30px rgba(0,0,0,0.3)' : '0 8px 24px rgba(0,0,0,0.03)',
            }}>

              {/* ─────────────────────────────────────────────────────────── */}
              {/* STEP 1: SELECT VEHICLE                                     */}
              {/* ─────────────────────────────────────────────────────────── */}
              {currentStep === 1 && (
                <div>
                  <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', margin: '0 0 6px' }}>
                      Step 1: Select Vehicle
                    </h2>
                    <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: 0 }}>
                      Choose which vehicle from your fleet you would like to service.
                    </p>
                  </div>

                  {loadingVehicles ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: dark ? '#6b7280' : '#94a3b8', fontSize: 13 }}>
                      Loading vehicles...
                    </div>
                  ) : vehicles.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '48px 24px',
                      background: dark ? '#0d0d0d' : '#f8fafc',
                      border: `1px dashed ${dark ? '#2a2b30' : '#cbd5e1'}`,
                      borderRadius: 12,
                      maxWidth: 520,
                      margin: '20px auto',
                    }}>
                      <div style={{ fontSize: 36, marginBottom: 12 }}>🚗</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a', marginBottom: 6 }}>
                        No vehicles added
                      </div>
                      <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', marginBottom: 20 }}>
                        No vehicles added. Please add a vehicle before booking a service.
                      </p>
                      <button
                        onClick={() => navigate('/my-vehicles')}
                        style={{
                          padding: '10px 22px',
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        + Add Vehicle
                      </button>
                    </div>
                  ) : (
                    <div>
                      {vehicles.length > 3 && (
                        <div style={{ marginBottom: 20, maxWidth: 380 }}>
                          <input
                            type="text"
                            placeholder="Search by brand, model, or license plate..."
                            value={vehicleSearch}
                            onChange={e => setVehicleSearch(e.target.value)}
                            className="form-input"
                            style={{ padding: '10px 14px', fontSize: 13 }}
                          />
                        </div>
                      )}

                      {/* Larger, spacious, uncluttered selectable Vehicle Cards */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                        gap: 20,
                      }}>
                        {vehicles
                          .filter(v => {
                            if (!vehicleSearch) return true;
                            const q = vehicleSearch.toLowerCase();
                            return (
                              v.make.toLowerCase().includes(q) ||
                              v.model.toLowerCase().includes(q) ||
                              v.licensePlate.toLowerCase().includes(q)
                            );
                          })
                          .map(v => {
                            const isSelected = selectedVehicleId === v._id;
                            return (
                              <div
                                key={v._id}
                                onClick={() => setSelectedVehicleId(v._id)}
                                style={{
                                  border: isSelected ? '2px solid #2563eb' : `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                                  background: isSelected
                                    ? (dark ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.04)')
                                    : (dark ? '#0d0d0d' : '#f8fafc'),
                                  borderRadius: 14,
                                  padding: '22px 24px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 20,
                                  transition: 'all 0.15s ease',
                                  position: 'relative',
                                  boxShadow: isSelected
                                    ? (dark ? '0 8px 24px rgba(37,99,235,0.2)' : '0 8px 20px rgba(37,99,235,0.1)')
                                    : 'none',
                                }}
                              >
                                <BrandLogo
                                  brand={v.make}
                                  size={64}
                                  bg={true}
                                  style={{ borderRadius: 12, flexShrink: 0 }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: dark ? '#6b7280' : '#94a3b8',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    marginBottom: 3,
                                  }}>
                                    {v.make}
                                  </div>
                                  <div style={{
                                    fontSize: 18,
                                    fontWeight: 700,
                                    color: dark ? '#f0f0f0' : '#0f172a',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    letterSpacing: '-0.01em',
                                  }}>
                                    {v.model}
                                  </div>
                                  <div style={{
                                    display: 'inline-block',
                                    marginTop: 6,
                                    padding: '3px 9px',
                                    borderRadius: 6,
                                    background: dark ? '#161616' : '#ffffff',
                                    border: `1px solid ${dark ? '#262626' : '#cbd5e1'}`,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: dark ? '#93c5fd' : '#2563eb',
                                    fontFamily: 'monospace',
                                    letterSpacing: '0.06em',
                                  }}>
                                    {v.licensePlate}
                                  </div>
                                </div>
                                <div style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: '50%',
                                  border: isSelected ? '2px solid #2563eb' : `2px solid ${dark ? '#2a2b30' : '#cbd5e1'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: isSelected ? '#2563eb' : 'transparent',
                                  flexShrink: 0,
                                }}>
                                  {isSelected && <span style={{ color: '#fff', fontSize: 13 }}>✓</span>}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────── */}
              {/* STEP 2: SERVICE LEVEL (FIRST, SECOND, THIRD SERVICE...)    */}
              {/* ─────────────────────────────────────────────────────────── */}
              {currentStep === 2 && (
                <div>
                  <div style={{ marginBottom: 22 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', margin: '0 0 6px' }}>
                      Step 2: Select Service Milestone Level
                    </h2>
                    <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: 0 }}>
                      Select the scheduled service milestone your vehicle is due for. Package pricing automatically scales with the service milestone level.
                    </p>
                  </div>

                  {/* Grid of Service Milestones */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 16,
                    marginBottom: 20,
                  }}>
                    {SERVICE_LEVELS.map(level => {
                      const isSelected = serviceQuantity === level.num;
                      return (
                        <div
                          key={level.num}
                          onClick={() => setServiceQuantity(level.num)}
                          style={{
                            borderRadius: 12,
                            border: isSelected ? '2px solid #2563eb' : `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                            background: isSelected
                              ? (dark ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.03)')
                              : (dark ? '#0d0d0d' : '#f8fafc'),
                            padding: '18px 20px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: isSelected ? '#2563eb20' : (dark ? '#1c1c1c' : '#e2e8f0'),
                                color: isSelected ? '#3b82f6' : (dark ? '#9ca3af' : '#64748b'),
                              }}>
                                {level.badge}
                              </span>
                              <div style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                border: isSelected ? '2px solid #2563eb' : `2px solid ${dark ? '#2a2b30' : '#cbd5e1'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isSelected ? '#2563eb' : 'transparent',
                              }}>
                                {isSelected && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                              </div>
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', marginBottom: 6 }}>
                              {level.title}
                            </div>
                            <div style={{ fontSize: 12, color: dark ? '#6b7280' : '#64748b', lineHeight: 1.5 }}>
                              {level.desc}
                            </div>
                          </div>

                          <div style={{
                            borderTop: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                            marginTop: 14,
                            paddingTop: 10,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}>
                            <span style={{ fontSize: 11, color: dark ? '#6b7280' : '#94a3b8' }}>
                              Starts from
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>
                              ₹{getPackagePriceForLevel(1499, level.num).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{
                    padding: '12px 18px',
                    borderRadius: 10,
                    background: dark ? '#0d0d0d' : '#f8fafc',
                    border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{ fontSize: 12, color: dark ? '#9ca3af' : '#64748b' }}>
                      Selected Milestone: <strong style={{ color: dark ? '#f0f0f0' : '#0f172a' }}>{selectedServiceLevelObj.title}</strong> ({selectedServiceLevelObj.badge})
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#22c55e' }}>
                      Ready to select package
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────── */}
              {/* STEP 3: SELECT SERVICE PACKAGE (PRICES ADJUSTED PER LEVEL) */}
              {/* ─────────────────────────────────────────────────────────── */}
              {currentStep === 3 && (
                <div>
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', margin: 0 }}>
                        Step 3: Select Service Package
                      </h2>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#3b82f6',
                        background: 'rgba(59,130,246,0.1)',
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid rgba(59,130,246,0.25)',
                      }}>
                        For {selectedServiceLevelObj.title}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: 0 }}>
                      Pricing below reflects comprehensive requirements for your selected {selectedServiceLevelObj.title}.
                    </p>
                  </div>

                  {/* 3 Package Cards with prices updated per periodic level */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 20,
                  }}>
                    {SERVICE_PACKAGES.map(pkg => {
                      const isSelected = selectedPackageId === pkg.id;
                      const calculatedPrice = getPackagePriceForLevel(pkg.basePrice, serviceQuantity);

                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setSelectedPackageId(pkg.id)}
                          style={{
                            borderRadius: 14,
                            border: isSelected ? '2px solid #2563eb' : `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                            background: isSelected
                              ? (dark ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.03)')
                              : (dark ? '#0d0d0d' : '#f8fafc'),
                            padding: '24px 22px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {pkg.popular && (
                            <div style={{
                              position: 'absolute',
                              top: -10,
                              right: 20,
                              background: '#2563eb',
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: 20,
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                            }}>
                              Recommended
                            </div>
                          )}

                          {/* Package Header */}
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 18, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a' }}>
                                {pkg.name}
                              </span>
                              <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: isSelected ? '#2563eb20' : (dark ? '#1c1c1c' : '#e2e8f0'),
                                color: isSelected ? '#3b82f6' : (dark ? '#9ca3af' : '#64748b'),
                                textTransform: 'uppercase',
                              }}>
                                {pkg.badge}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: dark ? '#6b7280' : '#64748b', minHeight: 32 }}>
                              {pkg.description}
                            </div>
                          </div>

                          {/* Dynamic Price Tag scaled to Service Milestone */}
                          <div style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                              <span style={{ fontSize: 28, fontWeight: 800, color: dark ? '#f0f0f0' : '#0f172a' }}>
                                ₹{calculatedPrice.toLocaleString('en-IN')}
                              </span>
                              <span style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b' }}>
                                / {selectedServiceLevelObj.title}
                              </span>
                            </div>
                          </div>

                          <div style={{ height: 1, background: dark ? '#1c1c1c' : '#e2e8f0', marginBottom: 16 }} />

                          {/* Features List */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 24 }}>
                            {pkg.features.map((feat, fIdx) => (
                              <div key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                                <span style={{ color: '#22c55e', fontWeight: 700, lineHeight: 1.2 }}>✓</span>
                                <span style={{ color: dark ? '#d1d5db' : '#334155', lineHeight: 1.4 }}>{feat}</span>
                              </div>
                            ))}
                          </div>

                          {/* Select Button */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedPackageId(pkg.id); }}
                            style={{
                              width: '100%',
                              padding: '10px 0',
                              borderRadius: 8,
                              border: isSelected ? 'none' : `1px solid ${dark ? '#2a2b30' : '#cbd5e1'}`,
                              background: isSelected ? '#2563eb' : 'transparent',
                              color: isSelected ? '#fff' : (dark ? '#9ca3af' : '#475569'),
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {isSelected ? '✓ Selected' : 'Select Package'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────── */}
              {/* STEP 4: SELECT EXTRA SERVICES                              */}
              {/* ─────────────────────────────────────────────────────────── */}
              {currentStep === 4 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', margin: '0 0 6px' }}>
                        Step 4: Select Extra Services
                      </h2>
                      <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: 0 }}>
                        Enhance your maintenance package with optional professional add-ons.
                      </p>
                    </div>
                    {selectedExtras.size > 0 && (
                      <div style={{
                        background: 'rgba(59,130,246,0.1)',
                        border: '1px solid rgba(59,130,246,0.3)',
                        borderRadius: 8,
                        padding: '6px 14px',
                        fontSize: 12,
                        color: '#3b82f6',
                        fontWeight: 600,
                      }}>
                        {selectedExtras.size} Extra{selectedExtras.size > 1 ? 's' : ''} Selected (+₹{extraServicesSubtotal.toLocaleString('en-IN')})
                      </div>
                    )}
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 14,
                    marginBottom: 20,
                  }}>
                    {EXTRA_SERVICES.map(extra => {
                      const isSelected = selectedExtras.has(extra.id);
                      return (
                        <div
                          key={extra.id}
                          onClick={() => toggleExtra(extra.id)}
                          style={{
                            borderRadius: 10,
                            border: isSelected ? '2px solid #2563eb' : `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                            background: isSelected
                              ? (dark ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.03)')
                              : (dark ? '#0d0d0d' : '#f8fafc'),
                            padding: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                {extra.category}
                              </span>
                              <div style={{
                                width: 18,
                                height: 18,
                                borderRadius: 4,
                                border: isSelected ? 'none' : `1.5px solid ${dark ? '#2a2b30' : '#cbd5e1'}`,
                                background: isSelected ? '#2563eb' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: 11,
                              }}>
                                {isSelected && '✓'}
                              </div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', marginBottom: 4 }}>
                              {extra.label}
                            </div>
                            <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b', lineHeight: 1.4, marginBottom: 12 }}>
                              {extra.desc}
                            </div>
                          </div>

                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTop: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                            paddingTop: 10,
                          }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                              ₹{extra.price.toLocaleString('en-IN')}
                            </span>
                            <span style={{ fontSize: 11, color: isSelected ? '#3b82f6' : (dark ? '#6b7280' : '#94a3b8'), fontWeight: 600 }}>
                              {isSelected ? 'Added' : '+ Add'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    background: dark ? '#0d0d0d' : '#f8fafc',
                    fontSize: 11,
                    color: dark ? '#6b7280' : '#64748b',
                  }}>
                    ℹ Selected extra services will be performed during this service appointment.
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────── */}
              {/* STEP 5: SCHEDULE SERVICE                                   */}
              {/* ─────────────────────────────────────────────────────────── */}
              {currentStep === 5 && (
                <div>
                  <div style={{ marginBottom: 22 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', margin: '0 0 6px' }}>
                      Step 5: Schedule Service
                    </h2>
                    <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: 0 }}>
                      Select an AeroFleet workshop location and your requested appointment time.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
                    {/* Garage Selection */}
                    <div>
                      <label className="form-label" style={{ color: dark ? '#9ca3af' : '#475569', marginBottom: 10 }}>
                        Select AeroFleet Garage <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {GARAGE_LOCATIONS.map(garage => {
                          const isSelected = selectedGarageId === garage.id;
                          return (
                            <div
                              key={garage.id}
                              onClick={() => setSelectedGarageId(garage.id)}
                              style={{
                                padding: '14px 16px',
                                borderRadius: 10,
                                border: isSelected ? '2px solid #2563eb' : `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                                background: isSelected
                                  ? (dark ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.03)')
                                  : (dark ? '#0d0d0d' : '#f8fafc'),
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.15s',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                                  {garage.name}
                                </div>
                                <div style={{ fontSize: 11, color: dark ? '#6b7280' : '#64748b', marginTop: 2 }}>
                                  {garage.address || `${garage.city}, ${garage.state}`}
                                </div>
                              </div>
                              <div style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                border: isSelected ? '2px solid #2563eb' : `2px solid ${dark ? '#2a2b30' : '#cbd5e1'}`,
                                background: isSelected ? '#2563eb' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                fontSize: 11,
                              }}>
                                {isSelected && '✓'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Date, Time & Notes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      <div>
                        <label className="form-label" style={{ color: dark ? '#9ca3af' : '#475569' }}>
                          Preferred Service Date <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="date"
                          required
                          min={minDateStr}
                          value={date}
                          onChange={e => setDate(e.target.value)}
                          className="form-input"
                        />
                      </div>

                      <div>
                        <label className="form-label" style={{ color: dark ? '#9ca3af' : '#475569', marginBottom: 8 }}>
                          Preferred Service Time <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          {TIME_SLOTS.map(slot => {
                            const isSelected = time === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setTime(slot)}
                                style={{
                                  padding: '8px 0',
                                  borderRadius: 8,
                                  border: isSelected ? '1.5px solid #2563eb' : `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                                  background: isSelected ? '#2563eb' : (dark ? '#0d0d0d' : '#f8fafc'),
                                  color: isSelected ? '#fff' : (dark ? '#d1d5db' : '#334155'),
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: 10, color: dark ? '#6b7280' : '#94a3b8', marginTop: 6 }}>
                          *Selected slot indicates your requested time. Confirmed upon workshop intake.
                        </div>
                      </div>

                      <div>
                        <label className="form-label" style={{ color: dark ? '#9ca3af' : '#475569' }}>
                          Technician Notes (Optional)
                        </label>
                        <textarea
                          rows={3}
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="Note any specific concerns or issues..."
                          className="form-input"
                          style={{ resize: 'vertical' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────── */}
              {/* STEP 6: CONFIRM BOOKING & SUMMARY                          */}
              {/* ─────────────────────────────────────────────────────────── */}
              {currentStep === 6 && (
                <div>
                  <div style={{ marginBottom: 22 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a', margin: '0 0 6px' }}>
                      Step 6: Booking Summary and Confirmation
                    </h2>
                    <p style={{ fontSize: 13, color: dark ? '#6b7280' : '#64748b', margin: 0 }}>
                      Review your complete service booking details and price breakdown before confirming.
                    </p>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1fr',
                    gap: 24,
                    alignItems: 'start',
                  }}>
                    {/* Left: Booking Details Breakdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* 1. Vehicle Details */}
                      <div style={{
                        background: dark ? '#0d0d0d' : '#f8fafc',
                        border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                        borderRadius: 12,
                        padding: '16px 20px',
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                          Vehicle Details
                        </div>
                        {selectedVehicle ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <BrandLogo brand={selectedVehicle.make} size={48} bg={true} style={{ borderRadius: 8 }} />
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                                {selectedVehicle.make} {selectedVehicle.model}
                              </div>
                              <div style={{ fontSize: 12, color: dark ? '#9ca3af' : '#64748b', marginTop: 2 }}>
                                Registration: <strong style={{ color: dark ? '#d1d5db' : '#0f172a' }}>{selectedVehicle.licensePlate}</strong>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: '#ef4444' }}>No vehicle selected</div>
                        )}
                      </div>

                      {/* 2. Service Details */}
                      <div style={{
                        background: dark ? '#0d0d0d' : '#f8fafc',
                        border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                        borderRadius: 12,
                        padding: '16px 20px',
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                          Service Details
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                            {selectedPackage.name}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6' }}>
                            {selectedServiceLevelObj.title}
                          </span>
                        </div>

                        {/* Included Features List */}
                        <div style={{
                          background: dark ? '#141414' : '#ffffff',
                          border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                          borderRadius: 8,
                          padding: '12px 14px',
                          marginBottom: 12,
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: dark ? '#9ca3af' : '#64748b', marginBottom: 6 }}>
                            Included in Package:
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            {selectedPackage.features.map((feat, idx) => (
                              <div key={idx} style={{ fontSize: 11, color: dark ? '#d1d5db' : '#334155', display: 'flex', gap: 6 }}>
                                <span style={{ color: '#22c55e' }}>✓</span> {feat}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Extra Services Itemized */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: dark ? '#9ca3af' : '#64748b', marginBottom: 6 }}>
                            Selected Extra Services:
                          </div>
                          {extraServicesList.length === 0 ? (
                            <div style={{ fontSize: 12, color: dark ? '#6b7280' : '#94a3b8', fontStyle: 'italic' }}>
                              None selected
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {extraServicesList.map(extra => (
                                <div key={extra.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                  <span style={{ color: dark ? '#d1d5db' : '#334155' }}>• {extra.label}</span>
                                  <span style={{ fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>₹{extra.price.toLocaleString('en-IN')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. Schedule Details */}
                      <div style={{
                        background: dark ? '#0d0d0d' : '#f8fafc',
                        border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                        borderRadius: 12,
                        padding: '16px 20px',
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                          Schedule & Location
                        </div>
                        <RowItem label="Selected Garage" value={selectedGarage?.name} dark={dark} />
                        <RowItem label="Garage Address" value={selectedGarage?.address || `${selectedGarage.city}, ${selectedGarage.state}`} dark={dark} />
                        <RowItem label="Preferred Date" value={date ? new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'} dark={dark} />
                        <RowItem label="Preferred Time Slot" value={time || '—'} dark={dark} />
                      </div>
                    </div>

                    {/* Right: Estimated Price Breakdown & Confirmation */}
                    <div style={{
                      background: dark ? '#0d0d0d' : '#f8fafc',
                      border: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                      borderRadius: 12,
                      padding: '22px 20px',
                      position: 'sticky',
                      top: 20,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>
                          Estimated Pricing Summary
                        </div>
                        <span style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(245,158,11,0.15)',
                          color: '#f59e0b',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Estimate
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: dark ? '#9ca3af' : '#64748b' }}>
                          <span>{selectedPackage.name}</span>
                          <span>₹{packagePrice.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: dark ? '#9ca3af' : '#64748b' }}>
                          <span>Periodic Milestone</span>
                          <span>{selectedServiceLevelObj.title}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: dark ? '#f0f0f0' : '#0f172a' }}>
                          <span>Package Subtotal</span>
                          <span>₹{packageSubtotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: dark ? '#9ca3af' : '#64748b' }}>
                          <span>Extra Services Subtotal</span>
                          <span>₹{extraServicesSubtotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: dark ? '#9ca3af' : '#64748b' }}>
                          <span>Applicable Taxes</span>
                          <span>₹0</span>
                        </div>
                      </div>

                      <div style={{ height: 1, background: dark ? '#1c1c1c' : '#e2e8f0', marginBottom: 16 }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: dark ? '#f0f0f0' : '#0f172a' }}>Estimated Total</div>
                          <div style={{ fontSize: 10, color: dark ? '#6b7280' : '#94a3b8' }}>Recorded as expenditure once completed</div>
                        </div>
                        <span style={{ fontSize: 24, fontWeight: 800, color: '#2563eb' }}>
                          ₹{finalTotal.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div style={{ marginBottom: 20 }} />

                      {/* Confirm Booking Button */}
                      <button
                        type="button"
                        onClick={handleConfirmBooking}
                        disabled={submitting || !selectedVehicleId || !date || !time}
                        style={{
                          width: '100%',
                          padding: '14px 20px',
                          borderRadius: 8,
                          border: 'none',
                          background: (submitting || !selectedVehicleId || !date || !time)
                            ? (dark ? '#1a1a1a' : '#e2e8f0')
                            : '#2563eb',
                          color: (submitting || !selectedVehicleId || !date || !time)
                            ? (dark ? '#4b5563' : '#94a3b8')
                            : '#ffffff',
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: (submitting || !selectedVehicleId || !date || !time) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background 0.15s ease',
                          textAlign: 'center',
                        }}
                        onMouseOver={e => {
                          if (!submitting && selectedVehicleId && date && time) {
                            e.currentTarget.style.background = '#3b82f6';
                          }
                        }}
                        onMouseOut={e => {
                          if (!submitting && selectedVehicleId && date && time) {
                            e.currentTarget.style.background = '#2563eb';
                          }
                        }}
                      >
                        {submitting ? 'Confirming Booking...' : 'Confirm Booking'}
                      </button>

                      <div style={{ textAlign: 'center', fontSize: 10, color: dark ? '#6b7280' : '#94a3b8', marginTop: 10 }}>
                        Review all steps before finalizing. You will receive an immediate confirmation.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────── */}
              {/* BOTTOM STEP CONTROLS (Next / Back)                          */}
              {/* ─────────────────────────────────────────────────────────── */}
              <div style={{
                marginTop: 'auto',
                paddingTop: 28,
                borderTop: `1px solid ${dark ? '#1c1c1c' : '#e2e8f0'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    style={{
                      padding: '10px 22px',
                      background: 'transparent',
                      border: `1px solid ${dark ? '#2a2b30' : '#cbd5e1'}`,
                      borderRadius: 8,
                      color: dark ? '#d1d5db' : '#475569',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>
                ) : <div />}

                {currentStep < 6 && (
                  <button
                    type="button"
                    onClick={handleNext}
                    style={{
                      padding: '10px 26px',
                      background: '#2563eb',
                      border: 'none',
                      borderRadius: 8,
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#3b82f6'}
                    onMouseOut={e => e.currentTarget.style.background = '#2563eb'}
                  >
                    {currentStep === 1 && 'Next: Select Service Milestone'}
                    {currentStep === 2 && 'Next: Select Service Package'}
                    {currentStep === 3 && 'Next: Extra Services'}
                    {currentStep === 4 && 'Next: Schedule Service'}
                    {currentStep === 5 && 'Next: Review and Confirm'}
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
        <AppFooter />
      </div>
    </div>
  );
}

function RowItem({ label, value, monospace, dark }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, lineHeight: 1.5 }}>
      <span style={{ color: dark ? '#9ca3af' : '#64748b' }}>{label}:</span>
      <span style={{
        fontWeight: 600,
        color: dark ? '#f0f0f0' : '#0f172a',
        fontFamily: monospace ? 'monospace' : 'inherit',
        textAlign: 'right',
        maxWidth: '65%',
      }}>
        {value}
      </span>
    </div>
  );
}

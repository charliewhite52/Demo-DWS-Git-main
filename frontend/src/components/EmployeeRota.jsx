import React from 'react';
import { ArrowLeft, Calendar, Clock, Building2, AlertTriangle } from 'lucide-react';
import './EmployeeRota.css';

const EmployeeRota = ({ employee, schedule, shifts, employees, onBack }) => {
  // Get all shifts assigned to this employee
  const getEmployeeShifts = () => {
    if (!schedule) return [];
    
    const employeeShifts = [];
    
    Object.entries(schedule).forEach(([shiftId, employeeIds]) => {
      if (employeeIds.includes(employee.id)) {
        const shift = shifts.find(s => s.id === shiftId);
        if (shift) {
          employeeShifts.push({
            ...shift,
            shiftId
          });
        }
      }
    });
    
    // Sort shifts chronologically
    return employeeShifts.sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      
      const shiftOrder = {
        'morning': 1,
        'day': 2,
        'swing': 3,
        'night': 4,
        'on_call': 5
      };
      
      return (shiftOrder[a.shift_type] || 6) - (shiftOrder[b.shift_type] || 6);
    });
  };

  const employeeShifts = getEmployeeShifts();
  
  // Calculate total hours and cost
  const calculateTotals = () => {
    let totalHours = 0;
    let totalCost = 0;
    
    employeeShifts.forEach(shift => {
      const shiftHours = {
        'morning': 8,    // 6AM-2PM
        'day': 8,        // 9AM-5PM
        'swing': 8,      // 2PM-10PM
        'night': 8,      // 10PM-6AM
        'on_call': 4     // On-call typically counts as 4 hours
      }[shift.shift_type] || 8;
      
      totalHours += shiftHours;
      totalCost += shiftHours * employee.cost_per_hour;
    });
    
    return { totalHours, totalCost };
  };

  const { totalHours, totalCost } = calculateTotals();

  // Group shifts by week
  const getShiftsByWeek = () => {
    const weeks = {};
    
    employeeShifts.forEach(shift => {
      const date = new Date(shift.date);
      // Simple week calculation - you might want to use a more robust method
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(shift);
    });
    
    return weeks;
  };

  const shiftsByWeek = getShiftsByWeek();

  const SHIFT_TYPE_LABELS = {
    'morning': 'Morning Shift (6AM-2PM)',
    'swing': 'Afternoon Shift (2PM-10PM)', 
    'night': 'Night Shift (10PM-6AM)',
    'day': 'Standard Shift (9AM-5PM)',
    'on_call': 'On-Call'
  };

  const DEPARTMENT_LABELS = {
    'ad_operations': 'Ad Operations',
    'engineering': 'Engineering',
    'sales': 'Sales',
    'account_management': 'Account Management',
    'support': 'Support'
  };

  const getDepartmentColor = (department) => {
    const colorMap = {
      'ad_operations': '#3B82F6',
      'engineering': '#8B5CF6', 
      'sales': '#10B981',
      'account_management': '#F59E0B',
      'support': '#EF4444'
    };
    return colorMap[department] || '#6B7280';
  };

  return (
    <div className="employee-rota-overlay">
      <div className="employee-rota-container">
        {/* Header */}
        <div className="rota-header">
          <button className="back-button" onClick={onBack}>
            <ArrowLeft size={20} />
            Back to Workforce
          </button>
          <div className="employee-summary">
            <h2>{employee.name}'s Schedule</h2>
            <div className="summary-badges">
              <span 
                className="dept-badge"
                style={{ backgroundColor: getDepartmentColor(employee.department) }}
              >
                {DEPARTMENT_LABELS[employee.department]}
              </span>
              <span className="shifts-count">{employeeShifts.length} shifts assigned</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <Calendar className="summary-icon" />
            <div className="summary-content">
              <div className="summary-value">{employeeShifts.length}</div>
              <div className="summary-label">Total Shifts</div>
            </div>
          </div>
          <div className="summary-card">
            <Clock className="summary-icon" />
            <div className="summary-content">
              <div className="summary-value">{totalHours}h</div>
              <div className="summary-label">Total Hours</div>
            </div>
          </div>
          <div className="summary-card">
            <Building2 className="summary-icon" />
            <div className="summary-content">
              <div className="summary-value">${totalCost.toFixed(2)}</div>
              <div className="summary-label">Total Cost</div>
            </div>
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="rota-content">
          <h3>Weekly Schedule</h3>
          
          {Object.keys(shiftsByWeek).length === 0 ? (
            <div className="no-shifts">
              <p>No shifts assigned to this employee.</p>
            </div>
          ) : (
            Object.entries(shiftsByWeek).map(([weekStart, weekShifts]) => (
              <div key={weekStart} className="week-section">
                <h4>Week of {new Date(weekStart).toLocaleDateString()}</h4>
                <div className="shifts-list">
                  {weekShifts.map(shift => (
                    <div key={shift.shiftId} className="rota-shift-item">
                      <div className="shift-date">
                        <strong>{shift.date}</strong>
                        <span className="day-name">
                          {new Date(shift.date).toLocaleDateString('en-US', { weekday: 'long' })}
                        </span>
                      </div>
                      <div className="shift-details">
                        <span className="shift-type">{SHIFT_TYPE_LABELS[shift.shift_type]}</span>
                        <span 
                          className="dept-tag"
                          style={{ backgroundColor: getDepartmentColor(shift.department) }}
                        >
                          {DEPARTMENT_LABELS[shift.department]}
                        </span>
                      </div>
                      <div className="shift-meta">
                        <span className="priority">Priority: {shift.priority}</span>
                        {shift.is_weekend && <span className="weekend-tag">Weekend</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Utilization Warning */}
        {totalHours > employee.max_hours_per_week && (
          <div className="utilization-warning">
            <AlertTriangle size={20} />
            <div>
              <strong>Overtime Warning</strong>
              <p>This employee is scheduled for {totalHours}h, exceeding their maximum of {employee.max_hours_per_week}h per week.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeRota;
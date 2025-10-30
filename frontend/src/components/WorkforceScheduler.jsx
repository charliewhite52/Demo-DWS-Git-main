import React, { useState } from 'react';
import axios from 'axios';
import './WorkforceScheduler.css';
import EmployeeRota from './EmployeeRota';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, UsersRound, Target, Shield, CalendarRange, SlidersHorizontal, BriefcaseBusiness, ChartNoAxesCombined, CircleAlert} from 'lucide-react';

const DEPARTMENT_LABELS = {
  'ad_operations': 'Ad Operations',
  'engineering': 'Engineering',
  'sales': 'Sales',
  'account_management': 'Account Management',
  'support': 'Support'
};

const SKILL_LEVEL_LABELS = {
  'junior': 'Junior',
  'mid': 'Mid-Level',
  'senior': 'Senior',
  'lead': 'Lead'
};

const SHIFT_TYPE_LABELS = {
  'morning': 'Morning Shift (6AM-2PM)',
  'swing': 'Afternoon Shift (2PM-10PM)', 
  'night': 'Night Shift (10PM-6AM)',
  'day': 'Standard Shift (9AM-5PM)',
  'on_call': 'On-Call'
};

const PRIORITY_LABELS = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Critical',
  5: 'Emergency'
};

// Helper function for department colors
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

const WorkforceScheduler = () => {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showRota, setShowRota] = useState(false);
  const [demoConfig, setDemoConfig] = useState({
    numEmployees: 1,
    numDays: 1,
    startDate: "2025-11-01",
    employeeDistribution: {
      ad_operations: 40,
      engineering: 30,
      support: 30
    }
  });

  const handleEmployeeClick = (employee) => {
    setSelectedEmployee(employee);
    setShowRota(true);
  };

  const handleBackToSchedule = () => {
    setShowRota(false);
    setSelectedEmployee(null);
  };

  // If showing rota, render only the EmployeeRota component
  if (showRota && selectedEmployee) {
    return (
      <EmployeeRota 
        employee={selectedEmployee}
        schedule={schedule}
        shifts={shifts}
        employees={employees}
        onBack={handleBackToSchedule}
      />
    );
  }

  const handleConfigChange = (key, value) => {
    setDemoConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDistributionChange = (department, value) => {
    setDemoConfig(prev => ({
      ...prev,
      employeeDistribution: {
        ...prev.employeeDistribution,
        [department]: parseInt(value)
      }
    }));
  };

  const loadDemoData = async () => {
    setLoading(true);
    try {
      console.log('Loading demo data with config:', demoConfig);
      
      // Convert percentages to decimals for the backend
      const distributionDecimals = {
        ad_operations: demoConfig.employeeDistribution.ad_operations / 100,
        engineering: demoConfig.employeeDistribution.engineering / 100,
        support: demoConfig.employeeDistribution.support / 100
      };
  
      // Use the same endpoint for both loading data and generating schedule
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/api/generate-demo-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numEmployees: demoConfig.numEmployees,
          numDays: demoConfig.numDays,
          startDate: demoConfig.startDate,
          employeeDistribution: distributionDecimals,
          loadOnly: true // Flag to indicate we only want the data, not the schedule
        }),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
  
      const data = await response.json();
      console.log('Received demo data:', data);
      
      // Set the employees and shifts from the response
      setEmployees(data.input_data.employees);
      setShifts(data.input_data.shifts);
      setSchedule(null);
      setMetrics(null);
      setRiskAssessment(null);
      setActiveTab('employees');
      
      console.log(`✅ Loaded ${data.input_data.employees.length} employees and ${data.input_data.shifts.length} shifts for ${demoConfig.numDays} days`);
      
    } catch (error) {
      console.error('Error loading demo data:', error);
      alert(`Error loading demo data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const generateDemoSchedule = async (config) => {
    setLoading(true);
    try {
      console.log('Generating schedule with config:', config);
      
      // Convert percentages to decimals for the backend
      const distributionDecimals = {
        ad_operations: config.employeeDistribution.ad_operations / 100,
        engineering: config.employeeDistribution.engineering / 100,
        support: config.employeeDistribution.support / 100
      };
      
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/api/generate-demo-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numEmployees: config.numEmployees,
          numDays: config.numDays,
          startDate: config.startDate,
          employeeDistribution: distributionDecimals,
          loadOnly: false // Generate full schedule
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Received schedule data:', data);
      
      // Update both the input data AND the schedule results
      setEmployees(data.input_data.employees);
      setShifts(data.input_data.shifts);
      setSchedule(data.schedule.assignments);
      setMetrics(data.schedule.metrics);
      setRiskAssessment(data.schedule.risk_assessment);
      setActiveTab('schedule');
      
    } catch (error) {
      console.error('Error generating schedule:', error);
      alert(`Error generating schedule: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setEmployees([]);
    setShifts([]);
    setSchedule(null);
    setMetrics(null);
    setRiskAssessment(null);
    setDemoConfig({
      numEmployees: 1,
      numDays: 1,
      startDate: "2025-11-01",
      employeeDistribution: {
        ad_operations: 40,
        engineering: 30,
        support: 30
      }
    });
    setActiveTab('schedule');
  };

  return (
    <div className="container">
      <header>
        <h1><CalendarRange size={28} className="icon-calendar" /> Workforce Scheduler</h1>
        <p>AI-powered scheduling for workflow operations</p>
      </header>

  {/* Unified Demo Controls Section */}
  <h3><SlidersHorizontal size={20} className = 'icon-sliders'/> Demo Configuration</h3>
  <div className="demo-controls card">
  
  <div className="control-group">
    <div className="control-item">
      <label htmlFor="numEmployees">Number of Employees: </label>
      <input
        id="numEmployees"
        type="range"
        min="1"
        max="50"
        value={demoConfig.numEmployees}
        onChange={(e) => handleConfigChange('numEmployees', parseInt(e.target.value))}
      />
      <span className="control-value">{demoConfig.numEmployees} employees</span>
    </div>
    
    <div className="control-item">
      <label htmlFor="numDays">Number of Days: </label>
      <input
        id="numDays"
        type="range"
        min="1"
        max="30"
        value={demoConfig.numDays}
        onChange={(e) => handleConfigChange('numDays', parseInt(e.target.value))}
      />
      <span className="control-value">{demoConfig.numDays} days ({demoConfig.numDays * 6} shifts)</span>
    </div>
    
    <div className="control-item">
      <label htmlFor="startDate">Start Date: </label>
      <input
        id="startDate"
        type="date"
        value={demoConfig.startDate}
        onChange={(e) => handleConfigChange('startDate', e.target.value)}
      />
    </div>
    </div>


  {/* Employee Distribution Controls */}
  <div className="control-group">
    <h4>Employee Distribution (%)</h4>
    <div className="distribution-controls">
      <div className="distribution-item">
        <label htmlFor="adOpsDist">Ad Operations: </label>
        <input
          id="adOpsDist"
          type="range"
          min="0"
          max="100"
          value={demoConfig.employeeDistribution.ad_operations}
          onChange={(e) => handleDistributionChange('ad_operations', e.target.value)}
        />
        <span className="control-value">{demoConfig.employeeDistribution.ad_operations}%</span>
      </div>
      
      <div className="distribution-item">
        <label htmlFor="engDist">Engineering: </label>
        <input
          id="engDist"
          type="range"
          min="0"
          max="100"
          value={demoConfig.employeeDistribution.engineering}
          onChange={(e) => handleDistributionChange('engineering', e.target.value)}
        />
        <span className="control-value">{demoConfig.employeeDistribution.engineering}%</span>
      </div>
      
      <div className="distribution-item">
        <label htmlFor="supportDist">Support: </label>
        <input
          id="supportDist"
          type="range"
          min="0"
          max="100"
          value={demoConfig.employeeDistribution.support}
          onChange={(e) => handleDistributionChange('support', e.target.value)}
        />
        <span className="control-value">{demoConfig.employeeDistribution.support}%</span>
      </div>
      
      <div className="distribution-total">
        Total: {demoConfig.employeeDistribution.ad_operations + 
                demoConfig.employeeDistribution.engineering + 
                demoConfig.employeeDistribution.support}%
        {demoConfig.employeeDistribution.ad_operations + 
         demoConfig.employeeDistribution.engineering + 
         demoConfig.employeeDistribution.support !== 100 && (
          <span style={{ color: 'red', marginLeft: '10px', display: 'inline-flex', alignItems: 'center' }}>
          <AlertTriangle size={16} className="icon-warning" /> Must total 100%
          </span>
        )}
      </div>
    </div>
  </div>
  
  <div className="button-group">
    <button 
      className="btn btn-secondary"
      onClick={loadDemoData}
      disabled={loading || 
        demoConfig.employeeDistribution.ad_operations + 
        demoConfig.employeeDistribution.engineering + 
        demoConfig.employeeDistribution.support !== 100
      }
    >
      {loading ? 'Loading...' : 'Load Demo Data'}
    </button>
    
    <button 
      className="btn btn-primary"
      onClick={() => generateDemoSchedule(demoConfig)}
      disabled={loading || employees.length === 0}
    >
      {loading ? 'Generating...' : 'Generate Optimized Schedule'}
    </button>

    <button 
      className="btn btn-warning"
      onClick={reset} 
      disabled={loading}
    >
      Reset
    </button>
  </div>
</div>
  
      {/* Navigation Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          Schedule View
        </button>
        <button 
          className={`tab ${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => setActiveTab('employees')}
        >
          Employees ({employees.length})
        </button>
        <button 
          className={`tab ${activeTab === 'shifts' ? 'active' : ''}`}
          onClick={() => setActiveTab('shifts')}
        >
          Shifts ({shifts.length})
        </button>
        <button 
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
          disabled={!metrics}
        >
          Analytics
        </button>
        <button 
          className={`tab ${activeTab === 'risks' ? 'active' : ''}`}
          onClick={() => setActiveTab('risks')}
          disabled={!riskAssessment}
        >
          Risk Assessment
        </button>
      </div>
  
{/* Schedule Tab */}
{activeTab === 'schedule' && (
  <div className="tab-content">
    <div className="schedule-header">
      <h3><CalendarRange size={20} className="icon-calendar" />Schedule View</h3>
      {metrics && (
        <div className="coverage-badge">
          Coverage: {metrics.coverage_rate}%
        </div>
      )}
    </div>
    
    <div className="card">
      {!schedule ? (
        <p className="placeholder">No schedule generated yet. Load demo data and generate a schedule to see results.</p>
      ) : (
        <div className="schedule-grid">
          <h4>Assignments ({Object.keys(schedule).length} shifts scheduled)</h4>
          
          {Object.entries(schedule)
            .map(([shiftId, employeeIds]) => {
              const shift = shifts.find(s => s.id === shiftId);
              return { shiftId, employeeIds, shift };
            })
            .filter(item => item.shift) // Remove shifts with missing data
            .sort((a, b) => {
              const dateCompare = new Date(a.shift.date).getTime() - new Date(b.shift.date).getTime();
              if (dateCompare !== 0) return dateCompare;

              const shiftOrder = {
                'morning': 1,    
                'day': 2,       
                'swing': 3,      
                'night': 4,     
                'on_call': 5     
              };
              
              return (shiftOrder[a.shift.shift_type] || 6) - (shiftOrder[b.shift.shift_type] || 6);
            })
            .map(({ shiftId, employeeIds, shift }) => {
              const isWeekend = shift.is_weekend;
              const dateObj = new Date(shift.date);
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
              
              return (
                <div key={shiftId} className={`schedule-item ${isWeekend ? 'weekend-shift' : 'weekday-shift'}`}>
                  <div className="shift-header">
                    <div className="shift-title">
                      <div className="date-info">
                        <strong>
                          {shift.date} ({dayName})
                        </strong>
                        {isWeekend && <span className="weekend-badge">Weekend</span>}
                      </div>
                      <span className="shift-type">{SHIFT_TYPE_LABELS[shift.shift_type]}</span>
                    </div>
                    <div className="assignment-count">
                      {employeeIds.length} assigned
                    </div>
                  </div>
                  
                  <div className="shift-details">
                    <div className="detail-row">
                      <span>Required:</span>
                      <span className="requirement">{shift.min_employees} employees</span>
                    </div>
                    <div className="detail-row">
                      <span>Priority:</span>
                      <span className={`priority-${shift.priority}`}>
                        {PRIORITY_LABELS[shift.priority]}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span>Department:</span>
                      <span className="dept-value">{DEPARTMENT_LABELS[shift.department]}</span>
                    </div>
                  </div>
                  
                  <div className="assigned-employees">
                    <div className="employees-label">Assigned Employees:</div>
                    <div className="employee-badges">
                      {employeeIds.map(empId => {
                        const employee = employees.find(e => e.id === empId);
                        return (
                          <span 
                            key={empId} 
                            className="employee-badge"
                            style={{ 
                              backgroundColor: employee ? getDepartmentColor(employee.department) : '#6B7280'
                            }}
                          >
                            {employee ? employee.name : empId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  
                  {employeeIds.length < shift.min_employees && (
                    <div className="warning-badge">
                        <AlertTriangle size={16} className="icon-warning" /> Understaffed (needs {shift.min_employees - employeeIds.length} more)
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  </div>
)}
  
      {/* Employees Tab */}
      {activeTab === 'employees' && (
  <div className="tab-content">
    <h3><UsersRound size={20} className='icons-people' /> Workforce ({employees.length} employees)</h3>
    <div className="card">
      {employees.length === 0 ? (
        <p className="placeholder">No employees loaded. Click "Load Demo Data" to load employees.</p>
      ) : (
        <div className="employees-grid">
          {employees.map(emp => (
            <div 
              key={emp.id} 
              className="employee-card clickable"
              onClick={() => handleEmployeeClick(emp)}
            >
              <div className="employee-header">
                <h4>{emp.name}</h4>
                <span 
                  className="dept-badge"
                  style={{ backgroundColor: getDepartmentColor(emp.department) }}
                >
                  {DEPARTMENT_LABELS[emp.department]}
                </span>
              </div>
              
              <div className="employee-details">
                <div className="detail-row">
                  <span className="label">Level:</span>
                  <span className="value">{SKILL_LEVEL_LABELS[emp.skill_level]}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Cost:</span>
                  <span className="value">${emp.cost_per_hour}/hr</span>
                </div>
                {emp.preferred_shift && (
                  <div className="detail-row">
                    <span className="label">Prefers:</span>
                    <span className="value">{SHIFT_TYPE_LABELS[emp.preferred_shift]}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">Max Hours:</span>
                  <span className="value">{emp.max_hours_per_week}/week</span>
                </div>
              </div>
              
              <div className="skills-section">
                <strong>Skills:</strong>
                <div className="skills-list">
                  {Array.from(emp.skills || []).map(skill => (
                    <span key={skill} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
              
              {emp.certifications && emp.certifications.size > 0 && (
                <div className="certifications">
                  <strong>Certifications:</strong>
                  <div className="certs-list">
                    {Array.from(emp.certifications).map(cert => (
                      <span key={cert} className="cert-tag">{cert}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {emp.on_call_capacity && (
                <div className="on-call-badge">On-Call Available</div>
              )}
              
              <div className="click-hint">
                Click to view schedule →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}


      {/* Shifts Tab */}
      {activeTab === 'shifts' && (
        <div className="tab-content">
          <h3>< BriefcaseBusiness size={20} className='icon-shifts'/> Shifts ({shifts.length} shifts)</h3>
          <div className="card">
            {shifts.length === 0 ? (
              <p className="placeholder">No shifts loaded. Click "Load Demo Data" to load shifts.</p>
            ) : (
              <div className="shifts-grid">
                {shifts.map(shift => (
                  <div key={shift.id} className="shift-card">
                    <div className="shift-header">
                      <h4>{shift.id}</h4>
                      <span 
                        className="dept-badge"
                        style={{ backgroundColor: getDepartmentColor(shift.department) }}
                      >
                        {DEPARTMENT_LABELS[shift.department]}
                      </span>
                    </div>
                    
                    <div className="shift-details">
                      <div className="detail-row">
                        <span className="label">Date:</span>
                        <span className="value">{shift.date}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Type:</span>
                        <span className="value">{SHIFT_TYPE_LABELS[shift.shift_type]}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Staff Required:</span>
                        <span className="value">{shift.min_employees} - {shift.max_employees}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Skill Level:</span>
                        <span className="value">{SKILL_LEVEL_LABELS[shift.required_skill_level]}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Priority:</span>
                        <span className="value">{PRIORITY_LABELS[shift.priority]}</span>
                      </div>
                    </div>
                    
                    <div className="skills-section">
                      <strong>Required Skills:</strong>
                      <div className="skills-list">
                        {Array.from(shift.required_skills || []).map(skill => (
                          <span key={skill} className="skill-tag required">{skill}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && metrics && (
        <div className="tab-content">
          <h3><ChartNoAxesCombined size={20} className='icon-shifts' />Schedule Analytics</h3>
          <div className="analytics-grid">
            <div className="metric-card primary">
              <h4>Total Cost</h4>
              <div className="metric-value">${metrics.total_labor_cost?.toFixed(2) || '0.00'}</div>
              <div className="metric-label">Labor Cost</div>
            </div>
            
            <div className="metric-card primary">
              <h4>Coverage Rate</h4>
              <div className="metric-value">{metrics.coverage_rate?.toFixed(1) || '0'}%</div>
              <div className="metric-label">Shifts Properly Staffed</div>
            </div>
            
            <div className="metric-card primary">
              <h4>Total Shifts</h4>
              <div className="metric-value">{metrics.total_shifts_scheduled || 0}</div>
              <div className="metric-label">Assigned Shifts</div>
            </div>
            
            <div className="metric-card primary">
              <h4>Utilization</h4>
              <div className="metric-value">
                {metrics.total_employees ? 
                  `${Math.round(((metrics.total_employees - (metrics.idle_employees_count || 0)) / metrics.total_employees) * 100)}%` : 
                  '0%'
                }
              </div>
              <div className="metric-label">Employees Utilized</div>
            </div>
          </div>

          {/* Department Distribution */}
          <div className="card">
            <h4>Department Distribution</h4>
            {metrics.department_distribution ? (
              <div className="department-stats">
                {Object.entries(metrics.department_distribution).map(([dept, count]) => (
                  <div key={dept} className="dept-stat-item">
                    <div className="dept-stat-header"       >
                      <span className="dept-name">{DEPARTMENT_LABELS[dept] || dept}</span>
                      <span className="dept-count">{count} assignments</span>
            
                    </div>
                    <div className="dept-bar">
                      <div 
                        className="dept-bar-fill"
                        style={{ 
                          width: `${(count / metrics.total_shifts_scheduled) * 100}%`,
                          backgroundColor: getDepartmentColor(dept)
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="placeholder">Department distribution data not available</p>
            )}
          </div>

          {/* Skill Utilization */}
          <div className="card">
            <h4>Skill Level Utilization</h4>
            {metrics.skill_utilization ? (
              <div className="skill-stats">
                {Object.entries(metrics.skill_utilization).map(([level, count]) => (
                  <div key={level} className="skill-stat-item">
                    <span className="skill-level">{SKILL_LEVEL_LABELS[level] || level}</span>
                    <span className="skill-count">{count} assignments</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="placeholder">Skill utilization data not available</p>
            )}
          </div>
        </div>
      )}

      {/* Risk Assessment Tab */}
      {activeTab === 'risks' && riskAssessment && (
        <div className="tab-content">
          <div className="risk-header">
            <h3><CircleAlert size={20} className='icon-shifts'/>Risk Assessment</h3>
            <div className={`risk-score ${riskAssessment.risk_score > 20 ? 'high' : riskAssessment.risk_score > 10 ? 'medium' : 'low'}`}>
              Risk Score: {riskAssessment.risk_score}
            </div>
          </div>

          {/* Understaffed Shifts */}
          {riskAssessment.understaffed_shifts && riskAssessment.understaffed_shifts.length > 0 && (
            <div className="card risk-card">
              <h4><AlertTriangle size={18} className="icon-alert" /> Understaffed Shifts ({riskAssessment.understaffed_shifts.length})</h4>
              <div className="risk-list">
                {riskAssessment.understaffed_shifts.map(shift => (
                  <div key={shift.shift_id} className="risk-item">
                    <div className="risk-details">
                      <strong>{shift.date} - {DEPARTMENT_LABELS[shift.department]}</strong>
                      <span>Required: {shift.required}, Assigned: {shift.assigned}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* High Traffic Risks */}
          {riskAssessment.high_traffic_risks && riskAssessment.high_traffic_risks.length > 0 && (
            <div className="card risk-card">
              <h4><TrendingUp size={18} className="icon-warning" /> High Traffic Risks ({riskAssessment.high_traffic_risks.length})</h4>
              <div className="risk-list">
                {riskAssessment.high_traffic_risks.map(shiftId => {
                  const shift = shifts.find(s => s.id === shiftId);
                  return shift ? (
                    <div key={shiftId} className="risk-item">
                      <div className="risk-details">
                        <strong>{shift.date} - {DEPARTMENT_LABELS[shift.department]}</strong>
                        <span>High traffic: {(shift.expected_traffic / 1000000).toFixed(1)}M impressions</span>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="card recommendations-card">
            <h4>Recommendations</h4>
            <ul className="recommendations-list">
              {riskAssessment.recommendations && riskAssessment.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>

          {(!riskAssessment.understaffed_shifts || riskAssessment.understaffed_shifts.length === 0) && 
           (!riskAssessment.high_traffic_risks || riskAssessment.high_traffic_risks.length === 0) && (
            <div className="card success-card">
              <h4><Shield size={18} className="icon-success" /> All Clear</h4>
              <p>No significant risks detected in the current schedule.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkforceScheduler;

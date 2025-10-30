from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Set, Dict, Optional, Any
from enum import Enum
from models import Employee, Shift, ScheduleRequest, ScheduleResponse, ScheduleConstraints, BusinessRules
from models import Department, SkillLevel, ShiftType
import json
import sys
from optimizers.BaseOptimizer import BaseOptimizer
from optimizers.FallbackOptimizer import FallbackOptimizer
from optimizers.GradualOptimizer import GradualOptimizer

sys.stdout.reconfigure(line_buffering=True)

app = FastAPI(title="Workforce Scheduler")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5175", "http://localhost:5173"],
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API
class DepartmentModel(str, Enum):
    AD_OPS = "ad_operations"
    ENGINEERING = "engineering"
    SALES = "sales"
    ACCOUNT_MANAGEMENT = "account_management"
    SUPPORT = "support"

class SkillLevelModel(str, Enum):
    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"

class ShiftTypeModel(str, Enum):
    MORNING_SHIFT = "morning"  # 6AM-2PM
    AFTERNOON_SHIFT = "swing"  # 2PM-10PM  
    NIGHT_SHIFT = "night"  # 10PM-6AM
    STANDARD_SHIFT = "day" # 9AM-5PM
    ON_CALL = "on_call"
    
class EmployeeModel(BaseModel):
    id: str
    name: str
    department: DepartmentModel
    skill_level: SkillLevelModel
    skills: Set[str]
    max_hours_per_week: int = 40
    cost_per_hour: float = 26.44
    preferred_shift: Optional[ShiftTypeModel] = None
    timezone: str = "EST"
    is_remote: bool = True
    certifications: Set[str] = set()
    supported_regions: Set[str] = {"NA"}
    on_call_capacity: bool = False

class ShiftModel(BaseModel):
    id: str
    date: str
    shift_type: ShiftTypeModel
    department: DepartmentModel
    required_skill_level: SkillLevelModel
    required_skills: Set[str]
    min_employees: int
    max_employees: int
    region: str = "NA"
    priority: int = 1
    expected_traffic: int = 0

class ScheduleRequestModel(BaseModel):
    start_date: str
    end_date: str
    employees: List[EmployeeModel]
    shifts: List[ShiftModel]
    constraints: Dict = {}
    business_rules: Dict = {}

def generate_demo_data(num_employees=50, num_days=30, start_date="2025-11-01", employee_distribution=None):
    """Generate realistic workforce and shift data with customizable parameters"""
    
    print(f"Generating demo data with: {num_employees} employees, {num_days} days, distribution: {employee_distribution}")
    
    # Default employee distribution if not provided
    if employee_distribution is None:
        employee_distribution = {
            'ad_operations': 0.4,  # 40% Ad Ops
            'engineering': 0.3,     # 30% Engineering  
            'support': 0.3          # 30% Support
        }
    else:
        # Convert from frontend format if needed
        if isinstance(employee_distribution, dict):
            # If values are percentages (like 40, 30, 30), convert to decimals
            if any(isinstance(v, (int, float)) and v > 1 for v in employee_distribution.values()):
                total = sum(employee_distribution.values())
                if total > 0:
                    employee_distribution = {k: v/total for k, v in employee_distribution.items()}
    
    # Ensure all required departments are present
    required_departments = ['ad_operations', 'engineering', 'support']
    for dept in required_departments:
        if dept not in employee_distribution:
            employee_distribution[dept] = 0.0
    
    all_possible_employees = [
        # Ad Operations Team (20 employees)
        *[{
            "id": f"adops_{i+1}", 
            "name": f"AdOps_Employee_{i+1}", 
            "department": DepartmentModel.AD_OPS,
            "skill_level": SkillLevelModel.LEAD if i < 4 else SkillLevelModel.SENIOR if i < 8 else SkillLevelModel.MID if i < 12 else SkillLevelModel.JUNIOR,
            "skills": ["programmatic", "rtb", "optimization", "analytics", "reporting"],
            "cost_per_hour": 65.0 if i < 4 else 55.0 if i < 8 else 45.0 if i < 15 else 30.0,
            "preferred_shift": ShiftTypeModel.MORNING_SHIFT if i % 3 == 0 else ShiftTypeModel.AFTERNOON_SHIFT if i % 3 == 1 else ShiftTypeModel.STANDARD_SHIFT,
            "certifications": ["programmatic", "rtb", "optimization"] if i < 10 else [],
            "max_hours_per_week": 40,
            "timezone": "EST",
            "is_remote": i % 4 != 0,  # Most are remote
            "supported_regions": ["NA"],
            "on_call_capacity": i >= 10  # Junior and some mid-level can be on-call
        } for i in range(20)],
        
        # Engineering Team (15 employees)
        *[{
            "id": f"eng_{i+1}", 
            "name": f"Eng_Employee_{i+1}", 
            "department": DepartmentModel.ENGINEERING,
            "skill_level": SkillLevelModel.LEAD if i < 3 else SkillLevelModel.SENIOR if i < 8 else SkillLevelModel.MID if i < 12 else SkillLevelModel.JUNIOR,
            "skills": ["python", "java", "aws", "kafka", "react", "nodejs", "mongodb", "analytics"],
            "cost_per_hour": 95.0 if i < 3 else 85.0 if i < 8 else 70.0 if i < 12 else 50.0,
            "preferred_shift": ShiftTypeModel.STANDARD_SHIFT if i % 2 == 0 else None,
            "certifications": ["aws", "python"] if i < 10 else [],
            "max_hours_per_week": 40,
            "timezone": "EST",
            "is_remote": True,  # All engineers are remote
            "supported_regions": ["NA", "EU"] if i < 8 else ["NA"],
            "on_call_capacity": i >= 5  # Mid-level and above can be on-call
        } for i in range(15)],
        
        # Support Team (15 employees)
        *[{
            "id": f"support_{i+1}", 
            "name": f"Support_Employee_{i+1}", 
            "department": DepartmentModel.SUPPORT,
            "skill_level": SkillLevelModel.LEAD if i < 3 else SkillLevelModel.SENIOR if i < 8 else SkillLevelModel.MID if i < 12 else SkillLevelModel.JUNIOR,
            "skills": ["troubleshooting", "client_communication", "documentation", "training", "analytics", "reporting"],
            "cost_per_hour": 55.0 if i < 3 else 45.0 if i < 8 else 35.0 if i < 12 else 25.0,
            "preferred_shift": ShiftTypeModel.STANDARD_SHIFT if i % 2 == 0 else ShiftTypeModel.MORNING_SHIFT,
            "certifications": [],
            "max_hours_per_week": 40 if i < 10 else 35,
            "timezone": "EST",
            "is_remote": True,
            "supported_regions": ["NA", "APAC"] if i < 5 else ["NA"],
            "on_call_capacity": True  # Most support staff are on-call
        } for i in range(15)]
    ]
    
    # Calculate how many employees to select from each department based on distribution
    ad_ops_count = int(num_employees * employee_distribution.get('ad_operations', 0.4))
    eng_count = int(num_employees * employee_distribution.get('engineering', 0.3))
    support_count = num_employees - ad_ops_count - eng_count  # Remainder goes to support
    
    # Ensure counts are reasonable and don't exceed available employees
    ad_ops_count = max(0, min(ad_ops_count, 20))
    eng_count = max(0, min(eng_count, 15))
    support_count = max(0, min(support_count, 15))
    
    print(f"Department counts - AdOps: {ad_ops_count}, Eng: {eng_count}, Support: {support_count}")
    
    # Select employees from each department
    ad_ops_employees = [emp for emp in all_possible_employees if emp["department"] == DepartmentModel.AD_OPS][:ad_ops_count]
    eng_employees = [emp for emp in all_possible_employees if emp["department"] == DepartmentModel.ENGINEERING][:eng_count]
    support_employees = [emp for emp in all_possible_employees if emp["department"] == DepartmentModel.SUPPORT][:support_count]
    
    # Combine selected employees
    employees = ad_ops_employees + eng_employees + support_employees
    
    # If we don't have enough employees due to distribution constraints, fill from available pool
    if len(employees) < num_employees:
        needed = num_employees - len(employees)
        print(f"Need {needed} more employees to reach requested {num_employees}")
        
        # Get all employees not yet selected, sorted by department priority
        available_employees = [emp for emp in all_possible_employees if emp not in employees]
        
        # Add needed employees
        employees.extend(available_employees[:needed])
    
    # Ensure we have exactly the requested number
    employees = employees[:num_employees]
    
    # Generate dates based on user choice - FIXED: use num_days parameter correctly
    from datetime import datetime, timedelta
    start = datetime.strptime(start_date, "%Y-%m-%d")
    dates = [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(num_days)]
    
    # Generate shifts - FIXED: Now properly uses num_days parameter
    shifts = []
    shift_id = 1
    
    for date_str in dates:
        # Parse the date to determine if it's a weekend
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        is_weekend = date_obj.weekday() >= 5  # 5=Saturday, 6=Sunday
        
        # Higher traffic on weekdays, lower on weekends
        is_high_traffic = not is_weekend  # Weekdays are high traffic
        priority = 2 if is_high_traffic else 1
        
        # Ad Operations shifts (24/7 coverage needed) - 3 shifts per day
        shift_types = [ShiftTypeModel.MORNING_SHIFT, ShiftTypeModel.STANDARD_SHIFT, ShiftTypeModel.AFTERNOON_SHIFT]
        for shift_type in shift_types:
            shifts.append({
                "id": f"shift_{shift_id}",
                "date": date_str,
                "shift_type": shift_type,
                "department": DepartmentModel.AD_OPS,
                "required_skill_level": SkillLevelModel.MID,
                "required_skills": ["analytics"],
                "min_employees": 2,
                "max_employees": 4,
                "region": "NA",
                "priority": priority,
                "is_weekend": is_weekend
            })
            shift_id += 1
        
        # Engineering shifts - 2 shifts per day
        shifts.extend([
            {
                "id": f"shift_{shift_id}",
                "date": date_str,
                "shift_type": ShiftTypeModel.STANDARD_SHIFT,
                "department": DepartmentModel.ENGINEERING,
                "required_skill_level": SkillLevelModel.JUNIOR,
                "required_skills": ["python", "aws"],
                "min_employees": 1,
                "max_employees": 2,
                "region": "NA",
                "priority": 3,
                "is_weekend": is_weekend
            },
            {
                "id": f"shift_{shift_id + 1}",
                "date": date_str,
                "shift_type": ShiftTypeModel.ON_CALL,
                "department": DepartmentModel.ENGINEERING,
                "required_skill_level": SkillLevelModel.SENIOR,
                "required_skills": ["troubleshooting"],
                "min_employees": 1,
                "max_employees": 1,
                "region": "NA",
                "priority": 4,
                "is_weekend": is_weekend
            }
        ])
        shift_id += 2
        
        # Support shifts - 1 shift per day
        shifts.append({
            "id": f"shift_{shift_id}",
            "date": date_str,
            "shift_type": ShiftTypeModel.STANDARD_SHIFT,
            "department": DepartmentModel.SUPPORT,
            "required_skill_level": SkillLevelModel.MID,
            "required_skills": ["client_communication"],
            "min_employees": 1,
            "max_employees": 2,
            "region": "NA",
            "priority": 3,
            "is_weekend": is_weekend
        })
        shift_id += 1
    
    print(f"Generated {len(employees)} employees and {len(shifts)} shifts for {num_days} days")
    print(f"Date range: {dates[0]} to {dates[-1]}")
    print(f"Final department distribution: "
          f"AdOps: {len([e for e in employees if e['department'] == DepartmentModel.AD_OPS])}, "
          f"Eng: {len([e for e in employees if e['department'] == DepartmentModel.ENGINEERING])}, "
          f"Support: {len([e for e in employees if e['department'] == DepartmentModel.SUPPORT])}")
    
    return {
        "employees": employees,
        "shifts": shifts,
        "config": {
            "num_employees": num_employees,
            "num_days": num_days,
            "start_date": start_date,
            "employee_distribution": employee_distribution,
            "department_counts": {
                "ad_operations": len([e for e in employees if e['department'] == DepartmentModel.AD_OPS]),
                "engineering": len([e for e in employees if e['department'] == DepartmentModel.ENGINEERING]),
                "support": len([e for e in employees if e['department'] == DepartmentModel.SUPPORT])
            },
            "total_shifts_generated": len(shifts),
            "shifts_per_day": 6,  # 3 AdOps + 2 Eng + 1 Support = 6 shifts per day
            "date_range": {
                "start": dates[0],
                "end": dates[-1],
                "total_days": len(dates)
            }
        }
    }

@app.post("/api/schedule/generate", response_model=ScheduleResponse)
async def generate_schedule(request: ScheduleRequestModel):
    try:
        
        # Test the optimizer first
        #optimizer = SimpleOptimizer()
        optimizer = GradualOptimizer()
        #optimizer = Optimizer()
        
        response = optimizer.optimize(request, phase=4)
        
        print(f"Optimizer created, methods: {[method for method in dir(optimizer) if not method.startswith('_')]}")
        # Convert to internal models
        employees = []
        for emp in request.employees:
            preferred_shift = ShiftType(emp.preferred_shift.value) if emp.preferred_shift else None
            employees.append(Employee(
                id=emp.id,
                name=emp.name,
                department=Department(emp.department.value),
                skill_level=SkillLevel(emp.skill_level.value),
                skills=set(emp.skills),
                max_hours_per_week=emp.max_hours_per_week,
                cost_per_hour=emp.cost_per_hour,
                preferred_shift=preferred_shift,
                timezone=emp.timezone,
                is_remote=emp.is_remote,
                certifications=set(emp.certifications),
                supported_regions=set(emp.supported_regions),
                on_call_capacity=emp.on_call_capacity
            ))
        
        shifts = []
        for shift in request.shifts:
            shifts.append(Shift(
                id=shift.id,
                date=shift.date,
                shift_type=ShiftType(shift.shift_type.value),
                department=Department(shift.department.value),
                required_skill_level=SkillLevel(shift.required_skill_level.value),
                required_skills=set(shift.required_skills),
                min_employees=shift.min_employees,
                max_employees=shift.max_employees,
                region=shift.region,
                priority=shift.priority,
                expected_traffic=shift.expected_traffic
            ))
        
        schedule_request = ScheduleRequest(
            start_date=request.start_date,
            end_date=request.end_date,
            employees=employees,
            shifts=shifts,
            constraints=request.constraints,
            business_rules=request.business_rules
        )
        
        print(f"Running optimization with {len(employees)} employees and {len(shifts)} shifts")
        result = optimizer.optimize(schedule_request)
        print("Optimization completed successfully")
        return result
    
        
    except Exception as e:
        import traceback
        print("❌ CRITICAL ERROR in generate_schedule:")
        traceback.print_exc()
        # Return a valid response structure even on error
        return ScheduleResponse(
            assignments={},
            metrics={"error": str(e)},
            total_cost=0,
            coverage_score=0,
            risk_assessment={"error": str(e)}
        )
    

@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "Workforce Scheduler"}

@app.get("/")
async def root():
    return {"message": "Workforce Scheduler API"}
    
@app.get("/api/test-optimizer")
async def test_optimizer():
    try:
        
        #optimizer = SimpleOptimizer
        optimizer = GradualOptimizer
        #optimizer = Optimizer
        
        print("Optimizer methods:", [m for m in dir(optimizer) if not m.startswith('_')])
        return {"status": "Optimizer loaded successfully", "methods": [m for m in dir(optimizer) if not m.startswith('_')]}
    except Exception as e:
        return {"error": str(e)}
    
    
@app.post("/api/generate-demo-schedule")
async def generate_demo_schedule(config: dict):
    """Generate demo schedule with customizable parameters"""
    try:
        # Extract configuration from request
        num_employees = config.get('numEmployees', 20)
        num_days = config.get('numDays', 10)
        start_date = config.get('startDate', '2025-11-01')
        employee_distribution = config.get('employeeDistribution', {
            'ad_operations': 0.4,
            'engineering': 0.3,
            'support': 0.3
        })
        load_only = config.get('loadOnly', False)  # New flag for data loading only
        
        # Validate inputs
        if num_employees < 1 or num_employees > 50:
            raise HTTPException(
                status_code=400, 
                detail="Number of employees must be between 1 and 50"
            )
        
        if num_days < 1 or num_days > 30:
            raise HTTPException(
                status_code=400, 
                detail="Number of days must be between 1 and 30"
            )
        
        print(f"Generating demo data with {num_employees} employees for {num_days} days starting {start_date}")
        print(f"Employee distribution: {employee_distribution}")
        print(f"Load only mode: {load_only}")
        
        # Generate demo data with user parameters
        demo_data = generate_demo_data(
            num_employees=num_employees,
            num_days=num_days,
            start_date=start_date,
            employee_distribution=employee_distribution
        )
        
        # If we're only loading data (not generating schedule), return early
        if load_only:
            return {
                "input_data": {
                    "employees": demo_data["employees"],
                    "shifts": demo_data["shifts"]
                },
                "demo_config": demo_data.get("config", {}),
                "schedule": None
            }
        
        # Convert to internal models for optimization
        employees = []
        for emp in demo_data["employees"]:
            preferred_shift = ShiftType(emp["preferred_shift"].value) if emp.get("preferred_shift") else None
            employees.append(Employee(
                id=emp["id"],
                name=emp["name"],
                department=Department(emp["department"].value),
                skill_level=SkillLevel(emp["skill_level"].value),
                skills=set(emp["skills"]),
                max_hours_per_week=emp["max_hours_per_week"],
                cost_per_hour=emp["cost_per_hour"],
                preferred_shift=preferred_shift,
                timezone=emp["timezone"],
                is_remote=emp["is_remote"],
                certifications=set(emp.get("certifications", [])),
                supported_regions=set(emp.get("supported_regions", [])),
                on_call_capacity=emp.get("on_call_capacity", False)
            ))
        
        shifts = []
        for shift in demo_data["shifts"]:
            shifts.append(Shift(
                id=shift["id"],
                date=shift["date"],
                shift_type=ShiftType(shift["shift_type"].value),
                department=Department(shift["department"].value),
                required_skill_level=SkillLevel(shift["required_skill_level"].value),
                required_skills=set(shift.get("required_skills", [])),
                min_employees=shift["min_employees"],
                max_employees=shift["max_employees"],
                region=shift.get("region", "NA"),
                priority=shift.get("priority", 1),
                expected_traffic=shift.get("expected_traffic", 0)
            ))
        
        # Convert to dictionaries instead of using the classes directly
        constraints_dict = {
            "max_overtime": 10,
            "min_rest_hours": 12,
            "max_consecutive_shifts": 5,
            "require_qualifications": True,
            "enforce_department_matching": True
        }
        
        business_rules_dict = {
            "require_senior_cover": True,
            "traffic_based_staffing": True,
            "respect_shift_preferences": True,
            "minimize_costs": True,
            "balance_workload": True
        }
        
        # Create schedule request with dictionaries
        schedule_request = ScheduleRequest(
            start_date=start_date,
            end_date=shifts[-1].date if shifts else start_date,
            employees=employees,
            shifts=shifts,
            constraints=constraints_dict,
            business_rules=business_rules_dict
        )
        
        print(f"Running optimization with {len(employees)} employees and {len(shifts)} shifts")
        
        # Run optimization
        optimizer = GradualOptimizer()
        result = optimizer.optimize(schedule_request)
        
        print("Demo schedule optimization completed successfully")

        schedule_dict = {
            "assignments": result.assignments,
            "metrics": result.metrics,
            "total_cost": result.total_cost,
            "coverage_score": result.coverage_score,
            "risk_assessment": result.risk_assessment
        }
        
        # Return combined result with demo configuration info
        return {
            "schedule": schedule_dict,
            "demo_config": demo_data.get("config", {}),
            "input_data": {
                "employees": demo_data["employees"],
                "shifts": demo_data["shifts"]
            }
        }
        
    except Exception as e:
        import traceback
        print("Error in generate_demo_schedule:")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate demo schedule: {str(e)}"
        )
        
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
    

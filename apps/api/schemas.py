from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import date, time, datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    role: str
    organization_id: str
    employee_id: Optional[str] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    org_id: Optional[str] = None
    type: Optional[str] = None

# Authentication & User Schemas
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str
    organization_name: Optional[str] = None  # To auto-create organization if registering
    organization_id: Optional[str] = None    # To join existing organization

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    role: str
    organization_id: str
    employee_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Department and Team Schemas
class DepartmentResponse(BaseModel):
    id: str
    name: str
    organization_id: str
    created_at: datetime
    class Config:
        from_attributes = True

class TeamResponse(BaseModel):
    id: str
    name: str
    department_id: str
    organization_id: str
    created_at: datetime
    class Config:
        from_attributes = True

# Employee Schemas
class EmployeeBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    designation: Optional[str] = None
    department_id: Optional[str] = None
    team_id: Optional[str] = None
    manager_id: Optional[str] = None
    joining_date: date
    employment_status: str = "ACTIVE"
    salary: float = 0.0
    work_location: str = "REMOTE"
    skills: Optional[List[str]] = []

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    department_id: Optional[str] = None
    team_id: Optional[str] = None
    manager_id: Optional[str] = None
    employment_status: Optional[str] = None
    salary: Optional[float] = None
    work_location: Optional[str] = None
    skills: Optional[List[str]] = None

class EmployeeResponse(EmployeeBase):
    id: str
    organization_id: str
    created_at: datetime
    class Config:
        from_attributes = True

# Attendance Schemas
class AttendanceBase(BaseModel):
    date: date
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    status: str = "PRESENT"

class AttendanceCreate(AttendanceBase):
    employee_id: str

class AttendanceResponse(AttendanceBase):
    id: str
    employee_id: str
    organization_id: str
    deviation_minutes: int
    anomaly_score: float
    baseline_avg: int
    created_at: datetime
    employee_name: Optional[str] = None

    class Config:
        from_attributes = True

class AttendanceCorrection(BaseModel):
    check_in: Optional[str] = None  # HH:MM format
    check_out: Optional[str] = None # HH:MM format
    status: Optional[str] = None    # PRESENT, LATE, etc.
    reason: str

# Leave Schemas
class LeaveRequestBase(BaseModel):
    leave_type: str  # SICK, CASUAL, VACATION, MATERNITY, UNPAID
    start_date: date
    end_date: date
    reason: Optional[str] = None

class LeaveRequestCreate(LeaveRequestBase):
    employee_id: str

class LeaveRequestApproval(BaseModel):
    status: str  # APPROVED, REJECTED
    comments: Optional[str] = None

class LeaveRequestResponse(LeaveRequestBase):
    id: str
    employee_id: str
    organization_id: str
    status: str
    approved_by: Optional[str] = None
    comments: Optional[str] = None
    created_at: datetime
    employee_name: Optional[str] = None

    class Config:
        from_attributes = True

# Workload Schemas
class WorkloadAssignmentResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    department_name: Optional[str] = None
    team_name: Optional[str] = None
    tasks_count: int
    estimated_hours: float
    deadline_pressure: int
    active_projects: int
    working_hours: float
    score: float
    updated_at: datetime

    class Config:
        from_attributes = True

# Risk Schemas
class RiskScoreResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    department_name: Optional[str] = None
    team_name: Optional[str] = None
    attendance_risk: float
    workload_risk: float
    operational_risk: float
    attrition_risk: float
    dependency_risk: float
    total_risk: float
    signals: Dict[str, Any]
    confidence: float
    recommended_action: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Predictions
class PredictionResponse(BaseModel):
    id: str
    organization_id: str
    target_type: str
    target_id: Optional[str] = None
    forecast_horizon: int
    predicted_value: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    confidence: float
    features: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Simulations
class SimulationCreate(BaseModel):
    name: str
    scenario_config: Dict[str, Any]  # absent_employee_ids, remote_pct, new_workload_pct, etc.

class SimulationResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    created_by: Optional[str] = None
    scenario_config: Dict[str, Any]
    baseline_snapshot: Dict[str, Any]
    result_snapshot: Dict[str, Any]
    confidence: float
    recommendations: Optional[List[str]] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Payroll
class PayrollResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: Optional[str] = None
    month: int
    year: int
    base_salary: float
    allowances: float
    deductions: float
    net_salary: float
    status: str
    anomaly_score: float
    anomaly_reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Audit and Notifications
class AuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str] = None
    action: str
    resource: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    result: str
    timestamp: datetime

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

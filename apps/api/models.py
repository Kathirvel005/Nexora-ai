import datetime
import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, Date, Time, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from apps.api.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # SUPER_ADMIN, HR_ADMIN, HR_MANAGER, MANAGER, EMPLOYEE, ANALYST, EXECUTIVE
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization = relationship("Organization")
    employee = relationship("Employee", foreign_keys=[employee_id])

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization = relationship("Organization")
    teams = relationship("Team", back_populates="department", cascade="all, delete-orphan")

class Team(Base):
    __tablename__ = "teams"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization = relationship("Organization")
    department = relationship("Department", back_populates="teams")
    employees = relationship("Employee", back_populates="team", foreign_keys="Employee.team_id")

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    designation = Column(String(100), nullable=True)
    manager_id = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    joining_date = Column(Date, nullable=False)
    employment_status = Column(String(50), default="ACTIVE")  # ACTIVE, INACTIVE, LEAVE
    salary = Column(Float, nullable=False, default=0.0)  # Sensitive
    work_location = Column(String(100), nullable=True)  # REMOTE, HYBRID, ON_SITE
    skills = Column(JSON, nullable=True)  # List of skills
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization = relationship("Organization")
    department = relationship("Department")
    team = relationship("Team", back_populates="employees", foreign_keys=[team_id])
    manager = relationship("Employee", remote_side=[id], foreign_keys=[manager_id])
    
    attendance_records = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    leave_records = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")
    workload = relationship("WorkloadAssignment", uselist=False, back_populates="employee", cascade="all, delete-orphan")
    risk_scores = relationship("RiskScore", back_populates="employee", cascade="all, delete-orphan")

class Attendance(Base):
    __tablename__ = "attendance"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    check_in = Column(Time, nullable=True)
    check_out = Column(Time, nullable=True)
    status = Column(String(50), default="PRESENT")  # PRESENT, ABSENT, LATE, HALF_DAY
    deviation_minutes = Column(Integer, default=0)  # + or - deviation from baseline check_in
    anomaly_score = Column(Float, default=0.0)      # Score 0.0 - 1.0
    baseline_avg = Column(Integer, default=540)     # Average work duration or start time in minutes (e.g. 540 = 9:00 AM)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization = relationship("Organization")
    employee = relationship("Employee", back_populates="attendance_records")

class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type = Column(String(50), nullable=False)  # SICK, CASUAL, VACATION, MATERNITY, UNPAID
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(50), default="PENDING")  # PENDING, APPROVED, REJECTED
    approved_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization = relationship("Organization")
    employee = relationship("Employee", back_populates="leave_records")

class Payroll(Base):
    __tablename__ = "payroll"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    base_salary = Column(Float, nullable=False)
    allowances = Column(Float, default=0.0)
    deductions = Column(Float, default=0.0)
    net_salary = Column(Float, nullable=False)
    status = Column(String(50), default="PENDING")  # PENDING, PAID
    anomaly_score = Column(Float, default=0.0)
    anomaly_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization = relationship("Organization")
    employee = relationship("Employee")

class WorkloadAssignment(Base):
    __tablename__ = "workload_assignments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    tasks_count = Column(Integer, default=0)
    estimated_hours = Column(Float, default=0.0)
    deadline_pressure = Column(Integer, default=1)  # 1 to 10
    active_projects = Column(Integer, default=0)
    working_hours = Column(Float, default=40.0)  # Standard weekly hours
    score = Column(Float, default=50.0)  # 0 to 100 calculated workload index
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    organization = relationship("Organization")
    employee = relationship("Employee", back_populates="workload")

class RiskScore(Base):
    __tablename__ = "risk_scores"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    
    attendance_risk = Column(Float, default=0.0)
    workload_risk = Column(Float, default=0.0)
    operational_risk = Column(Float, default=0.0)
    attrition_risk = Column(Float, default=0.0)
    dependency_risk = Column(Float, default=0.0)
    total_risk = Column(Float, default=0.0)  # Aggregated risk index (0 to 100)
    
    signals = Column(JSON, nullable=True)  # Contributing indicators
    confidence = Column(Float, default=0.0)
    recommended_action = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization = relationship("Organization")
    employee = relationship("Employee", back_populates="risk_scores")

class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    target_type = Column(String(50), nullable=False)  # WORKFORCE_AVAILABILITY, WORKLOAD, ATTENDANCE_RISK, OPERATIONAL_RISK
    target_id = Column(String(36), nullable=True)  # Specific Employee or Team ID if applicable
    forecast_horizon = Column(Integer, nullable=False)  # 7, 14, 30, 90 days
    predicted_value = Column(Float, nullable=False)
    lower_bound = Column(Float, nullable=True)
    upper_bound = Column(Float, nullable=True)
    confidence = Column(Float, default=0.0)
    features = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization = relationship("Organization")

class Simulation(Base):
    __tablename__ = "simulations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    scenario_config = Column(JSON, nullable=False)  # Map of simulated changes
    baseline_snapshot = Column(JSON, nullable=False)  # Baseline state metrics
    result_snapshot = Column(JSON, nullable=False)    # Predicted outcome metrics
    confidence = Column(Float, default=0.0)
    recommendations = Column(JSON, nullable=True)
    status = Column(String(50), default="PENDING")  # PENDING, RUNNING, COMPLETED, FAILED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization = relationship("Organization")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    actor_id = Column(String(36), nullable=True)  # User email or UUID who made the change
    action = Column(String(100), nullable=False)   # login, update_employee, approve_leave, etc.
    resource = Column(String(255), nullable=True)  # resource ID or name details
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    result = Column(String(50), default="SUCCESS")  # SUCCESS, FAILURE
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization = relationship("Organization")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="INFO")  # INFO, WARNING, CRITICAL, AI_INSIGHT
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    organization = relationship("Organization")
    user = relationship("User")

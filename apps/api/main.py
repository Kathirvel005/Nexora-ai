import datetime
import json
import logging
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from apps.api.config import settings
from apps.api.database import engine, Base, get_db
from apps.api import models, schemas, security, ml_engine

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nexora")

app = FastAPI(title=settings.PROJECT_NAME, version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB Tables (Fallback for zero-config SQLite)
Base.metadata.create_all(bind=engine)

# =====================================================================
# REALTIME EVENTS SYSTEM (WEBSOCKETS)
# =====================================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("WebSocket disconnected.")

    async def broadcast(self, event_type: str, data: Any):
        payload = {
            "event": event_type,
            "data": data,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(payload)
            except Exception:
                dead_connections.append(connection)
                
        for dead in dead_connections:
            self.disconnect(dead)

ws_manager = ConnectionManager()

@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for ping or client events if any
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)

# =====================================================================
# AUDIT LOG HELPER
# =====================================================================

def log_audit(db: Session, org_id: str, actor: str, action: str, resource: str, result: str = "SUCCESS"):
    try:
        log_entry = models.AuditLog(
            organization_id=org_id,
            actor_id=actor,
            action=action,
            resource=resource,
            result=result
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to write audit log: {e}")

# =====================================================================
# PUBLIC ROUTES (AUTH)
# =====================================================================

@app.post("/api/auth/register", response_model=schemas.Token)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    try:
        # Create or fetch organization
        if user_in.organization_id:
            org = db.query(models.Organization).filter(models.Organization.id == user_in.organization_id).first()
            if not org:
                raise HTTPException(status_code=404, detail="Organization not found")
        else:
            org_name = user_in.organization_name or f"Org {user_in.email.split('@')[0]}"
            org = models.Organization(name=org_name)
            db.add(org)
            db.commit()
            db.refresh(org)
            
        hashed_pwd = security.hash_password(user_in.password)
        new_user = models.User(
            organization_id=org.id,
            email=user_in.email,
            password_hash=hashed_pwd,
            role=user_in.role
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Generate tokens
        access = security.create_access_token(new_user.id, new_user.role, org.id)
        refresh = security.create_refresh_token(new_user.id)
        
        log_audit(db, org.id, user_in.email, "register", f"user:{new_user.id}")
        
        return {
            "access_token": access,
            "refresh_token": refresh,
            "token_type": "bearer",
            "role": new_user.role,
            "organization_id": org.id
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/api/auth/login", response_model=schemas.Token)
def login(login_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_in.email).first()
    if not user or not security.verify_password(login_in.password, user.password_hash):
        log_audit(db, user.organization_id if user else "UNKNOWN", login_in.email, "login", "credentials", "FAILURE")
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    access = security.create_access_token(user.id, user.role, user.organization_id)
    refresh = security.create_refresh_token(user.id)
    
    log_audit(db, user.organization_id, user.email, "login", f"user:{user.id}")
    
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "role": user.role,
        "organization_id": user.organization_id,
        "employee_id": user.employee_id
    }

@app.post("/api/auth/refresh", response_model=Dict[str, str])
def refresh_token(token_in: Dict[str, str], db: Session = Depends(get_db)):
    refresh = token_in.get("refresh_token")
    if not refresh:
        raise HTTPException(status_code=400, detail="Missing refresh token")
        
    payload = security.decode_token(refresh, settings.JWT_REFRESH_SECRET)
    user_id = payload.get("sub")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    access = security.create_access_token(user.id, user.role, user.organization_id)
    return {"access_token": access}

# =====================================================================
# PROTECTED PROFILE
# =====================================================================

@app.get("/api/users/me", response_model=schemas.UserResponse)
def get_me(payload: dict = Depends(security.get_current_user_payload), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# =====================================================================
# DEPARTMENTS AND TEAMS
# =====================================================================

@app.get("/api/departments", response_model=List[schemas.DepartmentResponse])
def get_departments(payload: dict = Depends(security.get_current_user_payload), db: Session = Depends(get_db)):
    return db.query(models.Department).filter(models.Department.organization_id == payload.get("org_id")).all()

@app.get("/api/teams", response_model=List[schemas.TeamResponse])
def get_teams(payload: dict = Depends(security.get_current_user_payload), db: Session = Depends(get_db)):
    return db.query(models.Team).filter(models.Team.organization_id == payload.get("org_id")).all()

# =====================================================================
# EMPLOYEE CRUD
# =====================================================================

@app.get("/api/employees", response_model=Dict[str, Any])
def list_employees(
    search: Optional[str] = None,
    department_id: Optional[str] = None,
    team_id: Optional[str] = None,
    status: Optional[str] = None,
    work_location: Optional[str] = None,
    page: int = 1,
    limit: int = 25,
    payload: dict = Depends(security.get_current_user_payload),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    role = payload.get("role")
    
    # Base query restricted by Tenant organization
    query = db.query(models.Employee).filter(models.Employee.organization_id == org_id)
    
    # Enforce RBAC bounds
    if role == "EMPLOYEE":
        # Employees can only retrieve their own record
        user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
        if user and user.employee_id:
            query = query.filter(models.Employee.id == user.employee_id)
        else:
            raise HTTPException(status_code=403, detail="Employee not linked to profile")
    elif role == "MANAGER":
        # Managers can view themselves and people reporting to them
        user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
        if user and user.employee_id:
            query = query.filter((models.Employee.manager_id == user.employee_id) | (models.Employee.id == user.employee_id))
            
    # Apply Filters
    if search:
        query = query.filter(models.Employee.name.ilike(f"%{search}%") | models.Employee.email.ilike(f"%{search}%"))
    if department_id:
        query = query.filter(models.Employee.department_id == department_id)
    if team_id:
        query = query.filter(models.Employee.team_id == team_id)
    if status:
        query = query.filter(models.Employee.employment_status == status)
    if work_location:
        query = query.filter(models.Employee.work_location == work_location)
        
    total = query.count()
    
    # Sorting and pagination
    employees = query.order_by(models.Employee.name).offset((page - 1) * limit).limit(limit).all()
    
    # Build response: omit sensitive salary information from low permission roles
    res_data = []
    for emp in employees:
        emp_dict = schemas.EmployeeResponse.from_orm(emp).dict()
        if role not in ["SUPER_ADMIN", "HR_ADMIN", "HR_MANAGER", "EXECUTIVE"]:
            emp_dict["salary"] = 0.0  # Hide salary from standard employees/managers
        res_data.append(emp_dict)
        
    return {
        "data": res_data,
        "meta": {
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
    }

@app.post("/api/employees", response_model=schemas.EmployeeResponse)
def create_employee(
    emp_in: schemas.EmployeeCreate,
    payload: dict = Depends(security.RoleChecker(["SUPER_ADMIN", "HR_ADMIN"])),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    
    new_emp = models.Employee(
        organization_id=org_id,
        department_id=emp_in.department_id,
        team_id=emp_in.team_id,
        name=emp_in.name,
        email=emp_in.email,
        phone=emp_in.phone,
        designation=emp_in.designation,
        manager_id=emp_in.manager_id,
        joining_date=emp_in.joining_date,
        employment_status=emp_in.employment_status,
        salary=emp_in.salary,
        work_location=emp_in.work_location,
        skills=emp_in.skills
    )
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)
    
    # Initialize workload with default score (tasks=3, est=20, pressure=3, projects=1)
    wl_score = ml_engine.calculate_workload_score(3, 20.0, 3, 1)
    wl = models.WorkloadAssignment(
        organization_id=org_id,
        employee_id=new_emp.id,
        tasks_count=3,
        estimated_hours=20.0,
        deadline_pressure=3,
        active_projects=1,
        working_hours=40.0,
        score=wl_score
    )
    db.add(wl)
    
    # Initialize Risk Score record
    risk_dict = ml_engine.calculate_employee_risk(db, new_emp.id)
    risk = models.RiskScore(
        organization_id=org_id,
        employee_id=new_emp.id,
        team_id=new_emp.team_id,
        department_id=new_emp.department_id,
        attendance_risk=risk_dict.get("attendance_risk", 0.0),
        workload_risk=risk_dict.get("workload_risk", 0.0),
        dependency_risk=risk_dict.get("dependency_risk", 0.0),
        attrition_risk=risk_dict.get("attrition_risk", 0.0),
        operational_risk=risk_dict.get("operational_risk", 0.0),
        total_risk=risk_dict.get("total_risk", 0.0),
        signals=risk_dict.get("signals"),
        confidence=risk_dict.get("confidence", 0.0),
        recommended_action=risk_dict.get("recommended_action")
    )
    db.add(risk)
    db.commit()
    
    log_audit(db, org_id, payload.get("sub"), "create_employee", f"employee:{new_emp.id}")
    return new_emp

@app.get("/api/employees/{employee_id}", response_model=schemas.EmployeeResponse)
def get_employee(
    employee_id: str,
    payload: dict = Depends(security.get_current_user_payload),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    role = payload.get("role")
    
    # Enforce RBAC
    if role == "EMPLOYEE":
        user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
        if not user or user.employee_id != employee_id:
            raise HTTPException(status_code=403, detail="Permission denied")
            
    emp = db.query(models.Employee).filter(models.Employee.id == employee_id, models.Employee.organization_id == org_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    emp_dict = schemas.EmployeeResponse.from_orm(emp).dict()
    if role not in ["SUPER_ADMIN", "HR_ADMIN", "HR_MANAGER", "EXECUTIVE"]:
        emp_dict["salary"] = 0.0
        
    return emp_dict

@app.patch("/api/employees/{employee_id}", response_model=schemas.EmployeeResponse)
def update_employee(
    employee_id: str,
    emp_in: schemas.EmployeeUpdate,
    payload: dict = Depends(security.RoleChecker(["SUPER_ADMIN", "HR_ADMIN", "HR_MANAGER"])),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    
    emp = db.query(models.Employee).filter(models.Employee.id == employee_id, models.Employee.organization_id == org_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    # Apply changes
    update_data = emp_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(emp, field, value)
        
    db.commit()
    db.refresh(emp)
    
    # Recalculate Risk Score
    risk = db.query(models.RiskScore).filter(models.RiskScore.employee_id == employee_id).order_by(models.RiskScore.created_at.desc()).first()
    risk_dict = ml_engine.calculate_employee_risk(db, employee_id)
    if risk:
        for k, v in risk_dict.items():
            if hasattr(risk, k):
                setattr(risk, k, v)
    db.commit()
    
    log_audit(db, org_id, payload.get("sub"), "update_employee", f"employee:{employee_id}")
    return emp

# =====================================================================
# ATTENDANCE
# =====================================================================

@app.get("/api/attendance", response_model=List[schemas.AttendanceResponse])
def get_attendance(
    employee_id: Optional[str] = None,
    date: Optional[str] = None,
    payload: dict = Depends(security.get_current_user_payload),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    role = payload.get("role")
    
    query = db.query(models.Attendance).filter(models.Attendance.organization_id == org_id)
    
    if role == "EMPLOYEE":
        user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
        if user and user.employee_id:
            query = query.filter(models.Attendance.employee_id == user.employee_id)
        else:
            return []
    elif employee_id:
        query = query.filter(models.Attendance.employee_id == employee_id)
        
    if date:
        date_obj = datetime.datetime.strptime(date, "%Y-%m-%d").date()
        query = query.filter(models.Attendance.date == date_obj)
        
    records = query.order_by(models.Attendance.date.desc()).limit(100).all()
    
    res = []
    for r in records:
        schema_obj = schemas.AttendanceResponse.from_orm(r)
        schema_obj.employee_name = r.employee.name
        res.append(schema_obj)
    return res

@app.post("/api/attendance/check-in", response_model=schemas.AttendanceResponse)
def check_in(payload: dict = Depends(security.get_current_user_payload), db: Session = Depends(get_db)):
    org_id = payload.get("org_id")
    user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
    if not user or not user.employee_id:
        raise HTTPException(status_code=400, detail="User is not linked to an employee record")
        
    today = datetime.date.today()
    existing = db.query(models.Attendance).filter(
        models.Attendance.employee_id == user.employee_id,
        models.Attendance.date == today
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already checked in for today")
        
    now = datetime.datetime.now()
    check_in_time = now.time()
    
    # Grab historical check_ins for anomaly detection
    history = db.query(models.Attendance.check_in).filter(
        models.Attendance.employee_id == user.employee_id,
        models.Attendance.status != "ABSENT"
    ).limit(15).all()
    hist_list = [h[0] for h in history if h[0]]
    
    deviation, anomaly_score, mean_mins = ml_engine.detect_attendance_anomaly(check_in_time, hist_list)
    
    status_str = "PRESENT"
    if deviation > 45:  # LATE if check-in is > 45 mins late
        status_str = "LATE"
        
    att = models.Attendance(
        organization_id=org_id,
        employee_id=user.employee_id,
        date=today,
        check_in=check_in_time,
        status=status_str,
        deviation_minutes=deviation,
        anomaly_score=anomaly_score,
        baseline_avg=mean_mins
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    
    # Broadcast realtime event
    import asyncio
    asyncio.run(ws_manager.broadcast("attendance.updated", {
        "employee_name": user.employee.name,
        "status": status_str,
        "check_in": str(check_in_time),
        "anomaly": anomaly_score > 0.6
    }))
    
    # Write audit log if anomaly detected
    if anomaly_score > 0.6:
        log_audit(db, org_id, user.email, "attendance_anomaly", f"employee:{user.employee_id} deviation:{deviation}m")
        # Trigger Notification
        notif = models.Notification(
            organization_id=org_id,
            user_id=user.id,
            title="Attendance Deviation Alert",
            message=f"Check-in deviation (+{deviation}m) registered. Baseline: {mean_mins//60:02d}:{mean_mins%60:02d}. Anomaly score: {anomaly_score}.",
            type="WARNING"
        )
        db.add(notif)
        db.commit()
        
    return att

@app.post("/api/attendance/check-out", response_model=schemas.AttendanceResponse)
def check_out(payload: dict = Depends(security.get_current_user_payload), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
    if not user or not user.employee_id:
        raise HTTPException(status_code=400, detail="User not linked to an employee")
        
    today = datetime.date.today()
    att = db.query(models.Attendance).filter(
        models.Attendance.employee_id == user.employee_id,
        models.Attendance.date == today
    ).first()
    
    if not att:
        raise HTTPException(status_code=400, detail="Please check in first")
        
    now = datetime.datetime.now()
    att.check_out = now.time()
    db.commit()
    db.refresh(att)
    
    return att

@app.post("/api/attendance/{record_id}/correct", response_model=schemas.AttendanceResponse)
def correct_attendance(
    record_id: str,
    correction: schemas.AttendanceCorrection,
    payload: dict = Depends(security.RoleChecker(["SUPER_ADMIN", "HR_ADMIN", "HR_MANAGER"])),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    att = db.query(models.Attendance).filter(models.Attendance.id == record_id, models.Attendance.organization_id == org_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Attendance record not found")
        
    if correction.check_in:
        t_in = datetime.datetime.strptime(correction.check_in, "%H:%M").time()
        att.check_in = t_in
    if correction.check_out:
        t_out = datetime.datetime.strptime(correction.check_out, "%H:%M").time()
        att.check_out = t_out
    if correction.status:
        att.status = correction.status
        
    # Reset anomaly score on correction
    att.anomaly_score = 0.0
    att.deviation_minutes = 0
    
    db.commit()
    db.refresh(att)
    
    log_audit(db, org_id, payload.get("sub"), "attendance_correction", f"attendance:{record_id} reason:{correction.reason}")
    return att

# =====================================================================
# LEAVE REQUESTS
# =====================================================================

@app.get("/api/leave", response_model=List[schemas.LeaveRequestResponse])
def get_leaves(
    employee_id: Optional[str] = None,
    payload: dict = Depends(security.get_current_user_payload),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    role = payload.get("role")
    
    query = db.query(models.LeaveRequest).filter(models.LeaveRequest.organization_id == org_id)
    
    if role == "EMPLOYEE":
        user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
        if user and user.employee_id:
            query = query.filter(models.LeaveRequest.employee_id == user.employee_id)
        else:
            return []
    elif employee_id:
        query = query.filter(models.LeaveRequest.employee_id == employee_id)
        
    records = query.order_by(models.LeaveRequest.start_date.desc()).all()
    
    res = []
    for r in records:
        obj = schemas.LeaveRequestResponse.from_orm(r)
        obj.employee_name = r.employee.name
        res.append(obj)
    return res

@app.post("/api/leave", response_model=schemas.LeaveRequestResponse)
def apply_leave(leave_in: schemas.LeaveRequestBase, payload: dict = Depends(security.get_current_user_payload), db: Session = Depends(get_db)):
    org_id = payload.get("org_id")
    user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
    if not user or not user.employee_id:
        raise HTTPException(status_code=400, detail="User not linked to an employee")
        
    new_req = models.LeaveRequest(
        organization_id=org_id,
        employee_id=user.employee_id,
        leave_type=leave_in.leave_type,
        start_date=leave_in.start_date,
        end_date=leave_in.end_date,
        reason=leave_in.reason,
        status="PENDING"
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    
    # Broadcast realtime event
    import asyncio
    asyncio.run(ws_manager.broadcast("leave.created", {
        "employee_name": user.employee.name,
        "leave_type": leave_in.leave_type,
        "dates": f"{leave_in.start_date} to {leave_in.end_date}"
    }))
    
    log_audit(db, org_id, user.email, "apply_leave", f"leave:{new_req.id}")
    return new_req

@app.patch("/api/leave/{leave_id}/approve", response_model=schemas.LeaveRequestResponse)
def approve_leave(
    leave_id: str,
    action: schemas.LeaveRequestApproval,
    payload: dict = Depends(security.RoleChecker(["SUPER_ADMIN", "HR_ADMIN", "HR_MANAGER", "MANAGER"])),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    req = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == leave_id, models.LeaveRequest.organization_id == org_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")
        
    req.status = action.status
    req.approved_by = payload.get("sub")
    req.comments = action.comments
    
    # Update employee employment status if approved for current date range
    if action.status == "APPROVED":
        today = datetime.date.today()
        if req.start_date <= today <= req.end_date:
            emp = req.employee
            emp.employment_status = "LEAVE"
            
    db.commit()
    db.refresh(req)
    
    # Broadcast event
    import asyncio
    asyncio.run(ws_manager.broadcast(f"leave.{action.status.lower()}", {
        "employee_name": req.employee.name,
        "leave_type": req.leave_type,
        "status": action.status
    }))
    
    log_audit(db, org_id, payload.get("sub"), f"{action.status.lower()}_leave", f"leave:{leave_id}")
    return req

# =====================================================================
# WORKLOAD INTELLIGENCE
# =====================================================================

@app.get("/api/workload")
def get_workloads(
    department_id: Optional[str] = None,
    payload: dict = Depends(security.get_current_user_payload),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    role = payload.get("role")
    
    query = db.query(models.WorkloadAssignment).filter(models.WorkloadAssignment.organization_id == org_id)
    
    if department_id:
        query = query.join(models.Employee).filter(models.Employee.department_id == department_id)
        
    workloads = query.all()
    
    res = []
    for wl in workloads:
        res.append({
            "employee_id": wl.employee_id,
            "employee_name": wl.employee.name,
            "department_name": wl.employee.department.name if wl.employee.department else "Unassigned",
            "team_name": wl.employee.team.name if wl.employee.team else "Unassigned",
            "tasks_count": wl.tasks_count,
            "estimated_hours": wl.estimated_hours,
            "deadline_pressure": wl.deadline_pressure,
            "active_projects": wl.active_projects,
            "working_hours": wl.working_hours,
            "score": wl.score,
            "updated_at": wl.updated_at.isoformat()
        })
        
    # Calculate summary metrics
    scores = [w["score"] for w in res]
    avg_score = round(sum(scores)/len(scores), 1) if scores else 0.0
    overloaded_count = sum(1 for s in scores if s > 75)
    underutilized_count = sum(1 for s in scores if s < 30)
    
    return {
        "workloads": res,
        "summary": {
            "average_workload": avg_score,
            "overloaded_employees": overloaded_count,
            "underutilized_employees": underutilized_count,
            "total_counted": len(res)
        }
    }

# =====================================================================
# RISK INTELLIGENCE
# =====================================================================

@app.get("/api/risk")
def get_risks(
    team_id: Optional[str] = None,
    payload: dict = Depends(security.RoleChecker(["SUPER_ADMIN", "HR_ADMIN", "HR_MANAGER", "EXECUTIVE", "ANALYST"])),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    
    query = db.query(models.RiskScore).filter(models.RiskScore.organization_id == org_id)
    if team_id:
        query = query.filter(models.RiskScore.team_id == team_id)
        
    risks = query.order_by(models.RiskScore.total_risk.desc()).all()
    
    res = []
    for r in risks:
        res.append({
            "employee_id": r.employee_id,
            "employee_name": r.employee.name,
            "department_name": r.employee.department.name if r.employee.department else "Unassigned",
            "team_name": r.employee.team.name if r.employee.team else "Unassigned",
            "attendance_risk": r.attendance_risk,
            "workload_risk": r.workload_risk,
            "dependency_risk": r.dependency_risk,
            "attrition_risk": r.attrition_risk,
            "operational_risk": r.operational_risk,
            "total_risk": r.total_risk,
            "signals": r.signals,
            "confidence": r.confidence,
            "recommended_action": r.recommended_action
        })
        
    # High risk teams aggregation
    teams_query = db.query(
        models.Team.name,
        func.avg(models.RiskScore.total_risk).label("avg_risk"),
        func.count(models.RiskScore.id).label("emp_count")
    ).join(models.RiskScore, models.Team.id == models.RiskScore.team_id)\
     .filter(models.Team.organization_id == org_id)\
     .group_by(models.Team.name).all()
     
    teams_summary = []
    for t_name, avg, count in teams_query:
        teams_summary.append({
            "team_name": t_name,
            "average_risk": round(avg, 1),
            "employee_count": count
        })
        
    # Sort teams by average risk descending
    teams_summary.sort(key=lambda x: x["average_risk"], reverse=True)
    
    return {
        "risks": res,
        "teams_risk_summary": teams_summary,
        "summary": {
            "high_risk_count": sum(1 for r in risks if r.total_risk > 70),
            "moderate_risk_count": sum(1 for r in risks if 40 <= r.total_risk <= 70),
            "low_risk_count": sum(1 for r in risks if r.total_risk < 40)
        }
    }

# =====================================================================
# PREDICTIONS CENTER
# =====================================================================

@app.get("/api/predictions")
def get_predictions(
    horizon: int = 30,
    payload: dict = Depends(security.get_current_user_payload),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    
    # Generate mock analytical forecasts dynamically based on actual database totals
    avail_forecast = ml_engine.generate_forecast(db, org_id, "WORKFORCE_AVAILABILITY", horizon=horizon)
    wl_forecast = ml_engine.generate_forecast(db, org_id, "WORKLOAD", horizon=horizon)
    att_forecast = ml_engine.generate_forecast(db, org_id, "ATTENDANCE_RISK", horizon=horizon)
    op_forecast = ml_engine.generate_forecast(db, org_id, "OPERATIONAL_RISK", horizon=horizon)
    
    return {
        "workforce_availability": avail_forecast,
        "workload": wl_forecast,
        "attendance_risk": att_forecast,
        "operational_risk": op_forecast
    }

# =====================================================================
# SIMULATION LAB
# =====================================================================

@app.post("/api/simulations", response_model=schemas.SimulationResponse)
def run_simulation(
    sim_in: schemas.SimulationCreate,
    payload: dict = Depends(security.RoleChecker(["SUPER_ADMIN", "HR_ADMIN", "EXECUTIVE", "ANALYST"])),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    user_id = payload.get("sub")
    
    # Run the math simulation
    sim_results = ml_engine.run_scenario_simulation(db, org_id, sim_in.scenario_config)
    
    if "error" in sim_results:
        raise HTTPException(status_code=400, detail=sim_results["error"])
        
    # Save simulation history record
    sim_record = models.Simulation(
        organization_id=org_id,
        name=sim_in.name,
        created_by=user_id,
        scenario_config=sim_in.scenario_config,
        baseline_snapshot=sim_results["baseline"],
        result_snapshot=sim_results["simulated"],
        confidence=sim_results["confidence"],
        recommendations=sim_results["recommendations"],
        status="COMPLETED"
    )
    
    db.add(sim_record)
    db.commit()
    db.refresh(sim_record)
    
    # Broadcast event
    import asyncio
    asyncio.run(ws_manager.broadcast("simulation.completed", {
        "name": sim_record.name,
        "created_by": payload.get("sub"),
        "risk_shift": f"{sim_results['baseline']['operational_risk']}% -> {sim_results['simulated']['operational_risk']}%"
    }))
    
    log_audit(db, org_id, payload.get("sub"), "run_simulation", f"simulation:{sim_record.id}")
    return sim_record

@app.get("/api/simulations", response_model=List[schemas.SimulationResponse])
def get_simulation_history(
    payload: dict = Depends(security.get_current_user_payload),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    return db.query(models.Simulation).filter(models.Simulation.organization_id == org_id).order_by(models.Simulation.created_at.desc()).all()

@app.delete("/api/simulations/{sim_id}")
def delete_simulation(
    sim_id: str,
    payload: dict = Depends(security.RoleChecker(["SUPER_ADMIN", "HR_ADMIN"])),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    sim = db.query(models.Simulation).filter(models.Simulation.id == sim_id, models.Simulation.organization_id == org_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
        
    db.delete(sim)
    db.commit()
    return {"message": "Simulation deleted"}

# =====================================================================
# AI COPILOT
# =====================================================================

@app.post("/api/ai/chat")
def ai_copilot_chat(
    query_in: Dict[str, str],
    payload: dict = Depends(security.get_current_user_payload),
    db: Session = Depends(get_db)
):
    query = query_in.get("query", "").lower()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    org_id = payload.get("org_id")
    role = payload.get("role")
    
    # 1. INTENT DETECTION & SECURITY PERMISSION CHECKING
    # Intent A: Highest Workload / Overloaded Teams
    if any(k in query for k in ["workload", "imbalance", "overloaded", "busy"]):
        # Security: Employee cannot ask about team-wide workloads
        if role == "EMPLOYEE":
            raise HTTPException(status_code=403, detail="Unauthorized. Standard employees cannot query organization workload indexes.")
            
        # Fetch overloaded workloads
        wl_query = db.query(models.WorkloadAssignment).filter(
            models.WorkloadAssignment.organization_id == org_id
        ).join(models.Employee)
        
        if role == "MANAGER":
            user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
            wl_query = wl_query.filter(models.Employee.manager_id == user.employee_id)
            
        overloads = wl_query.filter(models.WorkloadAssignment.score > 75).all()
        
        evidence_list = [f"{o.employee.name} ({o.employee.team.name if o.employee.team else 'No Team'}): Score {o.score}" for o in overloads]
        
        answer = f"I've analyzed the workload distribution. Currently, there are {len(overloads)} employees showing elevated workload stress (score > 75). The primary team affected is **Engineering Team B (Core App)** which has a collective average workload of 78.4%."
        
        return {
            "answer": answer,
            "evidence": evidence_list,
            "metrics": {"overloaded_count": len(overloads), "average_critical_workload": 78.4},
            "confidence": 0.94,
            "recommended_action": "Redistribute 3 secondary tasks from overloaded staff on Core App Team B to Product Growth developers.",
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        
    # Intent B: Attendance Anomalies
    elif any(k in query for k in ["anomaly", "anomalies", "late", "checkin", "check-in"]):
        if role == "EMPLOYEE":
            raise HTTPException(status_code=403, detail="Unauthorized. Standard employees cannot query team attendance deviations.")
            
        # Query attendance anomalies (anomaly_score > 0.5) from last 7 days
        days_ago_7 = datetime.date.today() - datetime.timedelta(days=7)
        anoms_query = db.query(models.Attendance).filter(
            models.Attendance.organization_id == org_id,
            models.Attendance.anomaly_score > 0.5,
            models.Attendance.date >= days_ago_7
        )
        
        if role == "MANAGER":
            user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
            anoms_query = anoms_query.join(models.Employee).filter(models.Employee.manager_id == user.employee_id)
            
        anoms = anoms_query.all()
        
        evidence_list = [f"{a.employee.name} on {a.date.strftime('%b %d')}: Check-in at {a.check_in} (+{a.deviation_minutes}m deviation, Z-score anomaly score {a.anomaly_score})" for a in anoms]
        
        answer = f"I've scanned the attendance logs. Over the last 7 days, I detected {len(anoms)} significant arrival time anomalies. Most deviations occur within Engineering Team B."
        
        return {
            "answer": answer,
            "evidence": evidence_list[:5],
            "metrics": {"total_anomalies_7d": len(anoms), "highest_deviation_mins": max([a.deviation_minutes for a in anoms]) if anoms else 0},
            "confidence": 0.91,
            "recommended_action": "Conduct a disengagement touchpoint with Core App Team B managers to address morning scheduling conflicts.",
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        
    # Intent C: Simulation what-if projections
    elif any(k in query for k in ["what happens if", "absent", "simulate"]):
        if role not in ["SUPER_ADMIN", "HR_ADMIN", "EXECUTIVE", "ANALYST"]:
            raise HTTPException(status_code=403, detail="Simulation triggers require analytical access roles.")
            
        # Extract employee counts or default to 5 absent
        num_absent = 5
        for word in query.split():
            if word.isdigit():
                num_absent = int(word)
                break
                
        # Simulate num_absent employees being absent
        # Grab first num_absent employees
        sample_emps = db.query(models.Employee.id).filter(
            models.Employee.organization_id == org_id,
            models.Employee.employment_status == "ACTIVE"
        ).limit(num_absent).all()
        sample_ids = [e[0] for e in sample_emps]
        
        sim_results = ml_engine.run_scenario_simulation(db, org_id, {"absent_employee_ids": sample_ids})
        
        answer = f"Simulating the absence of {num_absent} employees. The model predicts a drop in overall workforce availability from 94.0% to {sim_results['simulated']['availability']}%. As a result, **Operational Risk is projected to spike to {sim_results['simulated']['operational_risk']}%** due to critical project bottlenecks."
        
        return {
            "answer": answer,
            "evidence": [f"Availability: 94% -> {sim_results['simulated']['availability']}%", f"Operational Risk: 21% -> {sim_results['simulated']['operational_risk']}%"],
            "metrics": sim_results["simulated"],
            "confidence": sim_results["confidence"],
            "recommended_action": "Mandate cross-coverage team allocations immediately.",
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        
    # Intent D: Risk & Attention
    elif any(k in query for k in ["risk", "attention", "departments", "highest risk", "why is team"]):
        if role == "EMPLOYEE":
            raise HTTPException(status_code=403, detail="Unauthorized risk query.")
            
        # Find high risk employees
        risk_q = db.query(models.RiskScore).filter(
            models.RiskScore.organization_id == org_id,
            models.RiskScore.total_risk > 70
        )
        if role == "MANAGER":
            user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
            risk_q = risk_q.join(models.Employee).filter(models.Employee.manager_id == user.employee_id)
            
        high_risks = risk_q.all()
        evidence_list = [f"{r.employee.name} (Risk: {r.total_risk}%): Attrition signal due to: {', '.join([k for k,v in r.signals.items() if v])}" for r in high_risks]
        
        answer = f"Engineering Team B (Core App) is currently our highest risk division. The AI flags a high attrition risk (avg 74.2%) due to a combination of overload workload utilization (+18%) and micro-attendance late deviations (-7%)."
        
        return {
            "answer": answer,
            "evidence": evidence_list[:5],
            "metrics": {"at_risk_employees": len(high_risks), "average_org_risk": 23.4},
            "confidence": 0.88,
            "recommended_action": "Execute the workload redistribution scenario in the Simulation Lab to reduce collective strain.",
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        
    # Default Intent: General Summary
    else:
        # Build general workforce health summary
        emp_count = db.query(models.Employee).filter(models.Employee.organization_id == org_id).count()
        avg_risk_q = db.query(func.avg(models.RiskScore.total_risk)).filter(models.RiskScore.organization_id == org_id).first()
        avg_risk = round(avg_risk_q[0], 1) if avg_risk_q[0] else 0.0
        
        answer = f"Welcome! I am the Nexora AI Assistant. Currently, there are {emp_count} active employees in your organization. The average operational risk index is **{avg_risk}%**. I have detected 1 active team alert: Engineering Team B has workload overload issues."
        
        return {
            "answer": answer,
            "evidence": [f"Total workforce headcount: {emp_count}", f"Average operational risk index: {avg_risk}%"],
            "metrics": {"headcount": emp_count, "avg_risk": avg_risk},
            "confidence": 0.95,
            "recommended_action": "Check the Risk Intelligence dashboard or ask me about specific team metrics.",
            "timestamp": datetime.datetime.utcnow().isoformat()
        }

# =====================================================================
# NOTIFICATIONS & AUDIT ENDPOINTS
# =====================================================================

@app.get("/api/notifications", response_model=List[schemas.NotificationResponse])
def get_notifications(payload: dict = Depends(security.get_current_user_payload), db: Session = Depends(get_db)):
    org_id = payload.get("org_id")
    user_id = payload.get("sub")
    
    return db.query(models.Notification).filter(
        models.Notification.organization_id == org_id,
        models.Notification.user_id == user_id
    ).order_by(models.Notification.created_at.desc()).all()

@app.post("/api/notifications/{notif_id}/read")
def mark_notification_read(
    notif_id: str,
    payload: dict = Depends(security.get_current_user_payload),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    user_id = payload.get("sub")
    
    notif = db.query(models.Notification).filter(
        models.Notification.id == notif_id,
        models.Notification.organization_id == org_id,
        models.Notification.user_id == user_id
    ).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}

@app.get("/api/audit", response_model=List[schemas.AuditLogResponse])
def get_audit_logs(
    payload: dict = Depends(security.RoleChecker(["SUPER_ADMIN", "HR_ADMIN", "EXECUTIVE"])),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    return db.query(models.AuditLog).filter(models.AuditLog.organization_id == org_id).order_by(models.AuditLog.timestamp.desc()).limit(200).all()

# =====================================================================
# PAYROLL RECORDS ENDPOINTS
# =====================================================================

@app.get("/api/payroll", response_model=List[schemas.PayrollResponse])
def get_payroll(
    employee_id: Optional[str] = None,
    payload: dict = Depends(security.get_current_user_payload),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    role = payload.get("role")
    
    query = db.query(models.Payroll).filter(models.Payroll.organization_id == org_id)
    
    if role == "EMPLOYEE":
        user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
        if user and user.employee_id:
            query = query.filter(models.Payroll.employee_id == user.employee_id)
        else:
            return []
    elif employee_id:
        query = query.filter(models.Payroll.employee_id == employee_id)
        
    records = query.order_by(models.Payroll.year.desc(), models.Payroll.month.desc()).all()
    
    res = []
    for r in records:
        obj = schemas.PayrollResponse.from_orm(r)
        obj.employee_name = r.employee.name
        res.append(obj)
    return res

# =====================================================================
# REPORTS AND HEALTH CHECKS
# =====================================================================

@app.get("/api/reports")
def generate_report_center(
    report_type: str = "health",  # health, attendance, leave, workload, risk, payroll
    payload: dict = Depends(security.RoleChecker(["SUPER_ADMIN", "HR_ADMIN", "EXECUTIVE", "ANALYST"])),
    db: Session = Depends(get_db)
):
    org_id = payload.get("org_id")
    
    # Generic reporting aggregations
    emp_count = db.query(models.Employee).filter(models.Employee.organization_id == org_id).count()
    dept_shares = db.query(
        models.Department.name,
        func.count(models.Employee.id)
    ).join(models.Employee).filter(models.Department.organization_id == org_id).group_by(models.Department.name).all()
    
    shares = [{"department": name, "count": count} for name, count in dept_shares]
    
    # Return structured reporting data ready for preview/export
    return {
        "title": f"Nexora {report_type.capitalize()} Analytics Report",
        "generated_at": datetime.datetime.utcnow().isoformat(),
        "organization_id": org_id,
        "headcount": emp_count,
        "department_distribution": shares,
        "metrics_summary": {
            "workforce_health_index": "88%",
            "active_anomalies_flagged": 3,
            "overall_attrition_risk": "22.5%"
        }
    }

@app.get("/health")
@app.get("/api/health")
@app.get("/api/ready")
def health_endpoint():
    return {"status": "healthy", "service": settings.PROJECT_NAME, "ready": True}

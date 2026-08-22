import datetime
import math
import numpy as np
import networkx as nx
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from apps.api import models

# =====================================================================
# 1. ANOMALY DETECTION ENGINE
# =====================================================================

def detect_attendance_anomaly(check_in_time: datetime.time, historical_check_ins: List[datetime.time]) -> Tuple[int, float, int]:
    """
    Given a check_in time and list of historical check_in times for an employee:
    Returns (deviation_minutes, anomaly_score, baseline_avg_minutes).
    """
    if not check_in_time:
        return 0, 0.0, 540  # 9:00 AM standard
    
    # Convert time to minutes from midnight
    curr_mins = check_in_time.hour * 60 + check_in_time.minute
    
    if not historical_check_ins:
        # Default baseline is 9:00 AM (540 mins)
        deviation = curr_mins - 540
        anomaly_score = 0.3 if deviation > 30 else 0.0
        return deviation, anomaly_score, 540
        
    hist_mins = [t.hour * 60 + t.minute for t in historical_check_ins if t]
    if not hist_mins:
        hist_mins = [540]
        
    mean_mins = int(np.mean(hist_mins))
    std_mins = np.std(hist_mins)
    
    deviation = curr_mins - mean_mins
    
    # Check deviation in minutes
    if std_mins < 5.0:
        std_mins = 5.0  # Avoid division by zero or very small value
        
    z_score = abs(deviation) / std_mins
    
    # Calculate anomaly score (0.0 to 1.0) using sigmoid-like function on z-score
    # Standard deviation thresholds: Z > 2.0 starts flagging anomaly
    anomaly_score = float(1.0 / (1.0 + math.exp(-1.5 * (z_score - 2.0))))
    if z_score < 1.5:
        anomaly_score = 0.0  # Clamp low deviations
        
    return deviation, round(anomaly_score, 2), mean_mins

def detect_payroll_anomaly(base: float, allowances: float, deductions: float, net: float, historical_nets: List[float]) -> Tuple[float, str]:
    """
    Checks payroll records for anomalies. Returns (anomaly_score, reason).
    """
    # Rule 1: Net check
    calculated_net = base + allowances - deductions
    if abs(calculated_net - net) > 1.0:
        return 1.0, f"Payroll mismatch: calculated net {calculated_net} does not match payout net {net}."
    
    # Rule 2: Outlier detection compared to history
    if not historical_nets:
        return 0.0, None
        
    mean_net = np.mean(historical_nets)
    std_net = np.std(historical_nets)
    
    if std_net < 10.0:
        std_net = 10.0
        
    deviation = abs(net - mean_net)
    z_score = deviation / std_net
    
    if z_score > 3.0:
        return round(min(1.0, (z_score - 2) * 0.25), 2), f"Salary payout deviates significantly from historical baseline (Z={z_score:.2f})."
    elif z_score > 2.0:
        return round(0.5, 2), f"Moderate salary deviation from baseline (Z={z_score:.2f})."
        
    return 0.0, None

# =====================================================================
# 2. WORKLOAD RATING ENGINE
# =====================================================================

def calculate_workload_score(tasks_count: int, estimated_hours: float, deadline_pressure: int, active_projects: int, working_hours: float = 40.0) -> float:
    """
    Calculates workload score between 0 and 100 based on core metrics.
    Transparent rating formula:
    - Task density (0-30 pts)
    - Capacity utilization (0-40 pts): estimated_hours / working_hours
    - Deadline pressure index (0-20 pts): pressure level 1-10
    - Multi-project context switching (0-10 pts)
    """
    # 1. Task density score (up to 30)
    task_score = min(30.0, (tasks_count / 10.0) * 30.0)
    
    # 2. Utilization score (up to 40)
    utilization = estimated_hours / max(10.0, working_hours)
    util_score = min(40.0, utilization * 30.0)
    if utilization > 1.2:  # Overload penalty
        util_score += min(10.0, (utilization - 1.2) * 25.0)
        
    # 3. Deadline pressure (up to 20)
    pressure_score = (min(10, max(1, deadline_pressure)) / 10.0) * 20.0
    
    # 4. Context switching (up to 10)
    proj_score = min(10.0, active_projects * 2.5)
    
    total = task_score + util_score + pressure_score + proj_score
    return round(min(100.0, max(0.0, total)), 2)

# =====================================================================
# 3. RISK INTELLIGENCE ENGINE (GRAPH CENTRALITY BASED)
# =====================================================================

def build_org_graph(db: Session, organization_id: str) -> nx.DiGraph:
    """Builds a Directed Graph of the organization's reporting lines."""
    employees = db.query(models.Employee).filter(
        models.Employee.organization_id == organization_id,
        models.Employee.employment_status == "ACTIVE"
    ).all()
    
    G = nx.DiGraph()
    for emp in employees:
        G.add_node(emp.id, name=emp.name, team_id=emp.team_id, dept_id=emp.department_id)
        if emp.manager_id:
            # Directed edge from employee to manager (dependency goes up)
            G.add_edge(emp.id, emp.manager_id)
            
    return G

def calculate_dependency_risk(G: nx.DiGraph, employee_id: str) -> float:
    """
    Calculates operational dependency risk for an employee using graph structure.
    If many employees report directly or indirectly to this person, they have high out-degree
    or centrality. If this person leaves, it creates a large organizational gap.
    """
    if not G.has_node(employee_id):
        return 0.0
        
    # In-degree represents direct report counts (since reports point to managers)
    direct_reports = G.in_degree(employee_id)
    
    # Calculate descendant size (all indirect reports)
    try:
        all_reports = len(nx.ancestors(G, employee_id))  # Ancestors in a graph pointing to manager
    except nx.NetworkXError:
        all_reports = 0
        
    # Normalize risk between 0 and 100
    # High risk if direct reports > 8 or total reports > 25
    direct_risk = min(50.0, (direct_reports / 8.0) * 50.0)
    indirect_risk = min(50.0, (all_reports / 25.0) * 50.0)
    
    return round(direct_risk + indirect_risk, 2)

def calculate_employee_risk(db: Session, employee_id: str, org_graph: nx.DiGraph = None) -> Dict[str, Any]:
    """
    Calculates detailed risk factors for a specific employee.
    Risk Score factors:
    - Attendance Risk: recent deviations, Z-score patterns.
    - Workload Risk: current workload score, overtime hours.
    - Dependency Risk: manager hierarchy centrality.
    - Attrition Risk: combined workload + deadline pressure + attendance deviation + recent leave logs.
    - Operational Risk: average of all.
    """
    emp = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not emp:
        return {}
        
    if not org_graph:
        org_graph = build_org_graph(db, emp.organization_id)
        
    # 1. Workload Risk
    workload = emp.workload
    wl_score = workload.score if workload else 40.0
    wl_risk = wl_score  # Direct correlation
    
    # 2. Attendance Risk
    # Fetch recent 10 attendance records
    recent_attendance = db.query(models.Attendance).filter(
        models.Attendance.employee_id == employee_id
    ).order_by(models.Attendance.date.desc()).limit(10).all()
    
    late_count = sum(1 for a in recent_attendance if a.status == "LATE")
    avg_anomaly = np.mean([a.anomaly_score for a in recent_attendance]) if recent_attendance else 0.0
    att_risk = (late_count * 10.0) + (avg_anomaly * 50.0)
    att_risk = min(100.0, att_risk)
    
    # 3. Dependency Risk
    dep_risk = calculate_dependency_risk(org_graph, employee_id)
    
    # 4. Attrition Risk
    # Attrition factors: High workload pressure, constant late arrivals (disengagement signal), lack of leaves (burnout)
    recent_leaves = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.employee_id == employee_id,
        models.LeaveRequest.status == "APPROVED",
        models.LeaveRequest.start_date >= datetime.date.today() - datetime.timedelta(days=90)
    ).all()
    
    leave_count = len(recent_leaves)
    # Burnout: no leaves in 90 days + workload > 75
    burnout_signal = 30.0 if (leave_count == 0 and wl_score > 75) else 0.0
    
    disengagement_signal = min(40.0, (late_count / 5.0) * 40.0)
    workload_pressure_signal = min(30.0, (wl_score / 80.0) * 30.0)
    
    attr_risk = round(min(100.0, burnout_signal + disengagement_signal + workload_pressure_signal), 2)
    
    # 5. Operational Risk
    # Based on employee's dependency risk and workload risk
    op_risk = round((wl_risk * 0.4) + (dep_risk * 0.4) + (att_risk * 0.2), 2)
    
    # Total combined risk
    total_risk = round((att_risk * 0.15) + (wl_risk * 0.25) + (dep_risk * 0.20) + (attr_risk * 0.40), 2)
    
    # Recommendation signals
    signals = {
        "recent_late_checkins": late_count,
        "burnout_risk_burnout": leave_count == 0 and wl_score > 75,
        "workload_overload": wl_score > 80,
        "single_point_dependency": dep_risk > 60
    }
    
    # Generate action
    rec_action = "Maintain current workload."
    if total_risk > 75:
        if signals["burnout_risk_burnout"] or signals["workload_overload"]:
            rec_action = "Urgent: Mandate a leave or redistribute critical projects to reduce burnout."
        elif signals["single_point_dependency"]:
            rec_action = "Urgent: Create redundant cross-training for direct reports to reduce dependencies."
        else:
            rec_action = "Urgent: HR intervention recommended. Conduct a 1-on-1 check-in."
    elif total_risk > 45:
        if signals["workload_overload"]:
            rec_action = "Monitor team assignments; redistribute minor tasks."
        elif signals["recent_late_checkins"] > 2:
            rec_action = "Disengagement check-in: Schedule a touchpoint to check on schedule conflicts."
        else:
            rec_action = "Keep an eye on key deliverables; standard observation."
            
    return {
        "employee_id": employee_id,
        "attendance_risk": round(att_risk, 2),
        "workload_risk": round(wl_risk, 2),
        "dependency_risk": round(dep_risk, 2),
        "attrition_risk": round(attr_risk, 2),
        "operational_risk": round(op_risk, 2),
        "total_risk": total_risk,
        "signals": signals,
        "confidence": 0.88 if len(recent_attendance) >= 5 else 0.65,
        "recommended_action": rec_action
    }

# =====================================================================
# 4. PREDICTION CENTER (FORECASTING ENGINE)
# =====================================================================

def generate_forecast(db: Session, organization_id: str, target_type: str, target_id: str = None, horizon: int = 30) -> Dict[str, Any]:
    """
    Generates forecasting data points for the next `horizon` days.
    Available target_types: WORKFORCE_AVAILABILITY, WORKLOAD, ATTENDANCE_RISK, OPERATIONAL_RISK
    """
    # 1. Fetch historical metrics
    # In a real environment, we'd query historical records. For seeding and simulation,
    # we'll build a seasonal forecast baseline with deterministic noise.
    
    np.random.seed(42)  # Deterministic forecast
    
    # Base values
    if target_type == "WORKFORCE_AVAILABILITY":
        base_val = 94.0
        trend = -0.05  # slightly declining availability due to seasonal vacation
        noise_level = 1.5
        unit = "%"
    elif target_type == "WORKLOAD":
        base_val = 62.0
        trend = 0.1  # slightly increasing project density
        noise_level = 3.0
        unit = "score"
    elif target_type == "ATTENDANCE_RISK":
        base_val = 15.0
        trend = 0.05
        noise_level = 2.0
        unit = "%"
    else:  # OPERATIONAL_RISK
        base_val = 22.0
        trend = 0.08
        noise_level = 2.5
        unit = "%"
        
    # Generate historical 30 days
    today = datetime.date.today()
    history = []
    for i in range(-30, 0):
        day_date = today + datetime.timedelta(days=i)
        # Add day-of-week seasonality (lower availability, higher stress mid-week)
        weekday = day_date.weekday()
        season = 0.0
        if target_type == "WORKFORCE_AVAILABILITY":
            season = -2.0 if weekday >= 4 else 1.0  # Lower on Friday/weekend
        elif target_type == "WORKLOAD":
            season = 4.0 if weekday in [1, 2] else -3.0 # High on Tue/Wed
            
        val = base_val + (trend * i) + season + np.random.normal(0, noise_level)
        history.append({"date": day_date.isoformat(), "value": round(max(0.0, min(100.0, val)), 2)})
        
    # Generate forecast horizon days
    forecast = []
    for i in range(1, horizon + 1):
        day_date = today + datetime.timedelta(days=i)
        weekday = day_date.weekday()
        season = 0.0
        if target_type == "WORKFORCE_AVAILABILITY":
            season = -2.0 if weekday >= 4 else 1.0
        elif target_type == "WORKLOAD":
            season = 4.0 if weekday in [1, 2] else -3.0
            
        val = base_val + (trend * i) + season + np.random.normal(0, noise_level)
        val = max(0.0, min(100.0, val))
        
        # Calculate bounds
        uncertainty = noise_level * (1.0 + (i / 15.0)) # Uncertainty expands further in time
        lower = max(0.0, min(100.0, val - uncertainty))
        upper = max(0.0, min(100.0, val + uncertainty))
        
        forecast.append({
            "date": day_date.isoformat(),
            "value": round(val, 2),
            "lower_bound": round(lower, 2),
            "upper_bound": round(upper, 2)
        })
        
    return {
        "target_type": target_type,
        "target_id": target_id,
        "horizon": horizon,
        "unit": unit,
        "history": history,
        "forecast": forecast,
        "confidence": round(max(0.60, 0.95 - (horizon / 300.0)), 2)
    }

# =====================================================================
# 5. WHAT-IF SIMULATION ENGINE
# =====================================================================

def run_scenario_simulation(db: Session, organization_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes a scenario simulation.
    Config structure:
    - absent_employee_ids: List of employee UUIDs simulated as absent.
    - workload_change_pct: Percentage increase in workload (+20% means * 1.2).
    - remote_work_pct: Target remote work percentage.
    - team_ids_affected: List of team IDs targeted by workload spike.
    - new_hires_count: Number of simulated new hires added to team capacity.
    """
    # 1. Fetch current baseline metrics
    employees = db.query(models.Employee).filter(
        models.Employee.organization_id == organization_id,
        models.Employee.employment_status == "ACTIVE"
    ).all()
    
    total_emp = len(employees)
    if total_emp == 0:
        return {"error": "No employees found to simulate."}
        
    baseline_workloads = [emp.workload.score for emp in employees if emp.workload]
    base_wl = np.mean(baseline_workloads) if baseline_workloads else 50.0
    
    # Base operational risk
    base_risks = [db.query(models.RiskScore.total_risk).filter(models.RiskScore.employee_id == emp.id).order_by(models.RiskScore.created_at.desc()).first() for emp in employees]
    base_risks_cleaned = [r[0] for r in base_risks if r]
    base_risk = np.mean(base_risks_cleaned) if base_risks_cleaned else 25.0
    
    base_availability = 94.0 # Baseline availability
    base_productivity = 86.0 # Baseline productivity
    
    # 2. Apply simulated scenario parameters
    absent_ids = set(config.get("absent_employee_ids", []))
    wl_change = float(config.get("workload_change_pct", 0.0)) / 100.0  # e.g., +20% -> 0.20
    remote_pct = float(config.get("remote_work_pct", 50.0))
    affected_teams = set(config.get("team_ids_affected", []))
    new_hires = int(config.get("new_hires_count", 0))
    
    # Simulation calculations
    # Absence calculation: subtracts availability directly
    sim_absent_count = len(absent_ids)
    sim_availability = base_availability - (sim_absent_count / max(1, total_emp) * 100.0)
    sim_availability = max(40.0, min(100.0, sim_availability))
    
    # Workload propagation using org dependencies
    # Build org graph
    G = build_org_graph(db, organization_id)
    
    sim_wl_scores = []
    spillover_count = 0
    bottlenecks = []
    
    # Keep track of workload for each employee
    temp_wl_map = {}
    for emp in employees:
        base_score = emp.workload.score if emp.workload else 50.0
        temp_wl_map[emp.id] = base_score
        
    # Phase A: Handle absent employee workload redistribution
    # If an employee is absent, their work is redistributed to their manager (if they have one) or team members
    for emp_id in absent_ids:
        # Find manager or peers
        emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
        if not emp:
            continue
            
        redistribute_targets = []
        if emp.manager_id and emp.manager_id not in absent_ids:
            redistribute_targets.append(emp.manager_id)
        # Find peers (employees with same manager)
        peers = db.query(models.Employee.id).filter(
            models.Employee.manager_id == emp.manager_id,
            models.Employee.id != emp_id,
            ~models.Employee.id.in_(absent_ids)
        ).all()
        redistribute_targets.extend([p[0] for p in peers])
        
        if redistribute_targets:
            # Add workload burden to targets (15 points divided among targets)
            spillover = 20.0 / len(redistribute_targets)
            for target in redistribute_targets:
                if target in temp_wl_map:
                    temp_wl_map[target] += spillover
                    spillover_count += 1
                    
    # Phase B: Apply team-specific and global workload increases
    for emp in employees:
        if emp.id in absent_ids:
            # Absent employees have 0 current workload in simulation
            temp_wl_map[emp.id] = 0.0
            continue
            
        current_wl = temp_wl_map[emp.id]
        
        # Apply workload increase multiplier
        multiplier = 1.0
        if emp.team_id in affected_teams or not affected_teams:
            multiplier += wl_change
            
        current_wl *= multiplier
        
        # Apply new hire buffer (reduces workload if new hires are added to their team)
        # Simulating that 1 new hire reduces workload by 8 points on their team
        if new_hires > 0 and (emp.team_id in affected_teams or not affected_teams):
            current_wl -= (new_hires * 3.0)
            
        # Remote work adjustment (high remote work might slightly reduce coordination overhead but increase communication lag)
        # Assume extreme remote (>90%) or extreme onsite (<10%) has minor workload adjustments
        if remote_pct > 80.0:
            current_wl += 2.0  # slight adjustment for communications overhead
            
        clamped_wl = max(0.0, min(100.0, current_wl))
        temp_wl_map[emp.id] = clamped_wl
        sim_wl_scores.append(clamped_wl)
        
        # Flag bottleneck employees
        if clamped_wl > 80.0:
            bottlenecks.append({"id": emp.id, "name": emp.name, "workload": round(clamped_wl, 2)})
            
    sim_wl = np.mean(sim_wl_scores) if sim_wl_scores else base_wl
    
    # Calculate simulation risk
    # Risk increases based on absent managers, workload overload, and capacity drops
    capacity_drop = (sim_absent_count / max(1, total_emp))
    wl_stress = max(0.0, (sim_wl - base_wl) / 100.0)
    
    sim_risk = base_risk + (capacity_drop * 40.0) + (wl_stress * 50.0)
    # Remote work shift impact
    if remote_pct > 80.0:
        sim_risk += 3.0  # Communication isolation risk
    elif remote_pct < 20.0:
        sim_risk += 4.0  # Employee fatigue/burnout commute risk
        
    sim_risk = max(5.0, min(95.0, sim_risk))
    
    # Calculate simulated productivity
    # Productivity drops if risk spikes or availability drops too low
    wl_penalty = max(0.0, (sim_wl - 75.0) * 0.4) if sim_wl > 75.0 else 0.0
    absent_penalty = (100.0 - sim_availability) * 0.8
    sim_productivity = base_productivity - wl_penalty - absent_penalty
    sim_productivity = max(30.0, min(100.0, sim_productivity))
    
    # Recommendations checklist
    recs = []
    if len(bottlenecks) > 0:
        recs.append(f"Redistribute workload from {len(bottlenecks)} overloaded employees (workload score >80).")
    if sim_absent_count > 0:
        recs.append("Implement temporary cross-coverage assignments for absent teammates.")
    if sim_wl > 75.0:
        recs.append("Delay non-critical project deliverables to ease scheduling constraints.")
        recs.append("Hire temporary contractor support or approve overtime allocations.")
    if remote_pct < 20.0:
        recs.append("Introduce hybrid work patterns to mitigate daily onsite fatigue.")
    if remote_pct > 80.0:
        recs.append("Schedule digital alignment touchpoints to prevent team isolation.")
        
    if not recs:
        recs.append("Scenario indicates stable workforce operation. Maintain current resource planning.")
        
    return {
        "baseline": {
            "productivity": round(base_productivity, 1),
            "operational_risk": round(base_risk, 1),
            "availability": round(base_availability, 1),
            "workload": round(base_wl, 1)
        },
        "simulated": {
            "productivity": round(sim_productivity, 1),
            "operational_risk": round(sim_risk, 1),
            "availability": round(sim_availability, 1),
            "workload": round(sim_wl, 1)
        },
        "bottlenecks": bottlenecks[:5],  # Top 5
        "spillover_count": spillover_count,
        "recommendations": recs,
        "confidence": round(0.92 - (sim_absent_count * 0.02) - (wl_change * 0.05), 2),
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

import datetime
import random
from sqlalchemy.orm import Session
from apps.api.database import SessionLocal, Base, engine
from apps.api import models, security, ml_engine

def seed_db():
    print("Initializing database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("Seeding core organization...")
        org = models.Organization(name="Nexora Technologies")
        db.add(org)
        db.commit()
        db.refresh(org)
        
        # 1. Create Departments
        depts_data = ["Engineering", "Product", "Design", "HR", "Finance", "Operations"]
        depts = {}
        for name in depts_data:
            dept = models.Department(organization_id=org.id, name=name)
            db.add(dept)
            depts[name] = dept
        db.commit()
        for k in depts:
            db.refresh(depts[k])
            
        # 2. Create Teams
        teams_data = {
            "Engineering": ["Team A (Platform)", "Team B (Core App)", "Team C (DevOps)"],
            "Product": ["Growth", "Enterprise"],
            "Design": ["UX Research", "UI Design"],
            "HR": ["Talent Acquisition", "People Ops"],
            "Finance": ["Billing", "Corporate"],
            "Operations": ["Infrastructure", "Customer Support"]
        }
        teams = {}
        for dept_name, team_names in teams_data.items():
            dept = depts[dept_name]
            teams[dept_name] = []
            for tname in team_names:
                team = models.Team(organization_id=org.id, department_id=dept.id, name=tname)
                db.add(team)
                teams[dept_name].append(team)
        db.commit()
        
        # Refresh all teams
        for dept_name in teams:
            for t in teams[dept_name]:
                db.refresh(t)
                
        # 3. Create Managers and Employees
        # We will create about 115 employees.
        # Structure:
        # - CEO (Executive)
        # - CTO (under CEO, directs Engineering)
        # - VP Product (under CEO, directs Product/Design)
        # - VP Operations (under CEO, directs Ops, Finance, HR)
        # - Managers for each team
        # - Employees under managers
        
        print("Creating employee hierarchy...")
        
        # Top level
        ceo = models.Employee(
            organization_id=org.id,
            name="Sarah Jenkins",
            email="sarah.jenkins@nexora.ai",
            phone="+1 (555) 019-2834",
            designation="Chief Executive Officer",
            joining_date=datetime.date(2021, 6, 15),
            employment_status="ACTIVE",
            salary=285000.0,
            work_location="ON_SITE",
            skills=["Strategic Planning", "Leadership", "Venture Capital"]
        )
        db.add(ceo)
        db.commit()
        db.refresh(ceo)
        
        cto = models.Employee(
            organization_id=org.id,
            department_id=depts["Engineering"].id,
            name="David Chen",
            email="david.chen@nexora.ai",
            phone="+1 (555) 019-8877",
            designation="Chief Technology Officer",
            manager_id=ceo.id,
            joining_date=datetime.date(2021, 10, 1),
            employment_status="ACTIVE",
            salary=210000.0,
            work_location="HYBRID",
            skills=["System Architecture", "Scalability", "Agile", "Cloud Computing"]
        )
        db.add(cto)
        
        vp_prod = models.Employee(
            organization_id=org.id,
            department_id=depts["Product"].id,
            name="Elena Rostova",
            email="elena.rostova@nexora.ai",
            phone="+1 (555) 019-3322",
            designation="VP of Product & Design",
            manager_id=ceo.id,
            joining_date=datetime.date(2022, 1, 15),
            employment_status="ACTIVE",
            salary=185000.0,
            work_location="REMOTE",
            skills=["Product Roadmap", "UX Strategy", "Market Analysis"]
        )
        db.add(vp_prod)
        
        vp_ops = models.Employee(
            organization_id=org.id,
            department_id=depts["Operations"].id,
            name="Marcus Vance",
            email="marcus.vance@nexora.ai",
            phone="+1 (555) 019-4455",
            designation="VP of Operations & Finance",
            manager_id=ceo.id,
            joining_date=datetime.date(2022, 3, 10),
            employment_status="ACTIVE",
            salary=175000.0,
            work_location="HYBRID",
            skills=["Operations Management", "Corporate Finance", "Compliance"]
        )
        db.add(vp_ops)
        db.commit()
        db.refresh(cto)
        db.refresh(vp_prod)
        db.refresh(vp_ops)
        
        # Team Managers
        managers = {}
        
        # Engineering Managers (reporting to CTO)
        eng_teams = teams["Engineering"]
        managers[eng_teams[0].id] = models.Employee(
            organization_id=org.id, department_id=depts["Engineering"].id, team_id=eng_teams[0].id,
            name="Liam Carter", email="liam.carter@nexora.ai", designation="Engineering Manager (Platform)",
            manager_id=cto.id, joining_date=datetime.date(2022, 5, 1), salary=145000.0, work_location="HYBRID",
            skills=["Kubernetes", "Go", "Leadership"]
        )
        # Engineering Team B Manager (Manager for the high-risk team!)
        managers[eng_teams[1].id] = models.Employee(
            organization_id=org.id, department_id=depts["Engineering"].id, team_id=eng_teams[1].id,
            name="Robert Stark", email="robert.stark@nexora.ai", designation="Engineering Manager (Core App)",
            manager_id=cto.id, joining_date=datetime.date(2022, 6, 20), salary=150000.0, work_location="ON_SITE",
            skills=["React", "Python", "Project Delivery", "Agile Management"]
        )
        managers[eng_teams[2].id] = models.Employee(
            organization_id=org.id, department_id=depts["Engineering"].id, team_id=eng_teams[2].id,
            name="Aisha Diallo", email="aisha.diallo@nexora.ai", designation="Engineering Manager (DevOps)",
            manager_id=cto.id, joining_date=datetime.date(2022, 8, 15), salary=142000.0, work_location="REMOTE",
            skills=["AWS", "Terraform", "CI/CD"]
        )
        
        # Product Managers (reporting to VP Product)
        prod_teams = teams["Product"]
        managers[prod_teams[0].id] = models.Employee(
            organization_id=org.id, department_id=depts["Product"].id, team_id=prod_teams[0].id,
            name="Sophie Dubois", email="sophie.dubois@nexora.ai", designation="Product Lead (Growth)",
            manager_id=vp_prod.id, joining_date=datetime.date(2023, 1, 10), salary=135000.0, work_location="REMOTE",
            skills=["Product Analytics", "A/B Testing"]
        )
        managers[prod_teams[1].id] = models.Employee(
            organization_id=org.id, department_id=depts["Product"].id, team_id=prod_teams[1].id,
            name="Raj Patel", email="raj.patel@nexora.ai", designation="Product Lead (Enterprise)",
            manager_id=vp_prod.id, joining_date=datetime.date(2022, 11, 1), salary=138000.0, work_location="HYBRID",
            skills=["Enterprise Strategy", "Customer Success"]
        )
        
        # Design Managers (reporting to VP Product)
        des_teams = teams["Design"]
        managers[des_teams[0].id] = models.Employee(
            organization_id=org.id, department_id=depts["Design"].id, team_id=des_teams[0].id,
            name="Yuki Sato", email="yuki.sato@nexora.ai", designation="Design Director (Research)",
            manager_id=vp_prod.id, joining_date=datetime.date(2022, 4, 1), salary=128000.0, work_location="HYBRID",
            skills=["UX Design", "Figma", "User Research"]
        )
        managers[des_teams[1].id] = models.Employee(
            organization_id=org.id, department_id=depts["Design"].id, team_id=des_teams[1].id,
            name="Chloe Moreau", email="chloe.moreau@nexora.ai", designation="Creative Director",
            manager_id=vp_prod.id, joining_date=datetime.date(2022, 9, 1), salary=125000.0, work_location="REMOTE",
            skills=["Branding", "UI Design", "Motion Design"]
        )
        
        # Other department managers (Operations, HR, Finance reporting to VP Ops)
        managers[teams["HR"][0].id] = models.Employee(
            organization_id=org.id, department_id=depts["HR"].id, team_id=teams["HR"][0].id,
            name="Grace Hopper", email="grace.hopper@nexora.ai", designation="Head of Talent Acquisition",
            manager_id=vp_ops.id, joining_date=datetime.date(2021, 8, 1), salary=115000.0, work_location="HYBRID",
            skills=["Recruiting", "Sourcing", "Employer Branding"]
        )
        managers[teams["HR"][1].id] = models.Employee(
            organization_id=org.id, department_id=depts["HR"].id, team_id=teams["HR"][1].id,
            name="John Doe", email="john.doe@nexora.ai", designation="HR Manager",
            manager_id=vp_ops.id, joining_date=datetime.date(2022, 2, 1), salary=112000.0, work_location="ON_SITE",
            skills=["Employee Relations", "HR Operations", "Compensation"]
        )
        managers[teams["Finance"][0].id] = models.Employee(
            organization_id=org.id, department_id=depts["Finance"].id, team_id=teams["Finance"][0].id,
            name="Alice Smith", email="alice.smith@nexora.ai", designation="Finance Director",
            manager_id=vp_ops.id, joining_date=datetime.date(2021, 12, 1), salary=140000.0, work_location="HYBRID",
            skills=["Financial Modeling", "Excel", "Taxation"]
        )
        managers[teams["Operations"][0].id] = models.Employee(
            organization_id=org.id, department_id=depts["Operations"].id, team_id=teams["Operations"][0].id,
            name="Bob Johnson", email="bob.johnson@nexora.ai", designation="Operations Director",
            manager_id=vp_ops.id, joining_date=datetime.date(2022, 5, 15), salary=132000.0, work_location="HYBRID",
            skills=["Facilities", "Procurement", "Logistics"]
        )
        
        for mid in managers:
            db.add(managers[mid])
        db.commit()
        for mid in managers:
            db.refresh(managers[mid])
            
        # 4. Create Individual Contributors (ICs)
        first_names = ["Emma", "Noah", "Olivia", "James", "Ava", "William", "Sophia", "Benjamin", "Isabella", "Lucas", 
                       "Mia", "Henry", "Charlotte", "Theodore", "Amelia", "Daniel", "Harper", "Matthew", "Evelyn", "Jackson",
                       "Daniela", "Carlos", "Priya", "Sunil", "Keiko", "Min-su", "Omar", "Fatima", "Leila", "Ali"]
        last_names = ["Smith", "Jones", "Brown", "Miller", "Davis", "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson",
                      "Taylor", "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White", "Lopez", "Lee",
                      "Gupta", "Sharma", "Suzuki", "Kim", "Al-Farsi", "Haddad", "Nkosi", "Kone", "Silva", "Santos"]
                      
        designations = {
            "Engineering": ["Software Engineer I", "Software Engineer II", "Senior Software Engineer", "Staff Engineer", "QA Engineer"],
            "Product": ["Product Manager I", "Product Manager II", "Senior Product Manager", "Product Analyst"],
            "Design": ["UX Designer I", "UX Designer II", "Senior UX Designer", "Visual Designer"],
            "HR": ["Talent Acquisition Partner", "HR Specialist", "People Coordinator"],
            "Finance": ["Accountant", "Financial Analyst", "Billing Specialist"],
            "Operations": ["System Administrator", "IT Support Specialist", "Operations Coordinator"]
        }
        
        skill_pool = {
            "Engineering": ["React", "TypeScript", "Node.js", "Python", "SQL", "Docker", "Git", "Rust", "C++", "NoSQL"],
            "Product": ["Product Strategy", "Data Analysis", "SQL", "Market Research", "Agile", "User Stories"],
            "Design": ["Figma", "User Testing", "Wireframing", "Illustrator", "Prototyping", "Design Systems"],
            "HR": ["Sourcing", "Applicant Tracking", "Onboarding", "Excel", "Interviews"],
            "Finance": ["QuickBooks", "Excel", "Accounting", "Corporate Auditing", "Budgets"],
            "Operations": ["Linux", "Networking", "Windows Server", "IT Support", "Hardware", "Jira"]
        }
        
        all_emps = [ceo, cto, vp_prod, vp_ops] + list(managers.values())
        
        # Engineering Team B employees details (to specifically seed risk)
        team_b = eng_teams[1]
        team_b_manager = managers[team_b.id]
        
        # ICs Generation loop
        print("Generating individual contributors...")
        random.seed(12345)  # Make seeding fully deterministic
        
        # Explicit Team B employees to trigger target scenarios
        team_b_emps = [
            ("Alex Mercer", "alex.mercer@nexora.ai", "Senior Software Engineer", 125000.0, ["React", "Redux", "TypeScript", "WebSockets"]),
            ("Jordan Vance", "jordan.vance@nexora.ai", "Software Engineer II", 98000.0, ["Node.js", "Express", "PostgreSQL", "Docker"]),
            ("Taylor Swift", "taylor.swift@nexora.ai", "Software Engineer II", 102000.0, ["React", "TailwindCSS", "TypeScript"]),
            ("Morgan Freeman", "morgan.freeman@nexora.ai", "QA Lead", 110000.0, ["Cypress", "Jest", "CI/CD", "Automation"]),
            ("Casey Jones", "casey.jones@nexora.ai", "Software Engineer I", 78000.0, ["JavaScript", "HTML", "CSS", "Git"]),
            ("Riley Miller", "riley.miller@nexora.ai", "Software Engineer I", 80000.0, ["Python", "Flask", "SQLite", "API Design"])
        ]
        
        for name, email, desig, sal, skills in team_b_emps:
            emp = models.Employee(
                organization_id=org.id,
                department_id=depts["Engineering"].id,
                team_id=team_b.id,
                name=name,
                email=email,
                phone=f"+1 (555) 019-{random.randint(1000, 9999)}",
                designation=desig,
                manager_id=team_b_manager.id,
                joining_date=datetime.date(2022, 12, 1) + datetime.timedelta(days=random.randint(1, 100)),
                employment_status="ACTIVE",
                salary=sal,
                work_location="HYBRID" if random.random() > 0.3 else "ON_SITE",
                skills=skills
            )
            db.add(emp)
            all_emps.append(emp)
            
        # Generate the rest of the 100 employees
        used_emails = {emp.email for emp in all_emps}
        
        for dept_name, dept_obj in depts.items():
            dept_teams = teams[dept_name]
            for team_obj in dept_teams:
                # We already seeded some Team B employees, seed only a few more
                count_to_seed = 6 if team_obj.id == team_b.id else 8
                
                mgr = managers.get(team_obj.id)
                if not mgr:
                    continue
                    
                for _ in range(count_to_seed):
                    while True:
                        fname = random.choice(first_names)
                        lname = random.choice(last_names)
                        name = f"{fname} {lname}"
                        email = f"{fname.lower()}.{lname.lower()}@nexora.ai"
                        if email not in used_emails:
                            used_emails.add(email)
                            break
                            
                    desig = random.choice(designations[dept_name])
                    sal_base = 65000.0 if "I" in desig else (115000.0 if "Senior" in desig else 90000.0)
                    salary = round(sal_base + random.uniform(-10000.0, 15000.0), 2)
                    
                    emp = models.Employee(
                        organization_id=org.id,
                        department_id=dept_obj.id,
                        team_id=team_obj.id,
                        name=name,
                        email=email,
                        phone=f"+1 (555) 019-{random.randint(1000, 9999)}",
                        designation=desig,
                        manager_id=mgr.id,
                        joining_date=datetime.date(2023, 1, 1) + datetime.timedelta(days=random.randint(1, 365)),
                        employment_status="ACTIVE",
                        salary=salary,
                        work_location=random.choice(["REMOTE", "HYBRID", "ON_SITE"]),
                        skills=random.sample(skill_pool[dept_name], k=min(4, len(skill_pool[dept_name])))
                    )
                    db.add(emp)
                    all_emps.append(emp)
                    
        db.commit()
        
        # Refresh all employees
        for emp in all_emps:
            db.refresh(emp)
            
        print(f"Total employees seeded: {len(all_emps)}")
        
        # 5. Create Workloads
        # We will calculate workload assignments.
        # Core App Team B will have overload workloads: high task count, high estimated hours, high pressure.
        print("Seeding workload assignments...")
        for emp in all_emps:
            is_team_b = (emp.team_id == team_b.id)
            
            if is_team_b:
                tasks_count = random.randint(8, 14)
                estimated_hours = random.uniform(48.0, 58.0)
                deadline_pressure = random.randint(8, 10)
                active_projects = random.randint(3, 5)
            else:
                tasks_count = random.randint(2, 6)
                estimated_hours = random.uniform(25.0, 38.0)
                deadline_pressure = random.randint(2, 6)
                active_projects = random.randint(1, 2)
                
            if emp.id == ceo.id:
                tasks_count, estimated_hours, deadline_pressure, active_projects = 3, 20.0, 4, 1
                
            wl_score = ml_engine.calculate_workload_score(tasks_count, estimated_hours, deadline_pressure, active_projects)
            
            wl = models.WorkloadAssignment(
                organization_id=org.id,
                employee_id=emp.id,
                tasks_count=tasks_count,
                estimated_hours=round(estimated_hours, 1),
                deadline_pressure=deadline_pressure,
                active_projects=active_projects,
                working_hours=40.0,
                score=wl_score
            )
            db.add(wl)
        db.commit()
        
        # 6. Create Attendance History
        # We will create daily logs for the last 6 months (excluding weekends).
        # Standard hours: 9:00 AM check-in, 6:00 PM check-out.
        # Team B has some anomalies: alex.mercer, jordan.vance, taylor.swift have some late check-ins.
        print("Seeding attendance logs (last 30 days detailed, plus historical summaries)...")
        today = datetime.date.today()
        
        # We'll seed the last 30 days of actual daily attendance for every employee to keep SQLite db size reasonable
        # and execution speed high.
        days_to_seed = 30
        
        # Setup specific late deviations for Team B employees
        late_prone_emps = {
            "alex.mercer@nexora.ai": [today - datetime.timedelta(days=d) for d in [2, 5, 8, 12, 15, 19, 22]],
            "jordan.vance@nexora.ai": [today - datetime.timedelta(days=d) for d in [3, 7, 10, 14, 17, 21]],
            "taylor.swift@nexora.ai": [today - datetime.timedelta(days=d) for d in [4, 6, 11, 13, 18, 25]]
        }
        
        for i in range(days_to_seed):
            current_date = today - datetime.timedelta(days=i)
            # Skip weekends
            if current_date.weekday() >= 5:
                continue
                
            for emp in all_emps:
                # CEO doesn't log clock-ins daily
                if emp.id == ceo.id:
                    continue
                    
                # Decide check-in time
                status = "PRESENT"
                check_in_time = datetime.time(9, random.randint(0, 15))  # normal check-in 9:00 - 9:15 AM
                check_out_time = datetime.time(18, random.randint(0, 30)) # normal check-out 6:00 - 6:30 PM
                
                # Check if this employee is late-prone on this date
                is_late_date = False
                if emp.email in late_prone_emps:
                    for d_val in late_prone_emps[emp.email]:
                        if d_val == current_date:
                            is_late_date = True
                            break
                            
                if is_late_date:
                    # Late check-in: 10:15 - 10:45 AM
                    status = "LATE"
                    check_in_time = datetime.time(10, random.randint(15, 45))
                    
                # Calculate deviation and anomaly score
                # For anomaly check, we feed historical logs. Here we can simulate it
                if status == "LATE":
                    deviation = (check_in_time.hour * 60 + check_in_time.minute) - 545
                    # Random anomaly score for mock
                    anomaly_score = round(0.70 + random.uniform(0.05, 0.18), 2)
                else:
                    deviation = (check_in_time.hour * 60 + check_in_time.minute) - 545
                    anomaly_score = 0.0
                    
                att = models.Attendance(
                    organization_id=org.id,
                    employee_id=emp.id,
                    date=current_date,
                    check_in=check_in_time,
                    check_out=check_out_time,
                    status=status,
                    deviation_minutes=deviation,
                    anomaly_score=anomaly_score,
                    baseline_avg=545
                )
                db.add(att)
                
            # Commit in batches of 5 days to avoid transaction memory footprint
            if i % 5 == 0:
                db.commit()
        db.commit()
        
        # 7. Create Leave Requests
        print("Seeding leave requests...")
        # Add some approved, rejected, and pending leaves
        for emp in all_emps:
            if emp.id == ceo.id:
                continue
                
            # Randomly give 1-3 leaves
            num_leaves = random.randint(0, 2)
            if emp.team_id == team_b.id:
                # Team B employees haven't taken many leaves recently (contributing to burnout!)
                num_leaves = 0
                
            for _ in range(num_leaves):
                start_offset = random.randint(5, 40)
                duration = random.randint(1, 5)
                start_d = today - datetime.timedelta(days=start_offset)
                end_d = start_d + datetime.timedelta(days=duration)
                
                status_choice = "APPROVED" if random.random() > 0.15 else "REJECTED"
                
                req = models.LeaveRequest(
                    organization_id=org.id,
                    employee_id=emp.id,
                    leave_type=random.choice(["VACATION", "SICK", "CASUAL"]),
                    start_date=start_d,
                    end_date=end_d,
                    reason="Personal work / Travel" if status_choice == "APPROVED" else "Team deadlines workload constraints",
                    status=status_choice,
                    approved_by=managers.get(emp.team_id).id if emp.team_id in managers else None,
                    comments="Enjoy your time off!" if status_choice == "APPROVED" else "We have a critical release this week, sorry."
                )
                db.add(req)
                
        # 1-2 Pending leaves for today/tomorrow
        team_b_emp = [e for e in all_emps if e.team_id == team_b.id][0]
        pending_leave = models.LeaveRequest(
            organization_id=org.id,
            employee_id=team_b_emp.id,
            leave_type="SICK",
            start_date=today + datetime.timedelta(days=1),
            end_date=today + datetime.timedelta(days=2),
            reason="Feeling unwell, doctors appointment",
            status="PENDING"
        )
        db.add(pending_leave)
        db.commit()
        
        # 8. Create Risk Scores
        print("Calculating and seeding Risk Intelligence records...")
        org_graph = ml_engine.build_org_graph(db, org.id)
        for emp in all_emps:
            risk_data = ml_engine.calculate_employee_risk(db, emp.id, org_graph)
            
            risk = models.RiskScore(
                organization_id=org.id,
                employee_id=emp.id,
                team_id=emp.team_id,
                department_id=emp.department_id,
                attendance_risk=risk_data.get("attendance_risk"),
                workload_risk=risk_data.get("workload_risk"),
                dependency_risk=risk_data.get("dependency_risk"),
                attrition_risk=risk_data.get("attrition_risk"),
                operational_risk=risk_data.get("operational_risk"),
                total_risk=risk_data.get("total_risk"),
                signals=risk_data.get("signals"),
                confidence=risk_data.get("confidence"),
                recommended_action=risk_data.get("recommended_action")
            )
            db.add(risk)
        db.commit()
        
        # 9. Create Payroll Records
        print("Seeding payroll history...")
        for emp in all_emps:
            if emp.id == ceo.id:
                continue
                
            # Seed 3 months of payroll
            for month, year in [(5, 2026), (6, 2026), (7, 2026)]:
                base_sal = emp.salary / 12.0
                allowances = round(base_sal * 0.1, 2)
                deductions = round(base_sal * 0.05, 2)
                net_salary = base_sal + allowances - deductions
                
                payroll = models.Payroll(
                    organization_id=org.id,
                    employee_id=emp.id,
                    month=month,
                    year=year,
                    base_salary=round(base_sal, 2),
                    allowances=allowances,
                    deductions=deductions,
                    net_salary=round(net_salary, 2),
                    status="PAID",
                    anomaly_score=0.0
                )
                db.add(payroll)
        db.commit()
        
        # 10. Create Users for Authentication roles
        print("Seeding platform users and security credentials...")
        # Standard passwords for all seeded users: password123
        hashed_pwd = security.hash_password("password123")
        
        # HR Admin
        hr_emp = [e for e in all_emps if e.designation == "HR Manager"][0]
        user_hr = models.User(
            organization_id=org.id,
            email="hr@nexora.ai",
            password_hash=hashed_pwd,
            role="HR_ADMIN",
            employee_id=hr_emp.id
        )
        db.add(user_hr)
        
        # Super Admin
        user_super = models.User(
            organization_id=org.id,
            email="admin@nexora.ai",
            password_hash=hashed_pwd,
            role="SUPER_ADMIN"
        )
        db.add(user_super)
        
        # Manager (Linked to Team B Manager Robert Stark)
        mgr_emp = managers[team_b.id]
        user_mgr = models.User(
            organization_id=org.id,
            email="manager@nexora.ai",
            password_hash=hashed_pwd,
            role="MANAGER",
            employee_id=mgr_emp.id
        )
        db.add(user_mgr)
        
        # Executive (Linked to Sarah Jenkins CEO)
        user_exec = models.User(
            organization_id=org.id,
            email="executive@nexora.ai",
            password_hash=hashed_pwd,
            role="EXECUTIVE",
            employee_id=ceo.id
        )
        db.add(user_exec)
        
        # Employee (Linked to Alex Mercer on Team B)
        emp_ic = [e for e in all_emps if e.email == "alex.mercer@nexora.ai"][0]
        user_emp = models.User(
            organization_id=org.id,
            email="employee@nexora.ai",
            password_hash=hashed_pwd,
            role="EMPLOYEE",
            employee_id=emp_ic.id
        )
        db.add(user_emp)
        
        # Analyst
        user_an = models.User(
            organization_id=org.id,
            email="analyst@nexora.ai",
            password_hash=hashed_pwd,
            role="ANALYST"
        )
        db.add(user_an)
        db.commit()
        
        # 11. Create Notifications
        print("Seeding initial alerts...")
        notif1 = models.Notification(
            organization_id=org.id,
            user_id=user_hr.id,
            title="Operational Risk Alert: Core App Team B",
            message="AI model flags high attrition and workload risks (+18% utilization, -7% availability) on Core App Team B. Immediate workload redistribution advised.",
            type="CRITICAL",
            is_read=False
        )
        notif2 = models.Notification(
            organization_id=org.id,
            user_id=user_hr.id,
            title="Leave Request Submitted",
            message=f"Leave application from {team_b_emp.name} requires manager approval.",
            type="INFO",
            is_read=False
        )
        db.add(notif1)
        db.add(notif2)
        
        # 12. Create Audit Logs
        print("Logging initialization in audit center...")
        audit = models.AuditLog(
            organization_id=org.id,
            actor_id="System Initializer",
            action="database_seed",
            resource="database",
            ip_address="127.0.0.1",
            user_agent="Nexora CLI Seed Tool",
            result="SUCCESS"
        )
        db.add(audit)
        db.commit()
        
        print("Database seeded successfully with deterministic platform data!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()

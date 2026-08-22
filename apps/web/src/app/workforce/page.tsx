"use client";

import React, { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { Search, Plus, Filter, ArrowUpDown, Eye, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  department_id: string | null;
  team_id: string | null;
  manager_id: string | null;
  joining_date: string;
  employment_status: string;
  salary: number;
  work_location: string;
  skills: string[];
}

export default function WorkforcePage() {
  const { user, apiFetch } = useAuth();
  const router = useRouter();

  // State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [departments, setDepartments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);

  // Create Employee Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmp, setNewEmp] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "",
    department_id: "",
    team_id: "",
    manager_id: "",
    joining_date: new Date().toISOString().split("T")[0],
    employment_status: "ACTIVE",
    salary: 85000.0,
    work_location: "REMOTE",
    skills: ""
  });
  const [createError, setCreateError] = useState("");

  const isHR = user && ["SUPER_ADMIN", "HR_ADMIN", "HR_MANAGER"].includes(user.role);

  // Fetch departments, teams, managers for drop-downs
  useEffect(() => {
    async function loadMetadata() {
      try {
        const deptsData = await apiFetch("/api/departments");
        setDepartments(deptsData);
        
        const teamsData = await apiFetch("/api/teams");
        setTeams(teamsData);
        
        // Grab managers list (employees with manager or specific roles)
        const managersRes = await apiFetch("/api/employees?limit=100");
        setManagers(managersRes.data || []);
      } catch (err) {
        console.error("Error loading dropdown data", err);
      }
    }
    loadMetadata();
  }, []);

  // Fetch employees list
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      let url = `/api/employees?page=${page}&limit=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (deptFilter) url += `&department_id=${deptFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      
      const res = await apiFetch(url);
      setEmployees(res.data || []);
      setTotalPages(res.meta.pages);
      setTotalCount(res.meta.total);
    } catch (err) {
      console.error("Error loading employees", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [page, search, deptFilter, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    try {
      const payload = {
        ...newEmp,
        skills: newEmp.skills.split(",").map(s => s.trim()).filter(Boolean),
        salary: Number(newEmp.salary)
      };

      await apiFetch("/api/employees", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setShowCreateModal(false);
      // Reset form
      setNewEmp({
        name: "",
        email: "",
        phone: "",
        designation: "",
        department_id: "",
        team_id: "",
        manager_id: "",
        joining_date: new Date().toISOString().split("T")[0],
        employment_status: "ACTIVE",
        salary: 85000.0,
        work_location: "REMOTE",
        skills: ""
      });
      // Refresh list
      fetchEmployees();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create employee record.");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 uppercase">
              Workforce Directory
            </h1>
            <p className="text-zinc-500 text-xs font-semibold tracking-wider uppercase mt-1">
              Active headcount management and credentials mapping
            </p>
          </div>
          
          {isHR && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 font-bold text-xs tracking-wider uppercase rounded-lg text-white transition shadow-lg shadow-purple-500/20"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="glass-card rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input 
                type="text" 
                placeholder="Search by name, email..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 glass-input text-xs"
              />
            </div>
            
            {/* Department */}
            <select
              value={deptFilter}
              onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
              className="px-4 py-2.5 glass-input text-xs max-w-xs"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Employment status */}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-4 py-2.5 glass-input text-xs max-w-xs"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="LEAVE">On Leave</option>
            </select>
          </div>

          <div className="text-[10px] text-zinc-500 font-bold uppercase shrink-0">
            Showing {employees.length} of {totalCount} Records
          </div>
        </div>

        {/* Data Table */}
        <div className="glass-panel rounded-xl overflow-hidden border border-zinc-800/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-zinc-950/40 border-b border-zinc-800/60 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Designation</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Status</th>
                  {isHR && <th className="p-4">Salary</th>}
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                {loading ? (
                  <tr>
                    <td colSpan={isHR ? 7 : 6} className="p-8 text-center text-zinc-500">
                      Loading employee records...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={isHR ? 7 : 6} className="p-8 text-center text-zinc-500">
                      No records matched the selected query constraints.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr 
                      key={emp.id} 
                      className="hover:bg-zinc-800/10 cursor-pointer transition"
                      onClick={() => router.push(`/workforce/${emp.id}`)}
                    >
                      <td className="p-4">
                        <div className="font-semibold text-zinc-200">{emp.name}</div>
                        <div className="text-[10px] text-zinc-500">{emp.email}</div>
                      </td>
                      <td className="p-4 font-mono text-zinc-400">{emp.designation || "N/A"}</td>
                      <td className="p-4">
                        {departments.find(d => d.id === emp.department_id)?.name || "Unassigned"}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          emp.work_location === "REMOTE" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                          emp.work_location === "HYBRID" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                          "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                        }`}>
                          {emp.work_location}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`flex items-center gap-1.5 font-bold ${
                          emp.employment_status === "ACTIVE" ? "text-green-400" :
                          emp.employment_status === "LEAVE" ? "text-amber-400" :
                          "text-zinc-500"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            emp.employment_status === "ACTIVE" ? "bg-green-400" :
                            emp.employment_status === "LEAVE" ? "bg-amber-400" :
                            "bg-zinc-500"
                          }`}></span>
                          {emp.employment_status}
                        </span>
                      </td>
                      {isHR && (
                        <td className="p-4 font-mono font-bold text-zinc-200">
                          ${emp.salary.toLocaleString()}/yr
                        </td>
                      )}
                      <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => router.push(`/workforce/${emp.id}`)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-200 rounded hover:bg-zinc-800/30 transition mr-2"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="bg-zinc-950/20 border-t border-zinc-800/60 p-4 flex items-center justify-between text-xs">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded border border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition"
            >
              Previous
            </button>
            <div className="text-zinc-500 font-semibold">
              Page {page} of {totalPages}
            </div>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded border border-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 transition"
            >
              Next
            </button>
          </div>
        </div>

        {/* Create Employee slide-over / Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg glass-panel rounded-2xl p-6 shadow-2xl border border-zinc-800 relative max-h-[90vh] overflow-y-auto">
              
              <button 
                onClick={() => setShowCreateModal(false)}
                className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800/30 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold text-zinc-100 uppercase tracking-wide mb-1">
                Register New Workforce Node
              </h2>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-6">
                Creates DB Record, Workload metrics and active Risk matrices.
              </p>

              {createError && (
                <div className="mb-4 p-2.5 rounded border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Full Name</label>
                    <input 
                      required
                      type="text"
                      className="w-full px-3 py-2 glass-input text-xs"
                      value={newEmp.name}
                      onChange={e => setNewEmp(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Email</label>
                    <input 
                      required
                      type="email"
                      className="w-full px-3 py-2 glass-input text-xs"
                      value={newEmp.email}
                      onChange={e => setNewEmp(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="e.g. john@nexora.ai"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Phone</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2 glass-input text-xs"
                      value={newEmp.phone}
                      onChange={e => setNewEmp(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 012-3456"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Designation</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-2 glass-input text-xs"
                      value={newEmp.designation}
                      onChange={e => setNewEmp(prev => ({ ...prev, designation: e.target.value }))}
                      placeholder="e.g. Software Engineer II"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Department</label>
                    <select
                      required
                      className="w-full px-2 py-2 glass-input text-xs"
                      value={newEmp.department_id}
                      onChange={e => setNewEmp(prev => ({ ...prev, department_id: e.target.value }))}
                    >
                      <option value="">Select...</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Team</label>
                    <select
                      className="w-full px-2 py-2 glass-input text-xs"
                      value={newEmp.team_id}
                      onChange={e => setNewEmp(prev => ({ ...prev, team_id: e.target.value }))}
                    >
                      <option value="">Select...</option>
                      {teams.filter(t => t.department_id === newEmp.department_id).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Manager</label>
                    <select
                      className="w-full px-2 py-2 glass-input text-xs"
                      value={newEmp.manager_id}
                      onChange={e => setNewEmp(prev => ({ ...prev, manager_id: e.target.value }))}
                    >
                      <option value="">Select...</option>
                      {managers.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Joining Date</label>
                    <input 
                      required
                      type="date"
                      className="w-full px-3 py-2 glass-input text-xs"
                      value={newEmp.joining_date}
                      onChange={e => setNewEmp(prev => ({ ...prev, joining_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Location</label>
                    <select
                      className="w-full px-2 py-2 glass-input text-xs"
                      value={newEmp.work_location}
                      onChange={e => setNewEmp(prev => ({ ...prev, work_location: e.target.value }))}
                    >
                      <option value="REMOTE">Remote</option>
                      <option value="HYBRID">Hybrid</option>
                      <option value="ON_SITE">On-Site</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Salary ($/yr)</label>
                    <input 
                      required
                      type="number"
                      className="w-full px-3 py-2 glass-input text-xs font-mono"
                      value={newEmp.salary}
                      onChange={e => setNewEmp(prev => ({ ...prev, salary: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Skills (comma separated)</label>
                  <input 
                    type="text"
                    className="w-full px-3 py-2 glass-input text-xs"
                    value={newEmp.skills}
                    onChange={e => setNewEmp(prev => ({ ...prev, skills: e.target.value }))}
                    placeholder="React, Python, AWS, Docker"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 mt-2 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 font-bold text-xs uppercase tracking-wider text-white transition shadow-lg shadow-purple-500/20"
                >
                  Create Node & Recalculate Org Risk
                </button>
              </form>

            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}

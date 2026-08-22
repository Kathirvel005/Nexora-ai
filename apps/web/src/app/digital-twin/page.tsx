"use client";

import React, { useState, useEffect, useRef } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { 
  ZoomIn, ZoomOut, Maximize, Search, Filter, ShieldAlert, 
  BarChart3, Activity, X, Bot, Network 
} from "lucide-react";

interface Node {
  id: string;
  name: string;
  designation: string;
  department: string;
  team: string;
  workload: number;
  risk: number;
  manager_id: string | null;
  status: string;
  x: number;
  y: number;
}

export default function DigitalTwinPage() {
  const { apiFetch } = useAuth();
  const router = useRouter();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  
  // Selection
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Zoom & Pan
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 100, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const [departments, setDepartments] = useState<any[]>([]);

  // Load Data
  useEffect(() => {
    async function loadGraphData() {
      try {
        setLoading(true);
        // Load departments
        const depts = await apiFetch("/api/departments");
        setDepartments(depts);

        // Load employees
        const empRes = await apiFetch("/api/employees?limit=150");
        const employees = empRes.data || [];

        // Load workloads
        const wlRes = await apiFetch("/api/workload");
        const workloads = wlRes.workloads || [];

        // Load risks
        const riskRes = await apiFetch("/api/risk");
        const risks = riskRes.risks || [];

        // Arrange nodes dynamically in a visual tree
        // Root: Sarah Jenkins (CEO) -> VPs -> Managers -> ICs
        // Let's assign tree coordinates (x, y) based on reporting lines
        const nodeMap = new Map<string, any>();
        
        // Setup initial map
        employees.forEach((emp: any) => {
          const wl = workloads.find((w: any) => w.employee_id === emp.id)?.score || 40;
          const rk = risks.find((r: any) => r.employee_id === emp.id)?.total_risk || 20;
          const d_name = depts.find((d: any) => d.id === emp.department_id)?.name || "Other";
          
          nodeMap.set(emp.id, {
            id: emp.id,
            name: emp.name,
            designation: emp.designation || "Employee",
            department: d_name,
            team: emp.team_id || "None",
            workload: wl,
            risk: rk,
            manager_id: emp.manager_id,
            status: emp.employment_status,
            children: [],
            x: 0,
            y: 0
          });
        });

        // Build tree children references
        let rootNodeId = "";
        nodeMap.forEach((node) => {
          if (node.manager_id && nodeMap.has(node.manager_id)) {
            nodeMap.get(node.manager_id).children.push(node.id);
          } else {
            rootNodeId = node.id; // CEO or top manager
          }
        });

        // Compute layout using Breadth-First-Search (BFS) layered coordinates
        const layers: { [key: number]: string[] } = {};
        
        function traverse(nodeId: string, depth: number) {
          if (!layers[depth]) layers[depth] = [];
          layers[depth].push(nodeId);
          
          const childs = nodeMap.get(nodeId)?.children || [];
          childs.forEach((cId: string) => traverse(cId, depth + 1));
        }

        if (rootNodeId) traverse(rootNodeId, 0);

        // Assign visual positions (x, y)
        // Layer height spacing: 140px. Node width spacing: 130px.
        const nodePositions: Node[] = [];
        const layerHeight = 160;
        const nodeWidth = 140;

        Object.keys(layers).forEach((depthStr) => {
          const depth = parseInt(depthStr);
          const ids = layers[depth];
          const totalWidth = ids.length * nodeWidth;
          const startX = -totalWidth / 2 + nodeWidth / 2;

          ids.forEach((id, idx) => {
            const node = nodeMap.get(id);
            if (node) {
              node.x = startX + (idx * nodeWidth) + 300; // Offset x
              node.y = (depth * layerHeight) + 80;      // Offset y
              nodePositions.push(node as Node);
            }
          });
        });

        setNodes(nodePositions);

      } catch (err) {
        console.error("Error building org graph", err);
      } finally {
        setLoading(false);
      }
    }

    loadGraphData();
  }, []);

  // Handle Drag / Pan Events on Canvas
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom helpers
  const zoomIn = () => setZoom(z => Math.min(2.0, z + 0.15));
  const zoomOut = () => setZoom(z => Math.max(0.3, z - 0.15));
  const resetZoom = () => {
    setZoom(0.85);
    setPan({ x: 100, y: 50 });
  };

  // Apply filters to nodes
  const filteredNodes = nodes.filter(n => {
    const matchesSearch = n.name.toLowerCase().includes(search.toLowerCase()) || 
                          n.designation.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter ? n.department === deptFilter : true;
    
    let matchesRisk = true;
    if (riskFilter === "HIGH") matchesRisk = n.risk >= 70;
    else if (riskFilter === "MODERATE") matchesRisk = n.risk >= 40 && n.risk < 70;
    else if (riskFilter === "LOW") matchesRisk = n.risk < 40;

    return matchesSearch && matchesDept && matchesRisk;
  });

  return (
    <AppShell>
      <div className="h-[calc(100vh-120px)] flex flex-col space-y-4 relative">
        
        {/* Title and Controls header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 uppercase flex items-center gap-2">
              <Network className="w-8 h-8 text-purple-400" />
              Workforce Digital Twin
            </h1>
            <p className="text-zinc-500 text-xs font-semibold tracking-wider uppercase mt-1">
              Interactive organization tree hierarchy and dependency graph
            </p>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 border border-zinc-800 bg-zinc-950/40 p-1 rounded-lg">
            <button 
              onClick={zoomIn} 
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button 
              onClick={zoomOut} 
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button 
              onClick={resetZoom} 
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition"
              title="Reset view"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="glass-card rounded-xl p-3 flex flex-wrap gap-3 items-center justify-between shrink-0">
          <div className="flex flex-1 flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
              <input 
                type="text" 
                placeholder="Search nodes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 glass-input text-[11px]"
              />
            </div>
            
            {/* Dept */}
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="px-2 py-1.5 glass-input text-[11px]"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>

            {/* Risk */}
            <select
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value)}
              className="px-2 py-1.5 glass-input text-[11px]"
            >
              <option value="">All Risks</option>
              <option value="LOW">Low Risk</option>
              <option value="MODERATE">Moderate Risk</option>
              <option value="HIGH">High Risk</option>
            </select>
          </div>

          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider hidden sm:block">
            Use mouse drag to PAN. Click nodes to inspect.
          </div>
        </div>

        {/* SVG Organization Graph Canvas */}
        <div className="flex-1 glass-panel rounded-2xl overflow-hidden relative cursor-grab active:cursor-grabbing border border-zinc-800/80">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500">
              Generating digital twin network layout...
            </div>
          ) : (
            <svg 
              className="w-full h-full"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Grid backdrop */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#27272a" strokeWidth="0.5" opacity="0.3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Node graph group with translation */}
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                
                {/* 1. Dependency Connection Lines */}
                {filteredNodes.map((node) => {
                  if (!node.manager_id) return null;
                  const parent = nodes.find(n => n.id === node.manager_id);
                  if (!parent) return null;
                  
                  // Color link based on child's risk state
                  const lineColor = node.risk >= 70 ? "#ef4444" :
                                    node.risk >= 40 ? "#f59e0b" : "#3f3f46";
                  const opacity = node.risk >= 70 ? 0.8 : 0.4;
                  const dash = node.risk >= 70 ? "4, 4" : "none";
                  
                  return (
                    <line
                      key={`link-${node.id}`}
                      x1={node.x}
                      y1={node.y}
                      x2={parent.x}
                      y2={parent.y}
                      stroke={lineColor}
                      strokeWidth={1.5}
                      strokeDasharray={dash}
                      opacity={opacity}
                    />
                  );
                })}

                {/* 2. Nodes rendering */}
                {filteredNodes.map((node) => {
                  // Determine node color (border)
                  const nodeBorderColor = node.risk >= 70 ? "#ef4444" :
                                          node.risk >= 40 ? "#f59e0b" : "#10b981";
                  
                  // Size based on workload
                  const radius = 28 + (node.workload / 25); // radius between 28 and 32

                  const isSelected = selectedNode?.id === node.id;
                  
                  return (
                    <g 
                      key={`node-${node.id}`}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(node);
                      }}
                      className="cursor-pointer select-none group"
                    >
                      {/* Outer pulse if high risk */}
                      {node.risk >= 70 && (
                        <circle
                          r={radius + 6}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth={1}
                          className="animate-pulse"
                          opacity={0.4}
                        />
                      )}

                      {/* Inner Node Circle */}
                      <circle
                        r={radius}
                        fill="#18181b"
                        stroke={isSelected ? "#a855f7" : nodeBorderColor}
                        strokeWidth={isSelected ? 3.5 : 2}
                        className="transition duration-200"
                        style={{
                          filter: isSelected ? "drop-shadow(0 0 8px rgba(168, 85, 247, 0.4))" : 
                                  node.risk >= 70 ? "drop-shadow(0 0 6px rgba(239, 68, 68, 0.2))" : "none"
                        }}
                      />

                      {/* Initials label inside circle */}
                      <text
                        textAnchor="middle"
                        dy=".3em"
                        fill="#ffffff"
                        fontSize={10}
                        fontWeight="bold"
                        className="font-mono text-zinc-100"
                      >
                        {node.name.substring(0, 2).toUpperCase()}
                      </text>

                      {/* Label Text Card (visible on hover or zoom) */}
                      <g transform={`translate(0, ${radius + 16})`}>
                        <text
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize={9}
                          fontWeight="bold"
                        >
                          {node.name}
                        </text>
                        <text
                          textAnchor="middle"
                          fill="#71717a"
                          fontSize={7}
                          dy="1.2em"
                        >
                          {node.designation}
                        </text>
                      </g>
                    </g>
                  );
                })}

              </g>
            </svg>
          )}

          {/* Contextual Side Panel */}
          {selectedNode && (
            <div className="absolute right-4 top-4 bottom-4 w-80 glass-panel rounded-2xl border border-zinc-800 p-5 shadow-2xl overflow-y-auto z-40 flex flex-col justify-between">
              <div className="space-y-6">
                {/* Header info */}
                <div className="flex items-start justify-between border-b border-zinc-800/60 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center font-bold text-sm text-purple-300">
                      {selectedNode.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-zinc-200">{selectedNode.name}</h4>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">{selectedNode.designation}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedNode(null)}
                    className="p-1 text-zinc-500 hover:text-zinc-200 rounded hover:bg-zinc-800/40"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Metrics Breakdown */}
                <div className="space-y-4 text-xs">
                  {/* Department */}
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Department</span>
                    <span className="font-semibold text-zinc-200">{selectedNode.department}</span>
                  </div>

                  {/* Workload */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5 text-purple-400" /> Workload Index</span>
                      <span className={`font-bold ${selectedNode.workload > 75 ? "text-red-400" : "text-zinc-200"}`}>{selectedNode.workload}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${selectedNode.workload > 75 ? "bg-red-400" : "bg-purple-500"}`} 
                        style={{ width: `${selectedNode.workload}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Risk Score */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Operational Risk</span>
                      <span className={`font-bold ${selectedNode.risk >= 70 ? "text-red-400 animate-pulse-ai" : "text-zinc-200"}`}>{selectedNode.risk}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${
                          selectedNode.risk >= 70 ? "bg-red-500" : 
                          selectedNode.risk >= 40 ? "bg-amber-500" : "bg-green-500"
                        }`} 
                        style={{ width: `${selectedNode.risk}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* AI Recommendations */}
                <div className="p-3.5 rounded-lg border border-purple-500/15 bg-purple-500/5 text-[10px] leading-relaxed space-y-2 text-zinc-400">
                  <div className="flex items-center gap-1.5 font-bold text-zinc-200 uppercase tracking-wide">
                    <Bot className="w-4 h-4 text-purple-400" />
                    AI Intelligence Insight
                  </div>
                  <div>
                    {selectedNode.risk >= 70 ? (
                      "Operational stress detected due to task context switching and late arrival deviations. Urgent task redistribution or mandate leave advised."
                    ) : selectedNode.workload > 75 ? (
                      "Workload saturation limit reached. Highly central node in org tree; risk of delivery delays if capacity drops."
                    ) : (
                      "Workforce parameters stable. Normal check-in frequency and project delivery timelines maintained."
                    )}
                  </div>
                </div>
              </div>

              {/* View profile button link */}
              <button 
                onClick={() => router.push(`/workforce/${selectedNode.id}`)}
                className="w-full py-2 border border-zinc-800 text-[10px] uppercase font-bold tracking-wider rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/40 transition text-center"
              >
                Inspect Detailed Profile
              </button>
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}

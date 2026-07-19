import { useEffect, useRef, useState, useCallback } from 'react';
import { usePortal } from '../context/PortalContext';

interface Node {
  id: string;
  label: string;
  type: 'page' | 'subpage';
  pageId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isPinned?: boolean;
}

interface Edge {
  source: string;
  target: string;
  mutual?: boolean;
}

function extractInternalLinks(html: string): string[] {
  const matches = html.match(/data-pid="([^"]+)"/g) || [];
  return matches.map(m => m.replace(/data-pid="([^"]+)"/, '$1'));
}

export default function GraphView() {
  const { state, dispatch } = usePortal();
  const isDark = state.theme === 'dark';
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ nodeId: string; ox: number; oy: number } | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setDimensions({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Build nodes + edges from pages
  useEffect(() => {
    const w = dimensions.w, h = dimensions.h;
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const nodeMap = new Map<string, Node>();

    state.pages.forEach((page, pi) => {
      const angle = (pi / state.pages.length) * 2 * Math.PI;
      const r = Math.min(w, h) * 0.3;
      const cx = w / 2 + Math.cos(angle) * r;
      const cy = h / 2 + Math.sin(angle) * r;
      const existing = nodesRef.current.find(n => n.id === page.id);
      const node: Node = { id: page.id, label: page.title, type: 'page', pageId: page.id, x: existing?.x ?? cx, y: existing?.y ?? cy, vx: 0, vy: 0, isPinned: page.isPinned };
      newNodes.push(node);
      nodeMap.set(page.id, node);

      page.subPages.filter(sp => !sp.isTracker).forEach((sp, si) => {
        const spAngle = angle + (si - 1) * 0.3;
        const spR = r * 0.45;
        const existingSp = nodesRef.current.find(n => n.id === sp.id);
        const spNode: Node = { id: sp.id, label: sp.title, type: 'subpage', pageId: page.id, x: existingSp?.x ?? (cx + Math.cos(spAngle) * spR), y: existingSp?.y ?? (cy + Math.sin(spAngle) * spR), vx: 0, vy: 0 };
        newNodes.push(spNode);
        nodeMap.set(sp.id, spNode);
        newEdges.push({ source: page.id, target: sp.id });
      });
    });

    // Find internal links
    const linkCounts = new Map<string, number>();
    state.pages.forEach(page => {
      const links = extractInternalLinks(page.content);
      links.forEach(targetId => {
        if (targetId !== page.id && nodeMap.has(targetId)) {
          const edgeKey = [page.id, targetId].sort().join('->');
          linkCounts.set(edgeKey, (linkCounts.get(edgeKey) || 0) + 1);
          const existing = newEdges.find(e => (e.source === page.id && e.target === targetId) || (e.source === targetId && e.target === page.id));
          if (!existing) {
            newEdges.push({ source: page.id, target: targetId, mutual: linkCounts.get(edgeKey)! > 1 });
          } else {
            existing.mutual = true;
          }
        }
      });
      page.subPages.forEach(sp => {
        const links2 = extractInternalLinks(sp.content);
        links2.forEach(targetId => {
          if (targetId !== page.id && nodeMap.has(targetId)) {
            const existing = newEdges.find(e => (e.source === sp.id && e.target === targetId) || (e.source === targetId && e.target === sp.id));
            if (!existing) newEdges.push({ source: sp.id, target: targetId });
          }
        });
      });
    });

    nodesRef.current = newNodes;
    setNodes([...newNodes]);
    setEdges(newEdges);
  }, [state.pages, dimensions]);

  // Physics simulation
  useEffect(() => {
    const w = dimensions.w, h = dimensions.h;
    const simulate = () => {
      const ns = nodesRef.current;
      if (ns.length === 0) { animRef.current = requestAnimationFrame(simulate); return; }

      ns.forEach(node => {
        if (dragRef.current?.nodeId === node.id) return;
        // Repulsion
        ns.forEach(other => {
          if (other.id === node.id) return;
          const dx = node.x - other.x, dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 1800 / (dist * dist);
          node.vx += (dx / dist) * force * 0.1;
          node.vy += (dy / dist) * force * 0.1;
        });
        // Center attraction
        node.vx += (w / 2 - node.x) * 0.002;
        node.vy += (h / 2 - node.y) * 0.002;
        // Damping
        node.vx *= 0.85;
        node.vy *= 0.85;
        node.x += node.vx;
        node.y += node.vy;
        // Bounds
        node.x = Math.max(40, Math.min(w - 40, node.x));
        node.y = Math.max(40, Math.min(h - 40, node.y));
      });
      setNodes([...ns]);
      animRef.current = requestAnimationFrame(simulate);
    };
    animRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animRef.current);
  }, [dimensions]);

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;
    dragRef.current = { nodeId, ox: e.clientX - node.x, oy: e.clientY - node.y };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const node = nodesRef.current.find(n => n.id === dragRef.current!.nodeId);
      if (!node) return;
      node.x = e.clientX - dragRef.current.ox;
      node.y = e.clientY - dragRef.current.oy;
      node.vx = 0; node.vy = 0;
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const navigateTo = (node: Node) => {
    if (node.type === 'page') dispatch({ type: 'SET_ACTIVE_PAGE', pageId: node.pageId, subPageId: null });
    else dispatch({ type: 'SET_ACTIVE_PAGE', pageId: node.pageId, subPageId: node.id });
  };

  const filteredNodes = filter ? nodes.filter(n => n.label.toLowerCase().includes(filter.toLowerCase())) : nodes;
  const filteredIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = filter ? edges.filter(e => filteredIds.has(e.source) && filteredIds.has(e.target)) : edges;

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const pageFill = isDark ? '#6366f1' : '#6366f1';
  const subFill = isDark ? '#334155' : '#e0e7ff';
  const pageText = '#fff';
  const subText = isDark ? '#c7d2fe' : '#3730a3';
  const edgeColor = isDark ? '#334155' : '#cbd5e1';
  const mutualEdgeColor = isDark ? '#6366f1' : '#6366f1';

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-indigo-900/40' : 'bg-indigo-50'}`}>
            <svg className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" strokeWidth="2"/><circle cx="3" cy="5" r="2" strokeWidth="2"/><circle cx="21" cy="5" r="2" strokeWidth="2"/><circle cx="3" cy="19" r="2" strokeWidth="2"/><circle cx="21" cy="19" r="2" strokeWidth="2"/><line x1="12" y1="9" x2="3" y2="6" strokeWidth="2"/><line x1="12" y1="9" x2="21" y2="6" strokeWidth="2"/><line x1="12" y1="15" x2="3" y2="18" strokeWidth="2"/><line x1="12" y1="15" x2="21" y2="18" strokeWidth="2"/>
            </svg>
          </div>
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Graph View</h2>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{nodes.length} nodes · {edges.length} connections · drag to arrange</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter nodes..."
            className={`px-3 py-1.5 rounded-lg border text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200'}`}
          />
          <button onClick={() => dispatch({ type: 'SET_VIEW', view: 'editor' })} className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>← Back</button>
        </div>
      </div>

      {/* Legend */}
      <div className={`flex items-center gap-6 px-6 py-2 border-b text-xs ${isDark ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500"/><span>Page</span></div>
        <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${isDark ? 'bg-slate-600' : 'bg-indigo-100'} border border-indigo-300`}/><span>Sub Page</span></div>
        <div className="flex items-center gap-2"><div className="w-6 h-0.5 bg-slate-400"/><span>Relation</span></div>
        <div className="flex items-center gap-2"><div className="w-6 h-0.5 bg-indigo-500"/><span>Internal Link / Mutual</span></div>
        <span className="ml-auto">Click a node to navigate · Double-click to open</span>
      </div>

      {/* Graph canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ background: bg }}>
        <svg ref={svgRef} width={dimensions.w} height={dimensions.h} style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill={edgeColor} />
            </marker>
            <marker id="arrow-mutual" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill={mutualEdgeColor} />
            </marker>
          </defs>

          {/* Edges */}
          {filteredEdges.map((edge, i) => {
            const src = nodes.find(n => n.id === edge.source);
            const tgt = nodes.find(n => n.id === edge.target);
            if (!src || !tgt) return null;
            const dx = tgt.x - src.x, dy = tgt.y - src.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const ex = tgt.x - (dx / len) * 18;
            const ey = tgt.y - (dy / len) * 18;
            return (
              <line key={i} x1={src.x} y1={src.y} x2={ex} y2={ey}
                stroke={edge.mutual ? mutualEdgeColor : edgeColor}
                strokeWidth={edge.mutual ? 2 : 1}
                strokeDasharray={edge.mutual ? undefined : '4,3'}
                markerEnd={edge.mutual ? 'url(#arrow-mutual)' : 'url(#arrow)'}
                opacity={0.8}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const isFiltered = filter && !filteredIds.has(node.id);
            const r = node.type === 'page' ? 22 : 14;
            const fill = node.type === 'page' ? pageFill : subFill;
            const textColor = node.type === 'page' ? pageText : subText;
            return (
              <g key={node.id} opacity={isFiltered ? 0.2 : 1} style={{ cursor: 'pointer' }}
                onMouseDown={e => handleMouseDown(e, node.id)}
                onClick={() => navigateTo(node)}
                onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, label: node.label })}
                onMouseLeave={() => setTooltip(null)}
              >
                <circle cx={node.x} cy={node.y} r={r} fill={fill} stroke={node.type === 'page' ? '#4f46e5' : '#a5b4fc'} strokeWidth={node.isPinned ? 3 : 1.5}/>
                {node.isPinned && <circle cx={node.x} cy={node.y} r={r + 4} fill="none" stroke="#f59e0b" strokeWidth={2} opacity={0.7}/>}
                <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="middle" fontSize={node.type === 'page' ? 9 : 7} fill={textColor} fontWeight="600" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {node.label.length > 12 ? node.label.slice(0, 10) + '…' : node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div className="fixed z-50 px-2 py-1 rounded text-xs bg-slate-900 text-white shadow-lg pointer-events-none" style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}>
            {tooltip.label}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type TreeNode = {
  id: number;
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
};

type PositionedNode = {
  id: number;
  value: number;
  x: number;
  y: number;
  parentId: number | null;
};

type TraversalType = "preorder" | "inorder" | "postorder" | "levelorder";

type LastOperation =
  | { kind: "none" }
  | { kind: "insert"; value: number }
  | { kind: "random"; count: number }
  | { kind: "clear" }
  | { kind: "traversal"; traversal: TraversalType };

type AnimationMode = "none" | "insert" | "traversal";

function insertNode(
  root: TreeNode | null,
  value: number,
  nextId: () => number
): TreeNode {
  if (root === null) {
    return { id: nextId(), value, left: null, right: null };
  }
  if (value === root.value) {
    return root;
  } else if (value < root.value) {
    return {
      ...root,
      left: insertNode(root.left, value, nextId),
    };
  } else {
    return {
      ...root,
      right: insertNode(root.right, value, nextId),
    };
  }
}

function buildPositions(root: TreeNode | null): PositionedNode[] {
  const nodes: PositionedNode[] = [];
  let index = 0;
  const levelGap = 90;
  const baseY = 40;
  const baseX = 60;
  const xGap = 60;

  function inorder(
    node: TreeNode | null,
    depth: number,
    parentId: number | null
  ) {
    if (!node) return;
    inorder(node.left, depth + 1, node.id);
    const x = baseX + index * xGap;
    const y = baseY + depth * levelGap;
    nodes.push({ id: node.id, value: node.value, x, y, parentId });
    index++;
    inorder(node.right, depth + 1, node.id);
  }

  inorder(root, 0, null);
  return nodes;
}

function preorderTraversal(node: TreeNode | null, out: number[]) {
  if (!node) return;
  out.push(node.id);
  preorderTraversal(node.left, out);
  preorderTraversal(node.right, out);
}

function inorderTraversal(node: TreeNode | null, out: number[]) {
  if (!node) return;
  inorderTraversal(node.left, out);
  out.push(node.id);
  inorderTraversal(node.right, out);
}

function postorderTraversal(node: TreeNode | null, out: number[]) {
  if (!node) return;
  postorderTraversal(node.left, out);
  postorderTraversal(node.right, out);
  out.push(node.id);
}

function levelOrderTraversal(node: TreeNode | null, out: number[]) {
  if (!node) return;
  const queue: TreeNode[] = [node];
  while (queue.length > 0) {
    const n = queue.shift()!;
    out.push(n.id);
    if (n.left) queue.push(n.left);
    if (n.right) queue.push(n.right);
  }
}

function flattenByIds(root: TreeNode | null): { id: number; value: number }[] {
  const res: { id: number; value: number }[] = [];
  function dfs(node: TreeNode | null) {
    if (!node) return;
    dfs(node.left);
    res.push({ id: node.id, value: node.value });
    dfs(node.right);
  }
  dfs(root);
  return res;
}

function computeHeight(root: TreeNode | null): number {
  if (!root) return 0;
  return 1 + Math.max(computeHeight(root.left), computeHeight(root.right));
}

function getInsertPathIds(root: TreeNode | null, value: number): number[] {
  const path: number[] = [];
  let current = root;
  while (current) {
    path.push(current.id);
    if (value === current.value) break;
    if (value < current.value) current = current.left;
    else current = current.right;
  }
  return path;
}

export default function BinaryTreeVisualizer() {
  const [root, setRoot] = useState<TreeNode | null>(null);
  const [inputValue, setInputValue] = useState<string>("");

  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [traversalSeq, setTraversalSeq] = useState<number[]>([]);
  const [traversalType, setTraversalType] = useState<TraversalType | null>(
    null
  );
  const [animationMode, setAnimationMode] = useState<AnimationMode>("none");
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastOp, setLastOp] = useState<LastOperation>({ kind: "none" });
  const [lastInsertedNodeId, setLastInsertedNodeId] = useState<number | null>(
    null
  );

  const idRef = useRef(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const nextId = useCallback(() => {
    const id = idRef.current;
    idRef.current += 1;
    return id;
  }, []);

  function stopAnimation() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsAnimating(false);
    setHighlightedId(null);
    setTraversalSeq([]);
    setTraversalType(null);
    setAnimationMode("none");
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startInsertAnimation = useCallback(
    (value: number) => {
      if (!root) return;
      const pathIds = getInsertPathIds(root, value);
      if (pathIds.length === 0) return;

      const newNodeId = pathIds[pathIds.length - 1];
      setLastInsertedNodeId(newNodeId);

      setTraversalSeq(pathIds);
      setTraversalType(null);
      setAnimationMode("insert");
      setIsAnimating(true);

      let index = 0;
      setHighlightedId(pathIds[0]);

      const interval = setInterval(() => {
        index += 1;
        if (index >= pathIds.length) {
          clearInterval(interval);
          timerRef.current = null;
          setIsAnimating(false);

          setHighlightedId(pathIds[pathIds.length - 1]);
          return;
        }
        setHighlightedId(pathIds[index]);
      }, 600);

      timerRef.current = interval;
    },
    [root]
  );

  const handleInsert = useCallback(() => {
    const val = Number(inputValue);
    if (Number.isNaN(val)) return;

    stopAnimation();

    setRoot((prev) => insertNode(prev, val, nextId));
    setLastOp({ kind: "insert", value: val });
    setInputValue("");

    setTimeout(() => {
      startInsertAnimation(val);
    }, 0);
  }, [inputValue, nextId, startInsertAnimation]);

  const handleRandom = useCallback(() => {
    stopAnimation();
    const count = 8 + Math.floor(Math.random() * 3);
    let newRoot: TreeNode | null = null;
    for (let i = 0; i < count; i++) {
      const v = 1 + Math.floor(Math.random() * 99);
      newRoot = insertNode(newRoot, v, nextId);
    }
    setRoot(newRoot);
    setLastOp({ kind: "random", count });
    setLastInsertedNodeId(null);
  }, [nextId]);

  const handleClear = useCallback(() => {
    stopAnimation();
    setRoot(null);
    setLastOp({ kind: "clear" });
    setLastInsertedNodeId(null);
  }, []);

  const startTraversal = useCallback(
    (type: TraversalType) => {
      if (!root) return;
      stopAnimation();

      const seq: number[] = [];
      if (type === "preorder") preorderTraversal(root, seq);
      else if (type === "inorder") inorderTraversal(root, seq);
      else if (type === "postorder") postorderTraversal(root, seq);
      else levelOrderTraversal(root, seq);

      if (seq.length === 0) return;

      setTraversalSeq(seq);
      setTraversalType(type);
      setAnimationMode("traversal");
      setIsAnimating(true);
      setLastOp({ kind: "traversal", traversal: type });
      setLastInsertedNodeId(null);

      let index = 0;
      setHighlightedId(seq[0]);

      const interval = setInterval(() => {
        index += 1;
        if (index >= seq.length) {
          clearInterval(interval);
          timerRef.current = null;
          setIsAnimating(false);
          setHighlightedId(seq[seq.length - 1]);
          return;
        }
        setHighlightedId(seq[index]);
      }, 800);

      timerRef.current = interval;
    },
    [root]
  );

  const positionedNodes = useMemo(() => buildPositions(root), [root]);

  const nodeMap = useMemo(() => {
    const m = new Map<number, PositionedNode>();
    for (const n of positionedNodes) m.set(n.id, n);
    return m;
  }, [positionedNodes]);

  const idToValueMap = useMemo(() => {
    const m = new Map<number, number>();
    function dfs(node: TreeNode | null) {
      if (!node) return;
      m.set(node.id, node.value);
      dfs(node.left);
      dfs(node.right);
    }
    dfs(root);
    return m;
  }, [root]);

  const width = useMemo(() => {
    if (positionedNodes.length === 0) return 800;
    const xs = positionedNodes.map((n) => n.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const padding = 60;
    return maxX - minX + padding * 2;
  }, [positionedNodes]);

  const height = useMemo(() => {
    if (positionedNodes.length === 0) return 320;
    const ys = positionedNodes.map((n) => n.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padding = 80;
    return maxY - minY + padding * 2;
  }, [positionedNodes]);

  const xOffset = useMemo(() => {
    if (positionedNodes.length === 0) return 0;
    const minX = Math.min(...positionedNodes.map((n) => n.x));
    return 40 - minX;
  }, [positionedNodes]);

  const yOffset = useMemo(() => {
    if (positionedNodes.length === 0) return 0;
    const minY = Math.min(...positionedNodes.map((n) => n.y));
    return 40 - minY;
  }, [positionedNodes]);

  const inorderList = useMemo(() => flattenByIds(root), [root]);

  const traversalLabel = useMemo(() => {
    if (animationMode === "insert") {
      return "Insert path (Root → ... → New node)";
    }
    if (animationMode === "traversal" && traversalType) {
      switch (traversalType) {
        case "preorder":
          return "Pre-Order (Root → Left → Right)";
        case "inorder":
          return "In-Order (Left → Root → Right)";
        case "postorder":
          return "Post-Order (Left → Right → Root)";
        case "levelorder":
          return "Level-Order (Breadth-First Search)";
      }
    }
    return "";
  }, [animationMode, traversalType]);

  const traversalSeqValues = useMemo(
    () => traversalSeq.map((id) => idToValueMap.get(id) ?? id),
    [traversalSeq, idToValueMap]
  );

  const nodeCount = inorderList.length;
  const heightTree = useMemo(() => computeHeight(root), [root]);
  const log2n = nodeCount > 0 ? Math.log2(nodeCount) : 0;

  const lastOpLabel = useMemo(() => {
    switch (lastOp.kind) {
      case "none":
        return "Chưa có thao tác nào.";
      case "insert":
        return `Insert(${lastOp.value}) vào BST.`;
      case "random":
        return `Sinh cây ngẫu nhiên với khoảng ${lastOp.count} node.`;
      case "clear":
        return "Clear toàn bộ cây (n = 0).";
      case "traversal":
        return `Traversal: ${lastOp.traversal.toUpperCase()}.`;
    }
  }, [lastOp]);

  return (
    <div className="app-container">
      <div className="card">
        <h1 className="app-title">Binary Search Tree Visualizer</h1>
        <p className="app-subtitle">
          Chèn số, sinh cây ngẫu nhiên, quan sát đường đi Insert giống BST
          visualization (USF-style), và animation duyệt{" "}
          <strong>Pre / In / Post / Level Order</strong> với phân tích{" "}
          <strong>Time &amp; Space Complexity</strong>.
        </p>

        <div className="controls">
          <div className="input-group">
            <input
              className="input-number"
              type="number"
              value={inputValue}
              placeholder="Nhập số, ví dụ 7"
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button className="btn primary" onClick={handleInsert}>
              + Insert
            </button>
          </div>

          <button className="btn" onClick={handleRandom}>
            Random tree
          </button>

          <button className="btn danger" onClick={handleClear}>
            Clear
          </button>
        </div>

        <div style={{ marginTop: 10, marginBottom: 10 }}>
          <div className="section-title">Traversal</div>
          <div className="traversal-controls">
            <button
              className="btn"
              disabled={!root || isAnimating}
              onClick={() => startTraversal("preorder")}>
              Pre-Order
            </button>
            <button
              className="btn"
              disabled={!root || isAnimating}
              onClick={() => startTraversal("inorder")}>
              In-Order
            </button>
            <button
              className="btn"
              disabled={!root || isAnimating}
              onClick={() => startTraversal("postorder")}>
              Post-Order
            </button>
            <button
              className="btn"
              disabled={!root || isAnimating}
              onClick={() => startTraversal("levelorder")}>
              Level-Order (BFS)
            </button>
            <button
              className="btn"
              disabled={!isAnimating && animationMode === "none"}
              onClick={() => stopAnimation()}>
              Stop
            </button>
          </div>

          <div className="traversal-info">
            {traversalLabel ? (
              <>
                <div>
                  <strong>Đang xem:</strong> {traversalLabel}
                </div>
                <div className="traversal-seq">
                  {traversalSeqValues.length > 0 && (
                    <>
                      <span>Thứ tự node: </span>
                      {traversalSeqValues.join("  →  ")}
                    </>
                  )}
                </div>
              </>
            ) : (
              <span>
                Insert sẽ hiển thị đường đi so sánh từ root đến node mới. Hoặc
                chọn một kiểu traversal để xem thứ tự duyệt toàn cây.
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="section-title">Tree (In-Order layout)</div>
          <div className="tree-wrapper">
            {positionedNodes.length === 0 ? (
              <div
                style={{ padding: "16px 8px", fontSize: 13, color: "#9CA3AF" }}>
                Cây đang rỗng. Hãy <strong>Insert</strong> vài số hoặc dùng nút{" "}
                <strong>Random tree</strong>.
              </div>
            ) : (
              <svg
                className="tree-svg"
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}>
                {positionedNodes.map((node) => {
                  if (node.parentId === null) return null;
                  const parent = nodeMap.get(node.parentId);
                  if (!parent) return null;
                  return (
                    <line
                      key={`edge-${node.id}`}
                      x1={parent.x + xOffset}
                      y1={parent.y + yOffset}
                      x2={node.x + xOffset}
                      y2={node.y + yOffset}
                      stroke="#4b5563"
                      strokeWidth={2}
                    />
                  );
                })}

                {positionedNodes.map((node) => {
                  const isRoot = node.parentId === null;
                  const isHighlight = node.id === highlightedId;
                  const isNew = node.id === lastInsertedNodeId;
                  const radius = isHighlight ? 18 : 16;

                  const fill = isHighlight
                    ? "#f97316"
                    : isRoot
                    ? "#0ea5e9"
                    : "#020617";

                  const stroke = isHighlight
                    ? "#fed7aa"
                    : isRoot
                    ? "#bae6fd"
                    : "#4b5563";

                  const circleClasses = [
                    isHighlight ? "node-highlight" : "",
                    isNew ? "node-new" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <g
                      key={node.id}
                      className="node-group"
                      transform={`translate(${node.x + xOffset}, ${
                        node.y + yOffset
                      })`}>
                      <circle
                        cx={0}
                        cy={0}
                        r={radius}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={2}
                        className={circleClasses || undefined}
                      />
                      <text
                        x={0}
                        y={4}
                        textAnchor="middle"
                        fontSize={12}
                        fill={isHighlight ? "#111827" : "#e5e7eb"}
                        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">
                        {node.value}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
          <div className="legend">
            <div className="legend-item">
              <span className="legend-dot legend-dot-normal" />
              <span>Node thường</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot legend-dot-root" />
              <span>Root</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot legend-dot-highlight" />
              <span>Node đang highlight (Insert path / Traversal)</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="section-title">In-Order (sorted):</div>
          <div className="traversal-seq">
            {inorderList.length === 0 ? (
              <span>Cây rỗng.</span>
            ) : (
              inorderList.map((n, idx) => (
                <span key={n.id}>
                  {n.value}
                  {idx < inorderList.length - 1 ? "  |  " : ""}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="complexity">
          <div className="complexity-header">
            <div className="complexity-main">
              <div>
                Node count n ={" "}
                <span className="complexity-highlight">{nodeCount}</span>,
                height h ={" "}
                <span className="complexity-highlight">{heightTree}</span>.
              </div>
              <div>
                Với cây cân bằng: h ≈ log₂(n) ≈{" "}
                <span className="complexity-highlight">
                  {nodeCount > 0 ? log2n.toFixed(2) : "0"}
                </span>
                .
              </div>
            </div>
          </div>

          <div className="complexity-grid">
            <div className="complexity-item">
              <div className="complexity-title">Insert / Search (BST)</div>
              <div className="complexity-body">
                <div className="complexity-op">
                  <span>Average time:</span> O(log n) ≈ O(h)
                  <span className="complexity-tag">balanced</span>
                </div>
                <div className="complexity-op">
                  <span>Worst time:</span> O(n)
                  <span className="complexity-tag">degenerate (list)</span>
                </div>
                <div className="complexity-op">
                  <span>Space:</span> O(1) extra cho mỗi thao tác, dùng O(h)
                  stack nếu recursion.
                </div>
              </div>
            </div>

            <div className="complexity-item">
              <div className="complexity-title">
                Traversal (Pre / In / Post-Order)
              </div>
              <div className="complexity-body">
                <div className="complexity-op">
                  <span>Time:</span> O(n) — duyệt qua tất cả node một lần.
                </div>
                <div className="complexity-op">
                  <span>Space:</span> O(h) cho recursion stack (h = height).
                </div>
              </div>
            </div>

            <div className="complexity-item">
              <div className="complexity-title">Level-Order (BFS)</div>
              <div className="complexity-body">
                <div className="complexity-op">
                  <span>Time:</span> O(n) — mỗi node vào/ra queue một lần.
                </div>
                <div className="complexity-op">
                  <span>Space:</span> O(w) với w là độ rộng tối đa (worst case
                  O(n)).
                </div>
              </div>
            </div>

            <div className="complexity-item">
              <div className="complexity-title">Memory tổng thể</div>
              <div className="complexity-body">
                <div className="complexity-op">
                  <span>Nodes:</span> O(n) — mỗi node lưu {`value, left, right`}
                  .
                </div>
                <div className="complexity-op">
                  <span>Overhead thuật toán:</span> tối đa O(n) (queue BFS) hoặc
                  O(h) (stack recursion).
                </div>
              </div>
            </div>
          </div>

          <div className="complexity-last-op">
            <strong>Hoạt động gần nhất:</strong> {lastOpLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

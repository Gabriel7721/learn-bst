"use client";

import { useEffect } from "react";

export default function HomePage() {
  useEffect(() => {
    let nextNodeId = 1;

    function createNode(value: number) {
      return {
        id: nextNodeId++,
        value,
        left: null as any,
        right: null as any,
        x: 0,
        y: 0,
      };
    }

    let root: any = null;

    function log(message: string, type: "info" | "step" | "error" = "info") {
      const logPanel = document.getElementById("logPanel");
      if (!logPanel) return;
      const line = document.createElement("div");
      line.className = `log-line ${type}`;
      line.textContent = message;
      logPanel.appendChild(line);
      logPanel.scrollTop = logPanel.scrollHeight;
    }

    function clearLog() {
      const logPanel = document.getElementById("logPanel");
      if (!logPanel) return;
      logPanel.innerHTML = "";
    }

    function computeLayout(rootNode: any, svgWidth: number, levelHeight = 80) {
      const xMin = 50;
      const xMax = svgWidth - 50;

      function layout(node: any, depth: number, minX: number, maxX: number) {
        if (!node) return;
        const x = (minX + maxX) / 2;
        const y = 40 + depth * levelHeight;
        node.x = x;
        node.y = y;
        layout(node.left, depth + 1, minX, x);
        layout(node.right, depth + 1, x, maxX);
      }

      layout(rootNode, 0, xMin, xMax);
    }

    let highlightState = {
      currentNodeId: null as number | null,
      visitedIds: new Set<number>(),
      foundNodeId: null as number | null,
      newNodeId: null as number | null,
    };

    function resetHighlightState() {
      highlightState = {
        currentNodeId: null,
        visitedIds: new Set(),
        foundNodeId: null,
        newNodeId: null,
      };
    }

    function renderTree() {
      const svg = document.getElementById(
        "treeSvg"
      ) as unknown as SVGSVGElement;
      if (!svg) return;

      svg.innerHTML = "";

      if (!root) return;

      const width = svg.clientWidth || 1000;
      computeLayout(root, width);

      const nodes: any[] = [];
      const edges: { from: any; to: any }[] = [];

      function traverse(node: any) {
        if (!node) return;
        nodes.push(node);
        if (node.left) {
          edges.push({ from: node, to: node.left });
          traverse(node.left);
        }
        if (node.right) {
          edges.push({ from: node, to: node.right });
          traverse(node.right);
        }
      }

      traverse(root);

      for (const edge of edges) {
        const line = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        );
        line.setAttribute("x1", String(edge.from.x));
        line.setAttribute("y1", String(edge.from.y));
        line.setAttribute("x2", String(edge.to.x));
        line.setAttribute("y2", String(edge.to.y));
        line.setAttribute("class", "edge-line");
        svg.appendChild(line);
      }

      for (const node of nodes) {
        const group = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "g"
        );

        const circle = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle"
        );
        circle.setAttribute("cx", String(node.x));
        circle.setAttribute("cy", String(node.y));
        circle.setAttribute("r", "18");
        circle.setAttribute("class", "node-circle");

        if (node.id === highlightState.currentNodeId) {
          circle.classList.add("current");
        }
        if (highlightState.visitedIds.has(node.id)) {
          circle.classList.add("visited");
        }
        if (node.id === highlightState.foundNodeId) {
          circle.classList.add("found");
        }
        if (node.id === highlightState.newNodeId) {
          circle.classList.add("new-node");
        }

        const text = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );
        text.setAttribute("x", String(node.x));
        text.setAttribute("y", String(node.y + 1));
        text.setAttribute("class", "node-text");
        text.textContent = String(node.value);

        group.appendChild(circle);
        group.appendChild(text);
        svg.appendChild(group);
      }
    }

    const pseudoCodeTemplates: Record<string, string> = {
      insert: `
PROCEDURE INSERT(root, value)
    IF root = NULL THEN
        root ← NEW_NODE(value)
        RETURN root
    END IF

    IF value < root.value THEN
        root.left ← INSERT(root.left, value)
    ELSE IF value > root.value THEN
        root.right ← INSERT(root.right, value)
    ELSE
        // duplicate, do nothing
    END IF

    RETURN root
END PROCEDURE
`.trim(),

      search: `
PROCEDURE SEARCH(root, value)
    IF root = NULL THEN
        RETURN NOT_FOUND
    END IF

    IF value = root.value THEN
        RETURN root
    ELSE IF value < root.value THEN
        RETURN SEARCH(root.left, value)
    ELSE
        RETURN SEARCH(root.right, value)
    END IF
END PROCEDURE
`.trim(),

      "traversal-inorder": `
PROCEDURE INORDER(root)
    IF root = NULL THEN
        RETURN
    END IF

    INORDER(root.left)
    VISIT(root)
    INORDER(root.right)
END PROCEDURE
`.trim(),

      "traversal-preorder": `
PROCEDURE PREORDER(root)
    IF root = NULL THEN
        RETURN
    END IF

    VISIT(root)
    PREORDER(root.left)
    PREORDER(root.right)
END PROCEDURE
`.trim(),

      "traversal-postorder": `
PROCEDURE POSTORDER(root)
    IF root = NULL THEN
        RETURN
    END IF

    POSTORDER(root.left)
    POSTORDER(root.right)
    VISIT(root)
END PROCEDURE
`.trim(),
    };

    function setPseudoCode(key: string) {
      const pre = document.getElementById("pseudoCode");
      if (!pre) return;
      pre.textContent = pseudoCodeTemplates[key] || "";
    }

    // ======= Algorithm tracing =======

    type StepType =
      | "visit"
      | "compare"
      | "inserted"
      | "found"
      | "not-found"
      | "info";

    interface Step {
      type: StepType;
      node: any;
      info?: string;
    }

    function insertWithTrace(rootNode: any, value: number) {
      const steps: Step[] = [];

      function insertRec(node: any): any {
        if (node === null) {
          const newNode = createNode(value);
          steps.push({
            type: "inserted",
            node: newNode,
            info: `Insert ${value} as new node`,
          });
          return newNode;
        }

        steps.push({
          type: "visit",
          node,
          info: `At node ${node.value}`,
        });

        if (value < node.value) {
          steps.push({
            type: "compare",
            node,
            info: `${value} < ${node.value} ⇒ go left`,
          });
          node.left = insertRec(node.left);
        } else if (value > node.value) {
          steps.push({
            type: "compare",
            node,
            info: `${value} > ${node.value} ⇒ go right`,
          });
          node.right = insertRec(node.right);
        } else {
          steps.push({
            type: "compare",
            node,
            info: `${value} = ${node.value} ⇒ duplicate, do nothing`,
          });
        }
        return node;
      }

      const newRoot = insertRec(rootNode);
      return { newRoot, steps };
    }

    function searchWithTrace(rootNode: any, value: number) {
      const steps: Step[] = [];
      let current = rootNode;
      while (current !== null) {
        steps.push({
          type: "visit",
          node: current,
          info: `Visit node ${current.value}`,
        });

        if (value === current.value) {
          steps.push({
            type: "found",
            node: current,
            info: `Found ${value} at node ${current.value}`,
          });
          return { found: true, steps };
        } else if (value < current.value) {
          steps.push({
            type: "compare",
            node: current,
            info: `${value} < ${current.value} ⇒ go left`,
          });
          current = current.left;
        } else {
          steps.push({
            type: "compare",
            node: current,
            info: `${value} > ${current.value} ⇒ go right`,
          });
          current = current.right;
        }
      }
      steps.push({
        type: "not-found",
        node: null,
        info: `Value ${value} not found`,
      });
      return { found: false, steps };
    }

    function traversalWithTrace(
      rootNode: any,
      mode: "inorder" | "preorder" | "postorder"
    ) {
      const steps: Step[] = [];

      function inorder(node: any) {
        if (!node) return;
        inorder(node.left);
        steps.push({ type: "visit", node, info: `Visit ${node.value}` });
        inorder(node.right);
      }
      function preorder(node: any) {
        if (!node) return;
        steps.push({ type: "visit", node, info: `Visit ${node.value}` });
        preorder(node.left);
        preorder(node.right);
      }
      function postorder(node: any) {
        if (!node) return;
        postorder(node.left);
        postorder(node.right);
        steps.push({ type: "visit", node, info: `Visit ${node.value}` });
      }

      if (!rootNode) {
        steps.push({ type: "info", node: null, info: "Tree is empty" });
        return steps;
      }

      if (mode === "inorder") inorder(rootNode);
      else if (mode === "preorder") preorder(rootNode);
      else if (mode === "postorder") postorder(rootNode);

      return steps;
    }

    let currentSteps: Step[] = [];
    let currentStepIndex = 0;
    let runTimer: any = null;
    let currentSpeed = 800;

    function applyStep(step: Step | undefined) {
      if (!step) return;
      if (step.type === "info") {
        log(step.info || "", "info");
        return;
      }

      if (step.node) {
        highlightState.currentNodeId = step.node.id;
        highlightState.visitedIds.add(step.node.id);
      } else {
        highlightState.currentNodeId = null;
      }

      switch (step.type) {
        case "visit":
          log(step.info || `Visit node`, "step");
          break;
        case "compare":
          log(step.info || "Compare", "step");
          break;
        case "inserted":
          log(step.info || "Inserted node", "step");
          if (!root) {
            root = step.node;
          }
          highlightState.newNodeId = step.node.id;
          break;
        case "found":
          log(step.info || "Found", "step");
          highlightState.foundNodeId = step.node.id;
          break;
        case "not-found":
          log(step.info || "Not found", "error");
          break;
      }

      renderTree();
    }

    function resetAnimation(steps?: Step[]) {
      currentSteps = steps || [];
      currentStepIndex = 0;
      if (runTimer) {
        clearInterval(runTimer);
        runTimer = null;
      }
      resetHighlightState();
      renderTree();
    }

    function stepOnce() {
      if (currentStepIndex >= currentSteps.length) return;
      const step = currentSteps[currentStepIndex++];
      applyStep(step);
    }

    function runAuto() {
      if (!currentSteps.length) return;
      if (runTimer) {
        clearInterval(runTimer);
        runTimer = null;
      }
      runTimer = setInterval(() => {
        if (currentStepIndex >= currentSteps.length) {
          clearInterval(runTimer);
          runTimer = null;
          return;
        }
        stepOnce();
      }, currentSpeed);
    }

    function buildRandomTree() {
      root = null;
      resetHighlightState();
      clearLog();
      const n = 7 + Math.floor(Math.random() * 4); // 7–10 nodes
      const used = new Set<number>();
      for (let i = 0; i < n; i++) {
        let v: number;
        do {
          v = 1 + Math.floor(Math.random() * 99);
        } while (used.has(v));
        used.add(v);
        const { newRoot } = insertWithTrace(root, v);
        root = newRoot;
      }
      log(`Random tree created with ${used.size} nodes`, "info");
      renderTree();
    }

    function initUI() {
      const valueInput = document.getElementById(
        "valueInput"
      ) as HTMLInputElement | null;
      const opSelect = document.getElementById(
        "operationSelect"
      ) as HTMLSelectElement | null;
      const runBtn = document.getElementById("runBtn");
      const stepBtn = document.getElementById("stepBtn");
      const resetBtn = document.getElementById("resetBtn");
      const randomBtn = document.getElementById("randomBtn");
      const speedRange = document.getElementById(
        "speedRange"
      ) as HTMLInputElement | null;
      const speedLabel = document.getElementById("speedLabel");

      if (speedRange && speedLabel) {
        speedRange.addEventListener("input", () => {
          currentSpeed = Number(speedRange.value);
          speedLabel.textContent = `${currentSpeed} ms`;
        });
      }

      if (runBtn && opSelect && valueInput) {
        runBtn.addEventListener("click", () => {
          const op = opSelect.value;
          const valueStr = valueInput.value;
          clearLog();
          resetHighlightState();
          renderTree();

          if (op === "insert" || op === "search") {
            const value = Number(valueStr);
            if (Number.isNaN(valueStr === "" ? NaN : value)) {
              log("Please enter a value", "error");
              return;
            }
            if (op === "insert") {
              setPseudoCode("insert");
              const { newRoot, steps } = insertWithTrace(root, value);
              root = newRoot;
              resetAnimation(steps);
              runAuto();
            } else if (op === "search") {
              setPseudoCode("search");
              const { steps } = searchWithTrace(root, value);
              resetAnimation(steps);
              runAuto();
            }
          } else if (op.startsWith("traversal")) {
            setPseudoCode(op);
            const mode = op.split("-")[1] as
              | "inorder"
              | "preorder"
              | "postorder";
            const steps = traversalWithTrace(root, mode);
            resetAnimation(steps);
            runAuto();
          }
        });
      }

      if (stepBtn) {
        stepBtn.addEventListener("click", () => {
          if (!currentSteps.length) {
            log("No steps to execute. Press Run first.", "error");
            return;
          }
          stepOnce();
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          root = null;
          resetHighlightState();
          clearLog();
          renderTree();
        });
      }

      if (randomBtn) {
        randomBtn.addEventListener("click", () => {
          buildRandomTree();
        });
      }

      setPseudoCode("insert");
    }

    initUI();
    renderTree();
  }, []);

  return (
    <div className="app-container">
      <h1>Binary Search Tree Visualizer</h1>

      <div className="control-panel">
        <div className="row">
          <label>
            Value:
            <input id="valueInput" type="number" />
          </label>

          <label>
            Operation:
            <select id="operationSelect" defaultValue="insert">
              <option value="insert">Insert</option>
              <option value="search">Search</option>
              <option value="traversal-inorder">Traversal: In-Order</option>
              <option value="traversal-preorder">Traversal: Pre-Order</option>
              <option value="traversal-postorder">Traversal: Post-Order</option>
            </select>
          </label>

          <button id="runBtn">Run</button>
          <button id="stepBtn">Step</button>
          <button id="resetBtn">Reset Tree</button>
          <button id="randomBtn">Random Tree</button>
        </div>

        <div className="row">
          <label>
            Speed:
            <input
              id="speedRange"
              type="range"
              min={200}
              max={2000}
              step={100}
              defaultValue={800}
            />
            <span id="speedLabel">800 ms</span>
          </label>
        </div>
      </div>

      <div className="main-layout">
        <div className="tree-wrapper">
          <svg id="treeSvg" width={1000} height={500}></svg>
        </div>

        <div className="side-panel">
          <div className="panel">
            <h2>Pseudo Code</h2>
            <pre id="pseudoCode"></pre>
          </div>

          <div className="panel">
            <h2>Trace / Log</h2>
            <div id="logPanel" className="log-panel"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

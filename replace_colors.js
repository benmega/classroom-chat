const fs = require("fs");
const path = require("path");

const mappings = {
    "#e2e8f0": "var(--border-subtle)",
    "#f8fafc": "var(--bg-secondary)",
    "#1e293b": "var(--slate-800)",
    "#64748b": "var(--text-muted)",
    "#f1f5f9": "var(--bg-tertiary)",
    "#cbd5e1": "var(--border-rich)",
    "#0f172a": "var(--text-primary)",
    "#94a3b8": "var(--border-rich)"
};

function processFile(filePath) {
    let content = fs.readFileSync(filePath, "utf-8");
    let changed = false;
    
    for (const [hex, variable] of Object.entries(mappings)) {
        const regex = new RegExp(hex, "gi");
        if (regex.test(content)) {
            content = content.replace(regex, variable);
            changed = true;
        }
    }
    
    if (changed) {
        fs.writeFileSync(filePath, content, "utf-8");
        console.log("Updated: " + filePath);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith(".jsx")) {
            processFile(fullPath);
        }
    }
}

walk("c:/Users/Ben/AntiGravity/classroom-chat/frontend/src/components");

const fs = require("fs");
const path = require("path");

const mappings = {
    "#ef4444": "var(--error-color)",
    "#334155": "var(--text-secondary)",
    "#b91c1c": "var(--error-dark)"
};

const excludeFiles = ["HamburgerIcon.jsx"];

function processFile(filePath) {
    if (excludeFiles.includes(path.basename(filePath))) return;
    
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

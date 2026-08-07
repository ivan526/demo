const fs = require("fs");
const path = require("path");

const directory = __dirname;
const files = ["config.js", "core.js", "bookmarklet.js"];
const source = files.map((file) => fs.readFileSync(path.join(directory, file), "utf8")).join("\n");
const output = `javascript:${encodeURIComponent(source)}`;
fs.writeFileSync(path.join(directory, "bookmarklet-url.txt"), output);
console.log(`Generated bookmarklet/bookmarklet-url.txt (${output.length} chars)`);

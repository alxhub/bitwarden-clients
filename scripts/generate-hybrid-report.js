const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const workspaceRoot = "/Users/arick/dev/primary/bitwarden2";
const outRoot = path.join(workspaceRoot, "dist/ngp");
const artifactDir = "/Users/arick/.gemini/jetski/brain/1e0aa85f-35a2-4f1e-9ec4-d6dae0fa75c3";

const targets = [
  "libs/angular",
  "libs/auth",
  "libs/common",
  "libs/components",
  "libs/platform",
  "libs/vault",
  "libs/tools/generator/components",
  "apps/web",
];

// Helper to recursively find files matching a suffix
function findFiles(dir, suffix) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== "node_modules" && file !== "dist") {
        results = results.concat(findFiles(fullPath, suffix));
      }
    } else if (file.endsWith(suffix)) {
      results.push(fullPath);
    }
  }
  return results;
}

async function main() {
  console.log("=== 1. Running Jest and emitting JSON report ===");
  const reportPath = path.join(outRoot, "jest-report.json");
  const jestCmd = `npx jest --config jest-compiled-all.config.json --json --outputFile=${reportPath}`;
  console.log(`$ ${jestCmd}`);
  try {
    execSync(jestCmd, { cwd: workspaceRoot, stdio: "ignore" });
  } catch (err) {
    // Jest exits with 1 if there are failures, which is expected
  }

  if (!fs.existsSync(reportPath)) {
    throw new Error(`Jest report not generated at ${reportPath}`);
  }

  const jestReport = JSON.parse(fs.readFileSync(reportPath, "utf-8"));

  // 2. Collect all expected spec files in workspace for target projects
  console.log("=== 2. Collecting all expected spec files ===");
  const expectedSpecs = [];
  for (const target of targets) {
    const targetDir = path.join(workspaceRoot, target);
    const specs = findFiles(targetDir, ".spec.ts");
    expectedSpecs.push(...specs);
  }

  console.log(`Found ${expectedSpecs.length} expected spec files.`);

  // 3. Map ran tests from Jest report
  const ranSpecsMap = new Map();
  const failedSpecs = [];
  const passedSpecs = [];

  for (const testResult of jestReport.testResults) {
    // Convert shadow JS spec path back to original TS spec path to compare
    // e.g. dist/ngp/dist/compiled/libs/common/src/tools/rx.spec.js -> libs/common/src/tools/rx.spec.ts
    let relativeJsPath = path.relative(workspaceRoot, testResult.name);
    // dist/ngp/dist/compiled/libs/...
    let originalRelativePath = relativeJsPath
      .replace(/^dist\/ngp\/dist\/compiled\//, "")
      .replace(/\.js$/, ".ts");

    const originalAbsPath = path.resolve(workspaceRoot, originalRelativePath);
    ranSpecsMap.set(originalAbsPath, testResult);

    if (testResult.status === "failed") {
      failedSpecs.push({
        path: originalRelativePath,
        message: testResult.message,
      });
    } else {
      passedSpecs.push(originalRelativePath);
    }
  }

  // 4. Determine compilation failures (expected specs that didn't run)
  const compilationFailures = [];
  for (const spec of expectedSpecs) {
    if (!ranSpecsMap.has(spec)) {
      compilationFailures.push(path.relative(workspaceRoot, spec));
    }
  }

  // 5. Generate Markdown report
  console.log("=== 3. Generating Markdown Report ===");
  const reportMarkdown = `
# Hybrid Compiler Test Status Report

Generated on: ${new Date().toISOString()}

## Summary Table
| Metric | Count | Description |
| :--- | :---: | :--- |
| **Total Expected Suites** | **${expectedSpecs.length}** | Total \`.spec.ts\` files found in target projects |
| **Failed to Compile Suites** | **${compilationFailures.length}** | Test suites that did not compile to JS via \`tsgo\` |
| **Ran Test Suites** | **${jestReport.numTotalTestSuites}** | Test suites successfully compiled and run |
| **Passed Runtime Suites** | **${jestReport.numPassedTestSuites}** | Test suites where all tests passed |
| **Failed Runtime Suites** | **${jestReport.numFailedTestSuites}** | Test suites containing one or more failures |
| **Total Ran Tests** | **${jestReport.numTotalTests}** | Total individual tests executed across all ran suites |
| **Passed Runtime Tests** | **${jestReport.numPassedTests}** | Individual tests that passed runtime assertions |
| **Failed Runtime Tests** | **${jestReport.numFailedTests}** | Individual tests that failed runtime assertions |
| **Skipped Runtime Tests** | **${jestReport.numPendingTests}** | Individual tests explicitly skipped (e.g. \`it.skip\`) |
| **Todo Runtime Tests** | **${jestReport.numTodoTests}** | Individual tests marked as todo |

---

## 🟥 Compilation Failures (${compilationFailures.length})
These test suites did not compile to JS and were skipped entirely.

${compilationFailures.map((f) => `- [ ] [${path.basename(f)}](file://${path.resolve(workspaceRoot, f)})`).join("\n")}

---

## 🟨 Runtime Failures (${failedSpecs.length})
These test suites compiled successfully but failed at runtime due to compiler generation errors.

${failedSpecs
  .map((f) => {
    // Extract the main error name/message for clean presentation
    const lines = f.message.split("\n");
    const cleanMessage = lines
      .slice(0, 3)
      .join("\n")
      .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, ""); // strip colors
    return `### ❌ [${path.basename(f.path)}](file://${path.resolve(workspaceRoot, f.path)})
\`\`\`
${cleanMessage}
\`\`\`
`;
  })
  .join("\n")}

---

## 🟩 Passed Runtime Suites (${passedSpecs.length})
These test suites successfully compiled and passed all runtime assertions.

${passedSpecs.map((f) => `- [x] [${path.basename(f)}](file://${path.resolve(workspaceRoot, f)})`).join("\n")}
`;

  const reportFile = path.join(artifactDir, "hybrid_compiler_test_report.md");
  fs.writeFileSync(reportFile, reportMarkdown, "utf-8");
  console.log(`Report successfully written to ${reportFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

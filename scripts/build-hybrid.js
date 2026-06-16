const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const workspaceRoot = "/Users/arick/dev/primary/bitwarden2";
const outRoot = path.join(workspaceRoot, "dist/ngp");

async function main() {
  // 1. Replicate root tsconfig files to dist/ngp
  fs.mkdirSync(outRoot, { recursive: true });
  fs.copyFileSync(
    path.join(workspaceRoot, "tsconfig.base.json"),
    path.join(outRoot, "tsconfig.base.json"),
  );
  fs.copyFileSync(path.join(workspaceRoot, "tsconfig.json"), path.join(outRoot, "tsconfig.json"));

  // Create symlink for node_modules in dist/ngp/dist/compiled to resolve relative node_modules imports
  const compiledRoot = path.join(outRoot, "dist/compiled");
  fs.mkdirSync(compiledRoot, { recursive: true });
  const compiledNodeModules = path.join(compiledRoot, "node_modules");
  if (!fs.existsSync(compiledNodeModules)) {
    console.log("Creating symlink for compiled node_modules...");
    fs.symlinkSync(path.join(workspaceRoot, "node_modules"), compiledNodeModules, "dir");
  }

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

  for (const target of targets) {
    console.log(`=== Processing Target: ${target} ===`);
    const targetDir = path.join(workspaceRoot, target);

    // Resolve tsconfig path (prefer tsconfig.spec.json if it exists)
    let tsconfigName = "tsconfig.spec.json";
    if (!fs.existsSync(path.join(targetDir, tsconfigName))) {
      tsconfigName = "tsconfig.json";
    }
    const originalTsconfig = path.join(targetDir, tsconfigName);

    // Run ngp preprocessor on original target tsconfig, outputting to dist/ngp/
    const ngpCmd = `npx ngp ${originalTsconfig} --out ${outRoot} --root ${workspaceRoot} --optimize`;
    console.log(`$ ${ngpCmd}`);
    execSync(ngpCmd, { cwd: workspaceRoot, stdio: "inherit" });

    // Replicate tsconfig to dist/ngp/<target>
    const shadowTargetDir = path.join(outRoot, target);
    fs.mkdirSync(shadowTargetDir, { recursive: true });

    // Copy both tsconfig.json and tsconfig.spec.json if they exist
    for (const name of ["tsconfig.json", "tsconfig.spec.json"]) {
      const src = path.join(targetDir, name);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(shadowTargetDir, name));
      }
    }
    const shadowTsconfig = path.join(shadowTargetDir, tsconfigName);

    // Patch shadow tsconfig
    const tsconfig = JSON.parse(fs.readFileSync(shadowTsconfig, "utf-8"));
    tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    tsconfig.compilerOptions.rootDir = ".";
    tsconfig.compilerOptions.noCheck = true;
    tsconfig.compilerOptions.skipLibCheck = true;
    tsconfig.compilerOptions.allowJs = true;
    tsconfig.compilerOptions.module = "commonjs";
    tsconfig.compilerOptions.emitDecoratorMetadata = true;
    delete tsconfig.compilerOptions.moduleResolution;
    delete tsconfig.compilerOptions.baseUrl;
    tsconfig.include = ["./src/**/*.ts", "./src/**/*.js", "./spec/**/*.ts", "./spec/**/*.js"];
    tsconfig.exclude = ["**/*.ngtypecheck.ts", "node_modules", "dist"];
    fs.writeFileSync(shadowTsconfig, JSON.stringify(tsconfig, null, 2), "utf-8");

    // Compile the preprocessed files using tsgo
    const compiledDir = path.join(outRoot, "dist/compiled", target);
    if (fs.existsSync(compiledDir)) {
      fs.rmSync(compiledDir, { recursive: true, force: true });
    }
    fs.mkdirSync(compiledDir, { recursive: true });

    const tsgoCmd = `npx tsgo -p ${shadowTsconfig} --outDir ${compiledDir}`;
    console.log(`$ ${tsgoCmd}`);
    try {
      execSync(tsgoCmd, { cwd: outRoot, stdio: "inherit" });
    } catch (err) {
      if (fs.existsSync(compiledDir) && fs.readdirSync(compiledDir).length > 0) {
        console.log(`tsgo emitted files with warnings in ${compiledDir}.`);
      } else {
        throw err;
      }
    }

    // Copy assets (HTML, CSS templates) to compiled directory
    try {
      execSync(
        `rsync -a --include="*/" --include="*.html" --include="*.css" --exclude="*" ${target}/ ${compiledDir}/`,
        {
          cwd: workspaceRoot,
        },
      );
    } catch (err) {
      console.warn("Failed to copy some assets.");
    }
  }

  // 2. Generate and update jest-compiled-all.config.json moduleNameMapper
  console.log("=== Generating moduleNameMapper for Jest config ===");
  const jestConfigPath = path.join(workspaceRoot, "jest-compiled-all.config.json");
  if (fs.existsSync(jestConfigPath)) {
    const jestConfig = JSON.parse(fs.readFileSync(jestConfigPath, "utf-8"));
    jestConfig.moduleNameMapper = generateModuleNameMapper(workspaceRoot, targets);
    fs.writeFileSync(jestConfigPath, JSON.stringify(jestConfig, null, 2), "utf-8");
    console.log("Successfully updated jest-compiled-all.config.json");
  }
}

function generateModuleNameMapper(workspaceRoot, targets) {
  const tsconfigBase = JSON.parse(
    fs.readFileSync(path.join(workspaceRoot, "tsconfig.base.json"), "utf-8"),
  );
  const paths = tsconfigBase.compilerOptions?.paths || {};
  const mapper = {};

  // Add standard fixed/experimental package redirects
  mapper["^.*/node_modules/@ng-select/ng-select/types/ng-select-ng-select$"] =
    "<rootDir>/node_modules/@ng-select/ng-select/fesm2022/ng-select-ng-select.mjs";
  mapper["^.*/node_modules/@angular/common/types/_common_module-chunk$"] =
    "<rootDir>/node_modules/@angular/common/fesm2022/common.mjs";
  mapper["^.*/node_modules/@angular/forms/types/forms$"] =
    "<rootDir>/node_modules/@angular/forms/fesm2022/forms.mjs";
  mapper["^.*/node_modules/@angular/router/types/_router_module-chunk$"] =
    "<rootDir>/node_modules/@angular/router/fesm2022/router.mjs";
  mapper["^.*/node_modules/@angular/cdk/types/drag-drop$"] =
    "<rootDir>/node_modules/@angular/cdk/fesm2022/drag-drop.mjs";
  mapper["^.*/node_modules/@angular/cdk/types/_portal-directives-chunk$"] =
    "<rootDir>/node_modules/@angular/cdk/fesm2022/portal.mjs";
  mapper["^.*/node_modules/@angular/cdk/types/_bidi-module-chunk$"] =
    "<rootDir>/node_modules/@angular/cdk/fesm2022/bidi.mjs";
  mapper["^.*/node_modules/@angular/cdk/types/_a11y-module-chunk$"] =
    "<rootDir>/node_modules/@angular/cdk/fesm2022/_a11y-module-chunk.mjs";

  mapper["^@angular/cdk/_portal-directives-chunk$"] =
    "<rootDir>/node_modules/@angular/cdk/fesm2022/portal.mjs";
  mapper["^@angular/cdk/_bidi-module-chunk$"] =
    "<rootDir>/node_modules/@angular/cdk/fesm2022/bidi.mjs";
  mapper["^@angular/cdk/_a11y-module-chunk$"] =
    "<rootDir>/node_modules/@angular/cdk/fesm2022/_a11y-module-chunk.mjs";
  mapper["^@angular/common/_common_module-chunk$"] =
    "<rootDir>/node_modules/@angular/common/fesm2022/_common_module-chunk.mjs";
  mapper["^@angular/router/_router_module-chunk$"] =
    "<rootDir>/node_modules/@angular/router/fesm2022/_router_module-chunk.mjs";
  mapper["^@ng-select/ng-select/ng-select-ng-select$"] =
    "<rootDir>/node_modules/@ng-select/ng-select/fesm2022/ng-select-ng-select.mjs";

  // Angular Core tier bundles
  mapper["^@angular/core$"] = "<rootDir>/node_modules/@angular/core/fesm2022/core.mjs";
  mapper["^@angular/common$"] = "<rootDir>/node_modules/@angular/common/fesm2022/common.mjs";
  mapper["^@angular/forms$"] = "<rootDir>/node_modules/@angular/forms/fesm2022/forms.mjs";
  mapper["^@angular/router$"] = "<rootDir>/node_modules/@angular/router/fesm2022/router.mjs";

  // Custom mock overrides
  mapper["@bitwarden/common/platform/services/sdk/default-sdk-client-factory"] =
    "<rootDir>/dist/ngp/dist/compiled/libs/common/spec/jest-sdk-client-factory";
  mapper["^@bitwarden/common/spec$"] = "<rootDir>/dist/ngp/dist/compiled/libs/common/spec";

  for (const [key, valList] of Object.entries(paths)) {
    if (valList.length === 0) continue;
    const originalVal = valList[0];

    // Check if the original path starts with one of our compiled targets
    let matchingTarget = targets.find(
      (t) => originalVal.startsWith(`./${t}`) || originalVal.startsWith(`${t}`),
    );

    let mappedVal = originalVal;
    if (matchingTarget) {
      mappedVal = originalVal
        .replace(/^\.\//, "")
        .replace(/^/, "<rootDir>/dist/ngp/dist/compiled/");
    } else {
      mappedVal = originalVal.replace(/^\.\//, "").replace(/^/, "<rootDir>/");
    }

    if (key.endsWith("/*") && mappedVal.endsWith("/*")) {
      const keyPrefix = key.slice(0, -2);
      const valPrefix = mappedVal.slice(0, -2);

      const escapedKey = keyPrefix
        .replace(/\\/g, "\\\\")
        .replace(/\-/g, "\\-")
        .replace(/\//g, "\\/");
      mapper[`^${escapedKey}/(.*)$`] = `${valPrefix}/$1`;
      mapper[`^${escapedKey}$`] = valPrefix;
      mapper[`^${escapedKey}/src$`] = valPrefix;
    } else {
      const escapedKey = key.replace(/\\/g, "\\\\").replace(/\-/g, "\\-").replace(/\//g, "\\/");
      mapper[`^${escapedKey}$`] = mappedVal;
      mapper[`^${escapedKey}/src$`] = mappedVal;
    }
  }

  return mapper;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

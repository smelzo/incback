/**
 * Rollup configuration for incback CLI tool
 *
 * Creates a dual-package build (ESM + CommonJS) for maximum compatibility.
 * - ESM output: build/index.mjs
 * - CommonJS output: build/index.cjs
 */

import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// External dependencies (should not be bundled)
// For a CLI tool, we want to keep node built-ins and dependencies external
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  // Node.js built-in modules
  'fs',
  'path',
  'child_process',
  'util',
  'url'
];

/**
 * Base configuration shared between ESM and CJS builds
 */
const baseConfig = {
  input: 'src/cli.ts',
  external,
  strictDeprecations: true,
  watch: {
    include: ['src/**'],
    clearScreen: false
  },
  onwarn: (warning) => {
    // Throw errors for warnings to ensure clean builds
    throw Object.assign(new Error(), warning);
  }
};

const getPlugins = (produceTypes = false) => {
  let typescriptConfig = {
      tsconfig: './tsconfig.json',
      sourceMap: false,
      declaration: produceTypes,
      declarationMap: false,
      compilerOptions: {
        noEmit: false,
        outDir: undefined // Let Rollup handle output
      }
    }
    if(produceTypes) {
      typescriptConfig = {
        ...typescriptConfig,
        declarationDir : 'build/types'
      }
    }
  return [
    resolve({
      preferBuiltins: true, // Prefer Node.js built-in modules
      exportConditions: ['node'] // Target Node.js environment
    }),
    typescript(typescriptConfig)
  ];

}
// /**
//  * Plugin configuration shared between builds
//  */
// const plugins = [
//   resolve({
//     preferBuiltins: true, // Prefer Node.js built-in modules
//     exportConditions: ['node'] // Target Node.js environment
//   }),
//   typescript({
//     tsconfig: './tsconfig.json',
//     sourceMap: false,
//     declaration: true,
//     declarationDir: 'build/types',
//     declarationMap: false,
//     compilerOptions: {
//       noEmit: false,
//       outDir: undefined // Let Rollup handle output
//     }
//   })
// ];

/**
 * ESM build configuration
 */
const esmCliConfig = {
  ...baseConfig,
  output: {
    file: 'build/cli.mjs',
    format: 'esm',
    sourcemap: false,
    preserveModules: false
  },
  plugins: getPlugins(false)
};
const esmLibConfig = {
  ...baseConfig,
  input: 'src/lib.ts',
  output: {
    file: 'build/lib.mjs',
    format: 'esm',
    sourcemap: false,
    preserveModules: false
  },
  plugins: getPlugins(true)
};
/**
 * CommonJS build configuration
 */
const cjsCliConfig = {
  ...baseConfig,
  output: {
    file: 'build/cli.cjs',
    format: 'cjs',
    sourcemap: false,
    // banner: '#!/usr/bin/env node\n', // Shebang for CLI execution
    exports: 'auto', // Automatically determine export mode
    interop: 'auto' // Automatic interop between ESM and CJS
  },
  plugins: getPlugins(false)
};
const cjsLibConfig = {
  ...baseConfig,
  input: 'src/lib.ts',
  output: {
    file: 'build/lib.cjs',
    format: 'cjs',
    sourcemap: false,
    exports: 'auto', // Automatically determine export mode
    interop: 'auto' // Automatic interop between ESM and CJS
  },
  plugins: getPlugins(false)
};

export default [esmCliConfig, cjsCliConfig, esmLibConfig, cjsLibConfig];
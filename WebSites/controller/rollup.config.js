import path from 'path';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const externals = [
  'io-gui',
];

export function makeBundleTarget(src, target, skipExternals = true) {
  const _externals = [...externals];
  externals.push(path.resolve(src));

  return {
    input: src,
    plugins: [
      nodeResolve({
        moduleDirectories: ['node_modules'],
      })
    ],
    treeshake: true,
    output: [{
      inlineDynamicImports: true,
      format: 'es',
      file: target,
      indent: '  '
    }],
    external: skipExternals ? _externals : [],
    onwarn: (warning, warn) => {
      if (warning.code === 'THIS_IS_UNDEFINED') return;
      warn(warning);
    }
  };
}

export default [
  makeBundleTarget('build/SpacetimeController.js', 'bundle/SpacetimeController.js'),
];

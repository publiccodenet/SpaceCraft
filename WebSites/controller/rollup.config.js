import path from 'path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import strip from '@rollup/plugin-strip';
import terser from '@rollup/plugin-terser';

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
      }),
      strip({
        functions: [],
        labels: ['debug']
      }),
      // terser({
      //   keep_classnames: true,
      //   keep_fnames: true,
      //   compress: {
      //     keep_infinity: true,
      //   }
      // })
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

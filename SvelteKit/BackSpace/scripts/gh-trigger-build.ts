/**
 * Trigger Build Unity SpaceCraft GitHub Action
 *
 * This CLI fires the workflow_dispatch for .github/workflows/build-unity-spacecraft.yml
 * and forwards parameters provided on the command line.
 *
 * Usage examples:
 *   npm run trigger-build-unity-spacecraft -- \
 *     --unityVersion auto \
 *     --projectPath "Unity/SpaceCraft" \
 *     --targetPlatform WebGL \
 *     --buildProfile WebGLProductionBuild \
 *     --ref main
 *
 *   npm run trigger-build-unity-spacecraft -- \
 *     --unityVersion 2022.3.45f1 \
 *     --buildMethod SpaceCraft.Editor.Builds.BuildWebGLDevelopment \
 *     --ref my-feature-branch
 */

import { Command } from 'commander';
import { execSync } from 'node:child_process';

function ensureGhCliAvailable() {
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch (err) {
    console.error('gh CLI is required. Install from https://cli.github.com/');
    process.exit(1);
  }
}

const program = new Command();
program
  .option('--unityVersion <string>', 'Unity Editor version or "auto"', 'auto')
  .option('--projectPath <path>', 'Unity project path', 'Unity/SpaceCraft')
  .option('--targetPlatform <string>', 'Unity target platform', 'WebGL')
  .option('--buildProfile <string>', 'Build profile token', 'WebGLProductionBuild')
  .option('--buildMethod <string>', 'Explicit Unity build method (overrides buildProfile)', '')
  .requiredOption('--ref <string>', 'Git ref to run the workflow on (branch, tag, or commit)')
  .option('--repo <string>', 'Override GitHub repo in owner/name format');

program.parse(process.argv);
const opts = program.opts();

ensureGhCliAvailable();

const args: string[] = ['workflow', 'run', 'build-unity-spacecraft.yml'];

if (opts.repo) {
  args.push('--repo', opts.repo);
}
args.push('--ref', opts.ref);

function pushField(name: string, value: string | undefined) {
  if (typeof value === 'string') {
    args.push('-f', `${name}=${value}`);
  }
}

pushField('unityVersion', opts.unityVersion);
pushField('projectPath', opts.projectPath);
pushField('targetPlatform', opts.targetPlatform);
pushField('buildProfile', opts.buildProfile);
if (opts.buildMethod) {
  pushField('buildMethod', opts.buildMethod);
}

try {
  console.log('[gh] Running:', 'gh', args.join(' '));
  const out = execSync(`gh ${args.map(a => (a.includes(' ') ? `'${a.replace(/'/g, "'\\''")}'` : a)).join(' ')}`, {
    stdio: 'inherit',
  });
} catch (err: any) {
  const code = typeof err?.status === 'number' ? err.status : 1;
  process.exit(code);
}



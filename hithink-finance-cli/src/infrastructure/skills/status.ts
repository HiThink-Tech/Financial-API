import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const manifestSchema = z.object({
  protocolVersion: z.string().min(1),
  cliVersion: z.string().min(1),
  files: z.record(z.string(), z.string().min(1)),
});

export interface BundledSkillsStatus {
  canonical: string;
  protocolVersion: string;
  cliVersion: string;
  skillCount: number;
  fileCount: number;
  targetsVerified: false;
  targetStatus: 'not-verified';
}

/** Reads package-owned facts without guessing each Agent's discovery path. */
export async function readBundledSkillsStatus(packageRoot: string): Promise<BundledSkillsStatus> {
  const canonical = path.join(packageRoot, 'skills');
  const manifestPath = path.join(canonical, 'manifest.json');
  const manifest = manifestSchema.parse(JSON.parse(await readFile(manifestPath, 'utf8')));
  const skillNames = new Set(
    Object.keys(manifest.files)
      .map((file) => file.split('/')[0])
      .filter((name): name is string => name?.startsWith('hithink-finance-') === true),
  );

  return {
    canonical,
    protocolVersion: manifest.protocolVersion,
    cliVersion: manifest.cliVersion,
    skillCount: skillNames.size,
    fileCount: Object.keys(manifest.files).length,
    targetsVerified: false,
    targetStatus: 'not-verified',
  };
}

import { promises as fs } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceDir = path.join(repoRoot, 'src', 'components', 'widgets', 'Avisos', 'app');
const targetDir = path.join(repoRoot, 'public', 'Avisos');

async function copyDir(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
        const from = path.join(src, entry.name);
        const to = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDir(from, to);
            continue;
        }

        if (entry.isFile()) {
            await fs.copyFile(from, to);
        }
    }
}

async function main() {
    try {
        await fs.access(sourceDir);
    } catch {
        console.error(`[sync-avisos] No existe el origen: ${sourceDir}`);
        process.exitCode = 1;
        return;
    }

    await fs.rm(targetDir, { recursive: true, force: true });
    await copyDir(sourceDir, targetDir);
    // eslint-disable-next-line no-console
    console.log(`[sync-avisos] Copiado a ${targetDir}`);
}

main();

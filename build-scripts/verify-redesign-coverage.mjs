import { readFile } from 'node:fs/promises';

const coveragePath = new URL('../docs/REDESIGN_COVERAGE.md', import.meta.url);
const coverage = await readFile(coveragePath, 'utf8');
const unresolvedStatuses = new Set([
    'UNASSESSED',
    'DESIGN_NEEDED',
    'IN_PROGRESS',
    'BLOCKED'
]);
const rows = coverage
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| BVX-'))
    .map((line) => {
        const cells = line.split('|').map((cell) => cell.trim());
        return {
            id: cells[1],
            line,
            status: cells[4].replaceAll('`', '')
        };
    });

if (rows.length !== 38) {
    throw new Error(`Expected 38 coverage rows, found ${rows.length}.`);
}

const unresolvedRows = rows
    .filter(({ status }) => unresolvedStatuses.has(status))
    .map(({ line }) => line);

if (unresolvedRows.length > 0) {
    throw new Error(
        `Unresolved redesign coverage rows:\n${unresolvedRows.join('\n')}`
    );
}

console.log(`Verified ${rows.length} redesign coverage rows.`);

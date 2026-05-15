process.stdout.columns = process.stdout.columns || 120;
process.stdout.rows = process.stdout.rows || 40;
process.stdout.isTTY = true;
process.stderr.columns = process.stderr.columns || 120;
process.stderr.rows = process.stderr.rows || 40;
process.stderr.isTTY = true;

process.argv = ['node', 'next', 'build', ...process.argv.slice(2)];
require('next/dist/bin/next');

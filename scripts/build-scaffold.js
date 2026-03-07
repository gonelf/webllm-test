import fs from 'fs';
import path from 'path';

function buildFsTree(dir) {
    const tree = {};
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            tree[entry.name] = {
                directory: buildFsTree(fullPath),
            };
        } else {
            tree[entry.name] = {
                file: {
                    contents: fs.readFileSync(fullPath, 'utf-8'),
                },
            };
        }
    }
    return tree;
}

const scaffoldDir = path.join(process.cwd(), 'public', 'scaffold');
const outputPath = path.join(process.cwd(), 'public', 'scaffold-tree.json');

const tree = buildFsTree(scaffoldDir);
fs.writeFileSync(outputPath, JSON.stringify(tree, null, 2));

console.log(`Generated scaffold-tree.json with ${Object.keys(tree).length} top-level entries.`);

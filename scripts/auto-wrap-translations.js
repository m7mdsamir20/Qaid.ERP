const fs = require('fs');
const path = require('path');
const ts = require('c:/Users/pc203/OneDrive/Desktop/Projects/erp-app/node_modules/typescript');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const EXCLUDED_DIRS = [
    path.join(SRC_DIR, 'app/api'), // Backend API routes do not use client translation
];
const EXCLUDED_FILES = [
    path.join(SRC_DIR, 'lib/i18n.tsx'), // Translation dictionary itself
];

// Unicode Arabic range regex
const ARABIC_REGEX = /[\u0600-\u06FF]/;

// Recursively get files
function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const fullPath = path.join(dir, file);
        
        // Check if excluded directory
        if (EXCLUDED_DIRS.some(d => fullPath.startsWith(d))) {
            return;
        }
        
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(fullPath));
        } else {
            const ext = path.extname(fullPath);
            if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
                if (!EXCLUDED_FILES.includes(fullPath)) {
                    results.push(fullPath);
                }
            }
        }
    });
    return results;
}

// Check if a node is already wrapped in t(...)
function isAlreadyWrapped(node) {
    let parent = node.parent;
    while (parent) {
        if (parent.kind === ts.SyntaxKind.CallExpression &&
            parent.expression &&
            parent.expression.kind === ts.SyntaxKind.Identifier &&
            parent.expression.text === 't') {
            return true;
        }
        parent = parent.parent;
    }
    return false;
}

// Check if a node is inside type definitions, imports/exports, require calls, etc.
function isInsideExcludedContext(node) {
    let parent = node.parent;
    while (parent) {
        const kind = parent.kind;
        if (
            kind === ts.SyntaxKind.TypeAliasDeclaration ||
            kind === ts.SyntaxKind.InterfaceDeclaration ||
            kind === ts.SyntaxKind.TypeLiteral ||
            kind === ts.SyntaxKind.TypeReference ||
            kind === ts.SyntaxKind.LiteralType ||
            kind === ts.SyntaxKind.TypeAssertionExpression ||
            kind === ts.SyntaxKind.AsExpression ||
            kind === ts.SyntaxKind.ImportDeclaration ||
            kind === ts.SyntaxKind.ExportDeclaration ||
            kind === ts.SyntaxKind.ImportEqualsDeclaration ||
            (kind === ts.SyntaxKind.CallExpression && parent.expression && parent.expression.text === 'require')
        ) {
            return true;
        }
        // Exclude object property keys in PropertyAssignments
        if (kind === ts.SyntaxKind.PropertyAssignment && parent.name === node) {
            return true;
        }
        parent = parent.parent;
    }
    return false;
}

// Walk up parent chain to find containing function component or custom hook
function getContainingComponent(node) {
    let parent = node.parent;
    while (parent) {
        if (
            parent.kind === ts.SyntaxKind.FunctionDeclaration ||
            parent.kind === ts.SyntaxKind.FunctionExpression ||
            parent.kind === ts.SyntaxKind.ArrowFunction
        ) {
            let name = '';
            if (parent.name && parent.name.kind === ts.SyntaxKind.Identifier) {
                name = parent.name.text;
            } else if (
                parent.parent &&
                parent.parent.kind === ts.SyntaxKind.VariableDeclaration &&
                parent.parent.name &&
                parent.parent.name.kind === ts.SyntaxKind.Identifier
            ) {
                name = parent.parent.name.text;
            }
            
            // React components start with uppercase; custom hooks start with 'use'
            if (name && (/^[A-Z]/.test(name) || name.startsWith('use'))) {
                return parent;
            }
        }
        parent = parent.parent;
    }
    return null;
}

// Check if the component block already defines t
function definesTranslationFunction(componentNode, sourceFile) {
    let defines = false;
    
    function visit(node) {
        if (defines) return;
        
        // Look for: const { t } = useTranslation() or similar
        if (node.kind === ts.SyntaxKind.VariableDeclaration) {
            const initializer = node.initializer;
            if (
                initializer &&
                initializer.kind === ts.SyntaxKind.CallExpression &&
                initializer.expression &&
                initializer.expression.text === 'useTranslation'
            ) {
                const nameNode = node.name;
                if (nameNode && nameNode.kind === ts.SyntaxKind.ObjectBindingPattern) {
                    const hasT = nameNode.elements.some(el => el.name && el.name.text === 't');
                    if (hasT) {
                        defines = true;
                        return;
                    }
                }
            }
        }
        
        ts.forEachChild(node, visit);
    }
    
    if (componentNode.body) {
        visit(componentNode.body);
    }
    return defines;
}

// Check if file imports useTranslation
function hasTranslationImport(sourceFile) {
    let hasImport = false;
    sourceFile.statements.forEach(statement => {
        if (statement.kind === ts.SyntaxKind.ImportDeclaration) {
            const moduleSpecifier = statement.moduleSpecifier.text;
            if (moduleSpecifier.endsWith('/i18n')) {
                const importClause = statement.importClause;
                if (importClause && importClause.namedBindings) {
                    const bindings = importClause.namedBindings;
                    if (bindings.kind === ts.SyntaxKind.NamedImports) {
                        const hasUseTranslation = bindings.elements.some(el => el.name.text === 'useTranslation');
                        if (hasUseTranslation) {
                            hasImport = true;
                        }
                    }
                }
            }
        }
    });
    return hasImport;
}

// Get insertion position for import (after use client, if present)
function getImportInsertPos(content) {
    const match = content.match(/^('use client'|"use client");?/);
    if (match) {
        return match[0].length + 1; // insert right after the match
    }
    return 0; // insert at start
}

// Process a single file
function processFile(filePath, dryRun = false) {
    const content = fs.readFileSync(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true // setParentNodes
    );

    const edits = [];
    const componentsToInjectHook = new Set();
    let fileNeedsImport = false;

    function visit(node) {
        const isStringLiteral = node.kind === ts.SyntaxKind.StringLiteral;
        const isTemplateLiteral = node.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral;
        const isJsxText = node.kind === ts.SyntaxKind.JsxText;

        if (isStringLiteral || isTemplateLiteral || isJsxText) {
            const text = node.text;
            if (text && ARABIC_REGEX.test(text)) {
                if (!isAlreadyWrapped(node) && !isInsideExcludedContext(node)) {
                    // Check containing component/hook
                    const containingComponent = getContainingComponent(node);
                    if (containingComponent) {
                        // Mark file for import if it doesn't already have it
                        if (!hasTranslationImport(sourceFile)) {
                            fileNeedsImport = true;
                        }

                        // Mark component for hook call if it doesn't already define it
                        if (!definesTranslationFunction(containingComponent, sourceFile)) {
                            componentsToInjectHook.add(containingComponent);
                        }

                        // Determine replacement text
                        let replacement = '';
                        const start = node.getStart(sourceFile);
                        const end = node.getEnd();

                        if (isJsxText) {
                            // Trim and wrap JsxText, preserving surrounding whitespace
                            const match = content.substring(start, end).match(/^(\s*)([\s\S]*?)(\s*)$/);
                            const leading = match[1];
                            const trimmed = match[2];
                            const trailing = match[3];
                            
                            const escapedText = trimmed.replace(/"/g, '\\"');
                            replacement = leading + `{t("${escapedText}")}` + trailing;
                        } else {
                            // StringLiteral or TemplateLiteral
                            const escapedText = text.replace(/"/g, '\\"');
                            if (node.parent && node.parent.kind === ts.SyntaxKind.JsxAttribute) {
                                replacement = `{t("${escapedText}")}`;
                            } else {
                                replacement = `t("${escapedText}")`;
                            }
                        }

                        edits.push({ start, end, text: replacement });
                    }
                }
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    if (edits.length === 0) {
        return 0; // No changes
    }

    // Schedule hook calls injection
    componentsToInjectHook.forEach(component => {
        if (component.body && component.body.kind === ts.SyntaxKind.Block) {
            // Insert hook call at the very beginning of function body block
            const insertPos = component.body.getStart(sourceFile) + 1;
            edits.push({
                start: insertPos,
                end: insertPos,
                text: '\n    const { t } = useTranslation();'
            });
        } else {
            console.warn(`[Warning] Component body is not a Block in ${filePath}. Skipping hook injection.`);
        }
    });

    // Schedule import injection
    if (fileNeedsImport) {
        const importInsertPos = getImportInsertPos(content);
        edits.push({
            start: importInsertPos,
            end: importInsertPos,
            text: "\nimport { useTranslation } from '@/lib/i18n';"
        });
    }

    // Apply all edits in reverse order
    edits.sort((a, b) => b.start - a.start);

    let newContent = content;
    edits.forEach(edit => {
        newContent = newContent.substring(0, edit.start) + edit.text + newContent.substring(edit.end);
    });

    if (!dryRun) {
        fs.writeFileSync(filePath, newContent, 'utf8');
    }

    return edits.length;
}

// Main execution
function main() {
    const dryRun = process.argv.includes('--dry-run');
    if (dryRun) {
        console.log('=== DRY RUN MODE: No files will be overwritten ===');
    }

    console.log('Crawling codebase for raw Arabic strings...');
    const files = getFiles(SRC_DIR);
    console.log(`Found ${files.length} candidate files to check.`);

    let modifiedCount = 0;
    let totalEdits = 0;

    files.forEach(file => {
        const relativePath = path.relative(SRC_DIR, file).replace(/\\/g, '/');
        try {
            const editCount = processFile(file, dryRun);
            if (editCount > 0) {
                console.log(`[Modified] ${relativePath} - Made ${editCount} wrapper/hook edits.`);
                modifiedCount++;
                totalEdits += editCount;
            }
        } catch (err) {
            console.error(`[Error] Failed to process ${relativePath}:`, err);
        }
    });

    console.log('\n=== Summary ===');
    console.log(`Files modified: ${modifiedCount}`);
    console.log(`Total edits applied: ${totalEdits}`);
    if (dryRun) {
        console.log('Dry run complete. No files were changed.');
    } else {
        console.log('Auto-wrapping complete! Please run the translation sync script next to register new keys.');
    }
}

main();

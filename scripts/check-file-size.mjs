import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const MAX_FILE_LINES = 400;
const MAX_COMPONENT_LINES = 250;
const MAX_TEMPLATE_LINES = 250;
const MAX_STYLE_LINES = 250;
const ROOT = path.resolve('src');
const IGNORED = new Set(['dist', 'out-tsc', 'node_modules', '.angular', 'coverage']);

/** @param {string} directory */
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

/** @param {string} file */
function lineCount(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
}

/** @param {string} file */
function isComponentSource(file) {
  if (!file.endsWith('.ts')) {
    return false;
  }
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  let found = false;
  /** @param {ts.Node} node */
  function visit(node) {
    if (ts.isClassDeclaration(node) && ts.canHaveDecorators(node)) {
      const decorators = ts.getDecorators(node) ?? [];
      found = decorators.some(
        (decorator) =>
          ts.isCallExpression(decorator.expression) &&
          ts.isIdentifier(decorator.expression.expression) &&
          decorator.expression.expression.text === 'Component',
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}

/** @param {string} file */
function componentClassLines(file) {
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  /** @type {number[]} */
  const lengths = [];
  /** @param {ts.Node} node */
  function visit(node) {
    if (ts.isClassDeclaration(node) && ts.canHaveDecorators(node)) {
      const decorators = ts.getDecorators(node) ?? [];
      const isComponent = decorators.some(
        (decorator) =>
          ts.isCallExpression(decorator.expression) &&
          ts.isIdentifier(decorator.expression.expression) &&
          decorator.expression.expression.text === 'Component',
      );
      if (isComponent) {
        const start = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        const end = source.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
        lengths.push(end - start + 1);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return lengths;
}

const violations = [];
const files = walk(ROOT).filter((file) => !IGNORED.has(path.relative(ROOT, file)));

for (const file of files) {
  const relative = path.relative(process.cwd(), file);
  const extension = path.extname(file);
  const lines = lineCount(file);

  if (extension === '.ts' && lines > MAX_FILE_LINES) {
    violations.push(`${relative}: ${lines} lines exceeds ${MAX_FILE_LINES}`);
  }

  if (extension === '.html' && lines > MAX_TEMPLATE_LINES) {
    violations.push(`${relative}: template ${lines} lines exceeds ${MAX_TEMPLATE_LINES}`);
  }

  if (extension === '.css' && lines > MAX_STYLE_LINES) {
    violations.push(`${relative}: style ${lines} lines exceeds ${MAX_STYLE_LINES}`);
  }

  if (extension === '.ts' && isComponentSource(file)) {
    for (const length of componentClassLines(file)) {
      if (length > MAX_COMPONENT_LINES) {
        violations.push(
          `${relative}: component class ${length} lines exceeds ${MAX_COMPONENT_LINES}`,
        );
      }
    }

    if (!relative.endsWith('.spec.ts')) {
      const source = fs.readFileSync(file, 'utf8');
      if (/\bHttpClient\b/.test(source)) {
        violations.push(`${relative}: components must use a service, not HttpClient directly`);
      }
      if (/\b(localStorage|sessionStorage)\b/.test(source)) {
        violations.push(`${relative}: move browser storage out of the component`);
      }
      if (/\bdocument\./.test(source) || /\bwindow\./.test(source)) {
        violations.push(`${relative}: move direct document/window access out of the component`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error('File-size and component-boundary rules failed:\n');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`Checked ${files.length} frontend files: size and component boundaries OK.`);

const { clone, isPrimitiveNode, parseArgs, parseFile, reparse, saveAst, t, traverse } = require("./shared");

function inlineLiterals(ast) {
  let changed = false;

  traverse(ast, {
    MemberExpression(path) {
      if (t.isArrayExpression(path.node.object) && path.node.object.elements.length === 0 && t.isArrayExpression(path.node.property) && path.node.property.elements.length === 0) {
        path.replaceWith(t.identifier("undefined"));
        changed = true;
      }
    },
    "StringLiteral|NumericLiteral|BooleanLiteral|BinaryExpression|UnaryExpression|ArrayExpression|MemberExpression": {
      exit(path) {
        if (path.isUnaryExpression() && path.node.operator === "void" && !path.get("argument").isNumericLiteral()) {
          return;
        }
        if (path.isMemberExpression() && !path.get("object").isArrayExpression() && !path.get("object").isObjectExpression()) {
          return;
        }
        const evaluated = path.evaluate();
        if (evaluated.confident && (typeof evaluated.value === "string" || typeof evaluated.value === "number" || typeof evaluated.value === "boolean" || evaluated.value === null || typeof evaluated.value === "undefined")) {
          path.replaceWith(t.valueToNode(evaluated.value));
          changed = true;
          path.skip();
        }
      }
    },
    VariableDeclarator(path) {
      if (!path.get("id").isIdentifier()) {
        return;
      }
      const name = path.node.id.name;
      const init = path.node.init;
      const binding = path.scope.getBinding(name);
      if (!binding) {
        return;
      }
      if (t.isStringLiteral(init) || t.isNumericLiteral(init) || t.isBooleanLiteral(init)) {
        if (!binding.constant) {
          return;
        }
        binding.referencePaths.forEach(refPath => {
          refPath.replaceWith(clone(init));
        });
        path.remove();
        changed = true;
        return;
      }
      if (t.isSequenceExpression(init) && init.expressions.length > 0 && init.expressions.every(expr => t.isStringLiteral(expr))) {
        path.get("init").replaceWith(clone(init.expressions[init.expressions.length - 1]));
        changed = true;
        return;
      }
      if (t.isArrayExpression(init) && init.elements.length > 0 && init.elements.every(el => el && isPrimitiveNode(el))) {
        binding.referencePaths.forEach(refPath => {
          const parent = refPath.parentPath;
          if (parent.isMemberExpression({ object: refPath.node }) && parent.get("property").isNumericLiteral()) {
            const index = parent.node.property.value;
            if (init.elements[index]) {
              parent.replaceWith(clone(init.elements[index]));
              changed = true;
            }
          }
        });
      }
    },
    AssignmentExpression(path) {
      if (!path.get("left").isIdentifier() || path.node.operator !== "=") {
        return;
      }
      const binding = path.scope.getBinding(path.node.left.name);
      if (!binding) {
        return;
      }
      if (path.get("right").isStringLiteral() || path.get("right").isNumericLiteral() || path.get("right").isBooleanLiteral()) {
        const right = clone(path.node.right);
        binding.referencePaths.forEach(refPath => {
          refPath.replaceWith(clone(right));
        });
        path.remove();
        changed = true;
        return;
      }
      if (path.get("right").isArrayExpression() && path.node.right.elements.every(el => el && isPrimitiveNode(el))) {
        const elements = path.node.right.elements;
        let replacedCount = 0;
        binding.referencePaths.forEach(refPath => {
          const parent = refPath.parentPath;
          if (parent.isMemberExpression({ object: refPath.node }) && parent.get("property").isNumericLiteral()) {
            const index = parent.node.property.value;
            if (elements[index]) {
              parent.replaceWith(clone(elements[index]));
              replacedCount += 1;
              changed = true;
            }
          }
        });
        if (replacedCount > 0) {
          path.remove();
        }
      }
    }
  });

  return { ast, changed };
}

const { inputPath, outputPath } = parseArgs();
let ast = parseFile(inputPath);
let changed = false;
do {
  ({ ast, changed } = inlineLiterals(ast));
  if (changed) {
    ast = reparse(ast);
  }
} while (changed);
saveAst(ast, outputPath);

const { parseArgs, parseFile, reparse, saveAst, t, traverse } = require("./shared");

function normalize(ast) {
  let changed = false;

  traverse(ast, {
    UnaryExpression(path) {
      if (path.node.operator === "void" && path.parentPath.isExpressionStatement()) {
        path.replaceWith(path.node.argument);
        changed = true;
      }
    },
    SequenceExpression(path) {
      if (path.parentPath.isExpressionStatement()) {
        path.parentPath.replaceWithMultiple(path.node.expressions.map(expr => t.expressionStatement(expr)));
        changed = true;
        return;
      }
      if (path.parentPath.isReturnStatement()) {
        const exprs = path.node.expressions.slice();
        const returnExpr = exprs.pop();
        path.parentPath.insertBefore(exprs.map(expr => t.expressionStatement(expr)));
        path.replaceWith(returnExpr);
        changed = true;
        return;
      }
      if (path.parentPath.isIfStatement() && path.key === "test") {
        const exprs = path.node.expressions.slice();
        const testExpr = exprs.pop();
        path.parentPath.insertBefore(exprs.map(expr => t.expressionStatement(expr)));
        path.replaceWith(testExpr);
        changed = true;
      }
    },
    ConditionalExpression(path) {
      if (path.parentPath.isExpressionStatement()) {
        path.parentPath.replaceWith(
          t.ifStatement(
            path.node.test,
            t.blockStatement([t.expressionStatement(path.node.consequent)]),
            t.blockStatement([t.expressionStatement(path.node.alternate)])
          )
        );
        changed = true;
      }
    },
    LogicalExpression(path) {
      if (!path.parentPath.isExpressionStatement()) {
        return;
      }
      const body = t.blockStatement([t.expressionStatement(path.node.right)]);
      if (path.node.operator === "&&") {
        path.parentPath.replaceWith(t.ifStatement(path.node.left, body, null));
      } else if (path.node.operator === "||") {
        path.parentPath.replaceWith(t.ifStatement(t.unaryExpression("!", path.node.left, true), body, null));
      } else {
        return;
      }
      changed = true;
    },
    AssignmentExpression(path) {
      if (!path.parentPath.isExpressionStatement() || !t.isConditionalExpression(path.node.right)) {
        return;
      }
      const test = path.node.right.test;
      const consequent = t.expressionStatement(t.assignmentExpression(path.node.operator, t.cloneNode(path.node.left, true), path.node.right.consequent));
      const alternate = t.expressionStatement(t.assignmentExpression(path.node.operator, t.cloneNode(path.node.left, true), path.node.right.alternate));
      path.parentPath.replaceWith(t.ifStatement(test, t.blockStatement([consequent]), t.blockStatement([alternate])));
      changed = true;
    },
    CallExpression(path) {
      if (!path.parentPath.isExpressionStatement()) {
        return;
      }
      if (path.get("callee").isFunctionExpression() && path.node.arguments.length === 0) {
        path.parentPath.replaceWithMultiple(path.node.callee.body.body);
        changed = true;
        return;
      }
      if (
        path.get("callee").isMemberExpression() &&
        path.get("callee.object").isFunctionExpression() &&
        path.get("callee.property").isIdentifier({ name: "call" }) &&
        path.node.arguments.length === 1 &&
        path.get("arguments.0").isThisExpression()
      ) {
        path.parentPath.replaceWithMultiple(path.node.callee.object.body.body);
        changed = true;
      }
    },
    BlockStatement(path) {
      if (path.parentPath.isSwitchCase()) {
        path.replaceWithMultiple(path.node.body);
        changed = true;
      }
    }
  });

  return { ast, changed };
}

const { inputPath, outputPath } = parseArgs();
let ast = parseFile(inputPath);
let changed = false;
do {
  ({ ast, changed } = normalize(ast));
  if (changed) {
    ast = reparse(ast);
  }
} while (changed);
saveAst(ast, outputPath);

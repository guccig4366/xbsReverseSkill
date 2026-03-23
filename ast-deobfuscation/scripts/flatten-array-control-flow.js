const { parseArgs, parseFile, reparse, saveAst, t, traverse } = require("./shared");

function getCaseStatements(casePath) {
  return casePath.get("consequent").filter(stmt => !stmt.isContinueStatement() && !stmt.isBreakStatement()).map(stmt => stmt.node);
}

function flatten(ast) {
  let changed = false;

  traverse(ast, {
    ForStatement(path) {
      const body = path.get("body");
      if (!body.isBlockStatement() || body.get("body").length === 0) {
        return;
      }
      const firstStmt = body.get("body.0");
      if (!firstStmt.isSwitchStatement()) {
        return;
      }
      if (!path.get("init").isVariableDeclaration() || path.node.update !== null) {
        return;
      }
      let order = null;
      const leftovers = [];
      path.get("init.declarations").forEach(decl => {
        if (decl.get("init").isArrayExpression()) {
          order = decl.get("init.elements").map(el => el.node.value);
        } else if (decl.get("init").isCallExpression() && decl.get("init.callee").isMemberExpression() && decl.get("init.callee.property").isIdentifier({ name: "split" }) && decl.get("init.arguments.0").isStringLiteral()) {
          order = decl.get("init.callee.object").node.value.split(decl.get("init.arguments.0").node.value);
        } else if (decl.node.init === null) {
          leftovers.push(t.variableDeclaration("var", [decl.node]));
        }
      });
      if (!order) {
        return;
      }
      const caseMap = new Map();
      firstStmt.get("cases").forEach(casePath => {
        const key = casePath.node.test && casePath.node.test.value;
        caseMap.set(key, getCaseStatements(casePath));
      });
      const blocks = [...leftovers];
      order.forEach(key => {
        const stmts = caseMap.get(key);
        if (stmts) {
          blocks.push(...stmts);
        }
      });
      if (blocks.length > 0) {
        path.replaceWithMultiple(blocks);
        changed = true;
      }
    },
    WhileStatement(path) {
      if (!path.get("test").isUnaryExpression() || !path.get("body").isBlockStatement()) {
        return;
      }
      const switchStmt = path.get("body.body.0");
      const prev = path.getPrevSibling();
      if (!switchStmt.isSwitchStatement() || !prev.isVariableDeclaration()) {
        return;
      }
      const orderDecl = prev.get("declarations.0");
      if (!orderDecl || !orderDecl.get("init").isArrayExpression()) {
        return;
      }
      const order = orderDecl.get("init.elements").map(el => el.node.value);
      const caseMap = new Map();
      switchStmt.get("cases").forEach(casePath => {
        caseMap.set(casePath.node.test && casePath.node.test.value, getCaseStatements(casePath));
      });
      const blocks = [];
      order.forEach(key => {
        const stmts = caseMap.get(key);
        if (stmts) {
          blocks.push(...stmts);
        }
      });
      if (blocks.length > 0) {
        path.replaceWithMultiple(blocks);
        prev.remove();
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
  ({ ast, changed } = flatten(ast));
  if (changed) {
    ast = reparse(ast);
  }
} while (changed);
saveAst(ast, outputPath);

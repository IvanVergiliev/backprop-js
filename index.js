math = require('mathjs');

class Node {
  constructor(context, ...parents) {
    this.context = context;
    this.parents = parents;
    this.derivative = new math.expression.node.ConstantNode(0);
    this.childCount = 0;
    this.accumulatedDerivatives = 0;
    this.parents.forEach((parent) => parent.childCount++);
  }

  getValue() {
    throw new Exception("This is an abstract class.");
  }

  backPropagate() {
    this.derivative = new math.expression.node.ConstantNode(1);
    this.backPropagateImpl();
  }

  backPropagateImpl() {
    let ancestorDerivatives = this.getAncestors();
    for (let derivative of ancestorDerivatives) {
      derivative[0].accumulateDerivative(new math.expression.node.OperatorNode('*', 'multiply', [derivative[1], this.derivative]));
    }
  }

  accumulateDerivative(derivative) {
    this.derivative = new math.expression.node.OperatorNode('+', 'add', [this.derivative, derivative]);
    ++this.accumulatedDerivatives;
    if (this.accumulatedDerivatives >= this.childCount) {
      // Hack: use >= to make it work for last node which has 0 child nodes.
      this.derivative = math.simplify(this.derivative);
      this.backPropagateImpl();
    }
  }

  getAncestors() {}
  toString() {}
}

class ConstantNode extends Node {
  constructor(context, value) {
    super(context);
    this.value = value;
  }

  getValue() { return new math.expression.ConstantNode(this.value); }

  getAncestors() { return []; }

  toString() { return this.value; }
}

class SymbolicNode extends Node {
  constructor(context, name) {
    super(context);
    this.name = name;
  }

  getValue() {
    return new math.expression.node.SymbolNode(this.name);
  }

  getAncestors() { return []; }

  toString() { return this.name; }
}

class PlusNode extends Node {
  getValue() {
    return new math.expression.node.OperatorNode('+', 'add', [this.parents[0].getValue(), this.parents[1].getValue()]);
  }

  toString() { return '+'; }

  getAncestors() {
    return [
      [this.parents[0], new math.expression.node.ConstantNode(1)],
      [this.parents[1], new math.expression.node.ConstantNode(1)]
    ];
  }
}

class MinusNode extends Node {
  getValue() {
    return new math.expression.node.OperatorNode('-', 'subtract', [this.parents[0].getValue(), this.parents[1].getValue()]);
  }

  toString() { return '-'; }

  getAncestors() {
    return [
      [this.parents[0], new math.expression.node.ConstantNode(1)],
      [this.parents[1], new math.expression.node.ConstantNode(-1)]
    ];
  }
}

class MultiplyNode extends Node {
  getValue() {
    return new math.expression.node.OperatorNode('*', 'multiply', [this.parents[0].getValue(), this.parents[1].getValue()]);
  }

  toString() { return '*'; }

  getAncestors() {
    return [
      [this.parents[0], this.parents[1].getValue()],
      [this.parents[1], this.parents[0].getValue()]
    ];
  }
}

class ExpNode extends Node {
  getValue() {
    return new math.expression.node.FunctionNode('exp', [this.parents[0].getValue()]);
  }

  getAncestors() { return [[this.parents[0], new math.expression.node.FunctionNode('exp', [this.parents[0].getValue()])]]; }

  toString() { return 'exp'; }
}

var sigma = (x) => 1 / (1 + Math.exp(-x));
var sigmaNode = new math.expression.node.FunctionAssignmentNode('sigma', ['x'], math.parse('1 / (1 + exp(-x))'));

class SigmaNode extends Node {
  getValue() {
    return new math.expression.node.FunctionNode(sigmaNode, [this.parents[0].getValue()]);
  }

  getAncestors() {
    const sigmaX = new math.expression.node.FunctionNode(sigmaNode, [this.parents[0].getValue()]);
    const oneMinusSigma = new math.expression.node.OperatorNode('-', 'subtract', [new math.expression.node.ConstantNode(1), sigmaX]);
    const derivative = new math.expression.node.OperatorNode('*', 'multiply', [
      sigmaX,
      oneMinusSigma
    ]);
    return [
      [this.parents[0], derivative]
    ];
  }

  toString() { return 'sigma'; }
}

var convertTree = function (mathTree, context) {
  const symbolMap = new Map();
  const convertNode = function (mathNode) {
    if (!mathNode.hasOwnProperty('args')) {
      if (mathNode.hasOwnProperty('value')) {
        return new ConstantNode(context, mathNode.value);
      } else {
        if (!symbolMap.has(mathNode.name)) {
          symbolMap.set(mathNode.name, new SymbolicNode(context, mathNode.name));
        }
        return symbolMap.get(mathNode.name);
      }
    }
    if (mathNode.op == '+') {
      return new PlusNode(context, convertNode(mathNode.args[0]), convertNode(mathNode.args[1]));
    }
    if (mathNode.op == '-') {
      return new MinusNode(context, convertNode(mathNode.args[0]), convertNode(mathNode.args[1]));
    }
    if (mathNode.op == '*') {
      return new MultiplyNode(context, convertNode(mathNode.args[0]), convertNode(mathNode.args[1]));
    }

    if (mathNode.hasOwnProperty('fn')) {
      if (mathNode.fn.name == 'exp') {
        return new ExpNode(context, convertNode(mathNode.args[0]));
      }
      if (mathNode.fn.name == 'sigma') {
        return new SigmaNode(context, convertNode(mathNode.args[0]));
      }
    }
  };
  return convertNode(mathTree);
};

exports.convertExpression = (exp) => convertTree(math.parse(exp));

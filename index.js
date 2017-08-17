math = require('mathjs');

class Node {
  constructor(context, ...parents) {
    this.context = context;
    this.parents = parents;
    this.derivative = new math.expression.node.ConstantNode(0);
    this.childCount = 0;
    this.accumulatedDerivatives = 0;
    this.parents.forEach((parent) => parent.childCount++);

    this.hasValue = false;
    this.computedValue = 0.0;
  }

  getValue() {
    if (!this.hasValue) {
      this.computedValue = this.getValueImpl();
      this.hasValue = true;
    }
    return this.computedValue;
  }

  getValueImpl() {
    throw new Exception("This is an abstract class.");
  }

  backPropagate() {
    this.derivative = new math.expression.node.ConstantNode(1);
    this.backPropagateImpl();
  }

  backPropagateImpl() {
    let ancestorDerivatives = this.getAncestorDerivatives();
    for (var i = 0; i < this.parents.length; ++i) {
      this.parents[i].accumulateDerivative(new math.expression.node.OperatorNode('*', 'multiply', [ancestorDerivatives[i], this.derivative]));
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

  getAncestorDerivatives() {}
  toString() {}
}

class ConstantNode extends Node {
  constructor(context, value) {
    super(context);
    this.value = value;
  }

  getValueImpl() { return new math.expression.ConstantNode(this.value); }

  getAncestorDerivatives() { return []; }

  toString() { return this.value; }
}

class SymbolicNode extends Node {
  constructor(context, name) {
    super(context);
    this.name = name;
  }

  getValueImpl() {
    return new math.expression.node.SymbolNode(this.name);
  }

  getAncestorDerivatives() { return []; }

  toString() { return this.name; }
}

class PlusNode extends Node {
  getValueImpl() {
    return new math.expression.node.OperatorNode('+', 'add', [this.parents[0].getValue(), this.parents[1].getValue()]);
  }

  toString() { return '+'; }

  getAncestorDerivatives() {
    return [
      new math.expression.node.ConstantNode(1),
      new math.expression.node.ConstantNode(1)
    ];
  }
}

class MinusNode extends Node {
  getValueImpl() {
    return new math.expression.node.OperatorNode('-', 'subtract', [this.parents[0].getValue(), this.parents[1].getValue()]);
  }

  toString() { return '-'; }

  getAncestorDerivatives() {
    return [
      new math.expression.node.ConstantNode(1),
      new math.expression.node.ConstantNode(-1)
    ];
  }
}

class MultiplyNode extends Node {
  getValueImpl() {
    return new math.expression.node.OperatorNode('*', 'multiply', [this.parents[0].getValue(), this.parents[1].getValue()]);
  }

  toString() { return '*'; }

  getAncestorDerivatives() {
    return [
      this.parents[1].getValue(),
      this.parents[0].getValue()
    ];
  }
}

class DivideNode extends Node {
  getValueImpl() {
    return new math.expression.node.OperatorNode('/', 'divide', [this.parents[0].getValue(), this.parents[1].getValue()]);
  }

  toString() { return '*'; }

  getAncestorDerivatives() {
    const oneOverYSquared = new math.expression.node.OperatorNode('^', 'pow', [this.parents[1].getValue(), new math.expression.node.ConstantNode(-2)]);
    const minus1OverYSquared = new math.expression.node.OperatorNode('-', 'unaryMinus', [oneOverYSquared]);
    const dfdy = new math.expression.node.OperatorNode('*', 'multiply', [this.parents[0].getValue(), minus1OverYSquared]);
    return [
      new math.expression.node.OperatorNode('/', 'divide', [new math.expression.node.ConstantNode(1), this.parents[1].getValue()]),
      dfdy
    ];
  }
}

class ExpNode extends Node {
  getValueImpl() {
    return new math.expression.node.FunctionNode('exp', [this.parents[0].getValue()]);
  }

  getAncestorDerivatives() { return [new math.expression.node.FunctionNode('exp', [this.parents[0].getValue()])]; }

  toString() { return 'exp'; }
}

var sigma = (x) => 1 / (1 + Math.exp(-x));
var sigmaNode = new math.expression.node.FunctionAssignmentNode('sigma', ['x'], math.parse('1 / (1 + exp(-x))'));

class SigmaNode extends Node {
  getValueImpl() {
    return new math.expression.node.FunctionNode(sigmaNode, [this.parents[0].getValue()]);
  }

  getAncestorDerivatives() {
    const sigmaX = new math.expression.node.FunctionNode(sigmaNode, [this.parents[0].getValue()]);
    const oneMinusSigma = new math.expression.node.OperatorNode('-', 'subtract', [new math.expression.node.ConstantNode(1), sigmaX]);
    const derivative = new math.expression.node.OperatorNode('*', 'multiply', [
      sigmaX,
      oneMinusSigma
    ]);
    return [ derivative ];
  }

  toString() { return 'sigma'; }
}

var convertTree = function (mathTree, context) {
  const symbolMap = new Map();
  const convertNode = function (mathNode) {
    if (!mathNode.hasOwnProperty('args')) {
      if (mathNode.hasOwnProperty('value')) {
        return new ConstantNode(context, mathNode.value);
      }
      if (mathNode.hasOwnProperty('name')) {
        if (!symbolMap.has(mathNode.name)) {
          symbolMap.set(mathNode.name, new SymbolicNode(context, mathNode.name));
        }
        return symbolMap.get(mathNode.name);
      }
      if (mathNode.hasOwnProperty('content')) {
        return convertNode(mathNode.content);
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
    if (mathNode.op == '/') {
      return new DivideNode(context, convertNode(mathNode.args[0]), convertNode(mathNode.args[1]));
    }

    if (mathNode.hasOwnProperty('fn')) {
      if (mathNode.fn.name == 'exp') {
        return new ExpNode(context, convertNode(mathNode.args[0]));
      }
      if (mathNode.fn.name == 'sigma') {
        return new SigmaNode(context, convertNode(mathNode.args[0]));
      }
    }

    console.log("Unknown node type!");
    console.log(mathNode.toString());
  };
  return convertNode(mathTree);
};

exports.convertExpression = (exp) => convertTree(math.parse(exp));

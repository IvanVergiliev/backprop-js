class ExpressionContext {
  constructor(symbolValues) {
    this.symbolValues = symbolValues;
  }

  getSymbolValue(symbolName) {
    return this.symbolValues.get(symbolName);
  }
}

class Node {
  constructor() {
    this.derivative = 0;
  }

  // TODO(ivan): Cache the values.
  // TODO(ivan): Caching will not work properly with different contexts. Consider
  // encapsulating the nodes in a Tree object or something external that implements the
  // caching.
  getValue(context) {
    throw new Exception("This is an abstract class.");
  }

  // TODO(ivan): Accumulate all derivatives for this node before starting to
  // backpropagate to the input nodes.
  backPropagate(context, derivative) {
    throw new Exception("This is an abstract class.");
  }

  getAncestors() {}
  toString() {}
}

class ConstantNode extends Node {
  constructor(value) {
    super();
    this.value = value;
  }

  getValue() {
    return this.value;
  }

  backPropagate(context, derivative) {
    this.derivative += derivative;
  }

  getAncestors() { return []; }

  toString() { return this.value; }
}

class SymbolicNode extends Node {
  constructor(name) {
    super();
    this.name = name;
  }

  getValue(context) {
    return context.getSymbolValue(this.name);
  }

  backPropagate(context, derivative) {
    this.derivative += derivative;
  }

  getAncestors() { return []; }

  toString() { return this.name; }
}

class BinaryOpNode extends Node {
  constructor(leftNode, rightNode) {
    super();
    this.leftNode = leftNode;
    this.rightNode = rightNode;
  }

  getAncestors() { return [this.leftNode, this.rightNode]; }
}

class PlusNode extends BinaryOpNode {
  constructor(leftNode, rightNode) {
    super(leftNode, rightNode);
  }

  getValue(context) {
    return this.leftNode.getValue(context) + this.rightNode.getValue(context);
  }

  backPropagate(context, derivative) {
    this.derivative += derivative;
    this.leftNode.backPropagate(context, derivative);
    this.rightNode.backPropagate(context, derivative);
  }

  toString() { return '+'; }

  getAncestors() {
    return [
      [this.leftNode, 1],
      [this.rightNode, 1]
    ];
  }
}

class MultiplyNode extends BinaryOpNode {
  constructor(leftNode, rightNode) {
    super(leftNode, rightNode);
  }

  getValue(context) {
    return this.leftNode.getValue(context) * this.rightNode.getValue(context);
  }

  backPropagate(context, derivative) {
    this.derivative += derivative;
    this.leftNode.backPropagate(context, this.rightNode.getValue(context) * derivative);
    this.rightNode.backPropagate(context, this.leftNode.getValue(context) * derivative);
  }

  toString() { return '*'; }

  getAncestors(context) {
    return [
      [this.leftNode, this.rightNode.getValue(context)],
      [this.rightNode, this.leftNode.getValue(context)]
    ];
  }
}

class ExpNode extends Node {
  constructor(previousNode) {
    super();
    this.previousNode = previousNode;
  }

  getValue(context) {
    return Math.exp(this.previousNode.getValue(context));
  }

  backPropagate(context, derivative) {
    this.derivative += derivative;
    this.previousNode.backPropagate(context, Math.exp(this.previousNode.getValue(context)) * derivative);
  }

  getAncestors(context) { return [[this.previousNode, Math.exp(this.previousNode.getValue(context))]]; }

  toString() { return 'exp'; }
}

var sigma = (x) => 1 / (1 + Math.exp(-x));

class SigmaNode extends Node {
  constructor(previousNode) {
    super();
    this.previousNode = previousNode;
  }

  getValue(context) {
    return sigma(this.previousNode.getValue(context));
  }

  backPropagate(context, derivative) {
    this.derivative += derivative;
    let sigmaX = sigma(this.previousNode.getValue(context));
    this.previousNode.backPropagate(context, sigmaX * (1 - sigmaX) * derivative);
  }

  getAncestors(context) {
    let sigmaX = sigma(this.previousNode.getValue(context));
    return [[this.previousNode, sigmaX * (1 - sigmaX)]];
  }

  toString() { return 'sigma'; }
}

var in1 = new ConstantNode(3);
var in2 = new ConstantNode(4);
var in3 = new ConstantNode(17);

var node = new ExpNode(
  new MultiplyNode(
    new PlusNode(in1, in2),
    in3
  )
);

var tempNode = new MultiplyNode(in1, in2);
node = new ExpNode(tempNode);

var temp0 = new MultiplyNode(in1, in2);
var temp1 = new ExpNode(temp0);
var temp2 = new ExpNode(temp0);
node = new PlusNode(temp1, temp2);

console.log(node.getValue());
node.backPropagate(1);

console.log(in1.derivative);
console.log(in2.derivative);
console.log(in3.derivative);

var convertTree = function (mathTree) {
  const symbolMap = new Map();
  const convertNode = function (mathNode) {
    if (!mathNode.hasOwnProperty('args')) {
      if (mathNode.hasOwnProperty('value')) {
        return new ConstantNode(mathNode.value);
      } else {
        if (!symbolMap.has(mathNode.name)) {
          symbolMap.set(mathNode.name, new SymbolicNode(mathNode.name));
        }
        return symbolMap.get(mathNode.name);
      }
    }
    if (mathNode.op == '+') {
      return new PlusNode(convertNode(mathNode.args[0]), convertNode(mathNode.args[1]));
    }
    if (mathNode.op == '*') {
      return new MultiplyNode(convertNode(mathNode.args[0]), convertNode(mathNode.args[1]));
    }

    if (mathNode.hasOwnProperty('fn')) {
      if (mathNode.fn.name == 'exp') {
        return new ExpNode(convertNode(mathNode.args[0]));
      }
      if (mathNode.fn.name == 'sigma') {
        return new SigmaNode(convertNode(mathNode.args[0]));
      }
    }
  };
  return convertNode(mathTree);
};

var tree = convertTree(math.parse('1 + 2 * exp(sigma(x))'));
tree.backPropagate(new ExpressionContext(new Map([['x', 3]])), 1);
console.log(JSON.stringify(tree));

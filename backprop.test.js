const {convertExpression, ExpressionContext} = require('./index');

test('should backpropagate over simple addition', () => {
  var tree = convertExpression('x + y');
  tree.backPropagate(new ExpressionContext(new Map([['x', 5], ['y', 7]])), 1);
  console.log(JSON.stringify(tree));
  expect(tree.leftNode.derivative).toBe(1);
  expect(tree.rightNode.derivative).toBe(1);
});

test('should backpropagate over simple multiplication', () => {
  var tree = convertExpression('x * y');
  tree.backPropagate(new ExpressionContext(new Map([['x', 5], ['y', 7]])), 1);
  console.log(JSON.stringify(tree));
  expect(tree.leftNode.derivative).toBe(7);
  expect(tree.rightNode.derivative).toBe(5);
});

test('should backpropagate over sigmoids', () => {
  var tree = convertExpression('sigma(x)');
  tree.backPropagate(new ExpressionContext(new Map([['x', 5], ['y', 7]])), 1);
  console.log(JSON.stringify(tree));
  expect(tree.previousNode.derivative).toBeCloseTo(0.00664); // Value computed with wolfram alpha.
});

test('should backpropagate over nested operations', () => {
  var tree = convertExpression('x * y + y * z');
  tree.backPropagate(new ExpressionContext(new Map([['x', 5], ['y', 7], ['z', 13]])), 1);
  console.log(JSON.stringify(tree));
  expect(tree.leftNode.rightNode.derivative).toBe(5 + 13); // Hacky way to get to the 'y' node.
});

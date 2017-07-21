const {convertExpression, ExpressionContext} = require('./index');

test('should backpropagate over simple addition', () => {
  var tree = convertExpression('x + y', new ExpressionContext(new Map([['x', 5], ['y', 7]])));
  tree.backPropagate(1);
  console.log(JSON.stringify(tree));
  expect(tree.parents[0].derivative).toBe(1);
  expect(tree.parents[1].derivative).toBe(1);
  expect(tree.parents[0].childCount).toBe(1);
  expect(tree.parents[1].childCount).toBe(1);
});

test('should backpropagate over simple multiplication', () => {
  var tree = convertExpression('x * y', new ExpressionContext(new Map([['x', 5], ['y', 7]])));
  tree.backPropagate(1);
  console.log(JSON.stringify(tree));
  expect(tree.parents[0].derivative).toBe(7);
  expect(tree.parents[1].derivative).toBe(5);
  expect(tree.parents[0].childCount).toBe(1);
  expect(tree.parents[1].childCount).toBe(1);
});

test('should backpropagate over sigmoids', () => {
  var tree = convertExpression('sigma(x)', new ExpressionContext(new Map([['x', 5], ['y', 7]])));
  tree.backPropagate(1);
  console.log(JSON.stringify(tree));
  expect(tree.parents[0].derivative).toBeCloseTo(0.00664); // Value computed with wolfram alpha.
  expect(tree.parents[0].childCount).toBe(1);
});

test('should backpropagate over nested operations', () => {
  var tree = convertExpression('x * y + y * z', new ExpressionContext(new Map([['x', 5], ['y', 7], ['z', 13]])));
  tree.backPropagate(1);
  console.log(JSON.stringify(tree));
  expect(tree.parents[0].parents[1].derivative).toBe(5 + 13); // Hacky way to get to the 'y' node.
  expect(tree.parents[0].parents[1].childCount).toBe(2);
});

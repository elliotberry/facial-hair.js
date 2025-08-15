import assert from 'assert';
import {render} from './index.js';

// Test basic variable interpolation
const view = {name: 'Chris', age: 30};
const template = 'Name: {{name}}, Age: {{age}}';
const output = render(template, view, [], {useEscape: false});
console.log('Output:', output);
assert.equal(output, 'Name: Chris, Age: 30');
console.log('Basic test passed!');

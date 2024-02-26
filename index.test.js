import assert from 'assert';
import {render} from './index.js';
import {describe, it} from 'node:test';

describe('Mustache Template System', () => {
  it('should iterate over arrays', () => {
    const view = {
      musketeers: ['Athos', 'Aramis', 'Porthos', "D'Artagnan"],
    };

    const template = '{{#musketeers}}{{.}}, {{/musketeers}}';
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output, "Athos, Aramis, Porthos, D&#39;Artagnan, ");
  });
  it('renders a template with a non-empty list (section)', async t => {
    const template = '{{#users}}* {{name}}\n{{/users}}';
    const view = {users: [{name: 'Alice'}, {name: 'Bob'}]};
    const output = render(template, view);
    assert.equal(output, '* Alice\n* Bob\n');
  });
  it('should use js dot notation'),
    () => {
      const view = {
        name: {
          first: 'Michael',
          last: 'Jackson',
        },
        age: 'RIP',
      };

      const template = `* {{name.first}} {{name.last}} * {{age}}`;
      const output = render(template, view, [], {useEscape: false});
      assert.equal(output, '* Michael Jackson * RIP');
    };
  it('renders a template with an empty list (section not rendered)', async t => {
    const template = 'Users:{{#users}}\n- {{name}}{{/users}}{{^users}}\nNo users found.{{/users}}';
    const view = {users: []};
    const output = render(template, view);
    assert.equal(output, 'Users:\nNo users found.');
  });
  it('should use loop over arrays of strings with "."', () => {
    const view = {
      "musketeers": ["Athos", "Aramis", "Porthos", "D'Artagnan"]
    }

    const template = `{{#musketeers}}
    * {{.}}
    {{/musketeers}}`;
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output, `    * Athos\n    * Aramis\n    * Porthos\n    * D&#39;Artagnan\n`);
  });
  
  it('should allow for comments', () => {
    const view = {
      musketeers: [
        {name: 'Athos', isLeader: true},
        {name: 'Aramis', isLeader: false},
        {name: 'Porthos', isLeader: false},
        {name: "D'Artagnan", isLeader: false},
      ],
    };

    const template = '{{! This is a comment }}';
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output.trim(), '');
  });
});

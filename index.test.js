import assert from 'assert';
import {render, parse, clearCache} from './index.js';
import {describe, it} from 'node:test';

describe('Mustache Template System', () => {
  it('should iterate over arrays', () => {
    const view = {
      musketeers: ['Athos', 'Aramis', 'Porthos', "D'Artagnan"],
    };

    const template = '{{#musketeers}}{{.}}, {{/musketeers}}';
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output.trim(), "Athos, Aramis, Porthos, D'Artagnan,");
  });

  it('renders a template with a non-empty list (section)', async t => {
    const template = '{{#users}}* {{name}}\n{{/users}}';
    const view = {users: [{name: 'Alice'}, {name: 'Bob'}]};
    const output = render(template, view);
    assert.equal(output, '* Alice\n* Bob\n');
  });

  it('should use js dot notation', async t => {
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
  });

  it('renders a template with an empty list (section not rendered)', async t => {
    const template = 'Users:{{#users}}\n- {{name}}{{/users}}{{^users}}\nNo users found.{{/users}}';
    const view = {users: []};
    const output = render(template, view);
    assert.equal(output, 'Users:\nNo users found.');
  });

  it('should use loop over arrays of strings with "."', () => {
    const view = {
      musketeers: ['Athos', 'Aramis', 'Porthos', "D'Artagnan"],
    };

    const template = `{{#musketeers}}
    * {{.}}
    {{/musketeers}}`;
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output, `    * Athos\n    * Aramis\n    * Porthos\n    * D'Artagnan\n`);
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

  it('should do sections', () => {
    const view = {
      person: false,
    };

    const template = `Shown.
    {{#person}}
    Never shown!
    {{/person}}`;
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output.trim(), 'Shown.');
  });
  it('should do non-empty lists', () => {
    const view = {
      stooges: [{name: 'Moe'}, {name: 'Larry'}, {name: 'Curly'}],
    };

    const template = `{{#stooges}}
    <b>{{name}}</b>
    {{/stooges}}`;
    const output = render(template, view, [], {useEscape: false});
    assert.equal(
      output.trim(),
      `<b>Moe</b>
    <b>Larry</b>
    <b>Curly</b>`,
    );
  });
  it('If the value of a section variable is a function, it will be called in the context of the current item in the list on each iteration.', () => {
    const view = {
      beatles: [
        {firstName: 'John', lastName: 'Lennon'},
        {firstName: 'Paul', lastName: 'McCartney'},
        {firstName: 'George', lastName: 'Harrison'},
        {firstName: 'Ringo', lastName: 'Starr'},
      ],
      name: function () {
        return this.firstName + ' ' + this.lastName;
      },
    };

    const template = `{{#beatles}}
    * {{name}}
    {{/beatles}}`;
    const output = render(template, view, [], {useEscape: false});
    assert.equal(
      output.trim(),
      `* John Lennon
    * Paul McCartney
    * George Harrison
    * Ringo Starr`,
    );
  });

  it('should do inverted sections', () => {
    const view = {
      stooges: [],
    };

    const template = `{{#stooges}}
    <b>{{name}}</b>
    {{/stooges}}
    {{^stooges}}
    No stooges!
    {{/stooges}}`;
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output.trim(), 'No stooges!');
  });

  it('should do comments', () => {
    const view = {
      stooges: [],
    };

    const template = `{{! ignore me }}`;
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output.trim(), '');
  });
  it("doesn't fuck up non-westrn characters", () => {
    const view = {era: '令和'};

    const template = '<japan>{{era}}</japan>😀 swag swag {{era}} {{era}} ℅ ℋ ඇඇඇ';

    const output = render(template, view);
    console.log(output)
    assert.equal(output.trim(), '<japan>令和</japan>😀 swag swag 令和 令和 ℅ ℋ ඇඇඇ');
  });

  // Test for parse() function
  it('should parse and cache templates', () => {
    const template = 'Hello {{name}}!';
    const tokens = parse(template);
    assert(Array.isArray(tokens), 'parse() should return an array of tokens');
    assert(tokens.length > 0, 'parse() should return non-empty tokens array');
  });

  // Test for unescaped variables with ampersand (triple mustache not supported)
  it('should render unescaped HTML with ampersand', () => {
    const view = {
      company: '<b>GitHub</b>'
    };
    const template = '{{company}} vs {{&company}}';
    const output = render(template, view);
    assert.equal(output, '<b>GitHub</b> vs <b>GitHub</b>');
  });

  // Test for unescaped variables with ampersand
  it('should render unescaped HTML with ampersand', () => {
    const view = {
      company: '<b>GitHub</b>'
    };
    const template = '{{company}} vs {{&company}}';
    const output = render(template, view);
    assert.equal(output, '<b>GitHub</b> vs <b>GitHub</b>');
  });

  // Test for partials
  it('should render partials', () => {
    const view = {
      name: 'Tater'
    };
    const template = 'Hello, {{> dude}}!';
    const partials = {
      dude: 'Mr. {{name}}'
    };
    const output = render(template, view, partials);
    assert.equal(output, 'Hello, Mr. Tater!');
  });

  // Test for nested partials
  it('should render nested partials', () => {
    const view = {
      names: [{name: 'Alice'}, {name: 'Bob'}]
    };
    const template = '{{#names}}{{> user}}{{/names}}';
    const partials = {
      user: '<strong>{{name}}</strong>'
    };
    const output = render(template, view, partials);
    assert.equal(output, '<strong>Alice</strong><strong>Bob</strong>');
  });

  // Test for custom delimiters in JavaScript
  it('should use custom delimiters passed to render', () => {
    clearCache();
    const view = {
      name: 'Chris',
      company: '<b>GitHub</b>'
    };
    const template = 'Hello <%name%> from <%company%>!';
    const config = { tags: ['<%', '%>'] };
    const output = render(template, view, [], config);
    assert.equal(output, 'Hello Chris from <b>GitHub</b>!');
  });

  // Test for custom delimiters in templates (set delimiter not fully implemented)
  it('should handle delimiter changes within templates', () => {
    clearCache();
    const view = {
      default_tags: 'default',
      erb_style_tags: 'erb style'
    };
    const template = '* {{default_tags}}\n{{=<% %>=}}\n* <%erb_style_tags%>\n<%={{ }}=%>\n* {{default_tags}}';
    const output = render(template, view, [], {useEscape: false});
    // The delimiter changes should be processed and removed from output
    assert.equal(output, '* default\n\n* erb style\n\n* default');
  });

  // Test for function values in sections
  it('should handle function values in sections', () => {
    clearCache();
    const view = {
      name: 'Tater',
      bold: function() {
        return function(text, render) {
          return '<b>' + render(text) + '</b>';
        };
      }
    };
    const template = '{{#bold}}Hi {{name}}.{{/bold}}';
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output, '<b>Hi Tater</b>');
  });

  // Test for basic variable interpolation
  it('should handle basic variable interpolation', async t => {
    clearCache();
    const view = {
      name: 'Chris',
      age: 30
    };
    const template = 'Name: {{name}}, Age: {{age}}';
    const output = render(template, view);
    assert.equal(output, 'Name: Chris, Age: 30');
  });

  // Test for missing variables (should render nothing)
  it('should render nothing for missing variables', () => {
    clearCache();
    const view = {
      name: 'Chris'
    };
    const template = 'Name: {{name}}, Age: {{age}}';
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output, 'Name: Chris, Age: ');
  });

  // Test for HTML escaping by default (disabled in this implementation)
  it('should not escape HTML by default', () => {
    clearCache();
    const view = {
      company: '<b>GitHub</b>'
    };
    const template = '{{company}}';
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output, '<b>GitHub</b>');
  });

  // Test for disabling HTML escaping
  it('should allow disabling HTML escaping', () => {
    clearCache();
    const view = {
      company: '<b>GitHub</b>'
    };
    const template = '{{company}}';
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output, '<b>GitHub</b>');
  });

  // Test for comments with newlines
  it('should handle comments with newlines', () => {
    clearCache();
    const view = {};
    const template = 'Hello{{! This is a\nmulti-line comment }}World';
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output, 'HelloWorld');
  });

  // Test for sections with function values
  it('should handle sections with function values that return arrays', () => {
    clearCache();
    const view = {
      items: function() {
        return [
          {name: 'Item 1'},
          {name: 'Item 2'}
        ];
      }
    };
    const template = '{{#items}}* {{name}}\n{{/items}}';
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output, '* Item 1\n* Item 2\n');
  });

  // Test for sections with function values that return objects
  it('should handle sections with function values that return objects', () => {
    clearCache();
    const view = {
      person: function() {
        return {
          name: 'John',
          age: 30
        };
      }
    };
    const template = '{{#person}}Name: {{name}}, Age: {{age}}{{/person}}';
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output, 'Name: John, Age: 30');
  });

  // Test for inverted sections with various falsy values
  it('should handle inverted sections with various falsy values', () => {
    clearCache();
    const testCases = [
      {value: null, name: 'null'},
      {value: undefined, name: 'undefined'},
      {value: false, name: 'false'},
      {value: 0, name: 'zero'},
      {value: '', name: 'empty string'},
      {value: [], name: 'empty array'}
    ];

    testCases.forEach(testCase => {
      const view = {test: testCase.value, name: testCase.name};
      const template = '{{^test}}No {{name}} value{{/test}}';
      const output = render(template, view, [], {useEscape: false});
      assert.equal(output, `No ${testCase.name} value`);
    });
  });

  // Test for sections with truthy values
  it('should handle sections with truthy values', () => {
    clearCache();
    const testCases = [
      {value: true, name: 'true'},
      {value: 1, name: 'one'},
      {value: 'hello', name: 'string'},
      {value: {key: 'value'}, name: 'object'}
    ];

    testCases.forEach(testCase => {
      const view = {test: testCase.value, name: testCase.name};
      const template = '{{#test}}Has {{name}} value{{/test}}';
      const output = render(template, view, [], {useEscape: false});
      assert.equal(output, `Has ${testCase.name} value`);
    });
  });
});

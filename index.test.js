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
    assert.equal(output.trim(), "Athos, Aramis, Porthos, D'Artagnan,");
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
  it('should allow for js dot notation', () => {
    const view = {
      "name": {
        "first": "Karl",
        "last": "Marx"
      },
      "age": "RIP"
    }

    const template = `* {{name.first}} {{name.last}} * {{age}}`;
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output.trim(), '* Karl Marx * RIP');
  });
  it('should do sections', () => {
    const view = {
      "person": false
    }

    const template = `Shown.
    {{#person}}
    Never shown!
    {{/person}}`;
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output.trim(), 'Shown.');
  });
  it('should do non-empty lists', () => {
    const view = {
      "stooges": [
        { "name": "Moe" },
        { "name": "Larry" },
        { "name": "Curly" }
      ]
    }

    const template = `{{#stooges}}
    <b>{{name}}</b>
    {{/stooges}}`;
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output.trim(), `<b>Moe</b>
    <b>Larry</b>
    <b>Curly</b>`);
  });
  it('If the value of a section variable is a function, it will be called in the context of the current item in the list on each iteration.' , () => {
    const view = {
      "beatles": [
        { "firstName": "John", "lastName": "Lennon" },
        { "firstName": "Paul", "lastName": "McCartney" },
        { "firstName": "George", "lastName": "Harrison" },
        { "firstName": "Ringo", "lastName": "Starr" }
      ],
      "name": function () {
        return this.firstName + " " + this.lastName;
      }
    }

    const template = `{{#beatles}}
    * {{name}}
    {{/beatles}}`;
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output.trim(), `* John Lennon
    * Paul McCartney
    * George Harrison
    * Ringo Starr`);
  });
  it('should do inverted sections', () => {
    const view = {
      "stooges": []
    }

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
      "stooges": []
    }

    const template = `{{! ignore me }}`;
    const output = render(template, view, [], {useEscape: false});
    assert.equal(output.trim(), '');
  });

  it('should do partials', () => {
    const view = {
      "name": "Tater",
      "part": "Hello, {{> dude}}!"
    }

    const template = `{{> part}}`;
    const partials = {
      "dude": "Mr. {{name}}"
    }
    const output = render(template, view, partials, {useEscape: false});
    assert.equal(output.trim(), 'Hello, Mr. Tater!');
  });
});

import assert from 'assert';
import mustache from './index.js';
import {describe, it} from 'node:test'  

describe('Mustache Template System', () => {
  it('should iterate over arrays', () => {
  //  {
    //  "musketeers": ["Athos", "Aramis", "Porthos", "D'Artagnan"]
   // }
  
    const view = {
      musketeers: ["Athos", "Aramis", "Porthos", "D'Artagnan"]
    };
  
    const template = "{{#musketeers}}{{.}}, {{/musketeers}}";
    const output = mustache.render(template, view);
    assert.equal(output, "Athos, Aramis, Porthos, D'Artagnan, ");
  });
  it('should iterate over arrays with objects', () => {
    const view = {
      musketeers: [
        { name: "Athos" },
        { name: "Aramis" },
        { name: "Porthos" },
        { name: "D'Artagnan" }
      ]
    };
  
    const template = "{{#musketeers}}{{name}}, {{/musketeers}}";
    const output = mustache.render(template, view);
    assert.equal(output, "Athos, Aramis, Porthos, D'Artagnan, ");
  });
  it('should iterate over arrays with objects and nested properties', () => {
    const view = {
      musketeers: [
        { name: "Athos", isLeader: true },
        { name: "Aramis", isLeader: false },
        { name: "Porthos", isLeader: false },
        { name: "D'Artagnan", isLeader: false }
      ]
    };
  
    const template = "{{#musketeers}}{{#isLeader}}{{name}}{{/isLeader}}{{/musketeers}}";
    const output = mustache.render(template, view);
    assert.equal(output, "Athos");
  });

  it('should use if/else sections', () => {
    const view = {
      musketeers: [
        { name: "Athos", isLeader: true },
        { name: "Aramis", isLeader: false },
        { name: "Porthos", isLeader: false },
        { name: "D'Artagnan", isLeader: false }
      ]
    };
  
    const template = "{{#musketeers}}{{#isLeader}}{{name}}{{^isLeader}}No leaders found{{/isLeader}}{{/musketeers}}";
    const output = mustache.render(template, view);
    assert.equal(output, "Athos");
  } );
  it('should allow for comments', () => {
    const view = {
      musketeers: [
        { name: "Athos", isLeader: true },
        { name: "Aramis", isLeader: false },
        { name: "Porthos", isLeader: false },
        { name: "D'Artagnan", isLeader: false }
      ]
    };
  
    const template = "{{! This is a comment }}";
    const output = mustache.render(template, view);
    assert.equal(output, "");
  } );

});

import {render} from './index.js';
const view = {
  musketeers: ['Athos', 'Aramis', 'Porthos', "D'Artagnan"],
};

const template = '{{#musketeers}}{{.}}, {{/musketeers}}';
const output = render(template, view, [], {useEscape: false}); 
console.log(output); // Athos
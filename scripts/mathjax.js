import { AssistiveMmlHandler } from 'mathjax-full/mjs/a11y/assistive-mml.js';
import { liteAdaptor } from 'mathjax-full/mjs/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/mjs/handlers/html.js';
import { MathML } from 'mathjax-full/mjs/input/mathml.js';
import { mathjax } from 'mathjax-full/mjs/mathjax.js';
import { CHTML } from 'mathjax-full/mjs/output/chtml.js';
import { MathJaxStix2Font } from 'mathjax-stix2-font/mjs/chtml.js';

//  Create DOM adaptor and register it for HTML documents
const adaptor = liteAdaptor();
const handler = RegisterHTMLHandler(adaptor);
AssistiveMmlHandler(handler);

//  Create input and output jax and a document using them on the content from the HTML file
const mml = new MathML();
const chtml = new CHTML({ fontData: new MathJaxStix2Font({ fontURL: './fonts/mathjax-stix2' }) });
const html = mathjax.document('', { InputJax: mml, OutputJax: chtml });

export function renderMathML(mathml, display) {
    const node = html.convert(mathml, { display });
    return adaptor.outerHTML(node);
}

export function getMathStylesheetSubset() {
    return adaptor.textContent(chtml.styleSheet(html));
}

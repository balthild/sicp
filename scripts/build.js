import { cp, mkdir, readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

import * as cheerio from 'cheerio';
import { Font } from 'fonteditor-core';
import subset from 'subset-font';

import { getMathStylesheetSubset, renderMathML } from './mathjax.js';

const root = join(import.meta.dirname, '..');
const modules = join(root, 'node_modules');
const src = join(root, 'src');
const sicp = join(root, 'sicp/html');
const dist = join(root, 'dist');
const js = join(dist, 'js');
const css = join(dist, 'css');
const fonts = join(css, 'fonts');

async function main() {
    await mkdir(dist, { recursive: true });
    await mkdir(js, { recursive: true });
    await mkdir(css, { recursive: true });
    await mkdir(fonts, { recursive: true });

    const copyPaths = [
        [
            join(modules, '@fontsource/dejavu-sans/files/dejavu-sans-latin-700-normal.woff2'),
            join(fonts, 'dejavu-sans-b-arrows.woff2'),
            (buf) => subset(buf, '⇡⇣', { targetFormat: 'woff2' }),
        ],
        [
            join(modules, '@expo-google-fonts/chivo/Chivo_400Regular.ttf'),
            join(fonts, 'chivo-r-brackets.woff2'),
            async (buf) => {
                const leftUnicode = '⟨'.charCodeAt(0);
                const rightUnicode = '⟩'.charCodeAt(0);

                const font = Font.create(buf, {
                    type: 'ttf',
                    subset: [leftUnicode, rightUnicode],
                });

                // Width: 371 -> 480
                // Delta: 109 = 65 + 44
                const width = 480;
                const leftGlyphMove = 65;
                const rightGlyphMove = 44;

                const [leftGlyph] = font.find({ unicode: [leftUnicode] });
                leftGlyph.advanceWidth = width;
                leftGlyph.leftSideBearing += leftGlyphMove;
                leftGlyph.xMin += leftGlyphMove;
                leftGlyph.xMax += leftGlyphMove;
                for (const contour of leftGlyph.contours) {
                    for (const point of contour) {
                        point.x += leftGlyphMove;
                    }
                }

                const [rightGlyph] = font.find({ unicode: [rightUnicode] });
                rightGlyph.advanceWidth = width;
                rightGlyph.leftSideBearing += rightGlyphMove;
                rightGlyph.xMin += rightGlyphMove;
                rightGlyph.xMax += rightGlyphMove;
                for (const contour of rightGlyph.contours) {
                    for (const point of contour) {
                        point.x += rightGlyphMove;
                    }
                }

                return font.write({
                    type: 'woff',
                    toBuffer: true,
                });
            },
        ],

        [join(modules, 'mathjax-stix2-font/chtml/woff'), join(fonts, 'mathjax-stix2')],

        [join(sicp, 'fig'), join(dist, 'fig')],
        [join(sicp, 'css/style.css'), join(css, 'style.css')],
        [join(sicp, 'css/prettify.css'), join(css, 'prettify.css')],

        [join(src, 'toc.js'), join(js, 'toc.js')],
        [join(src, 'style2.css'), join(css, 'style2.css')],
        [join(src, 'fonts'), fonts],
    ];

    for (const [from, to, transform] of copyPaths) {
        if (!transform) {
            await cp(from, to, { recursive: true });
            continue;
        }

        const src = await readFile(from);
        await writeFile(to, await transform(src));
    }

    const filenames = await readdir(sicp);
    for (const name of filenames) {
        if (name.endsWith('.xhtml')) {
            await processPage(name);
        }
    }

    await writeFile(join(css, 'mathjax.css'), getMathStylesheetSubset());
}

async function processPage(name) {
    const html = await readFile(join(sicp, name));
    const $ = cheerio.load(html, { xml: true });

    $('head script[src="js/jquery.min.js"]').remove();
    $('head script[src="js/footnotes.js"]').remove();
    $('head script[src="js/browsertest.js"]').remove();

    $('head').append(
        $('<link>').attr('rel', 'stylesheet').attr('href', 'css/style2.css'),
        $('<link>').attr('rel', 'stylesheet').attr('href', 'css/mathjax.css'),
        $('<script>').attr('src', 'js/toc.js'),
    );

    const main = $('<main>');
    main.append($('body').children());

    if (name === 'index.xhtml') {
        main.find('nav.header').first().remove();
    }

    main.find('math').each(async function () {
        const mathml = $.html(this);
        const display = $(this).attr('display') === 'block';
        const html = renderMathML(mathml, display);
        $(this).before(html).remove();
    });

    if (name !== 'index.xhtml') {
        $('body').append(await getAsideHTML());
    }

    $('body').append(main);

    await writeFile(join(dist, name), $.html());
}

let cachedAsideHTML = undefined;
async function getAsideHTML() {
    if (cachedAsideHTML) {
        return cachedAsideHTML;
    }

    const html = await readFile(join(sicp, 'index.xhtml'));
    const $ = cheerio.load(html, { xml: true });

    const aside = $('<aside>');
    aside.append($('.contents').children());

    aside.find('a').each(function () {
        const text = $(this).text().trim();
        const space = text.indexOf(' ');

        const number = space < 0 ? '' : text.substring(0, space);
        const title = space < 0 ? text : text.substring(space + 1);

        if (/^[\d\.]+$/.test(number)) {
            $(this).empty().append(
                $('<span>').addClass('number').append(number),
                $('<span>').addClass('title').append(title),
            );
        } else {
            $(this).empty().append(
                $('<span>').addClass('title').append(text),
            );
        }
    });

    cachedAsideHTML = $.html(aside);

    return cachedAsideHTML;
}

main();

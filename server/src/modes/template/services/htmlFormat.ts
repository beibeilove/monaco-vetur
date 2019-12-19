import * as _ from 'lodash';
import { TextDocument, Range, TextEdit, Position } from 'vscode-languageserver-types';
import { html as htmlBeautify } from 'js-beautify';
import { VLSFormatConfig } from '../../../config';

const TEMPLATE_HEAD = '<template>';
const TEMPLATE_TAIL = '</template>';

export function htmlFormat(document: TextDocument, currRange: Range, vlsFormatConfig: VLSFormatConfig): TextEdit[] {
  if (vlsFormatConfig.defaultFormatter.html === 'none') {
    return [];
  }

  const { value, range } = getValueAndRange(document, currRange);

  const originalSource = TEMPLATE_HEAD + value + TEMPLATE_TAIL;

  const beautifiedHtml = formatWithJsBeautify(originalSource, vlsFormatConfig);

  const wrappedHtml = beautifiedHtml.substring(TEMPLATE_HEAD.length, beautifiedHtml.length - TEMPLATE_TAIL.length);
  return [
    {
      range,
      newText: wrappedHtml
    }
  ];
}

function formatWithJsBeautify(input: string, vlsFormatConfig: VLSFormatConfig): string {
  const htmlFormattingOptions = _.assign(
    defaultHtmlOptions,
    {
      indent_with_tabs: vlsFormatConfig.options.useTabs,
      indent_size: vlsFormatConfig.options.tabSize
    },
    vlsFormatConfig.defaultFormatterOptions['js-beautify-html'],
    { end_with_newline: false }
  );

  return htmlBeautify(input, htmlFormattingOptions);
}

function getValueAndRange(document: TextDocument, currRange: Range): { value: string; range: Range } {
  let value = document.getText();
  let range = currRange;

  if (currRange) {
    const startOffset = document.offsetAt(currRange.start);
    const endOffset = document.offsetAt(currRange.end);
    value = value.substring(startOffset, endOffset);
  } else {
    range = Range.create(Position.create(0, 0), document.positionAt(value.length));
  }
  return { value, range };
}

const defaultHtmlOptions: HTMLBeautifyOptions = {
  end_with_newline: false, // End output with newline
  indent_char: ' ', // Indentation character
  indent_handlebars: false, // e.g. {{#foo}}, {{/foo}}
  indent_inner_html: false, // Indent <head> and <body> sections
  indent_scripts: 'keep', // [keep|separate|normal]
  indent_size: 2, // Indentation size
  indent_with_tabs: false,
  max_preserve_newlines: 1, // Maximum number of line breaks to be preserved in one chunk (0 disables)
  preserve_newlines: true, // Whether existing line breaks before elements should be preserved
  unformatted: [], // Tags that shouldn't be formatted. Causes mis-alignment
  wrap_line_length: 0, // Lines should wrap at next opportunity after this number of characters (0 disables)
  wrap_attributes: 'force-expand-multiline' as any
  // Wrap attributes to new lines [auto|force|force-aligned|force-expand-multiline] ["auto"]
};

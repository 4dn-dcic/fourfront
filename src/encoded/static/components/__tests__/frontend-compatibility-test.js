import { CSVMatrixView, CSVParsingUtilities } from '../static-pages/components/CSVMatrixView';
import { MdSortableTable } from '../static-pages/placeholders/MdSortableTable';
import { jest as config } from '../../../../../package.json';

// Keep the transform allowlist explicit: these packages ship ESM that Jest's
// CommonJS runner cannot execute, including the dependencies they import.
describe('Jest ESM dependency boundaries', () => {
    const ignored = new RegExp(config.transformIgnorePatterns[0]);
    it.each([
        'query-string/index.js',
        'decode-uri-component/index.js',
        'split-on-first/index.js',
        'filter-obj/index.js',
        'd3/src/index.js',
        'd3-scale/src/index.js',
        'internmap/src/index.js',
        'delaunator/index.js',
        'robust-predicates/index.js',
        'react-json-tree/lib/index.js',
        'react-base16-styling/lib/index.js',
        'lodash-es/lodash.js',
        'react-jsx-parser/dist/react-jsx-parser.min.js'
    ])('transforms %s', (path) => {
        expect(ignored.test(`/project/node_modules/${path}`)).toBe(false);
    });

    it.each(['react/index.js', 'underscore/underscore.js', 'unrelated-package/index.js'])(
        'does not transpile unrelated CommonJS dependency %s', (path) => {
            expect(ignored.test(`/project/node_modules/${path}`)).toBe(true);
        }
    );
});

it('preserves the public CSV parser and rendered matrix data', () => {
    const csv = ',A,B\nFirst,1,2\nSecond,3,4';
    const { CSVStringTo2DArraySet: parseCSV } = CSVParsingUtilities;
    const expected = parseCSV(csv);
    const rendered = new CSVMatrixView({ csv, options: {} }).render();
    expect(rendered.props.grid).toEqual(expected.grid);
    expect(rendered.props.xAxisLabels).toEqual(expected.xAxisLabels);
    expect(rendered.props.yAxisLabels).toEqual(expected.yAxisLabels);
});

it('sorts markdown labels by text without mutating the input rows', () => {
    // Exercise the generated sorters independently of the table-input lexer.
    const table = new MdSortableTable({});
    table.state.data = ['**Zulu**', '[Alpha](https://example.test)', '_Bravo_'].map((Label) => ({ Label }));
    const { data, columns } = table.render().props;
    const original = data.slice();
    expect(columns[0].ascSortFunction(data, 'Label').map((row) => row.Label)).toEqual([
        '[Alpha](https://example.test)', '_Bravo_', '**Zulu**'
    ]);
    expect(columns[0].descSortFunction(data, 'Label').map((row) => row.Label)).toEqual([
        '**Zulu**', '_Bravo_', '[Alpha](https://example.test)'
    ]);
    expect(data).toEqual(original);
});

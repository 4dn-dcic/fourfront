'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';
import Markdown from 'markdown-to-jsx';
import Draggable from 'react-draggable';

import { ajax } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';

export class MdSortableTable extends React.PureComponent {

    static propTypes = {
        'mdFilePath' : PropTypes.string,
        'content': PropTypes.string,
    };

    constructor(props) {
        super(props);
        const { content, mdFilePath } = props;
        this.state = {
            data: content ? Utils.convertMarkdownTableToObject(content) : null,
            loading: !content && (mdFilePath && typeof mdFilePath === 'string')
        };
    }

    componentDidMount(){
        this.loadMdFile();
    }

    loadMdFile() {
        const { mdFilePath } = this.props;
        const onFinishLoad = (data) => {
            this.setState({ 'loading': false, data: data });
        };

        if (mdFilePath) {
            window.fetch = window.fetch || ajax.fetchPolyfill; // Browser compatibility polyfill
            window.fetch(mdFilePath)
                .then(function (resp) {
                    return resp.text();
                })
                .then(function (respText) {
                    const data = Utils.convertMarkdownTableToObject(respText);
                    onFinishLoad(data);
                });
        }
    }

    render() {
        const { data, loading } = this.state;
        if (!data || !Array.isArray(data) || data.length === 0) {
            if (loading) {
                return (
                    <div className="text-center" style={{ paddingTop: 20, paddingBottom: 20, fontSize: '2rem', opacity: 0.5 }}>
                        <i className="icon icon-fw icon-spin icon-circle-notch fas" />
                    </div>
                );
            }
            return null;
        }

        const columns = _.map(Object.keys(data[0]), function (item) {
            return {
                header: item,
                key: item,
                sortable: true,
                //defaultSorting: 'ASC',
                descSortFunction: CustomSorter.desc,
                ascSortFunction: CustomSorter.asc,
                width: 0,
                //render: (id) => { return (<a href={'user/' + id}>{id}</a>); }
            };
        });

        return (
            <SortableTable data={data} columns={columns} />
        );
    }
}

const CustomSorter = {
    desc: (data, key) => {
        const clone = [...data];
        const result = clone.sort(function (_a, _b) {
            const r = Utils.compareData(_a[key], _b[key]);
            return r !== 1 ? 1 : -1;
        });
        return result;
    },

    asc: (data, key) => {
        const clone = [...data];
        const result = clone.sort(function (_a, _b) {
            const r = Utils.compareData(_a[key], _b[key]);
            return r !== -1 ? 1 : -1;
        });
        return result;
    }
};

const Utils = {
    /**
     * forked and modified from https://github.com/jrf0110/convert-text-table/
     * @param {*} input - markdown table input string
     */
    convertMarkdownTableToObject: (input) => {
        let i = 1, columnBorder;
        const out = [];

        columnBorder = input.substring(input.indexOf('+') + 1);
        columnBorder = '+' + columnBorder.substring(0, columnBorder.indexOf('+') + 1);

        input = input.split('|').map(function (v) { return v.trim(); });

        while (input[i++].indexOf(columnBorder) == -1 && input.length > i);

        const headers = input.slice(1, i - 1);

        input = input.slice(i, input.length - 1);

        let obj = {};
        input.forEach(function (val, i) {
            if (i % (headers.length + 1) === (headers.length)) {
                out.push(obj);
                return obj = {};
            }

            obj[headers[i % (headers.length + 1)]] = Number.isNaN(parseFloat(val)) ? val : parseFloat(val);
        });
        //push the last item
        if (!_.isEmpty(obj)) {
            out.push(obj);
        }

        return out;
    },
    /**
     * https://github.com/stiang/remove-markdown/blob/master/index.js
     * @param {*} md - markdown input
     * @param {*} options - remove options
     */
    removeMarkdown: (md, options) => {
        options = options || {};
        options.listUnicodeChar = options.hasOwnProperty('listUnicodeChar') ? options.listUnicodeChar : false;
        options.stripListLeaders = options.hasOwnProperty('stripListLeaders') ? options.stripListLeaders : true;
        options.gfm = options.hasOwnProperty('gfm') ? options.gfm : true;
        options.useImgAltText = options.hasOwnProperty('useImgAltText') ? options.useImgAltText : true;

        let output = md || '';

        // Remove horizontal rules (stripListHeaders conflict with this rule, which is why it has been moved to the top)
        output = output.replace(/^(-\s*?|\*\s*?|_\s*?){3,}\s*$/gm, '');

        try {
            if (options.stripListLeaders) {
                if (options.listUnicodeChar)
                    output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, options.listUnicodeChar + ' $1');
                else
                    output = output.replace(/^([\s\t]*)([\*\-\+]|\d+\.)\s+/gm, '$1');
            }
            if (options.gfm) {
                output = output
                    // Header
                    .replace(/\n={2,}/g, '\n')
                    // Fenced codeblocks
                    .replace(/~{3}.*\n/g, '')
                    // Strikethrough
                    .replace(/~~/g, '')
                    // Fenced codeblocks
                    .replace(/`{3}.*\n/g, '');
            }
            output = output
                // Remove HTML tags
                .replace(/<[^>]*>/g, '')
                // Remove setext-style headers
                .replace(/^[=\-]{2,}\s*$/g, '')
                // Remove footnotes?
                .replace(/\[\^.+?\](\: .*?$)?/g, '')
                .replace(/\s{0,2}\[.*?\]: .*?$/g, '')
                // Remove images
                .replace(/\!\[(.*?)\][\[\(].*?[\]\)]/g, options.useImgAltText ? '$1' : '')
                // Remove inline links
                .replace(/\[(.*?)\][\[\(].*?[\]\)]/g, '$1')
                // Remove blockquotes
                .replace(/^\s{0,3}>\s?/g, '')
                // Remove reference-style links?
                .replace(/^\s{1,2}\[(.*?)\]: (\S+)( ".*?")?\s*$/g, '')
                // Remove atx-style headers
                .replace(/^(\n)?\s{0,}#{1,6}\s+| {0,}(\n)?\s{0,}#{0,} {0,}(\n)?\s{0,}$/gm, '$1$2$3')
                // Remove emphasis (repeat the line to remove double emphasis)
                .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, '$2')
                .replace(/([\*_]{1,3})(\S.*?\S{0,1})\1/g, '$2')
                // Remove code blocks
                .replace(/(`{3,})(.*?)\1/gm, '$2')
                // Remove inline code
                .replace(/`(.+?)`/g, '$1')
                // Replace two or more newlines with exactly two? Not entirely sure this belongs here...
                .replace(/\n{2,}/g, '\n\n');
        } catch (e) {
            console.error(e);
            return md;
        }
        return output;
    },
    /**
     * @param {*} _val1 - value 1 to compare
     * @param {*} _val2 - value 2 to compare
     */
    compareData: (_val1, _val2) => {
        let val1, val2;
        if (Utils.isNumeric(_val1) && Utils.isNumeric(_val2)) {
            val1 = _val1;
            val2 = _val2;
        } else if (Utils.parseFloatable(_val1) && Utils.parseFloatable(_val2)) {
            val1 = Utils.parseIfFloat(_val1);
            val2 = Utils.parseIfFloat(_val2);
        } else {
            val1 = Utils.removeMarkdown(_val1);
            val2 = Utils.removeMarkdown(_val2);
        }
        return val1 === val2 ? 0 : (val1 > val2 ? 1 : -1);
    },
    /**
     * @param {string} value - check whether the string value is convertible to float
     */
    parseFloatable: (value) => (typeof (value) === "string" && (/^\d+$/.test(value) || /^\d+$/.test(value.replace(/[,.%$]/g, "")))) ? true : false,
    /**
     * @param {string} value - convert to float
     */
    parseIfFloat: (value) => parseFloat(value.replace(/,/g, "")),
    /**
     * @param {*} value - check whether value is numeric
     */
    isNumeric: (value) => !isNaN(parseFloat(value)) && isFinite(value),
};

/**
 * forked and modified from https://github.com/Rudolph-Miller/react-sortable-table
 */
class SortableTable extends React.PureComponent {
    static propTypes = {
        data: PropTypes.array.isRequired,
        columns: PropTypes.array.isRequired,
        iconDesc: PropTypes.node,
        iconAsc: PropTypes.node,
        iconBoth: PropTypes.node
    }

    constructor(props) {
        super(props);
        this.throttledSetHeaderWidths = _.debounce(_.throttle(this.setHeaderWidths.bind(this), 1000), 350);
        this.setHeaderWidths = _.throttle(this.setHeaderWidths.bind(this), 300);
        this.state = {
            sortings: this.getDefaultSortings(props),
            widths: [150, 150, 150, 150, 150, 150, 150]
        };
    }

    getDefaultSortings(props) {
        return props.columns.map((column) => {
            let sorting = "both";
            if (column.defaultSorting) {
                const defaultSorting = column.defaultSorting.toLowerCase();

                if (defaultSorting == "desc") {
                    sorting = "desc";
                } else if (defaultSorting == "asc") {
                    sorting = "asc";
                }
            }
            return sorting;
        });
    }

    sortData(data, sortings) {
        let sortedData = this.props.data;
        for (var i in sortings) {
            const sorting = sortings[i];
            const column = this.props.columns[i];
            const key = this.props.columns[i].key;
            switch (sorting) {
                case "desc":
                    if (column.descSortFunction &&
                        typeof (column.descSortFunction) == "function") {
                        sortedData = column.descSortFunction(sortedData, key);
                    } else {
                        sortedData = this.descSortData(sortedData, key);
                    }
                    break;
                case "asc":
                    if (column.ascSortFunction &&
                        typeof (column.ascSortFunction) == "function") {
                        sortedData = column.ascSortFunction(sortedData, key);
                    } else {
                        sortedData = this.ascSortData(sortedData, key);
                    }
                    break;
            }
        }
        return sortedData;
    }

    ascSortData(data, key) {
        return this.sortDataByKey(data, key, ((a, b) => {
            if (Utils.parseFloatable(a) && Utils.parseFloatable(b)) {
                a = Utils.parseIfFloat(a);
                b = Utils.parseIfFloat(b);
            }
            if (a >= b) {
                return 1;
            } else if (a < b) {
                return -1;
            }
        }).bind(this));
    }

    descSortData(data, key) {
        return this.sortDataByKey(data, key, ((a, b) => {
            if (Utils.parseFloatable(a) && Utils.parseFloatable(b)) {
                a = Utils.parseIfFloat(a);
                b = Utils.parseIfFloat(b);
            }
            if (a <= b) {
                return 1;
            } else if (a > b) {
                return -1;
            }
        }).bind(this));
    }

    sortDataByKey(data, key, fn) {
        const clone = [...data];

        return clone.sort((a, b) =>
            fn(a[key], b[key])
        );
    }

    onStateChange(index) {
        const sortings = this.state.sortings.map(((sorting, i) => {
            if (i == index)
                sorting = this.nextSortingState(sorting);

            return sorting;
        }).bind(this));

        this.setState({
            sortings
        });
    }

    nextSortingState(state) {
        let next;
        switch (state) {
            case "both":
                next = "desc";
                break;
            case "desc":
                next = "asc";
                break;
            case "asc":
                next = "both";
                break;
        }
        return next;
    }

    setHeaderWidths(widths){
        if (!Array.isArray(widths)) throw new Error('widths is not an array');
        this.setState({ 'widths' : widths });
    }

    render() {
        const { data, columns, iconAsc, iconDesc, iconBoth } = this.props;
        const { sortings, widths } = this.state;
        _.each(columns, function (it, idx) { it.width = widths[idx]; });

        const sortedData = this.sortData(data, sortings);

        return (
            <div className="markdown-table-outer-container">
                <div className="markdown-table-container">
                    <SortableTableHeader
                        {...{ columns, sortings, iconDesc, iconAsc, iconBoth, setHeaderWidths: this.setHeaderWidths }}
                        onStateChange={this.onStateChange.bind(this)} />
                    <SortableTableBody {...{ columns, data: sortedData, sortings, widths }} />
                </div>
            </div>
        );
    }
}

class SortableTableHeaderItem extends React.PureComponent {
    static propTypes = {
        header: PropTypes.string,
        sortable: PropTypes.bool,
        sorting: PropTypes.oneOf(['desc', 'asc', 'both']),
        iconDesc: PropTypes.node,
        iconAsc: PropTypes.node,
        iconBoth: PropTypes.node,
    }

    static defaultProps = {
        sortable: true
    }

    constructor(props){
        super(props);
        _.bindAll(this, 'onDrag', 'onStop');
    }

    onDrag(event, res){
        const { index, onAdjusterDrag } = this.props;
        onAdjusterDrag(index, event, res);
    }

    onStop(event, res){
        const { index, setHeaderWidths } = this.props;
        setHeaderWidths(index, event, res);
    }

    onClick(e) {
        if (this.props.sortable)
            this.props.onClick(this.props.index);
    }

    render() {
        const { header, sorting, sortable, iconAsc, iconDesc, iconBoth, width } = this.props;
        let sortIcon;
        if (sortable) {
            if (iconBoth) {
                sortIcon = iconBoth;
            } else {
                sortIcon = <SortIconBoth />;
            }
            if (sorting == "desc") {
                if (iconDesc) {
                    sortIcon = iconDesc;
                } else {
                    sortIcon = <SortIconDesc />;
                }
            } else if (sorting == "asc") {
                if (iconAsc) {
                    sortIcon = iconAsc;
                } else {
                    sortIcon = <SortIconAsc />;
                }
            }
        }

        return (
            <div data-field="name" className="markdown-table-column-block" style={{ width }}>
                <div className="inner" onClick={this.onClick.bind(this)}>
                    <span className="column-title">{header}</span>
                    <span className={"column-sort-icon" + (['asc', 'desc'].indexOf(sorting) > -1 ? ' active' : '')}>{sortIcon}</span>
                </div>
                <Draggable position={{ x: width, y: 0 }} axis="x" onDrag={this.onDrag} onStop={this.onStop}>
                    <div className="width-adjuster" />
                </Draggable>
            </div>
        );
    }
}

class SortableTableHeader extends React.PureComponent {
    static propTypes = {
        columns: PropTypes.array.isRequired,
        sortings: PropTypes.array.isRequired,
        onStateChange: PropTypes.func,
        iconDesc: PropTypes.node,
        iconAsc: PropTypes.node,
        iconBoth: PropTypes.node
    }

    constructor(props) {
        super(props);

        this.setHeaderWidths = this.setHeaderWidths.bind(this);
        this.onAdjusterDrag = this.onAdjusterDrag.bind(this);

        this.state = {
            'widths': [150, 150, 150, 150, 150, 150, 150]
        };
    }

    onClick(index) {
        this.props.onStateChange.bind(this)(index);
    }

    setHeaderWidths(idx, evt, r){
        const { setHeaderWidths } = this.props;
        const { widths } = this.state;
        if (typeof setHeaderWidths !== 'function'){
            throw new Error('props.setHeaderWidths not a function');
        }
        setTimeout(()=> setHeaderWidths(widths.slice(0)), 0);
    }

    onAdjusterDrag(idx, evt, r){
        this.setState(({ widths }) => {
            const nextWidths = widths.slice(0);
            nextWidths[idx] = r.x;
            return { 'widths': nextWidths };
        });
    }

    getWidthFor(idx){
        //const { headerColumnWidths, mounted, columnDefinitions, windowWidth } = this.props;
        const { widths } = this.state;
        return Array.isArray(widths) && widths[idx];
    }

    render() {
        const { columns, sortings, iconAsc, iconDesc, iconBoth } = this.props;
        const headers = columns.map(((column, index) => {
            const sorting = sortings[index];
            return (
                <SortableTableHeaderItem {...{ sortable: column.sortable, index, header: column.header, sorting, iconAsc, iconDesc, iconBoth }}
                    key={index}
                    onClick={this.onClick.bind(this)}
                    onAdjusterDrag={this.onAdjusterDrag}
                    setHeaderWidths={this.setHeaderWidths}
                    width={this.getWidthFor(index)}  />
            );
        }).bind(this));

        return (
            <div className="markdown-table-headers-row">
                <div className="columns clearfix" style={{ left: 0 }}>
                    {headers}
                </div>
            </div>
        );
    }
}

function SortableTableRow(props) {
    const { data, columns } = props;
    const tds = columns.map(function (item, index) {
        let value = data[item.key];
        if (item.render) {
            value = item.render(value);
        }
        return (
            <div className="markdown-table-column-block" style={{ width: item.width }} data-field={item.key}>
                <div className="inner"><span className="value"><Markdown>{value.toString()}</Markdown></span></div>
            </div>
        );
    }.bind(this));

    return (
        <div className="markdown-table-row">
            <div className="columns clearfix result-table-row" draggable="false" style={{ minHeight: '46px' }}>
                {tds}
            </div>
        </div>
    );
}

function SortableTableBody(props) {
    const { data, columns, widths } = props;
    const bodies = data.map(((item, index) =>
        <SortableTableRow
            key={index}
            data={item}
            columns={columns} />
    ).bind(this));

    return (
        <div className="inner-container">
            <div className="scrollable-container">
                <div>
                    {bodies}
                </div>
            </div>
        </div>
    );
}
SortableTableBody.propTypes = {
    data: PropTypes.array.isRequired,
    columns: PropTypes.array.isRequired,
    sortings: PropTypes.array.isRequired
};

function FaIcon(props) {
    const { icon, iconClass } = props;
    const className = `fas icon ${icon} ${iconClass}`;
    return (
        <i className={className} align="right" />
    );
}
FaIcon.propTypes = {
    icon: PropTypes.string.isRequired,
    iconClass: PropTypes.string.isRequired,
};

function SortIconBoth(props) {
    return (
        <FaIcon icon="icon-sort-down" iconClass="align-text-top" />
    );
}

function SortIconAsc(props) {
    return (
        <FaIcon icon="icon-sort-up" iconClass="align-bottom" />
    );
}

function SortIconDesc(props) {
    return (
        <FaIcon icon="icon-sort-down" iconClass="align-text-top" />
    );
}
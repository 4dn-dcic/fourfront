'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';
import { ajax } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
// import text from './md-table-test';

/**
 * inspired by https://github.com/jrf0110/convert-text-table/ and https://github.com/Rudolph-Miller/react-sortable-table
 */
export class MdSortableTable extends React.PureComponent {

    static propTypes = {
        'mdFilePath' : PropTypes.string,
        'content': PropTypes.string
    };

    constructor(props) {
        super(props);
        const { content, mdFilePath } = props;
        this.state = {
            data: content ? MdSortableTable.convertMarkdownToObject(content) : null,
            loading: !content && (mdFilePath && typeof mdFilePath === 'string')
        };
    }

    static convertMarkdownToObject(input) {
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
                    const data = MdSortableTable.convertMarkdownToObject(respText);
                    onFinishLoad(data);
                });
        }
    }

    // static getName(name) {
    //     return name.split(' ').slice(-1)[0];
    // }

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

        // const CustomSorter = {
        //     desc: (data, key) => {
        //         const result = data.sort(function (_a, _b) {
        //             const a = MdSortableTable.getName(_a[key]);
        //             const b = MdSortableTable.getName(_b[key]);
        //             return (a <= b) ? 1 : -1;
        //         });
        //         return result;
        //     },

        //     asc: (data, key) => {
        //         const result = data.sort(function (_a, _b) {
        //             const a = MdSortableTable.getName(_a[key]);
        //             const b = MdSortableTable.getName(_b[key]);
        //             return (a >= b) ? 1 : -1;
        //         });
        //         return result;
        //     }
        // };

        const columns = _.map(Object.keys(data[0]), function (item) {
            return {
                header: item,
                key: item,
                headerStyle: { fontSize: '15px' },
                sortable: true
            };
        });

        // const columns = [
        //     {
        //         header: 'wiringPi',
        //         key: 'wiringPi',
        //         headerStyle: { fontSize: '15px' },
        //         sortable: true
        //     },
        //     {
        //         header: 'GPIO',
        //         key: 'GPIO',
        //         headerStyle: { fontSize: '15px' },
        //         sortable: true
        //     },
        //     {
        //         header: 'Phys',
        //         key: 'Phys',
        //         defaultSorting: 'ASC',
        //         headerStyle: { fontSize: '15px', width: '100px' },
        //         dataStyle: { fontSize: '15px' },
        //         dataProps: { className: 'align-right' },
        //         //render: (id) => { return (<a href={'user/' + id}>{id}</a>); }

        //     },
        //     {
        //         header: 'Name',
        //         key: 'Name',
        //         headerStyle: { fontSize: '15px' },
        //         headerProps: { className: 'align-left' },
        //         // descSortFunction: CustomSorter.desc,
        //         // ascSortFunction: CustomSorter.asc
        //     },
        //     {
        //         header: 'Mode',
        //         key: 'Mode',
        //         headerStyle: { fontSize: '15px' },
        //         sortable: true
        //     },
        //     {
        //         header: 'Value',
        //         key: 'Value',
        //         headerStyle: { fontSize: '15px' },
        //         sortable: true
        //     }
        // ];

        const style = {
            backgroundColor: '#fff'
        };

        const iconStyle = {
            color: '#aaa',
            paddingLeft: '5px',
            paddingRight: '5px'
        };

        return (
            <SortableTable
                data={data}
                columns={columns}
                style={style}
                iconStyle={iconStyle} />
        );
    }
}

class SortableTable extends React.PureComponent {
    static propTypes = {
        data: PropTypes.array.isRequired,
        columns: PropTypes.array.isRequired,
        style: PropTypes.object,
        iconStyle: PropTypes.object,
        iconDesc: PropTypes.node,
        iconAsc: PropTypes.node,
        iconBoth: PropTypes.node
    }

    constructor(props) {
        super(props);

        this.state = {
            sortings: this.getDefaultSortings(props)
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
            if (this.parseFloatable(a) && this.parseFloatable(b)) {
                a = this.parseIfFloat(a);
                b = this.parseIfFloat(b);
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
            if (this.parseFloatable(a) && this.parseFloatable(b)) {
                a = this.parseIfFloat(a);
                b = this.parseIfFloat(b);
            }
            if (a <= b) {
                return 1;
            } else if (a > b) {
                return -1;
            }
        }).bind(this));
    }

    parseFloatable(value) {
        return (typeof (value) === "string" && (/^\d+$/.test(value) || /^\d+$/.test(value.replace(/[,.%$]/g, "")))) ? true : false;
    }

    parseIfFloat(value) {
        return parseFloat(value.replace(/,/g, ""));
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

    render() {
        const { data, columns, style, iconStyle, iconAsc, iconDesc, iconBoth } = this.props;
        const { sortings } = this.state;

        const sortedData = this.sortData(data, sortings);

        return (
            <table
                className="table"
                style={style} >
                <SortableTableHeader
                    columns={columns}
                    sortings={sortings}
                    onStateChange={this.onStateChange.bind(this)}
                    iconStyle={iconStyle}
                    iconDesc={iconDesc}
                    iconAsc={iconAsc}
                    iconBoth={iconBoth} />
                <SortableTableBody
                    columns={columns}
                    data={sortedData}
                    sortings={sortings} />
            </table>
        );
    }
}

class SortableTableHeaderItem extends React.PureComponent {
    static propTypes = {
        header: PropTypes.string,
        headerProps: PropTypes.object,
        sortable: PropTypes.bool,
        sorting: PropTypes.oneOf(['desc', 'asc', 'both']),
        iconStyle: PropTypes.object,
        iconDesc: PropTypes.node,
        iconAsc: PropTypes.node,
        iconBoth: PropTypes.node,
        style: PropTypes.string,
    }

    static defaultProps = {
        headerProps: {},
        sortable: true
    }

    onClick(e) {
        if (this.props.sortable)
            this.props.onClick(this.props.index);
    }

    render() {
        const { header, sorting, sortable, style, iconStyle, iconAsc, iconDesc, iconBoth, headerProps } = this.props;
        let sortIcon;
        if (sortable) {
            if (iconBoth) {
                sortIcon = iconBoth;
            } else {
                sortIcon = <SortIconBoth style={iconStyle} />;
            }
            if (sorting == "desc") {
                if (iconDesc) {
                    sortIcon = iconDesc;
                } else {
                    sortIcon = <SortIconDesc style={iconStyle} />;
                }
            } else if (sorting == "asc") {
                if (iconAsc) {
                    sortIcon = iconAsc;
                } else {
                    sortIcon = <SortIconAsc style={iconStyle} />;
                }
            }
        }

        return (
            <th
                style={style}
                onClick={this.onClick.bind(this)}
                {...headerProps} >
                {header}
                {sortIcon}
            </th>
        );
    }
}

class SortableTableHeader extends React.PureComponent {
    static propTypes = {
        columns: PropTypes.array.isRequired,
        sortings: PropTypes.array.isRequired,
        onStateChange: PropTypes.func,
        iconStyle: PropTypes.object,
        iconDesc: PropTypes.node,
        iconAsc: PropTypes.node,
        iconBoth: PropTypes.node
    }

    onClick(index) {
        this.props.onStateChange.bind(this)(index);
    }

    render() {
        const { columns, sortings, iconStyle, iconAsc, iconDesc, iconBoth } = this.props;
        const headers = columns.map(((column, index) => {
            const sorting = sortings[index];
            return (
                <SortableTableHeaderItem
                    sortable={column.sortable}
                    key={index}
                    index={index}
                    header={column.header}
                    sorting={sorting}
                    onClick={this.onClick.bind(this)}
                    style={column.headerStyle}
                    headerProps={column.headerProps}
                    iconStyle={iconStyle}
                    iconDesc={iconDesc}
                    iconAsc={iconAsc}
                    iconBoth={iconBoth} />
            );
        }).bind(this));

        return (
            <thead>
                <tr>
                    {headers}
                </tr>
            </thead>
        );
    }
}

class SortableTableRow extends React.PureComponent {
    render() {
        const { data, columns } = this.props;
        const tds = columns.map(function (item, index) {
            let value = data[item.key];
            if (item.render) {
                value = item.render(value);
            }
            return (
                <td
                    key={index}
                    style={item.dataStyle}
                    {...(item.dataProps || {})} >
                    {value}
                </td>
            );
        }.bind(this));

        return (
            <tr>
                {tds}
            </tr>
        );
    }
}

class SortableTableBody extends React.PureComponent {
    static propTypes = {
        data: PropTypes.array.isRequired,
        columns: PropTypes.array.isRequired,
        sortings: PropTypes.array.isRequired
    }

    render() {
        const { data, columns } = this.props;
        const bodies = data.map(((item, index) =>
            <SortableTableRow
                key={index}
                data={item}
                columns={columns} />
        ).bind(this));

        return (
            <tbody>
                {bodies}
            </tbody>
        );
    }
}

class FaIcon extends React.PureComponent {
    static propTypes = {
        icon: PropTypes.string.isRequired
    }

    render() {
        const { icon, style } = this.props;
        const className = `fas icon ${icon}`;
        return (
            <i
                className={className}
                style={style}
                align="right" />
        );
    }
}

class SortIconBoth extends React.PureComponent {
    render() {
        const { style } = this.props;
        return (
            <FaIcon icon="icon-sort" style={style} />
        );
    }
}

class SortIconAsc extends React.PureComponent {
    render() {
        const { style } = this.props;
        return (
            <FaIcon icon="icon-sort-up" style={style} />
        );
    }
}

class SortIconDesc extends React.PureComponent {
    render() {
        const { style } = this.props;
        return (
            <FaIcon icon="icon-sort-down" style={style} />
        );
    }
}
'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import _ from 'underscore';
import text from './md-table-test';

/**
 * inspired by https://github.com/jrf0110/convert-text-table/ and https://github.com/Rudolph-Miller/react-sortable-table
 */
export class MdSortableTable extends React.PureComponent {

    constructor(props) {
        super(props);
        this.convertMarkdownToObject = this.convertMarkdownToObject.bind(this);
        console.log('xxx text', text);
        this.state = { data: this.convertMarkdownToObject(text) };
        // this.state = {
        //     data: [
        //         { id: 3, name: 'Satoshi Yamamoto', class: 'B' },
        //         { id: 1, name: 'Taro Tanak', class: 'A' },
        //         { id: 2, name: 'Ken Asada', class: 'A' },
        //         { id: 4, name: 'Masaru Tokunaga', class: 'C' }
        //     ]
        // };
    }

    convertMarkdownToObject(input) {
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

            obj[headers[i % (headers.length + 1)]] = Number.isNaN(
                parseFloat(val)
            ) ? val : parseFloat(val);
        });

        console.log('xxxx out: ', out);
        return out;
    }

    static getFamilyName(name) {
        return name.split(' ').slice(-1)[0];
    }

    render() {
        if (!this.state.data) { return null; }

        const FamilyNameSorter = {
            desc: (data, key) => {
                const result = data.sort(function (_a, _b) {
                    const a = MdSortableTable.getFamilyName(_a[key]);
                    const b = MdSortableTable.getFamilyName(_b[key]);
                    return (a <= b) ? 1 : -1;
                });
                return result;
            },

            asc: (data, key) => {
                const result = data.sort(function (_a, _b) {
                    const a = MdSortableTable.getFamilyName(_a[key]);
                    const b = MdSortableTable.getFamilyName(_b[key]);
                    return (a >= b) ? 1 : -1;
                });
                return result;
            }
        };

        const columns = [
            {
                header: 'wiringPi',
                key: 'wiringPi',
                headerStyle: { fontSize: '15px' },
                sortable: true
            },
            {
                header: 'GPIO',
                key: 'GPIO',
                headerStyle: { fontSize: '15px' },
                sortable: true
            },
            {
                header: 'Phys',
                key: 'Phys',
                defaultSorting: 'ASC',
                headerStyle: { fontSize: '15px', width: '100px' },
                dataStyle: { fontSize: '15px' },
                dataProps: { className: 'align-right' },
                //render: (id) => { return (<a href={'user/' + id}>{id}</a>); }

            },
            {
                header: 'Name',
                key: 'Name',
                headerStyle: { fontSize: '15px' },
                headerProps: { className: 'align-left' },
                descSortFunction: FamilyNameSorter.desc,
                ascSortFunction: FamilyNameSorter.asc
            },
            {
                header: 'Mode',
                key: 'Mode',
                headerStyle: { fontSize: '15px' },
                sortable: true
            },
            {
                header: 'Value',
                key: 'Value',
                headerStyle: { fontSize: '15px' },
                sortable: true
            }
        ];

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
                data={this.state.data}
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
        const clone = Array.apply(null, data);

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
        const sortedData = this.sortData(this.props.data, this.state.sortings);

        return (
            <table
                className="table"
                style={this.props.style} >
                <SortableTableHeader
                    columns={this.props.columns}
                    sortings={this.state.sortings}
                    onStateChange={this.onStateChange.bind(this)}
                    iconStyle={this.props.iconStyle}
                    iconDesc={this.props.iconDesc}
                    iconAsc={this.props.iconAsc}
                    iconBoth={this.props.iconBoth} />
                <SortableTableBody
                    columns={this.props.columns}
                    data={sortedData}
                    sortings={this.state.sortings} />
            </table>
        );
    }
}

class SortableTableHeaderItem extends React.PureComponent {
    static propTypes = {
        headerProps: PropTypes.object,
        sortable: PropTypes.bool,
        sorting: PropTypes.oneOf(['desc', 'asc', 'both']),
        iconStyle: PropTypes.object,
        iconDesc: PropTypes.node,
        iconAsc: PropTypes.node,
        iconBoth: PropTypes.node
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
        let sortIcon;
        if (this.props.sortable) {
            if (this.props.iconBoth) {
                sortIcon = this.props.iconBoth;
            } else {
                sortIcon = <SortIconBoth style={this.props.iconStyle} />;
            }
            if (this.props.sorting == "desc") {
                if (this.props.iconDesc) {
                    sortIcon = this.props.iconDesc;
                } else {
                    sortIcon = <SortIconDesc style={this.props.iconStyle} />;
                }
            } else if (this.props.sorting == "asc") {
                if (this.props.iconAsc) {
                    sortIcon = this.props.iconAsc;
                } else {
                    sortIcon = <SortIconAsc style={this.props.iconStyle} />;
                }
            }
        }

        return (
            <th
                style={this.props.style}
                onClick={this.onClick.bind(this)}
                {...this.props.headerProps} >
                {this.props.header}
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
        const headers = this.props.columns.map(((column, index) => {
            const sorting = this.props.sortings[index];
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
                    iconStyle={this.props.iconStyle}
                    iconDesc={this.props.iconDesc}
                    iconAsc={this.props.iconAsc}
                    iconBoth={this.props.iconBoth} />
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
        var tds = this.props.columns.map(function (item, index) {
            var value = this.props.data[item.key];
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
        var bodies = this.props.data.map(((item, index) => {
            return (
                <SortableTableRow
                    key={index}
                    data={item}
                    columns={this.props.columns} />
            );
        }).bind(this));

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
        const className = `fas icon ${this.props.icon}`
        return (
            <i
                className={className}
                style={this.props.style}
                align="right" />
        );
    }
}

class SortIconBoth extends React.PureComponent {
    render() {
        return (
            <FaIcon icon="icon-sort" style={this.props.style} />
        );
    }
}

class SortIconAsc extends React.PureComponent {
    render() {
        return (
            <FaIcon icon="icon-sort-up" style={this.props.style} />
        );
    }
}

class SortIconDesc extends React.PureComponent {
    render() {
        return (
            <FaIcon icon="icon-sort-down" style={this.props.style} />
        );
    }
}
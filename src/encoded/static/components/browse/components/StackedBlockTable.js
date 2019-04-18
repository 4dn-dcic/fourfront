'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import { Button, Collapse } from 'react-bootstrap';
import _ from 'underscore';
import url from 'url';
import { IndeterminateCheckbox } from './../../forms/components/IndeterminateCheckbox';
import { expFxn, console, isServerSide, analytics, object, Schemas, fileUtil, typedefs } from './../../util';
import * as store from './../../../store';

var { Item } = typedefs;


/**
 * Label to show at top left of Name block.
 */
export function StackedBlockNameLabel(props){
    const { title, subtitle, accession, className, subtitleVisible } = props;
    const cls = (
        "label-ext-info" + (className? ' ' + className : '') +
        (subtitle || accession ? ' has-subtitle' : '' ) +
        (subtitleVisible ? ' subtitle-visible' : '')
    );

    return (
        <div className={cls} key="label">
            <div className="label-title">{ title }</div>
            { subtitle || accession ?
                <div className={"ext" + (accession ? ' is-accession' : '')}>
                    { accession ?
                        <object.CopyWrapper value={accession} key="copy-accession">{ accession || subtitle }</object.CopyWrapper>
                    : subtitle }
                </div>
            : null }
        </div>
    );
}

StackedBlockNameLabel.propTypes = {
    /** Subtitle/label will appear more opaque when not hovered over */
    'subtitleVisible' : PropTypes.bool,
    'className' : PropTypes.string,
    'title' : PropTypes.oneOfType(PropTypes.string, PropTypes.node),
    'subtitle' : PropTypes.oneOfType(PropTypes.string, PropTypes.node),
    // Pass in place of or in addition to subtitle (takes precedence).
    'accession' : PropTypes.string
};

/**
 * Name element to be put inside of StackedBlocks as the first child.
 */
export class StackedBlockName extends React.PureComponent {

    static Label = StackedBlockNameLabel

    render(){
        const { children, style, relativePosition, colWidthStyles, columnClass, label } = this.props;

        var useStyle = {};
        const colWidthStyle = colWidthStyles[columnClass];

        if (style)              _.extend(useStyle, style);
        if (colWidthStyle)      _.extend(useStyle, colWidthStyle);
        if (relativePosition)   useStyle.position = 'relative';

        return (
            <div className={"name col-" + columnClass} style={useStyle}>
                { label ? <StackedBlockName.Label {...label} /> : null }
                { children }
            </div>
        );
    }

}

/**
 * Button to toggle collapse/visible of longer StacedkBlockLists. Used in StackedBlockLists.
 */
export class StackedBlockListViewMoreButton extends React.PureComponent {

    static propTypes = {
        'collapsibleChildren' : PropTypes.array,
        'collapsed' : PropTypes.bool,
        'handleCollapseToggle' : PropTypes.func
        // + those from parent .List
    };

    render(){
        const { collapsibleChildren, collapsed, title, showMoreExtTitle, handleCollapseToggle } = this.props;
        const collapsibleChildrenLen = collapsibleChildren.length;

        if (collapsibleChildrenLen === 0) return null;

        const titleStr = (
            (collapsed? "Show " + collapsibleChildrenLen + " More" : "Show Fewer") +
            (title? ' ' + title : '')
        );

        return (
            <div className="view-more-button" onClick={handleCollapseToggle}>
                <i className={"icon icon-" + (collapsed ? 'plus': 'minus')}/>
                { titleStr }
                { showMoreExtTitle ? <span className="ext text-400">{ showMoreExtTitle }</span> : null }
            </div>
        );
    }
}

/**
 * List which can be put inside a StackedBlock, after a StackedBlockName, and which holds other StackedBlocks.
 */
export class StackedBlockList extends React.PureComponent {

    static ViewMoreButton = StackedBlockListViewMoreButton;

    static propTypes = {
        'showMoreExtTitle'    : PropTypes.string,
        'collapseLimit'       : PropTypes.number,
        'collapseShow'        : PropTypes.number,
        'collapseLongLists'   : PropTypes.bool,
        'defaultCollapsed'    : PropTypes.bool,
        'children'            : PropTypes.arrayOf(PropTypes.node),
        'stackDepth'          : PropTypes.number
    };

    constructor(props){
        super(props);
        this.adjustedChildren = this.adjustedChildren.bind(this);
        this.handleCollapseToggle = this.handleCollapseToggle.bind(this);
        this.state = { 'collapsed' : props.defaultCollapsed };
    }

    adjustedChildren(){
        const { children, stackDepth } = this.props;
        return React.Children.map(children, (c)=>{

            //console.log('LIST_CHILD', c, typeof c)

            //if (c.type.displayName !== 'StackedBlock') return c; // Only add props to StackedBlocks

            var addedProps = _.pick(this.props, 'colWidthStyles', 'selectedFiles', 'columnHeaders', 'handleFileCheckboxChange');

            addedProps.stackDepth = stackDepth + 1;

            _.forEach(['collapseLongLists', 'collapseLimit', 'collapseShow', 'defaultCollapsed'], (prop)=>{
                if (typeof c.props[prop] === 'undefined'){
                    addedProps[prop] = this.props[prop];
                }
            });

            return React.cloneElement(c, addedProps, c.props.children);
        });
    }

    handleCollapseToggle(){
        this.setState(function({ collapsed }){
            return { 'collapsed' : !collapsed };
        });
    }

    render(){
        var { collapseLongLists, stackDepth, collapseLimit, collapseShow, className } = this.props,
            children = this.adjustedChildren(),
            cls = "s-block-list " + (className || '') + (' stack-depth-' + stackDepth);

        if (collapseLongLists === false || !Array.isArray(children) || children.length <= collapseLimit) {
            // Don't have enough items for collapsible element, return plain list.
            return <div className={cls}>{ children }</div>;
        }

        const collapsibleChildren = children.slice(collapseShow);
        const collapsibleChildrenLen = collapsibleChildren.length;

        var collapsibleChildrenElemsList;

        if (collapsibleChildrenLen > Math.min(collapseShow, 10)) { // Don't transition
            collapsibleChildrenElemsList = this.state.collapsed ? null : <div className="collapsible-s-block-ext">{ collapsibleChildren }</div>;
        } else {
            collapsibleChildrenElemsList = (
                <Collapse in={!this.state.collapsed}>
                    <div className="collapsible-s-block-ext">{ collapsibleChildren }</div>
                </Collapse>
            );
        }

        return (
            <div className={cls} data-count-collapsed={collapsibleChildren.length}>
                { children.slice(0, collapseShow) }
                { collapsibleChildrenElemsList }
                <StackedBlockListViewMoreButton {...this.props} collapsibleChildren={collapsibleChildren}
                    collapsed={this.state.collapsed} handleCollapseToggle={this.handleCollapseToggle} />
            </div>
        );
    }

}

export class StackedBlock extends React.PureComponent {

    static Name = StackedBlockName

    static List = StackedBlockList

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.adjustedChildren = this.adjustedChildren.bind(this);
    }

    adjustedChildren(){
        const { children } = this.props;
        return React.Children.map(children, (c, index) => {
            if (c === null) return null;

            var addedProps = _.pick(this.props,
                'columnClass', 'colWidthStyles', 'label', 'stackDepth',
                'selectedFiles', 'columnHeaders', 'handleFileCheckboxChange'
            );

            _.forEach(['collapseLongLists', 'collapseLimit', 'collapseShow', 'defaultCollapsed'], (prop)=>{
                if (typeof c.props[prop] === 'undefined'){
                    addedProps[prop] = this.props[prop];
                }
            });

            if (_.keys(addedProps).length > 0){
                return React.cloneElement(c, addedProps, c.props.children);
            } else return c;
        });
    }

    render(){
        const { columnClass, className, stackDepth, stripe, hideNameOnHover, keepLabelOnHover, id } = this.props;
        let cls = (
            "s-block stack-depth-" + stackDepth +
            (columnClass ? ' ' + columnClass : '') +
            (hideNameOnHover ? ' hide-name-on-block-hover' : '') +
            (keepLabelOnHover ? ' keep-label-on-name-hover' : '') +
            (className ? ' ' + className : '')
        );
        if (typeof stripe !== 'undefined' && stripe !== null){
            if (stripe === true || stripe === 'even') cls += ' even';
            else cls += ' odd';
        }
        return <div className={cls} data-id={id}>{ this.adjustedChildren() }</div>;
    }

}


/** Renders out a checkbox which controls selected state of multiple files */
class MultipleFileCheckbox extends React.PureComponent {

    static propTypes = {
        'selectedFiles' : PropTypes.object,
        'onChange' : PropTypes.func,
        'files' : PropTypes.array
    };

    static defaultProps = {
        'className' : 'checkbox-for-multiple-files',
        'name' : "file-checkbox"
    };

    isChecked = memoize(function(accessionTriples, selectedFiles){
        for (var i = 0; i < accessionTriples.length; i++){
            if (typeof selectedFiles[accessionTriples[i]] === 'undefined') return false;
        }
        return true;
    })

    isIndeterminate = memoize(function(accessionTriples, selectedFiles){
        for (var i = 0; i < accessionTriples.length; i++){
            if (typeof selectedFiles[accessionTriples[i]] !== 'undefined') return true;
        }
        return false;
    });

    render(){
        const { files, selectedFiles, onChange } = this.props;
        const filesCount = (Array.isArray(files) && files.length) || 0;

        // Don't render anything if no selectedFiles passed in.
        if (!selectedFiles || filesCount === 0 || !onChange || !files[0].accession) return null;

        const accessionTriples = expFxn.filesToAccessionTriples(files, true);
        const checked = this.isChecked(accessionTriples, selectedFiles);
        const indeterminate = !checked && this.isIndeterminate(accessionTriples, selectedFiles);
        const lineHeight = (filesCount * 35 + (filesCount - 1) - 15) + 'px';

        return (
            <div className="multipe-files-checkbox-wrapper inline-block" data-files-count={filesCount} style={{ lineHeight }}>
                <IndeterminateCheckbox {...{ indeterminate, checked }} id={'checkbox-for-' + accessionTriples.join('_')}
                    data-select-files={accessionTriples} {..._.omit(this.props, 'files', 'selectedFiles')} />
            </div>
        );
    }
}


export class FilePairBlock extends React.PureComponent {

    static isSingleItem(isSingleItemProp, files){
        return typeof isSingleItemProp === 'boolean' ? isSingleItemProp : files.length < 2 ? true : false;
    }

    static propTypes = {
        'handleFileCheckboxChange' : PropTypes.func,
        'isSingleItem' : PropTypes.bool,
        'selectedFiles' : PropTypes.object,
        'files' : PropTypes.arrayOf(PropTypes.object)
    };

    static defaultProps = {
        'excludeChildrenCheckboxes' : true,
        'excludeOwnCheckbox' : false
    };

    constructor(props){
        super(props);
        this.nameColumn = this.nameColumn.bind(this);
        this.onCheckboxChange = this.onCheckboxChange.bind(this);
        this.isSingleItem = memoize(FilePairBlock.isSingleItem);
    }

    onCheckboxChange(e){
        const { files, handleFileCheckboxChange } = this.props;
        const accessionTriples = expFxn.filesToAccessionTriples(files, true);
        handleFileCheckboxChange(accessionTriples, files);
    }

    nameColumn(){
        const { label, colWidthStyles, name, files, selectedFiles, excludeOwnCheckbox } = this.props;
        var labelToShow = null;
        if (typeof label === 'string'){
            labelToShow = <StackedBlock.Name.Label title="Pair" subtitle={label} />;
        } else if (typeof label === 'object' && label){
            labelToShow = <StackedBlock.Name.Label {...label} />;
        }
        return (
            <div className="name col-file-group" style={colWidthStyles ? _.clone(colWidthStyles['file-group']) : null}>
                { labelToShow }
                <div className="name-title" key="name-title">
                    { !excludeOwnCheckbox ?
                        <MultipleFileCheckbox onChange={this.onCheckboxChange} files={files} selectedFiles={selectedFiles} />
                    : null }
                    { name }
                </div>
            </div>
        );
    }

    render(){
        const { files, columnHeaders, colWidthStyles, isSingleItem, excludeChildrenCheckboxes, hideNameOnHover } = this.props;
        const isReallySingleItem = this.isSingleItem(isSingleItem, files);
        const cls = (
            "s-block file-group keep-label-on-name-hover" +
            (hideNameOnHover ? ' hide-name-on-block-hover' : '')
        );

        let childBlocks;

        if (!Array.isArray(files) || files.length === 0){
            // Blank placeholder thingy (?) todo: test
            childBlocks = <FileEntryBlock file={null} {...{ columnHeaders, colWidthStyles }} />;
        } else {
            childBlocks = _.map(files, (file) =>
                <FileEntryBlock key={object.atIdFromObject(file)}
                    {..._.omit(this.props, 'files', 'file', 'isSingleItem', 'className', 'type', 'excludeChildrenCheckboxes', 'excludeOwnCheckbox', 'name', 'label')}
                    file={file}
                    className={null}
                    isSingleItem={isReallySingleItem} hideNameOnHover={!isReallySingleItem}
                    excludeCheckbox={excludeChildrenCheckboxes} // May be excluded as this block has own checkbox
                    type="paired-end" />
            );
        }

        return (
            <div className={cls}>
                { this.nameColumn() }
                <div className="files s-block-list">{ childBlocks }</div>
            </div>
        );
    }
}



function SingleFileCheckbox(props){
    const { file, excludeCheckbox, selectedFiles, handleFileCheckboxChange } = props;
    if (!SingleFileCheckbox.hasCheckbox(file, excludeCheckbox, selectedFiles)){
        return null;
    }
    const isChecked = SingleFileCheckbox.isChecked(file, selectedFiles);
    const accessionTriple = expFxn.fileToAccessionTriple(props.file, true);

    return (
        <input type="checkbox" checked={isChecked} name="file-checkbox" id={'checkbox-for-' + accessionTriple}
            className='file-entry-table-checkbox' data-select-files={[accessionTriple]}
            onChange={handleFileCheckboxChange.bind(handleFileCheckboxChange, accessionTriple, file)} />
    );
}

SingleFileCheckbox.hasCheckbox = function(file, excludeCheckbox, selectedFiles){
    if (!file || !file.accession || !selectedFiles || excludeCheckbox) return false; // No file to select.
    return true;
};

SingleFileCheckbox.isChecked = function(file, selectedFiles){
    if (!file || !file.accession || !selectedFiles) return null;
    var accessionTriple = expFxn.fileToAccessionTriple(file, true);
    return selectedFiles[accessionTriple];
};



export class FileEntryBlock extends React.PureComponent {

    static propTypes = {
        'selectedFiles' : PropTypes.object,
        'handleFileCheckboxChange' : PropTypes.func,
        'excludeCheckbox' : PropTypes.bool,
        'file' : PropTypes.object,
        'columnHeaders' : PropTypes.arrayOf(PropTypes.object)
    };

    static defaultProps = {
        'excludeCheckbox' : false,
        'label' : {
            'title' : 'File',
            'subtitle' : null
        },
        'hideNameOnHover' : false,
        'keepLabelOnHover' : true
    };

    constructor(props){
        super(props);
        this.filledFileRow = this.filledFileRow.bind(this);
        this.renderName = this.renderName.bind(this);
    }

    /**
     * Returns a row (list) of column values for `"file-detail"` columnClass columnHeaders.
     * Contains a number of hard-coded rules for certain titles:
     */
    filledFileRow(){
        const { columnHeaders, className, colWidthStyles, file } = this.props;
        const fileAtId = object.itemUtil.atId(file);
        const row = []; // Return val.
        const cols = _.filter(columnHeaders, function(col){ return col.columnClass === 'file-detail'; });
        const baseClassName = (className || '') + " col-file-detail item";

        _.forEach(cols, (col, index)=>{

            const colClassName = baseClassName + ' col-' + col.columnClass + ' detail-col-' + index;
            const title = col.valueTitle || col.title;
            const colStyle = colWidthStyles ? colWidthStyles[col.field || col.columnClass || 'file-detail'] : null;

            if (typeof col.render === 'function'){
                row.push(
                    <div key={col.field || index} className={colClassName} style={colStyle}>
                        { col.render(file, col.field, index, this.props) }
                    </div>
                );
                return;
            }

            if (!fileAtId) {
                // Empty block to take up space/width needed.
                row.push(<div key={"file-detail-empty-" + index} className={colClassName} style={colStyle}></div>);
                return;
            }

            if (typeof col.field === 'string'){
                // Grab value out of file.
                let val = object.getNestedProperty(file, col.field, true);
                val = (val && Schemas.Term.toName(col.field, val, true)) || '-';
                row.push(<div key={col.field} className={colClassName} style={colStyle}>{ val }</div>);
                return;
            }
        });

        return row;
    }

    renderNameInnerTitle(){

        var { file, columnHeaders } = this.props,
            colForFile = _.findWhere(columnHeaders || [], { 'columnClass' : 'file' }) || null,
            fileAtId = file && object.atIdFromObject(file),
            fileError = (file && file.error) || false,
            fileTitleString;

        if (fileError) {
            return <div key="name-title" className="name-title"><em>{ fileError }</em></div>;
        }

        if (!file || !fileAtId) {
            return <div key="name-title" className="name-title"><em>No file(s) or view permissions.</em></div>;
        }

        if (typeof colForFile.render === 'function') {
            var renderedName = colForFile.render(file, colForFile.field || null, 0, this.props);
            if (renderedName) return <span key="name-title" className="name-title">{ renderedName }</span>;
        }

        if (!fileTitleString && file.accession) {
            fileTitleString = file.accession;
        }
        if (!fileTitleString && fileAtId) {
            var idParts = _.filter(fileAtId.split('/'));
            if (idParts[1].slice(0,5) === '4DNFI'){
                fileTitleString = idParts[1];
            }
        }
        if (!fileTitleString) {
            fileTitleString = file.uuid || fileAtId || 'N/A';
        }

        return <a key="name-title" className="name-title mono-text" href={fileAtId}>{ fileTitleString }</a>;
    }

    renderLabel(){
        var { file, label, type, sequenceNum, columnHeaders } = this.props;

        if (!file) return null;

        var commonProperties = {
            'key'       : "name-block-label",
            'title'     : label && label.title,
            'inline'    : false,
            'className' : 'col-file',
            'subtitle'  : label && label.subtitle
        };

        if (label) {
            return <StackedBlock.Name.Label {..._.extend(commonProperties, label)} />;
        } else if (type === 'sequence-replicate') {
            return <StackedBlock.Name.Label {..._.extend(commonProperties, label, { 'subtitle' : (sequenceNum ? 'Seq Replicate ' + sequenceNum : null) })} />;
        } else if (type === 'paired-end') {
            return <StackedBlock.Name.Label {...commonProperties} />;
            //return RawFilesStackedTable.StackedBlock.Name.renderBlockLabel(_.extend({}, commonProperties, {
            //    //subtitle : this.props.file.paired_end ? 'Paired End ' + this.props.file.paired_end : null,
            //}));
        }

        if (Array.isArray(columnHeaders)) {
            var headerTitles = _.pluck(columnHeaders, 'title');
            if ((file.file_type || fileUtil.getFileFormatStr(file)) && _.intersection(headerTitles,['File Type', 'File Format']).length === 0){
                return <StackedBlock.Name.Label {...commonProperties } subtitle={file.file_type || (file.file_format && file.file_format.display_title)} />;
            }
            if (file.instrument && _.intersection(headerTitles,['Instrument', 'File Instrument']).length === 0){
                return <StackedBlock.Name.Label {...commonProperties} subtitle={file.instrument} />;
            }
        }

        return <StackedBlock.Name.Label {...commonProperties} />;
    }

    renderName(){
        var { file, colWidthStyles } = this.props;
        return (
            <div key="file-entry-name-block" className={"name col-file" + (file && file.accession ? ' mono-text' : '')}
                style={colWidthStyles ? colWidthStyles.file : null}>
                { this.renderLabel() }
                <SingleFileCheckbox {...this.props} />
                { this.renderNameInnerTitle() }
            </div>
        );
    }

    render(){
        var { hideNameOnHover, keepLabelOnHover, isSingleItem, stripe } = this.props,
            sBlockClassName = "s-block file";

        if (hideNameOnHover)    sBlockClassName += ' hide-name-on-block-hover';
        if (keepLabelOnHover)   sBlockClassName += ' keep-label-on-name-hover';
        if (isSingleItem)       sBlockClassName += ' single-item';
        if (typeof stripe !== 'undefined' && stripe !== null){
            sBlockClassName += (stripe === true || stripe === 'even') ? ' even' : ' odd';
        }
        return <div key="file-s-block" className={sBlockClassName}>{ this.renderName() }{ this.filledFileRow() }</div>;
    }
}




/**
 * To be used within Experiments Set View/Page, or
 * within a collapsible row on the browse page.
 *
 * Shows experiments only, not experiment sets.
 *
 * Allows either table component itself to control state of "selectedFiles"
 * or for a parentController (passed in as a prop) to take over management
 * of "selectedFiles" Set and "checked", for integration with other pages/UI.
 */


export class StackedBlockTable extends React.PureComponent {

    static StackedBlock = StackedBlock;

    static getOriginalColumnWidthArray = memoize(function(columnHeaders, defaultInitialColumnWidth){
        return _.map(columnHeaders, (c) => c.initialWidth || defaultInitialColumnWidth );
    });

    static totalColumnsWidth = memoize(function(columnHeaders, defaultInitialColumnWidth){
        var origColumnWidths = StackedBlockTable.getOriginalColumnWidthArray(columnHeaders, defaultInitialColumnWidth);
        return _.reduce(origColumnWidths, function(m,v){ return m + v; }, 0);
    });

    /**
     * Returns array of column widths, aligned to columnHeaders, which are scaled up to
     * fit `width`, or original/initial widths if total is > props.width.
     */
    static scaledColumnWidths = memoize(function(width, columnHeaders, defaultInitialColumnWidth){
        if (!width) {
            width = 960; // 960 = fallback for tests
        }
        var origColumnWidths    = StackedBlockTable.getOriginalColumnWidthArray(columnHeaders, defaultInitialColumnWidth),
            totalOrigColsWidth  = StackedBlockTable.totalColumnsWidth(columnHeaders, defaultInitialColumnWidth);

        if (totalOrigColsWidth > width){
            return origColumnWidths;
        }

        var scale               = (width / totalOrigColsWidth) || 1,
            newColWidths        = _.map(origColumnWidths, function(c){
                return Math.floor(c * scale);
            }),
            totalNewColsWidth   = _.reduce(newColWidths, function(m,v){ return m + v; }, 0),
            remainder           = width - totalNewColsWidth;

        // Adjust first column by few px to fit perfectly.
        newColWidths[0] += Math.floor(remainder - 0.5);

        return newColWidths;
    });

    static colWidthStyles = memoize(function(columnWidths, columnHeaders){
        // { 'experiment' : { width } , 'biosample' : { width }, ... }
        return _.object(
            _.map(
                _.map(columnHeaders, function(col){
                    return col.field || col.columnClass;
                }),
                function(cn, index){
                    return [cn, { 'width' : columnWidths[index] }];
                }
            )
        );
    });

    static propTypes = {
        'columnHeaders' : PropTypes.arrayOf(PropTypes.shape({
            'columnClass' : PropTypes.string.isRequired,
            'className' : PropTypes.string,
            'title' : PropTypes.string.isRequired,
            'visibleTitle' : PropTypes.oneOfType([PropTypes.string, PropTypes.element, PropTypes.func]),
            'initialWidth' : PropTypes.number
        })).isRequired,
        'width' : PropTypes.number.isRequired
    };

    static defaultProps = {
        'columnHeaders' : [
            { columnClass: 'biosample',     className: 'text-left',     title: 'Biosample',     initialWidth: 115   },
            { columnClass: 'experiment',    className: 'text-left',     title: 'Experiment',    initialWidth: 145   },
            { columnClass: 'file-group',                                title: 'File Group',     initialWidth: 40,   visibleTitle : <i className="icon icon-download"></i> },
            { columnClass: 'file',                                      title: 'File',          initialWidth: 125   }
        ],
        'width': null,
        'defaultInitialColumnWidth' : 120,
        'collapseLimit'     : 4,
        'collapseShow'      : 3,
        'collapseLongLists' : true,
        'defaultCollapsed'  : true
    };

    constructor(props){
        super(props);
        this.adjustedChildren = this.adjustedChildren.bind(this);
        this.colWidthStyles = this.colWidthStyles.bind(this);
        this.handleFileCheckboxChange = this.handleFileCheckboxChange.bind(this);
        this.setCollapsingState = _.throttle(this.setCollapsingState.bind(this));

        this.cache = {
            'oddExpRow' : true
        };

        this.state = {
            'mounted' : false
        };
    }

    componentDidMount(){
        this.setState({ 'mounted' : true });
    }

    colWidthStyles(){
        const { width, columnHeaders, defaultInitialColumnWidth } = this.props;
        const columnWidths = StackedBlockTable.scaledColumnWidths(width, columnHeaders, defaultInitialColumnWidth);
        return StackedBlockTable.colWidthStyles(columnWidths, columnHeaders);
    }

    /**
     * If we have a SelectedFilesController up the parent/ancestor chain that feeds us selectFile, selectedFiles, and unselectFile, this is the handler to use for checkbox stacked blocks.
     *
     * @param {string|string[]} accessionTripleString - String or list of strings which represented 3 accessions (ExpSet, Exp, File) delimited by a tilde (~).
     * @param {Item|Item[]} fileObj - File Item JSON
     * @returns {void} - Nothing.
     */
    handleFileCheckboxChange(accessionTripleString, fileObj){
        var { selectedFiles, selectFile, unselectFile } = this.props,
            willSelect, isMultiples;

        if (!selectedFiles || !selectFile || !unselectFile) return null;

        if (Array.isArray(accessionTripleString)){
            isMultiples = true;
            willSelect = typeof selectedFiles[accessionTripleString[0]] === 'undefined';
        } else {
            isMultiples = false;
            willSelect = typeof selectedFiles[accessionTripleString] === 'undefined';
        }

        if (willSelect){
            if (isMultiples){
                selectFile(_.zip(accessionTripleString, fileObj));
            } else {
                selectFile(accessionTripleString, fileObj);
            }
        } else {
            unselectFile(accessionTripleString);
        }
    }

    setCollapsingState(collapsing){
        this.setState({ collapsing });
    }

    adjustedChildren(){
        const { children, columnHeaders, selectedFiles } = this.props;
        const colWidthStyles = this.colWidthStyles();

        return React.Children.map(children, (c)=>{
            var addedProps = _.omit(this.props, 'columnHeaders', 'stackDepth', 'colWidthStyles', 'handleFileCheckboxChange');

            // REQUIRED & PASSED DOWN TO STACKEDBLOCKLIST
            addedProps.handleFileCheckboxChange = this.handleFileCheckboxChange;
            addedProps.colWidthStyles      = colWidthStyles;
            addedProps.stackDepth          = 0;
            addedProps.columnHeaders       = columnHeaders;
            addedProps.selectedFiles       = selectedFiles;

            return React.cloneElement(c, addedProps, c.props.children);
        });
    }

    render(){
        const { width , fadeIn, columnHeaders, className, children, defaultInitialColumnWidth } = this.props;
        const { mounted } = this.state;

        if (!children){
            return <h6 className="text-center text-400"><em>No Results</em></h6>;
        }

        const totalColsWidth = StackedBlockTable.totalColumnsWidth(columnHeaders, defaultInitialColumnWidth);
        const minTotalWidth = Math.max(width || 0, totalColsWidth);
        const columnWidths = StackedBlockTable.scaledColumnWidths(width, columnHeaders, defaultInitialColumnWidth);

        const headers = _.map(columnHeaders, (colHeader, index) => {
            if (colHeader.visible === false) return null;
            let visibleTitle = colHeader.visibleTitle || colHeader.title;
            if (typeof visibleTitle === 'function') visibleTitle = visibleTitle(this.props);
            const style = {
                'width' : columnWidths[index] || colHeader.initialWidth || defaultInitialColumnWidth
            };
            return (
                <div className={"heading-block col-" + colHeader.columnClass + (colHeader.className ? ' ' + colHeader.className : '')}
                    key={colHeader.field || index} style={style} data-column-class={colHeader.columnClass}>
                    { visibleTitle }
                </div>
            );
        });

        return (
            <div style={{ 'width' : minTotalWidth }} className={
                "stacked-block-table" +
                (mounted ? ' mounted' : '') +
                (fadeIn ? ' fade-in' : '') +
                (typeof className === 'string' ? ' ' + className : '')}>
                <div className="headers stacked-block-table-headers">{ headers }</div>
                <div className="body clearfix">{ this.adjustedChildren() }</div>
            </div>
        );
    }
}

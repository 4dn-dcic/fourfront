'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import memoize from 'memoize-one';
import { Button, Checkbox, Collapse } from 'react-bootstrap';
import _ from 'underscore';
import url from 'url';
import { FacetList } from './FacetList';
import { expFxn, Filters, console, isServerSide, analytics, object, Schemas, fileUtil, typedefs } from './../../util';
import { requestAnimationFrame } from './../../viz/utilities';
import * as store from './../../../store';

var { Item } = typedefs;


/**
 * Label to show at top left of Name block.
 */
export function StackedBlockNameLabel(props){
    var { title, subtitle, accession, inline, className } = props;

    function titleElement(){
        return React.createElement(
            inline ? 'span' : 'div',
            { className : "label-title" },
            title
        );
    }

    function subtitleElement(){
        if (!accession && !subtitle) return null;
        return React.createElement(
            inline ? 'span' : 'div',
            { className : "ext" + (accession ? ' is-accession' : '') },
            <object.CopyWrapper value={accession} key="copy-accession">{accession || subtitle}</object.CopyWrapper>
        );
    }

    var fullClassName = "label-ext-info";
    if (typeof className === 'string') fullClassName += ' ' + className;
    if (subtitle !== null) fullClassName += ' has-subtitle';

    return (
        <div className={fullClassName} key="label">
            { titleElement() }
            { subtitleElement() }
        </div>
    );
}

/**
 * Name element to be put inside of StackedBlocks as the first child.
 */
export class StackedBlockName extends React.PureComponent {

    static Label = StackedBlockNameLabel

    static propTypes = {
        'columnClass' : PropTypes.string,
        'colWidthStyles' : PropTypes.object,
        'label' : PropTypes.node,
        //PropTypes.shape({
        //    title : PropTypes.node,
        //    subtitle : PropTypes.node,
        //    subtitleVisible : PropTypes.bool
        //}),
        'style' : PropTypes.object,
        'visible' : PropTypes.bool, // ? forgot
        'verticalAlign' : PropTypes.string // CSS vertical-align property. Change alignment/positioning if wanted.

    }

    static defaultProps = {
        'visible' : true,
        'passProps' : true
    };

    constructor(props){
        super(props);
        this.getColumnWidthStyle = this.getColumnWidthStyle.bind(this);
        this.adjustedChildren = this.adjustedChildren.bind(this);
    }

    getColumnWidthStyle(){
        const { colWidthStyles, columnClass, expTable } = this.props;
        if (colWidthStyles && typeof colWidthStyles[columnClass] !== 'undefined'){
            return colWidthStyles[columnClass];
        }

        if (expTable && expTable.state && Array.isArray(expTable.state.columnWidths)){
            var colWidthIndex = _.findIndex(expTable.columnHeaders(), { 'columnClass' : columnClass });
            if (colWidthIndex > -1) return { 'width' : expTable.state.columnWidths[colWidthIndex] };
        }

        return null;
    }

    adjustedChildren(){
        const { children, passProps } = this.props;
        return React.Children.map(children, (c)=>{
            var addedProps = {};

            if (c && c.props && (!c.props.className || (typeof c.props.className === 'string' && c.props.className.indexOf('name-title') === -1))){
                addedProps.className = (c.props.className || '') + ' name-title';
            }

            if (c && c.type && typeof c.type === 'function' && passProps){
                _.extend(addedProps, this.props, c.props);
            }

            if (_.keys(addedProps).length > 0){
                return React.cloneElement(c, addedProps, c.props.children);
            }

            return c;
        });
    }

    render(){
        if (!this.props.visible) return null;
        var style = null;
        var colWidthStyle = this.getColumnWidthStyle();
        if (colWidthStyle){
            if (this.props.colStyle) style = _.extend(_.clone(colWidthStyle), this.props.colStyle);
            else style = _.clone(colWidthStyle);
        }
        if (this.props.relativePosition){
            if (style) style.position = 'relative';
            else style = { 'position' : 'relative' };
        }
        if (this.props.verticalAlign){
            if (style) style.verticalAlign = this.props.verticalAlign;
            else style = { 'verticalAlign' : this.props.verticalAlign };
        }
        if (this.props.style){
            if (style) style = _.extend({}, this.props.style, style);
            else style = _.clone(this.props.style);
        }
        return (
            <div className={"name col-" + this.props.columnClass} style={style}>
                { this.props.label ?
                    <StackedBlockName.Label {..._.extend({}, this.props.label, {
                        inline : false,
                        className : this.props.label.subtitleVisible === true ? 'subtitle-visible' : null
                    })} />
                    : null }
                { this.adjustedChildren() }
            </div>
        );
    }

}

/**
 * Button to toggle collapse/visible of longer StacedkBlockLists. Used in StackedBlockLists.
 */
export class StackedBlockListViewMoreButton extends React.Component {

    static propTypes = {
        'collapsibleChildren' : PropTypes.array,
        'collapsed' : PropTypes.bool,
        'handleCollapseToggle' : PropTypes.func
        // + those from parent .List
    };


    shouldComponentUpdate(nextProps){
        if (this.props.collapsed !== nextProps.collapsed) return true;
        if (this.props.currentlyCollapsing !== nextProps.currentlyCollapsing) return true;
        if (this.props.title !== nextProps.title) return true;
        if (this.props.showMoreExtTitle !== nextProps.showMoreExtTitle) return true;
        return false;
    }

    render(){
        const { collapsibleChildren, collapsed, currentlyCollapsing, parentID, title, showMoreExtTitle, handleCollapseToggle } = this.props;

        if (collapsibleChildren.length === 0) return null;

        var collapsedMsg = collapsed &&
        (currentlyCollapsing ?
            (currentlyCollapsing === parentID ? false : true)
            :
            true
        );

        function collapseTitle(){
            let showTitle = null;
            if (collapsedMsg){
                showTitle = "Show " + collapsibleChildren.length + " More";
            } else {
                showTitle = "Show Fewer";
            }
            if (title) showTitle += ' ' + title;

            let extTitle = null;
            if (showMoreExtTitle && collapsedMsg){
                extTitle = <span className="ext text-400"> { showMoreExtTitle }</span>;
            }

            return <span>{ showTitle }{ extTitle }</span>;
        }

        return (
            <div className="view-more-button" onClick={handleCollapseToggle}>
                <i className={"icon icon-" + (collapsedMsg ? 'plus': 'minus')}></i>
                { collapseTitle() }
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
        title               : PropTypes.string,
        showMoreExtTitle    : PropTypes.string,
        collapseLimit       : PropTypes.number,
        collapseShow        : PropTypes.number,
        expTable            : PropTypes.any,
        collapseLongLists   : PropTypes.bool.isRequired
    };

    static defaultProps = {
        'collapseLimit'     : 4,
        'collapseShow'      : 3,
        'collapseLongLists' : true
    };

    constructor(props){
        super(props);
        this.finishTransition = this.finishTransition.bind(this);
        this.adjustedChildren = this.adjustedChildren.bind(this);
        this.handleCollapseToggle = this.handleCollapseToggle.bind(this);
        if (props.collapseLongLists && Array.isArray(props.children) && props.children.length > props.collapseLimit){
            this.state = { 'collapsed' : true };
        }
    }

    finishTransition(){
        if (this.props.expTable && this.props.expTable.state){
            this.props.expTable.setState({ 'collapsing' : false });
        }
    }

    adjustedChildren(){
        return React.Children.map(this.props.children, (c)=>{

            //console.log('LIST_CHILD', c, typeof c)

            //if (c.type.displayName !== 'StackedBlock') return c; // Only add props to StackedBlocks
            var addedProps = {};

            addedProps.stackDepth = this.props.stackDepth + 1;

            if (this.props.parentIDList && !c.props.parentIDList){
                addedProps.parentIDList = this.props.parentIDList;
            }
            if (this.props.currentlyCollapsing && !c.props.currentlyCollapsing){
                addedProps.currentlyCollapsing = this.props.currentlyCollapsing;
            }
            if (this.props.expTable && !c.props.expTable){
                addedProps.expTable = this.props.expTable;
            }
            if (this.props.colWidthStyles && !c.props.colWidthStyles){
                addedProps.colWidthStyles = this.props.colWidthStyles;
            }
            if (this.props.experimentSetType && !c.props.experimentSetType){
                addedProps.experimentSetType = this.props.experimentSetType;
            }
            if (this.props.experimentSetAccession && !c.props.experimentSetAccession){
                addedProps.experimentSetAccession = this.props.experimentSetAccession;
            }
            if (this.props.selectedFiles && !c.props.selectedFiles){
                addedProps.selectedFiles = this.props.selectedFiles;
            }
            if (this.props.columnHeaders && !c.props.columnHeaders){
                addedProps.columnHeaders = this.props.columnHeaders;
            }
            if (this.props.handleFileCheckboxChange && !c.props.handleFileCheckboxChange){
                addedProps.handleFileCheckboxChange = this.props.handleFileCheckboxChange;
            }
            if (typeof this.props.collapseLongLists === 'boolean' && typeof c.props.collapseLongLists !== 'boolean'){
                addedProps.collapseLongLists = this.props.collapseLongLists;
            }
            if (_.keys(addedProps).length > 0){
                return React.cloneElement(c, addedProps, c.props.children);
            }
            return c;
        });
    }

    handleCollapseToggle(){
        if (this.props.expTable && this.props.expTable.state && !this.props.expTable.state.collapsing){
            this.props.expTable.setState({
                'collapsing' : this.props.rootList ? 'root' :
                    this.props.parentID || this.props.className || true
            }, ()=>{
                this.setState(function({ collapsed }){
                    return { 'collapsed' : !collapsed };
                });
            });
        } else this.setState(function({ collapsed }){
            return { 'collapsed' : !collapsed };
        });
    }

    render(){
        var { collapseLongLists, stackDepth, collapseLimit, collapseShow } = this.props,
            children = this.adjustedChildren(),
            className = "s-block-list " + (this.props.className || '') + (' stack-depth-' + stackDepth),
            timeout = 350; // Default

        if (collapseLongLists === false || !Array.isArray(children) || children.length <= collapseLimit) {
            // Don't have enough items for collapsible element, return plain list.
            return <div className={className}>{ children }</div>;
        }

        var collapsibleChildren = children.slice(collapseShow);
        if (collapsibleChildren.length > 18) {
            className += ' transition-slow';
            timeout = 1000;
        } else if (collapsibleChildren.length > 9) {
            className += ' transition-med';
            timeout = 500;
        }

        return (
            <div className={className} data-count-collapsed={collapsibleChildren.length}>
                { children.slice(0, this.props.collapseShow) }
                <Collapse in={!this.state.collapsed} timeout={timeout} onExited={this.finishTransition} onEntered={this.finishTransition}>
                    <div className="collapsible-s-block-ext">{ collapsibleChildren }</div>
                </Collapse>
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
        this.childIDList = new Set();
    }

    adjustedChildren(){
        return React.Children.map(this.props.children, (c) => {
            if (c === null) return null;
            var addedProps = {};

            addedProps.stackDepth = this.props.stackDepth;

            if (!c.props.columnClass && this.props.columnClass) addedProps.columnClass = this.props.columnClass;
            if (!c.props.colWidthStyles && this.props.colWidthStyles) addedProps.colWidthStyles = this.props.colWidthStyles;
            if (!c.props.label && this.props.label) addedProps.label = this.props.label;
            if (!c.props.expTable && this.props.expTable) addedProps.expTable = this.props.expTable;
            if (!c.props.experimentSetType && this.props.experimentSetType) addedProps.experimentSetType = this.props.experimentSetType;
            if (!c.props.currentlyCollapsing && this.props.currentlyCollapsing) addedProps.currentlyCollapsing = this.props.currentlyCollapsing;

            if (this.props.selectedFiles && !c.props.selectedFiles){
                addedProps.selectedFiles = this.props.selectedFiles;
            }
            if (this.props.experimentSetAccession && !c.props.experimentSetAccession){
                addedProps.experimentSetAccession = this.props.experimentSetAccession;
            }
            if (this.props.columnHeaders && !c.props.columnHeaders){
                addedProps.columnHeaders = this.props.columnHeaders;
            }
            if (this.props.handleFileCheckboxChange && !c.props.handleFileCheckboxChange){
                addedProps.handleFileCheckboxChange = this.props.handleFileCheckboxChange;
            }
            if (typeof this.props.collapseLongLists === 'boolean' && typeof c.props.collapseLongLists !== 'boolean'){
                addedProps.collapseLongLists = this.props.collapseLongLists;
            }

            if (c.props.children){
                // Grab & save child s-block ids (one level deep)
                React.Children.forEach(c.props.children, (cc)=>{
                    if (cc.props && typeof cc.props.id === 'string'){
                        this.childIDList.add(cc.props.id);
                    }
                });
            }
            if (this.props.id){
                // Pass down (and include self in) parent s-block ids to child elements.
                if (this.props.parentIDList){
                    addedProps.parentIDList = new Set(this.props.parentIDList);
                } else {
                    addedProps.parentIDList = new Set();
                }
                addedProps.parentIDList.add(this.props.id);
                addedProps.parentID = this.props.id;
            }
            if (Object.keys(addedProps).length > 0){
                return React.cloneElement(c, addedProps, c.props.children);
            } else return c;
        });
    }

    render(){
        const { columnClass, stackDepth, stripe, hideNameOnHover, keepLabelOnHover, currentlyCollapsing, id, parentIDList } = this.props;
        var className = columnClass ? columnClass + ' ' : '';
        className += "s-block"  + (' stack-depth-' + stackDepth);
        if (hideNameOnHover) className += ' hide-name-on-block-hover';
        if (keepLabelOnHover) className += ' keep-label-on-name-hover';
        if (typeof stripe !== 'undefined' && stripe !== null){
            if (stripe === true || stripe === 'even') className += ' even';
            else className += ' odd';
        }
        if (currentlyCollapsing){
            className += ' s-block-list-collapsing collapsing-' + currentlyCollapsing;
            if (
                currentlyCollapsing === id ||
                currentlyCollapsing === 'root' ||
                ((parentIDList instanceof Set) && parentIDList.has(currentlyCollapsing)) ||
                ((this.childIDList instanceof Set) && this.childIDList.has(currentlyCollapsing))
            ) className += ' collapsing-child';
        }
        if (typeof this.props.className === 'string') className += ' ' + this.props.className;
        return <div className={className}>{ this.adjustedChildren() }</div>;
    }

}


/** Renders out a checkbox which controls selected state of multiple files */
function MultipleFileCheckbox(props){
    const { files, selectedFiles, onChange } = props;
    const filesCount = (Array.isArray(files) && files.length) || 0;

    // Don't render anything if no selectedFiles passed in.
    if (!selectedFiles || filesCount === 0 || !onChange || !files[0].accession) return null;

    const accessionTriples = expFxn.filesToAccessionTriples(files, true);
    const checked = MultipleFileCheckbox.isChecked(accessionTriples, selectedFiles);
    const lineHeight = (filesCount * 35 + (filesCount - 1) - 15) + 'px';

    return (
        <div className="multipe-files-checkbox-wrapper inline-block" data-files-count={filesCount} style={{ lineHeight }}>
            <input type="checkbox" checked={checked} id={'checkbox-for-' + accessionTriples.join('_')}
                data-select-files={accessionTriples}
                {..._.omit(props, 'files', 'selectedFiles')} />
        </div>
    );
}

MultipleFileCheckbox.isChecked = function(accessionTriples, selectedFiles){
    for (var i = 0; i < accessionTriples.length; i++){
        if (typeof selectedFiles[accessionTriples[i]] === 'undefined') return false;
    }
    return true;
};

MultipleFileCheckbox.propTypes = {
    'selectedFiles' : PropTypes.object,
    'onChange' : PropTypes.func,
    'files' : PropTypes.array
};

MultipleFileCheckbox.defaultProps = {
    'className' : 'checkbox-for-multiple-files',
    'name' : "file-checkbox"
};


export class FilePairBlock extends React.PureComponent {

    static isSingleItem(isSingleItemProp, files){
        return typeof isSingleItemProp === 'boolean' ? isSingleItemProp : files.length < 2 ? true : false;
    }

    static propTypes = {
        'handleFileCheckboxChange' : PropTypes.func,
        'isSingleItem' : PropTypes.bool,
        'selectedFiles' : PropTypes.object,
    };

    static defaultProps = {
        'excludeChildrenCheckboxes' : true
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
        const { colVisible, label, colWidthStyles, name, files, selectedFiles } = this.props;
        if (colVisible === false) return null;
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
                    <MultipleFileCheckbox onChange={this.onCheckboxChange} files={files} selectedFiles={selectedFiles}  />
                    { name }
                </div>
            </div>
        );
    }

    render(){
        const { files, columnHeaders, colWidthStyles, isSingleItem, excludeChildrenCheckboxes } = this.props;
        const isReallySingleItem = this.isSingleItem(isSingleItem, files);

        let childBlocks;

        if (!Array.isArray(files) || files.length === 0){
            // Blank placeholder thingy (?) todo: test
            childBlocks = <FileEntryBlock file={null} {...{ columnHeaders, colWidthStyles }} />;
        } else {
            childBlocks = _.map(files, (file) =>
                <FileEntryBlock key={object.atIdFromObject(file)}
                    {..._.pick(this.props, 'columnHeaders', 'handleFileCheckboxChange', 'selectedFiles', 'colWidthStyles')}
                    file={file} className={null}
                    isSingleItem={isReallySingleItem} hideNameOnHover={!isReallySingleItem}
                    excludeCheckbox={excludeChildrenCheckboxes} // May be excluded as this block has own checkbox
                    type="paired-end" />
            );
        }

        return (
            <div className="s-block file-group keep-label-on-name-hover">
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
        'excludeCheckbox' : PropTypes.bool
    }

    static defaultProps = {
        'excludeCheckbox' : false,
        'label' : {
            'title' : 'File',
            'subtitle' : null
        },
        'hideNameOnHover' : false,
        'keepLabelOnHover' : true
    }

    constructor(props){
        super(props);
        this.filledFileRow = this.filledFileRow.bind(this);
        this.renderName = this.renderName.bind(this);
    }

    fileTypeSummary(){
        var file = this.props.file,
            fileFormat = fileUtil.getFileFormatStr(file),
            summary = (
                file.file_type_detailed ||
                ((file.file_type && fileFormat && (file.file_type + ' (' + fileFormat + ')')) || file.file_type) ||
                file.file_format ||
                '-'
            );

        // Remove 'other', if present, because it just takes up horizontal space.
        if (summary.slice(0, 6).toLowerCase() === 'other '){
            return summary.slice(7).slice(0, -1);
        }
        return summary;
    }

    filledFileRow(){
        var { columnHeaders, className, colWidthStyles, file } = this.props,
            row = [],
            cols = _.filter(columnHeaders, (col)=>{
                if (col.columnClass === 'file-detail') return true;
                return false;
            }),
            baseClassName = (className || '') + " col-file-detail item";

        for (var i = 0; i < cols.length; i++){

            var col = cols[i],
                colClassName = baseClassName + ' col-' + col.columnClass + ' detail-col-' + i,
                title = col.valueTitle || col.title,
                baseStyle = colWidthStyles ? colWidthStyles[col.field || col.columnClass || 'file-detail'] : null;

            if (typeof col.render === 'function'){
                row.push(
                    <div key={col.field || i} className={colClassName} style={baseStyle}>
                        { col.render(file, col.field, i, this.props) }
                    </div>
                );
                continue;
            }

            if (!file || !object.atIdFromObject(file)) {
                row.push(<div key={"file-detail-empty-" + i} className={colClassName} style={baseStyle}></div>);
                continue;
            }

            if (title === 'File Type'){
                row.push(<div key="file-type" className={colClassName} style={baseStyle}>{ this.fileTypeSummary() }</div>);
                continue;
            }

            if (typeof col.field === 'string'){
                let val = object.getNestedProperty(file, col.field, true);
                val = (val && Schemas.Term.toName(col.field, val, true)) || '-';
                if (col.field === 'quality_metric.overall_quality_status'){
                    var linkToReport = (file.quality_metric && file.quality_metric.url) || null;
                    if (val === 'PASS'){
                        val = (
                            <span>
                                <i className="icon icon-check success" style={{ 'color' : 'green' }}/>
                                &nbsp; { linkToReport ? <a href={linkToReport} target="_blank" rel="noreferrer noopener">Pass</a> : "Pass"}
                            </span>
                        );
                    } else if (val === 'FAIL'){
                        val = (
                            <span>
                                <i className="icon icon-times" style={{ 'color' : 'red' }}/>
                                &nbsp; { linkToReport ? <a href={linkToReport} target="_blank" rel="noreferrer noopener">Fail</a> : "Fail"}
                            </span>
                        );
                    }
                }
                row.push(<div key={col.field} className={colClassName} style={baseStyle}>{ val }</div>);
                continue;
            }

            if (title === 'File Info'){ // AKA Paired Info
                var fileFormat = fileUtil.getFileFormatStr(file);
                if (typeof file.paired_end !== 'undefined') {
                    row.push(<div key="file-info" className={colClassName} style={baseStyle}>Paired end {file.paired_end}</div>);
                } else if (fileFormat === 'fastq' || fileFormat === 'fasta') {
                    row.push(<div key="file-info" className={colClassName} style={baseStyle}>Unpaired</div>);
                } else {
                    row.push(<div key="file-info" className={colClassName} style={baseStyle}></div>);
                }
                continue;
            }
        }
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

        if (!file)                              fileTitleString = 'No Files';
        if (!fileTitleString && file.accession) fileTitleString = file.accession;
        if (!fileTitleString && fileAtId) {
            var idParts = _.filter(fileAtId.split('/'));
            if (idParts[1].slice(0,5) === '4DNFI'){
                fileTitleString = idParts[1];
            }
        }
        if (!fileTitleString)                   fileTitleString = file.uuid || fileAtId || 'N/A';

        if (typeof colForFile.render === 'function') {
            var renderedName = colForFile.render(file, this.props, { fileAtId, fileTitleString });
            if (renderedName) return <div key="name-title" className="name-title">{ renderedName }</div>;
        }

        if (!fileAtId) {
            return <div key="name-title" className="name-title">{ fileTitleString }</div>;
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

    /**
    * Add a link to an external JuiceBox site for some file types.
    * @param {string} fileHref          - URL path used to access the file
    * @param {boolean} fileIsHic        - If true the file format is HiC
    * @param {boolean} fileIsPublic     - If true the file can be publicly viewed
    * @param {string} host              - The host part of the current url
    *
    * @returns {JSX.Element|null} A button which opens up file to be viewed at HiGlass onClick, or void.
    */
    renderJuiceboxLink(fileHref, fileIsHic, fileIsPublic, host){
        var externalLinkButton = null;
        // Do not show the link if the file cannot be viewed by the public.
        if (fileIsHic && fileIsPublic) {
            // Make an external juicebox link.
            var onClick = function(evt){

                // If we're on the server side, there is no need to make an external link.
                if (isServerSide()) return null;

                var targetLocation = "http://aidenlab.org/juicebox/?hicUrl=" + host + fileHref;
                var win = window.open(targetLocation, '_blank');
                win.focus();
            };

            // Build the juicebox button
            externalLinkButton = (
                <Button key="juicebox-link-button" bsSize="xs" bsStyle="primary" className="text-600 inline-block clickable in-stacked-table-button" data-tip="Visualize this file in JuiceBox" onClick={onClick}>
                    J<i className="icon icon-fw icon-external-link text-smaller"/>
                </Button>
            );
        }

        // Return the External link.
        return externalLinkButton;
    }

    /**
    * Add a link to WashU Epigenome site for some file types.
    * @param {string} fileHref          - URL path used to access the file
    * @param {boolean} fileIsHic        - If true the file format is HiC
    * @param {boolean} fileIsPublic     - If true the file can be publicly viewed
    * @param {string} host              - The host part of the current url
    * @param {string} genome_assembly   - The file's genome assembly
    *
    * @returns {JSX.Element|null} A button which opens up file to be viewed at HiGlass onClick, or void.
    */
    renderEpigenomeLink(fileHref, fileIsHic, fileIsPublic, host, genome_assembly) {
        var externalLinkButton = null;

        // We may need to map the genome assembly to Epigenome's assemblies.
        const assemblyMap = {
            'GRCh38' : 'hg38',
            'GRCm38' : 'mm10'
        };

        // If the file lacks a genome assembly or it isn't in the expected mappings, do not show the button.
        if (!(genome_assembly && genome_assembly in assemblyMap)) {
            return null;
        }

        // Do not show the link if the file cannot be viewed by the public.
        if (fileIsHic && fileIsPublic) {
            // Make an external juicebox link.
            var onClick = function(evt){

                // If we're on the server side, there is no need to make an external link.
                if (isServerSide()) return null;

                const epiGenomeMapping = assemblyMap[genome_assembly];
                var targetLocation  = "http://epigenomegateway.wustl.edu/browser/?genome=" + epiGenomeMapping + "&hicUrl=" + host + fileHref;

                var win = window.open(targetLocation, '_blank');
                win.focus();
            };

            // Build the Epigenome button
            externalLinkButton = (
                <Button key="epigenome-link-button" bsSize="xs" bsStyle="primary" className="text-600 inline-block clickable in-stacked-table-button" data-tip="Visualize this file in WashU Epigenome Browser" onClick={onClick}>
                    E<i className="icon icon-fw icon-external-link text-smaller"/>
                </Button>
            );
        }

        // Return the External link.
        return externalLinkButton;
    }

    renderExternalButtons(){
        if (!this.props.file) return;
        var { file } = this.props,
            fileFormat              = fileUtil.getFileFormatStr(file),
            fileIsHic               = (file && file.href && ( // Needs an href + either it needs a file format of 'hic' OR it has a detailed file type that contains 'hic'
                (fileFormat && fileFormat === 'hic')
                || (file.file_type_detailed && file.file_type_detailed.indexOf('(hic)') > -1)
            )),
            externalLinkButton      = null,
            genome_assembly         = ("genome_assembly" in file) ? file.genome_assembly : null,
            fileIsPublic = (file.status === 'archived' || file.status === 'released'),
            fileHref = file.href,
            currentPageUrlBase = store && store.getState().href,
            hrefParts = url.parse(currentPageUrlBase),
            host = hrefParts.protocol + '//' + hrefParts.host;

        return (
            <React.Fragment>
                {this.renderJuiceboxLink(fileHref, fileIsHic, fileIsPublic, host)}
                {this.renderEpigenomeLink(fileHref, fileIsHic, fileIsPublic, host, genome_assembly)}
            </React.Fragment>
        );
    }

    renderName(){
        var { file, colWidthStyles } = this.props;
        return (
            <div key="file-entry-name-block" className={"name col-file" + (file && file.accession ? ' mono-text' : '')}
                style={colWidthStyles ? colWidthStyles.file : null}>
                { this.renderLabel() }
                <SingleFileCheckbox {...this.props} />
                { this.renderNameInnerTitle() }
                { this.renderExternalButtons() }
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
                    return [
                        cn,
                        { 'width' : columnWidths[index] }
                    ];
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
    };

    constructor(props){
        super(props);
        this.adjustedChildren = this.adjustedChildren.bind(this);
        this.colWidthStyles = this.colWidthStyles.bind(this);
        this.handleFileCheckboxChange = this.handleFileCheckboxChange.bind(this);

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

    adjustedChildren(){
        const { children, columnHeaders } = this.props;
        const colWidthStyles = this.colWidthStyles();

        return React.Children.map(children, (c)=>{
            //if (c.type.displayName !== 'StackedBlock') return c; // Only add props to StackedBlocks

            var addedProps = {};

            // REQUIRED & PASSED DOWN
            addedProps.handleFileCheckboxChange = this.handleFileCheckboxChange;
            addedProps.colWidthStyles           = colWidthStyles;
            addedProps.currentlyCollapsing      = this.state.collapsing;
            addedProps.expTable                 = this;
            addedProps.stackDepth               = 0;
            addedProps.columnHeaders            = columnHeaders;

            _.extend(
                addedProps,
                _.omit(this.props, 'columnHeaders', 'stackDepth', 'expTable', 'currentlyCollapsing',
                    'colWidthStyles', 'handleFileCheckboxChange')
            );

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

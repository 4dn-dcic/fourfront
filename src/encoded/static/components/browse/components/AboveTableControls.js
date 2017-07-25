
import React from 'react';
import PropTypes from 'prop-types';
import url from 'url';
import _ from 'underscore';
import ReactTooltip from 'react-tooltip';
import { MenuItem, Modal, DropdownButton, ButtonToolbar, ButtonGroup, Table, Checkbox, Button, Panel, Collapse } from 'react-bootstrap';
import { isServerSide, Filters, expFxn, navigate, object, layout, Schemas, DateUtility, ajax } from './../../util';
import * as vizUtil from './../../viz/utilities';
import { SearchResultTable } from './SearchResultTable';
import { CustomColumnSelector } from './CustomColumnController';
import { ChartDataController } from './../../viz/chart-data-controller';



class SelectedFilesOverview extends React.Component {

    totalFiles(){
        var exps = this.props.filteredExperiments || this.props.experiments;
        if (!exps) return 0;
        return expFxn.fileCountFromExperiments(exps, this.props.includeFileSets);
    }

    render(){
        var selectedFilesCount = _.keys(this.props.selectedFiles).length;
        var totalFilesCount = this.totalFiles();
        
        return (
            <div className="pull-left box">
                <span className="text-500">{ selectedFilesCount }</span> / { totalFilesCount } files selected.
            </div>
        );
    }
}





/**
 * This component must be fed props from CustomColumnController (for columns UI), SelectedFilesController (for selected files read-out).
 * Some may need to be transformed to exclude certain non-user-controlled columns (e.g. @type) and such.
 */
export class AboveTableControls extends React.Component {

    static defaultProps = {
        'showSelectedFileCount' : false,
        'showTotalResults' : false
    }

    constructor(props){
        super(props);
        this.componentWillMount = this.componentWillMount.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.handleWindowResize = _.debounce(this.handleWindowResize.bind(this), 300);
        this.handleOpenToggle = _.throttle(this.handleOpenToggle.bind(this), 350);
        this.handleLayoutToggle = _.throttle(this.handleLayoutToggle.bind(this), 350);
        this.renderPanel = this.renderPanel.bind(this);
        this.rightButtons = this.rightButtons.bind(this);
        this.state = {
            'open' : false,
            'reallyOpen' : false,
            'layout' : 'normal'
        };
    }

    componentWillMount(){
        if (!isServerSide()){
            window.addEventListener('resize', this.handleWindowResize);
        }
    }

    componentWillUnmount(){
        window.removeEventListener('resize', this.handleWindowResize);
    }

    componentDidUpdate(prevProps, prevState){
        if (this.state.open || prevState.open !== this.state.open) ReactTooltip.rebuild();
        if (this.state.layout === 'wide' && prevState.layout !== 'wide') {
            this.setWideLayout();
        } else if (this.state.layout !== 'wide' && prevState.layout === 'wide'){
            this.unsetWideLayout();
        }
    }

    handleWindowResize(e){
        if (isServerSide() || !document || !document.body) return null;
        if (this.state.layout === 'wide'){
            if ((document.body.offsetWidth || window.innerWidth) < 1200) {
                this.setState({ 'layout' : 'normal' });
            } else {
                this.setWideLayout();
            }
        }
    }

    setWideLayout(){
        if (isServerSide() || !document || !document.getElementsByClassName || !document.body) return null;
        vizUtil.requestAnimationFrame(()=>{
            var browsePageContainer = document.getElementsByClassName('browse-page-container')[0];
            var bodyWidth = document.body.offsetWidth || window.innerWidth;
            if (bodyWidth < 1200) {
                this.handleLayoutToggle(); // Cancel
                throw new Error('Not large enough window width to expand. Aborting.');
            }
            var extraWidth = bodyWidth - 1180;
            browsePageContainer.style.marginLeft = browsePageContainer.style.marginRight = -(extraWidth / 2) + 'px';
            this.lastBodyWidth = bodyWidth;
            setTimeout(this.props.parentForceUpdate, 100);
        });
    }

    unsetWideLayout(){
        if (isServerSide() || !document || !document.getElementsByClassName) return null;
        vizUtil.requestAnimationFrame(()=>{
            var browsePageContainer = document.getElementsByClassName('browse-page-container')[0];
            browsePageContainer.style.marginLeft = browsePageContainer.style.marginRight = '';
            setTimeout(this.props.parentForceUpdate, 100);
        });
    }

    handleOpenToggle(value){
        if (this.timeout){
            clearTimeout(this.timeout);
            delete this.timeout;
        }
        var state = { 'open' : value };
        if (state.open){
            state.reallyOpen = state.open;
        } else {
            this.timeout = setTimeout(()=>{
                this.setState({ 'reallyOpen' : false });
            }, 400);
        }
        this.setState(state);
    }

    handleLayoutToggle(){
        if (!SearchResultTable.isDesktopClientside()) return null;
        var state = { };
        if (this.state.layout === 'normal'){
            state.layout = 'wide';
        } else {
            state.layout = 'normal';
        }
        this.setState(state);
    }

    renderPanel(){
        var { open, reallyOpen } = this.state;
        if (open === 'customColumns' || reallyOpen === 'customColumns') {
            return (
                <Collapse in={!!(open)} transitionAppear>
                    <CustomColumnSelector
                        hiddenColumns={this.props.hiddenColumns}
                        addHiddenColumn={this.props.addHiddenColumn}
                        removeHiddenColumn={this.props.removeHiddenColumn}
                        columnDefinitions={this.props.columnDefinitions}
                        //columnDefinitions={CustomColumnSelector.buildColumnDefinitions(
                        //    browseTableConstantColumnDefinitions,
                        //    this.props.context.columns || {},
                        //    {}, //this.props.columnDefinitionOverrides,
                        //    this.props.constantHiddenColumns
                        //)}
                    />
                </Collapse>
            );
        }
        return null;
    }

    leftSection(){
        if (this.props.showSelectedFileCount && this.props.selectedFiles){
            return (
                <ChartDataController.Provider>
                    <SelectedFilesOverview selectedFiles={this.props.selectedFiles} />
                </ChartDataController.Provider>
            );
        }
        if (this.props.showTotalResults) {
            var total;
            if (typeof this.props.showTotalResults === 'number') total = this.props.showTotalResults;
            if (this.props.context && this.props.context.total) total = this.props.context.total;
            if (!total) return null;
            return (
                <div className="pull-left box results-count">
                    <span className="text-500">{ total }</span> Results
                </div>
            );
        }
        return null;
    }

    rightButtons(){
        var { open, layout } = this.state;

        function expandLayoutButton(){
            return (
                <Button key="toggle-expand-layout" className={"expand-layout-button" + (layout === 'normal' ? '' : ' expanded')} onClick={this.handleLayoutToggle} data-tip={(layout === 'normal' ? 'Expand' : 'Collapse') + " table width"}>
                    <i className={"icon icon-fw icon-" + (layout === 'normal' ? 'arrows-alt' : 'crop')}></i>
                </Button>
            );
        }

        return open === false ? (
            <div className="pull-right right-buttons">
                <Button key="toggle-visible-columns" onClick={this.handleOpenToggle.bind(this, (!open && 'customColumns') || false)} data-tip="Configure visible columns" data-event-off="click">
                    <i className="icon icon-eye-slash icon-fw"/> Columns
                </Button>
                { expandLayoutButton.call(this) }
            </div>
        ) : (
            <div className="pull-right right-buttons" data-tip="">

                Close &nbsp;
                
                <Button key="toggle-visible-columns" onClick={this.handleOpenToggle.bind(this, false)}>
                    <i className="icon icon-angle-up icon-fw"></i>
                </Button>
                
            </div>
        );
    }


    render(){

        return (
            <div className="above-results-table-row">
                <div className="clearfix">
                    { this.leftSection() }
                    { this.rightButtons() }
                </div>
                { this.renderPanel() }
            </div>
        );
    }
}
'use strict';

import React from 'react';
import _ from 'underscore';
import url from 'url';
import memoize from 'memoize-one';

import { console, layout, searchFilters, analytics } from '@hms-dbmi-bgm/shared-portal-components/src/components/util';
import { Schemas } from './../../util';
import { DropdownButton, DropdownItem } from '@hms-dbmi-bgm/shared-portal-components/src/components/forms/components/DropdownButton';
import * as vizUtil from '@hms-dbmi-bgm/shared-portal-components/src/components/viz/utilities';
import { Legend } from './../components';

/**
 * Component which wraps BarPlot.Chart and provides some UI buttons and stuff.
 * Passes props to BarPlot.Chart.
 */
export class UIControlsWrapper extends React.PureComponent {

    static canShowChart(chartData){
        if (!chartData) return false;
        if (!chartData.total) return false;
        if (chartData.total && chartData.total.experiment_sets === 0) return false;
        if (typeof chartData.field !== 'string') return false;
        if (typeof chartData.terms !== 'object') return false;
        if (_.keys(chartData.terms).length === 0) return false;
        return true;
    }

    static contextualView = memoize(function(href){
        if (href){
            // Hide on homepage.
            const hrefParts = url.parse(href);
            if (hrefParts.pathname === '/' || hrefParts.pathname === '/home'){
                return 'home';
            }
        }
        return 'browse';
    });

    static defaultProps = {
        'titleMap' : {
            // Aggr type
            'experiment_sets'   : "Experiment Sets",
            'experiments'       : 'Experiments',
            'files'             : "Files",

            // Show state
            'all'               : 'All',
            'filtered'          : 'Selected',
            'both'              : 'All & Selected'
        },
        'availableFields_XAxis' : [
            { title : "Experiment Type", field : 'experiments_in_set.experiment_type.display_title' },
            //{ title : "Digestion Enzyme", field : "experiments_in_set.digestion_enzyme.name" },
            { title : "Biosource", field : "experiments_in_set.biosample.biosource_summary" },
            { title : "Biosource Type", field : 'experiments_in_set.biosample.biosource.biosource_type' },
            { title : "Organism", field : "experiments_in_set.biosample.biosource.individual.organism.name" },
            { title : "Project", field : "award.project" },
            { title : "Lab", field : "lab.display_title" },
            { title : "Status", field : "status" }
        ],
        'availableFields_Subdivision' : [
            { title : "Organism", field : "experiments_in_set.biosample.biosource.individual.organism.name" },
            { title : "Experiment Type", field : 'experiments_in_set.experiment_type.display_title' },
            //{ title : "Digestion Enzyme", field : "experiments_in_set.digestion_enzyme.name" },
            { title : "Biosource Type", field : 'experiments_in_set.biosample.biosource.biosource_type' },
            { title : "Biosource", field : "experiments_in_set.biosample.biosource_summary" },
            { title : "Project", field : "award.project" },
            { title : "Center", field : "award.center_title" },
            { title : "Lab", field : "lab.display_title" },
            { title : "Status", field : "status" }
        ],
        'legend' : false,
        'chartHeight' : 300
    };

    static getDerivedStateFromProps({ barplot_data_filtered }, { showState }){
        // Switch to 'all' if filtered data to show.
        // Inverse of this is done in componentDidUpdate if filtered data arrives for first time.
        if (showState === "filtered" && (!barplot_data_filtered || barplot_data_filtered && barplot_data_filtered.total.experiment_sets === 0)){
            return { 'showState' : 'all' };
        }
        return null;
    }

    constructor(props){
        super(props);
        _.bindAll(this, 'filterObjExistsAndNoFiltersSelected', 'titleMap', 'adjustedChildChart',
            'getFieldAtIndex', 'renderDropDownMenuItems', 'handleDropDownToggle', 'renderShowTypeDropdown');

        this.handleDropDownShowTypeToggle = this.handleDropDownToggle.bind(this, 'showType');
        this.handleDropDownSubdivisionFieldToggle = this.handleDropDownToggle.bind(this, 'subdivisionField');
        this.handleDropDownYAxisFieldToggle = this.handleDropDownToggle.bind(this, 'yAxis');
        this.handleDropDownXAxisFieldToggle = this.handleDropDownToggle.bind(this, 'xAxisField');
        this.handleFirstFieldSelect = this.handleFieldSelect.bind(this, 0);
        this.handleSecondFieldSelect = this.handleFieldSelect.bind(this, 1);

        this.handleAggregateTypeSelect = _.throttle(this.handleAggregateTypeSelect.bind(this), 750);
        this.handleExperimentsShowType = _.throttle(this.handleExperimentsShowType.bind(this), 750, { trailing : false });
        this.handleFieldSelect = _.throttle(this.handleFieldSelect.bind(this), 300);

        this.state = {
            'aggregateType' : 'experiment_sets',
            'showState' : this.filterObjExistsAndNoFiltersSelected() || (props.barplot_data_filtered && props.barplot_data_filtered.total.experiment_sets === 0) ? 'all' : 'filtered',
            'openDropdown' : null
        };
    }

    componentDidUpdate({ barplot_data_filtered : pastFilteredData }){
        const { barplot_data_filtered : newFilteredData } = this.props;
        this.setState(function({ showState }){
            // Set to filtered if new filtered data arrives.
            // Inverse of this done in getDerivedStateFromProps
            if (showState === "all" && newFilteredData &&
                newFilteredData.total.experiment_sets > 0 &&
                (!pastFilteredData || pastFilteredData.total.experiment_sets === 0)){
                return { 'showState' : 'filtered' };
            }
            return null;
        });
    }

    // TODO: MAYBE REMOVE HREF WHEN SWITCH SEARCH FROM /BROWSE/
    filterObjExistsAndNoFiltersSelected(){
        const { expSetFilters, href } = this.props;
        return searchFilters.filterObjExistsAndNoFiltersSelected(expSetFilters) && !searchFilters.searchQueryStringFromHref(href);
    }

    titleMap(key = null, fromDropdown = false){
        const { titleMap } = this.props, { aggregateType } = this.state;
        if (!key) return titleMap;
        let title = titleMap[key];
        if (fromDropdown && ['all','filtered'].indexOf(key) > -1){
            title += ' ' + this.titleMap(aggregateType);
        } else if (fromDropdown && key == 'both'){
            return 'Both';
        }
        return title;
    }

    /**
     * Clones props.children, expecting a Chart React Component as the sole child, and extends Chart props with 'fields', 'showType', and 'aggregateType'.
     *
     * @todo validate that props.children is a BarPlot.Chart
     * @returns {React.Component} Cloned & extended props.children.
     */
    adjustedChildChart(){
        const { children, barplot_data_fields } = this.props;
        const { showState, aggregateType } = this.state;
        return React.cloneElement(children, _.extend(
            _.omit( // Own props minus these.
                this.props,
                'titleMap', 'availableFields_XAxis', 'availableFields_Subdivision', 'legend', 'chartHeight', 'children'
            ),
            { 'fields' : barplot_data_fields, 'showType' : showState, 'aggregateType' : aggregateType }
        ));
    }

    handleAggregateTypeSelect(eventKey, event){
        this.setState({ 'aggregateType' : eventKey });
    }

    handleExperimentsShowType(eventKey, event){
        this.setState({ 'showState' : eventKey });
    }

    /**
     * Handler for the Dropdown components which offer field options.
     *
     * @prop {function} updateBarPlotFields - Analog of ChartDataController.updateBarPlotFields, passed in by ChartDataController.Provider.
     * @prop {string[]} barplot_data_fields - List of currently aggregated fields; passed in by ChartDataController.Provider.
     *
     * @param {number} fieldIndex   Index of field in aggregation being changed -- must be 0 or 1.
     * @param {string} newFieldKey  Dot-delimited name of field used for aggregation, e.g. 'lab.display_title'.
     * @param {Event} [event]       Reference to event of DropDown change.
     */
    handleFieldSelect(fieldIndex, newFieldKey, event = null){
        const { barplot_data_fields, updateBarPlotFields, availableFields_XAxis, availableFields_Subdivision } = this.props;
        let newFields;

        if (newFieldKey === "none"){
            // Only applies to subdivision (fieldIndex 1)
            newFields = barplot_data_fields.slice(0,1);
            updateBarPlotFields(newFields);
            return;
        }

        const propToGetFieldFrom = fieldIndex === 0 ? availableFields_XAxis : availableFields_Subdivision;
        const newField = _.find(propToGetFieldFrom, { 'field' : newFieldKey });
        const otherFieldIndex = fieldIndex === 0 ? 1 : 0;

        if (fieldIndex === 0 && barplot_data_fields.length === 1){
            newFields = [null];
        } else {
            newFields = [null, null];
        }

        newFields[fieldIndex] = newField;
        if (newFields.length > 1){
            const foundFieldFromProps = _.findWhere(
                availableFields_Subdivision.slice(0).concat(availableFields_XAxis.slice(0)),
                { 'field' : barplot_data_fields[otherFieldIndex] }
            );
            newFields[otherFieldIndex] = foundFieldFromProps || {
                'title' : barplot_data_fields[otherFieldIndex],
                'field' : barplot_data_fields[otherFieldIndex]
            };
        }
        updateBarPlotFields(_.pluck(newFields, 'field'));
        analytics.event('BarPlot', 'Set Aggregation Field', {
            'eventLabel' : '[' + _.pluck(newFields, 'field').join(', ') + ']',
            'field' : newFieldKey
        });
    }

    getFieldAtIndex(fieldIndex){
        const { barplot_data_fields, availableFields_XAxis, availableFields_Subdivision } = this.props;
        if (!barplot_data_fields) return null;
        if (!Array.isArray(barplot_data_fields)) return null;
        if (barplot_data_fields.length < fieldIndex + 1) return null;

        return (
            _.findWhere(availableFields_Subdivision.slice(0).concat(availableFields_XAxis.slice(0)), { 'field' : barplot_data_fields[fieldIndex] })
        ) || {
            'title' : barplot_data_fields[fieldIndex],
            'field' : barplot_data_fields[fieldIndex]
        };
    }

    renderDropDownMenuItems(keys, active = null){
        return _.map(keys, (menuKey)=>{
            var [ key, title = null, subtitle = null, disabled = false, tooltip = null ] = Array.isArray(menuKey) ? menuKey : [ menuKey ];
            if (typeof title === 'string' && typeof tooltip === 'string'){
                title = <span className="inline-block" data-tip={tooltip} data-place="left">{ title }</span>;
            }

            return (
                <DropdownItem key={key} eventKey={key} active={key === active} disabled={disabled}>
                    { title || this.titleMap(key, true) }
                </DropdownItem>
            );
        });
    }

    handleDropDownToggle(id, isOpen, evt, source){
        if (isOpen){
            setTimeout(()=>{
                this.setState({ 'openDropdown' : id });
            }, 10);
        } else {
            this.setState({ 'openDropdown' : null });
        }
    }

    renderShowTypeDropdown(){
        const { href, barplot_data_filtered } = this.props;
        const { aggregateType, showState } = this.state;
        const contextualView = UIControlsWrapper.contextualView(href);
        if (contextualView === 'home'){
            return null;
        }
        // TODO: MAYBE REMOVE HREF WHEN SWITCH SEARCH FROM /BROWSE/
        const isSelectedDisabled = (this.filterObjExistsAndNoFiltersSelected() && !searchFilters.searchQueryStringFromHref(href)) || (barplot_data_filtered && barplot_data_filtered.total.experiment_sets === 0);
        const aggrTypeTitle = this.titleMap(aggregateType);
        const showStateTitle = showState === 'all' ? 'All' : 'Selected';
        return (
            <div className="show-type-change-section">
                <h6 className="dropdown-heading">
                    <span className="inline-block" data-tip={isSelectedDisabled ? "Enable some filters to enable toggling between viewing all and selected items." : null}>Show</span>
                </h6>
                <DropdownButton
                    id="select-barplot-show-type"
                    onSelect={this.handleExperimentsShowType}
                    bsSize="xsmall"
                    disabled={isSelectedDisabled}
                    title={
                        <React.Fragment>
                            <span className="text-600">{ showStateTitle }</span> { aggrTypeTitle }
                        </React.Fragment>
                    }
                    onToggle={this.handleDropDownShowTypeToggle}>
                    {
                        this.renderDropDownMenuItems([
                            [
                                'all',
                                <span key={0}>
                                    <span className="text-500">All</span> { this.titleMap(aggregateType) }
                                </span>
                            ],
                            [
                                'filtered',
                                <span key={1} className="inline-block" data-place="left" data-tip={isSelectedDisabled ? 'No filters currently set' : null}>
                                    <span className="text-500">Selected</span> { this.titleMap(aggregateType) }
                                </span>,
                                null,
                                isSelectedDisabled
                            ]
                        ], showState)
                    }
                </DropdownButton>
            </div>
        );
    }

    renderGroupByFieldDropdown(){
        const { isLoadingChartData, barplot_data_fields, availableFields_Subdivision } = this.props;
        let title;
        if (isLoadingChartData){
            title = <span style={{ opacity : 0.33 }}><i className="icon icon-spin icon-circle-o-notch"/></span>;
        } else {
            const field = this.getFieldAtIndex(1);
            if (!field) title = "None";
            else title = field.title || Schemas.Field.toName(field.field);
        }
        return (
            <div className="field-1-change-section">
                <h6 className="dropdown-heading">Group By</h6>
                <DropdownButton id="select-barplot-field-1" onSelect={this.handleSecondFieldSelect}
                    disabled={isLoadingChartData} title={title}
                    onToggle={this.handleDropDownSubdivisionFieldToggle}>
                    {
                        this.renderDropDownMenuItems(
                            _.map(availableFields_Subdivision.slice(0).concat([{
                                title : <em>None</em>,
                                field : "none"
                            }]), function(field){
                                //const isDisabled = barplot_data_fields[0] === field.field;
                                return [
                                    field.field,                                        // Field
                                    field.title || Schemas.Field.toName(field.field),   // Title
                                    field.description || null,                          // Description
                                    //isDisabled,                                         // Disabled
                                    //isDisabled ? "Field already selected for X-Axis" : null
                                ]; // key, title, subtitle, disabled
                            }),
                            barplot_data_fields[1] || "none"
                        )
                    }
                </DropdownButton>
            </div>
        );
    }

    render(){
        const {
            barplot_data_filtered, barplot_data_unfiltered, barplot_data_fields, isLoadingChartData, href,
            availableFields_XAxis, availableFields_Subdivision, schemas, chartHeight, windowWidth, cursorDetailActions
        } = this.props;
        const { aggregateType, showState } = this.state;

        if (!UIControlsWrapper.canShowChart(barplot_data_unfiltered)) return null;

        const windowGridSize = layout.responsiveGridState(windowWidth);
        const contextualView = UIControlsWrapper.contextualView(href);

        const legendContainerHeight = windowGridSize === 'xs' ? null
            : chartHeight - (49 * (contextualView === 'home' ? 1 : 2 )) - 50;

        vizUtil.unhighlightTerms();

        let xAxisDropdownTitle;
        if (isLoadingChartData){
            xAxisDropdownTitle = <span style={{ opacity : 0.33 }}><i className="icon icon-spin icon-circle-o-notch"/></span>;
        } else {
            const field = this.getFieldAtIndex(0);
            xAxisDropdownTitle = <span>{(field.title || Schemas.Field.toName(field.field))}</span>;
        }

        return (
            <div className="bar-plot-chart-controls-wrapper">
                <div className="overlay" style={{
                    width  : (windowGridSize !== 'xs' ? (layout.gridContainerWidth(windowWidth) * (9/12) - 15) : null)
                }}>

                    <div className="y-axis-top-label" style={{
                        width : chartHeight,
                        top: chartHeight - 4
                    }}>
                        <div className="row" style={{ 'maxWidth' : 210, 'float': 'right' }}>
                            <div className="col-xs-3" style={{ 'width' : 51 }}>
                                <h6 className="dropdown-heading">Y Axis</h6>
                            </div>
                            <div className="col-xs-9" style={{ 'width' : 159, 'textAlign' : 'left' }}>
                                <DropdownButton
                                    id="select-barplot-aggregate-type"
                                    bsSize="xsmall"
                                    onSelect={this.handleAggregateTypeSelect}
                                    title={this.titleMap(aggregateType)}
                                    onToggle={this.handleDropDownYAxisFieldToggle}>
                                    { this.renderDropDownMenuItems(['experiment_sets','experiments','files'], aggregateType) }
                                </DropdownButton>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="row">
                    <div className="col-sm-9">{ this.adjustedChildChart() }</div>
                    <div className="col-sm-3 chart-aside" style={{ 'height' : chartHeight }}>
                        { this.renderShowTypeDropdown() }
                        { this.renderGroupByFieldDropdown() }
                        <div className="legend-container" style={{ 'height' : legendContainerHeight }}>
                            <AggregatedLegend {...{ cursorDetailActions, barplot_data_filtered, barplot_data_unfiltered, aggregateType, schemas }}
                                height={legendContainerHeight}
                                field={_.findWhere(availableFields_Subdivision, { 'field' : barplot_data_fields[1] }) || null}
                                showType={showState} />
                        </div>
                        <div className="x-axis-right-label">
                            <div className="row">
                                <div className="col-xs-3" style={{ width : 51 }}>
                                    <h6 className="dropdown-heading">X Axis</h6>
                                </div>
                                <div className="col-xs-9 pull-right" style={{ "width" : (layout.gridContainerWidth(windowWidth) * (windowGridSize !== 'xs' ? 0.25 : 1)) + 5 - 52 }}>
                                    <DropdownButton
                                        id="select-barplot-field-0"
                                        onSelect={this.handleFirstFieldSelect}
                                        disabled={isLoadingChartData}
                                        title={xAxisDropdownTitle}
                                        onToggle={this.handleDropDownXAxisFieldToggle}>
                                        {
                                            this.renderDropDownMenuItems(
                                                _.map(availableFields_XAxis, function(field){
                                                    //const isDisabled = barplot_data_fields[1] && barplot_data_fields[1] === field.field;
                                                    return [
                                                        field.field,
                                                        field.title || Schemas.Field.toName(field.field),
                                                        field.description || null,
                                                        //isDisabled,
                                                        //isDisabled ? 'Field is already selected for "Group By"' : null
                                                    ]; // key, title, subtitle
                                                }),
                                                barplot_data_fields[0]
                                            )
                                        }
                                    </DropdownButton>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </div>
        );
    }

}

export class AggregatedLegend extends React.Component {

    static collectSubDivisionFieldTermCounts = memoize(function(rootField, aggregateType = 'experiment_sets'){
        if (!rootField) return null;

        const retField = {
            'field' : null,
            'terms' : {},
            'total' : {
                'experiment_sets' : 0,
                'experiments' : 0,
                'files' : 0
            }
        };

        _.forEach(_.keys(rootField.terms), function(term){
            const childField = rootField.terms[term];
            if (typeof retField.field === 'undefined' || !retField.field) retField.field = childField.field;

            _.forEach(_.keys(childField.terms), function(t){
                if (typeof retField.terms[t] === 'undefined'){
                    retField.terms[t] = {
                        'experiment_sets' : 0,
                        'experiments' : 0,
                        'files' : 0
                    };
                }
                retField.terms[t].experiment_sets += childField.terms[t].experiment_sets;
                retField.terms[t].experiments += childField.terms[t].experiments;
                retField.terms[t].files += childField.terms[t].files;
                retField.total.experiment_sets += childField.terms[t].experiment_sets;
                retField.total.experiments += childField.terms[t].experiments;
                retField.total.files += childField.terms[t].files;
            });
        });

        retField.terms = _.object(_.sortBy(_.pairs(retField.terms), function(termPair){ return termPair[1][aggregateType]; }));

        return retField;
    });

    constructor(props){
        super(props);
        this.getFieldForLegend = this.getFieldForLegend.bind(this);
        this.updateIfShould = this.updateIfShould.bind(this);
        this.width = this.width.bind(this);
        this.height = this.height.bind(this);

        this.legendContainerRef = React.createRef();
    }

    componentDidMount(){
        this.updateIfShould();
    }

    componentDidUpdate(pastProps, pastState){
        this.updateIfShould();
    }

    getFieldForLegend(){
        const { field, barplot_data_unfiltered, barplot_data_filtered, aggregateType, showType } = this.props;
        return Legend.barPlotFieldDataToLegendFieldsData(
            AggregatedLegend.collectSubDivisionFieldTermCounts(
                showType === 'all' ? barplot_data_unfiltered : barplot_data_filtered || barplot_data_unfiltered,
                aggregateType || 'experiment_sets',
                field
            ),
            function(term){ return typeof term[aggregateType] === 'number' ? -term[aggregateType] : 'term'; }
        );
    }

    /**
     * Do a forceUpdate() in case we set this.shouldUpdate = true in an initial render.
     * this.shouldUpdate would be set if legend fields do not have colors yet from cache.
     */
    updateIfShould(){
        const fieldForLegend = this.getFieldForLegend();
        const shouldUpdate = (
            fieldForLegend &&
            fieldForLegend.terms && fieldForLegend.terms.length > 0 &&
            fieldForLegend.terms[0] && fieldForLegend.terms[0].color === null
        );

        if (shouldUpdate){
            setTimeout(()=>{
                this.forceUpdate();
            }, 750);
        }
    }

    width(){
        const { width : propWidth, windowWidth } = this.props;
        if (propWidth) return propWidth;
        const elem = this.legendContainerRef.current;
        const width = elem && elem.offsetWidth;

        return width || layout.gridContainerWidth(windowWidth) * (3/12) - 15;
    }

    height(){
        const { height : propHeight } = this.props;
        if (propHeight) return propHeight;
        const elem = this.legendContainerRef.current;
        const height = elem && elem.offsetHeight;
        return height || null;
    }

    render(){
        const { field, barplot_data_unfiltered, isLoadingChartData, aggregateType, href, cursorDetailActions, schemas } = this.props;
        if (!field || !barplot_data_unfiltered || isLoadingChartData || (barplot_data_unfiltered.total && barplot_data_unfiltered.total.experiment_sets === 0)){
            return null;
        }

        const fieldForLegend = this.getFieldForLegend();

        return (
            <div className="legend-container-inner" ref={this.legendContainerRef}>
                <Legend {...{ href, aggregateType, cursorDetailActions }} field={fieldForLegend || null}
                    includeFieldTitles={false} schemas={schemas}
                    width={this.width()} height={this.height()} hasPopover
                    //expandable
                    //expandableAfter={8}
                    //cursorDetailActions={boundActions(this, showType)}
                />
            </div>
        );
    }
}

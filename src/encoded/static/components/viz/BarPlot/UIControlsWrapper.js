'use strict';

var React = require('react');
var _ = require('underscore');
var url = require('url');
var vizUtil = require('./../utilities');
var { RotatedLabel, Legend } = require('./../components');
var { console, object, isServerSide, expFxn, Filters, Schemas, layout } = require('./../../util');
var { ButtonToolbar, ButtonGroup, Button, DropdownButton, MenuItem } = require('react-bootstrap');
var { Toggle } = require('./../../inputs');
import { boundActions } from './ViewContainer';

/**
 * Component which wraps BarPlot.Chart and provides some UI buttons and stuff.
 * Passes props to BarPlot.Chart.
 * 
 * @type {Component}
 */
export class UIControlsWrapper extends React.Component {

    static defaultProps = {
        'titleMap' : {
            // Aggr type
            'experiment_sets' : "Experiment Sets",
            'experiments' : 'Experiments',
            'files' : "Files",

            // Show state
            'all' : 'All',
            'filtered' : 'Selected',
            'both' : 'All & Selected'
        },
        'availableFields_XAxis' : [
            { title : "Experiment Type", field : 'experiments_in_set.experiment_type' },
            { title : "Digestion Enzyme", field : "experiments_in_set.digestion_enzyme.name" },
            { title : "Biosource", field : "experiments_in_set.biosample.biosource_summary" },
            { title : "Biosource Type", field : 'experiments_in_set.biosample.biosource.biosource_type' },
            { title : "Organism", field : "experiments_in_set.biosample.biosource.individual.organism.name" },
            { title : "Project", field : "award.project" },
            { title : "Lab", field : "lab.title" }
        ],
        'availableFields_Subdivision' : [
            { title : "Project", field : "award.project" },
            { title : "Organism", field : "experiments_in_set.biosample.biosource.individual.organism.name" },
            { title : "Experiment Type", field : 'experiments_in_set.experiment_type' },
            { title : "Digestion Enzyme", field : "experiments_in_set.digestion_enzyme.name" },
            { title : "Biosource", field : "experiments_in_set.biosample.biosource_summary" },
            { title : "Biosource Type", field : 'experiments_in_set.biosample.biosource.biosource_type' },
            { title : "Lab", field : "lab.title" }
        ],
        'legend' : false,
        'chartHeight' : 300
    }

    constructor(props){
        super(props);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.filterObjExistsAndNoFiltersSelected = this.filterObjExistsAndNoFiltersSelected.bind(this);
        this.titleMap = this.titleMap.bind(this);
        this.adjustedChildChart = this.adjustedChildChart.bind(this);
        this.handleAggregateTypeSelect = _.throttle(this.handleAggregateTypeSelect.bind(this), 750);
        this.handleExperimentsShowType = _.throttle(this.handleExperimentsShowType.bind(this), 750, { trailing : false });
        this.handleFieldSelect = _.throttle(this.handleFieldSelect.bind(this), 300);
        this.getFieldAtIndex = this.getFieldAtIndex.bind(this);
        this.contextualView = this.contextualView.bind(this);
        this.renderDropDownMenuItems = this.renderDropDownMenuItems.bind(this);
        this.handleDropDownToggle = this.handleDropDownToggle.bind(this);
        this.renderShowTypeDropdown = this.renderShowTypeDropdown.bind(this);
        this.render = this.render.bind(this);

        this.state = {
            'fields' : [
                props.availableFields_XAxis[0],
                props.availableFields_Subdivision[0],
                //{ title : "Experiment Summary", field : "experiments_in_set.experiment_summary" }
            ],
            'aggregateType' : 'experiment_sets',
            'showState' : this.filterObjExistsAndNoFiltersSelected(props.expSetFilters) ? 'all' : 'filtered',
            'openDropdown' : null
        };
    }

    componentWillReceiveProps(nextProps){
        if (
            // TODO: MAYBE REMOVE HREF WHEN SWITCH SEARCH FROM /BROWSE/
            this.filterObjExistsAndNoFiltersSelected(this.props.expSetFilters, this.props.href) &&
            !this.filterObjExistsAndNoFiltersSelected(nextProps.expSetFilters, nextProps.href) && (
                this.state.showState === 'all'
            )
        ){
            this.setState({ 'showState' : 'filtered' });
        } else if (
            // TODO: MAYBE REMOVE HREF WHEN SWITCH SEARCH FROM /BROWSE/
            this.filterObjExistsAndNoFiltersSelected(nextProps.expSetFilters, nextProps.href) &&
            !this.filterObjExistsAndNoFiltersSelected(this.props.expSetFilters, this.props.href) && (
                this.state.showState === 'filtered'
            )
        ){
            this.setState({ 'showState' : 'all' });
        }
    }

    // TODO: MAYBE REMOVE HREF WHEN SWITCH SEARCH FROM /BROWSE/
    filterObjExistsAndNoFiltersSelected(expSetFilters = this.props.expSetFilters, href = this.props.href){
        return Filters.filterObjExistsAndNoFiltersSelected(expSetFilters) && !Filters.searchQueryStringFromHref(href);
    }

    titleMap(key = null, fromDropdown = false){
        if (!key) return this.props.titleMap;
        var title = this.props.titleMap[key];
        if (fromDropdown && ['all','filtered'].indexOf(key) > -1){
            title += ' ' + this.titleMap(this.state.aggregateType);
        } else if (fromDropdown && key == 'both'){
            return 'Both';
        }
        return title;
    }

    /**
     * Clones props.children, expecting a Chart React Component as the sole child, and extends Chart props with 'fields', 'showType', and 'aggregateType'.
     *
     * @returns {React.Component} Cloned & extended props.children.
     */
    adjustedChildChart(){
        // TODO: validate that props.children is a BarPlot.Chart

        return React.cloneElement(
            this.props.children,
            _.extend(
                _.omit( // Own props minus these.
                    this.props,
                    'titleMap', 'availableFields_XAxis', 'availableFields_Subdivision', 'legend', 'chartHeight', 'children'
                ),
                {
                    'fields' : this.state.fields,
                    'showType' : this.state.showState,
                    'aggregateType' : this.state.aggregateType,
                }
            )
        );
    }


    handleAggregateTypeSelect(eventKey, event){
        this.setState({ aggregateType : eventKey });
    }

    handleExperimentsShowType(eventKey, event){
        this.setState({ showState : eventKey });
    }

    handleFieldSelect(fieldIndex, newFieldKey, event){
        var newFields;
        if (newFieldKey === "none"){ // Only applies to subdivision (fieldIndex 1)
            newFields = this.state.fields.slice(0,1);
            this.setState({ fields : newFields });
            return;
        }

        var newField = _.find(
            this.props['availableFields' + (fieldIndex === 0 ? '_XAxis' : '_Subdivision') ],
            { field : newFieldKey }
        );
        var otherFieldIndex = fieldIndex === 0 ? 1 : 0;
        if (fieldIndex === 0 && this.state.fields.length === 1){
            newFields = [null];
        } else {
            newFields = [null, null];
        }
        newFields[fieldIndex] = newField;
        if (newFields.length > 1) newFields[otherFieldIndex] = this.state.fields[otherFieldIndex];
        setTimeout(()=>{
            this.setState({ fields : newFields });
        });
    }

    getFieldAtIndex(fieldIndex){
        if (!this.state.fields) return null;
        if (!Array.isArray(this.state.fields)) return null;
        if (this.state.fields.length < fieldIndex + 1) return null;
        return this.state.fields[fieldIndex];
    }

    contextualView(){
        if (this.props.href){
            // Hide on homepage.
            var hrefParts = url.parse(this.props.href);
            if (hrefParts.pathname === '/' || hrefParts.pathname === '/home'){
                return 'home';
            }
        }
        return 'browse';
    }

    renderDropDownMenuItems(keys, active = null){
        return keys.map((key)=>{
            var subtitle = null;
            var title = null;
            var disabled = null;
            var tooltip = null;
            if (Array.isArray(key)){
                // Assume we have [key, title, subtitle].
                title = key[1] || null;
                subtitle = key[2] || null;
                disabled = key[3] || false;
                tooltip = key[4] || null;
                key = key[0];
            }

            if (typeof title === 'string' && typeof tooltip === 'string'){
                title = <span className="inline-block" data-tip={tooltip} data-place="left">{ title }</span>;
            }

            return <MenuItem
                key={key}
                eventKey={key}
                active={key === active}
                children={title || this.titleMap(key, true)}
                disabled={disabled}
            />;
        });
    }

    handleDropDownToggle(id, isOpen, evt, source){
        if (isOpen){
            setTimeout(this.setState.bind(this), 10, { 'openDropdown' : id });
        } else {
            this.setState({ 'openDropdown' : null });
        }
    }

    renderShowTypeDropdown(contextualView){
        if (contextualView === 'home') return null;
        console.log('FF', Filters.searchQueryStringFromHref(this.props.href), this.props.href);
        var isSelectedDisabled = this.filterObjExistsAndNoFiltersSelected() && !Filters.searchQueryStringFromHref(this.props.href);
        return (
            <div className="show-type-change-section">
                <h6 className="dropdown-heading">Show</h6>
                <DropdownButton
                    id="select-barplot-show-type"
                    onSelect={this.handleExperimentsShowType}
                    bsSize='xsmall'
                    title={(()=>{
                        //if (this.state.openDropdown === 'subdivisionField'){
                        //    return <em className="dropdown-open-title">Color Bars by</em>;
                        //}
                        var aggrType = this.titleMap(this.state.aggregateType);
                        var showString = (this.state.showState === 'all' || isSelectedDisabled) ? 'All' : 'Selected';
                        return (
                            <span>
                                <span className="text-600">{ showString }</span> { aggrType }
                            </span>
                        );
                    })()}
                    onToggle={this.handleDropDownToggle.bind(this, 'showType')}
                    children={this.renderDropDownMenuItems([
                        ['all', <span>
                            <span className="text-500">All</span> { this.titleMap(this.state.aggregateType) }
                        </span>],
                        ['filtered', <span className="inline-block" data-place="left" data-tip={isSelectedDisabled ? 'No filters currently set' : null}>
                            <span className="text-500">Selected</span> { this.titleMap(this.state.aggregateType) }
                        </span>, null, isSelectedDisabled]
                    ], this.state.showState)}
                />
            </div>
        );
    }

    renderGroupByFieldDropdown(contextualView){
        return (
            <div className="field-1-change-section">
                <h6 className="dropdown-heading">Group By</h6>
                <DropdownButton
                    id="select-barplot-field-1"
                    onSelect={this.handleFieldSelect.bind(this, 1)}
                    title={(()=>{
                        //if (this.state.openDropdown === 'subdivisionField'){
                        //    return <em className="dropdown-open-title">Color Bars by</em>;
                        //}
                        var field = this.getFieldAtIndex(1);
                        if (!field) return "None";
                        return field.title || Schemas.Field.toName(field.field);
                    })()}
                    onToggle={this.handleDropDownToggle.bind(this, 'subdivisionField')}
                    children={this.renderDropDownMenuItems(
                        this.props.availableFields_Subdivision.concat([{
                            title : <em>None</em>,
                            field : "none"
                        }]).map((field)=>{
                            var isDisabled = this.state.fields[0] && this.state.fields[0].field === field.field;
                            return [
                                field.field,                                        // Field
                                field.title || Schemas.Field.toName(field.field),   // Title
                                field.description || null,                          // Description
                                //isDisabled,                                         // Disabled
                                //isDisabled ? "Field already selected for X-Axis" : null
                            ]; // key, title, subtitle, disabled
                        }),
                        (this.state.fields[1] && this.state.fields[1].field) || "none"
                    )}
                />
            </div>
        );
    }

    render(){

        if (!this.props.experiment_sets) return null;
        
        var filterObjExistsAndNoFiltersSelected = this.filterObjExistsAndNoFiltersSelected();
        var windowGridSize = layout.responsiveGridState();
        var contextualView = this.contextualView();

        var legendContainerHeight = windowGridSize === 'xs' ? null :
            this.props.chartHeight - (49 * (contextualView === 'home' ? 1 : 2 )) - 50;

        return (
            <div className="bar-plot-chart-controls-wrapper">
                <div className="overlay" style={{
                    width  : (windowGridSize !== 'xs' ? (layout.gridContainerWidth() * (9/12) - 15) : null)
                }}>

                    <div className="y-axis-top-label" style={{
                        width : this.props.chartHeight,
                        top: this.props.chartHeight - 4
                    }}>
                        <div className="row" style={{ maxWidth : 210, float: 'right' }}>
                            <div className="col-xs-3" style={{ width : 51 }}>
                                <h6 className="dropdown-heading">Y Axis</h6>
                            </div>
                            <div className="col-xs-9" style={{ width : 159, textAlign : 'left' }}>
                                <DropdownButton
                                    id="select-barplot-aggregate-type"
                                    bsSize="xsmall"
                                    onSelect={this.handleAggregateTypeSelect}
                                    title={(() => {
                                        //if (this.state.openDropdown === 'yAxis'){
                                        //    return 'Y-Axis Aggregation';
                                        //}
                                        return this.titleMap(this.state.aggregateType);
                                    })()}
                                    onToggle={this.handleDropDownToggle.bind(this, 'yAxis')}
                                    children={this.renderDropDownMenuItems(
                                        ['experiment_sets','experiments','files'],
                                        this.state.aggregateType
                                    )}
                                />
                            </div>
                        </div>
                    </div>

                    {/* this.renderShowTypeToggle(windowGridSize) */}

                </div>

                <div className="row">
                    <div className="col-sm-9">
                        { this.adjustedChildChart() }
                    </div>
                    <div className="col-sm-3 chart-aside" style={{ height : this.props.chartHeight }}>
                        { this.renderShowTypeDropdown(contextualView) }
                        { this.renderGroupByFieldDropdown(contextualView) }
                        <div className="legend-container" style={{ height : legendContainerHeight }}>
                            <AggregatedLegend
                                experiment_sets={this.props.experiment_sets}
                                filtered_experiment_sets={this.props.filtered_experiment_sets}
                                height={legendContainerHeight}
                                fields={this.state.fields}
                                showType={this.state.showState}
                                aggregateType={this.state.aggregateType}
                                schemas={this.props.schemas}
                            />
                        </div>
                        <div className="x-axis-right-label">
                            <div className="row">
                                <div className="col-xs-3" style={{ width : 51 }}>
                                    <h6 className="dropdown-heading">X Axis</h6>
                                </div>
                                <div className="col-xs-9 pull-right" style={{ width : (layout.gridContainerWidth() * (windowGridSize !== 'xs' ? 3/12 : 1)) + 5 - 52 }}>
                                    <DropdownButton
                                        id="select-barplot-field-0"
                                        onSelect={this.handleFieldSelect.bind(this, 0)}
                                        title={(()=>{
                                            //if (this.state.openDropdown === 'xAxisField'){
                                            //    return <em className="dropdown-open-title">X-Axis Field</em>;
                                            //}
                                            var field = this.getFieldAtIndex(0);
                                            return <span>{(field.title || Schemas.Field.toName(field.field))}</span>;
                                        })()}
                                        onToggle={this.handleDropDownToggle.bind(this, 'xAxisField')}
                                        children={this.renderDropDownMenuItems(
                                            this.props.availableFields_XAxis.map((field)=>{
                                                var isDisabled = this.state.fields[1] && this.state.fields[1].field === field.field;
                                                return [
                                                    field.field,
                                                    field.title || Schemas.Field.toName(field.field),
                                                    field.description || null,
                                                    //isDisabled,
                                                    //isDisabled ? 'Field is already selected for "Group By"' : null
                                                ]; // key, title, subtitle
                                            }),
                                            this.state.fields[0].field
                                        )}
                                    />
                                </div>
                            </div>
                            
                        </div>

                    </div>
                </div>
            </div>
        );
    }

}

class AggregatedLegend extends React.Component {

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.updateIfShould = this.updateIfShould.bind(this);
        this.width = this.width.bind(this);
        this.height = this.height.bind(this);
        this.shouldUpdate = false;
    }

    componentDidMount(){
        this.updateIfShould();
    }

    componentDidUpdate(pastProps, pastState){
        this.updateIfShould();
    }

    /**
     * Do a forceUpdate() in case we set this.shouldUpdate = true in an initial render.
     * this.shouldUpdate would be set if legend fields do not have colors yet from cache.
     */
    updateIfShould(){
        if (this.shouldUpdate){
            setTimeout(()=>{
                this.forceUpdate();
            }, 750);
        }
    }

    width(){
        if (this.refs && this.refs.container && this.refs.container.offsetWidth){
            return this.refs.container.offsetWidth;
        }
        return layout.gridContainerWidth() * (3/12) - 15;
    }

    height(){
        if (this.props.height) return this.props.height;
        if (this.refs && this.refs.container && this.refs.container.offsetHeight){
            return this.refs.container.offsetHeight;
        }
        return null;
    }

    render(){

        var fieldsForLegend = Legend.barPlotFieldDataToLegendFieldsData(
            (!this.props.experiment_sets || !this.props.fields[1] ? null :
                Legend.aggregegateBarPlotData(
                    expFxn.listAllExperimentsFromExperimentSets( this.props.showType === 'filtered' ? (this.props.filtered_experiment_sets || this.props.experiment_sets) : this.props.experiment_sets),
                    [this.props.fields[1]]
                )
            ),
            term => typeof term[this.props.aggregateType] === 'number' ? -term[this.props.aggregateType] : 'term'
        );

        this.shouldUpdate = false;
        if (fieldsForLegend && fieldsForLegend.length > 0 && fieldsForLegend[0] &&
            fieldsForLegend[0].terms && fieldsForLegend[0].terms.length > 0 &&
            fieldsForLegend[0].terms[0] && fieldsForLegend[0].terms[0].color === null){
            this.shouldUpdate = true;
        }

        return (
            <div className="legend-container-inner" ref="container">
                <Legend
                    fields={fieldsForLegend}
                    includeFieldTitles={false}
                    schemas={this.props.schemas}
                    width={this.width()}
                    height={this.height()}
                    hasPopover
                    expandable
                    expandableAfter={8}
                    cursorDetailActions={boundActions(this, this.props.showType)}
                />
            </div>
        );
    }
}

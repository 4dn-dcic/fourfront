'use strict';

var React = require('react');
var _ = require('underscore');
var vizUtil = require('./../utilities');
var barAggrFxn = require('./../BarPlot/aggregation-functions');
var { console, isServerSide, Schemas, object } = require('./../../util');
import { CursorViewBounds } from './../ChartDetailCursor';
import ReactTooltip from 'react-tooltip';


/**
 * React component which represents a Term item.
 * 
 * @class Term
 * @prop {string} field - Name of field to which this term belongs, in object-dot-notation.
 * @prop {string} term - Name of term.
 * @prop {string|Object} color - Color to show next to term, should be string or RGBColor object.
 * @type Component
 */
class Term extends React.Component {

    constructor(props){
        super(props);
        this.generateNode = this.generateNode.bind(this);
        this.onMouseEnter = this.onMouseEnter.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        this.onClick = this.onClick.bind(this);
    }

    generateNode(){
        return {
            'field' : this.props.field,
            'term' : this.props.term,
            'color' : this.props.color,
            'position' : this.props.position,
            'experiment_sets' : this.props.experiment_sets,
            'experiments' : this.props.experiments,
            'files' : this.props.files
        };
    }

    onMouseEnter(e){
        vizUtil.highlightTerm(this.props.field, this.props.term, this.props.color);
        if (typeof this.props.onNodeMouseEnter === 'function'){
            this.props.onNodeMouseEnter(this.generateNode(), e);
        }
    }

    onMouseLeave(e){
        if (typeof this.props.onNodeMouseLeave === 'function'){
            this.props.onNodeMouseLeave(this.generateNode(), e);
        }
    }

    onClick(e){
        if (typeof this.props.onNodeClick === 'function'){
            this.props.onNodeClick(this.generateNode(), e);
        }
    }

    /**
     * @returns {Element} A div element containing term name & color patch.
     */
    render(){
        var color = this.props.color;
        if (!color) color = 'transparent';
        return (
            <div className="term">
                <span
                    onMouseEnter={this.onMouseEnter}
                    onMouseLeave={this.onMouseLeave}
                    onClick={this.onClick}
                    className="inline-block"
                >
                    <div
                        className="color-patch no-highlight-color"
                        data-term={this.props.term}
                        style={{ backgroundColor : color }}
                    />
                    { this.props.name || Schemas.Term.toName(this.props.field, this.props.term) }
                </span>
            </div>
        );
    }
}

/**
 * React component which represents a "Field", which might have multiple terms.
 * 
 * @class Field
 * @prop {string} field - Field name, in object-dot-notation.
 * @prop {boolean} includeFieldTitle - Whether field title should be included at the top of list of terms.
 * @prop {Object[]} terms - Terms which belong to this field, in the form of objects. 
 * @type {Component}
 */
class Field extends React.Component {

    static defaultProps = {
        'includeFieldTitle' : true
    }

    /**
     * @returns {Element} Div element containing props.title, .name, or .field if supplied along with props.includeFieldTitle == true, and list of terms & their colors.
     * @instance
     */
    render(){
        return (
            <div className="field" data-field={this.props.field} onMouseLeave={vizUtil.unhighlightTerms.bind(this, this.props.field)}>
                { this.props.includeFieldTitle ? 
                    <h5 className="text-500 legend-field-title">{ this.props.title || this.props.name || this.props.field }</h5>
                : null }
                { this.props.terms.map((term, i) =>
                    <Legend.Term
                        {...term}
                        field={this.props.field}
                        key={term.term}
                        onNodeMouseEnter={this.props.onNodeMouseEnter}
                        onNodeMouseLeave={this.props.onNodeMouseLeave}
                        onNodeClick={this.props.onNodeClick}
                        selectedTerm={this.props.selectedTerm}
                        hoverTerm={this.props.hoverTerm}
                        position={i}
                    />
                )}
            </div>
        );
    }
}


class LegendViewContainer extends React.Component {

    static defaultProps = {
        'expandable' : false,
        'expandableAfter' : 5
    }

    constructor(props){
        super(props);
        this.showToggleIcon = this.showToggleIcon.bind(this);
        this.toggleIcon = this.toggleIcon.bind(this);
        this.render = this.render.bind(this);
    }

    componentDidUpdate(){
        if (this.showToggleIcon()){
            ReactTooltip.rebuild();
        }
    }

    showToggleIcon(){ return this.props.expandable && Legend.totalTermsCount(this.props.fields) > this.props.expandableAfter; }

    toggleIcon(){
        if (!this.showToggleIcon()) return null;
        var iconClass = this.props.expanded ? 'compress' : 'expand';
        return (
            <div className="expand-toggle text-center" onClick={this.props.onToggleExpand} data-tip={this.props.expanded ? "Collapse" : "Expand" } data-place="left">
                <i className={"icon icon-fw icon-" + iconClass}/>
            </div>
        );
    }

    /**
     * @returns {Element} Div element containing props.title and list of {@link module:viz/components.Legend.Field} components.
     */
    render(){
        if (!this.props.fields) return null;
        var className = 'legend ' + this.props.className;
        if (this.props && this.props.expanded) className += ' expanded';
        return (
            <div className={className} id={this.props.id} style={{
                opacity : !Array.isArray(this.props.fields) ? 0 : 1,
                width : this.props.width || null
            }}>
                { this.props.title }
                { this.toggleIcon() }
                { Array.isArray(this.props.fields) ?
                    Legend.parseFieldNames(this.props.fields, this.props.schemas || null)
                    .map((field)=>
                        <Legend.Field
                            includeFieldTitle={this.props.includeFieldTitles}
                            {...field}
                            onNodeMouseEnter={this.props.onNodeMouseEnter}
                            onNodeMouseLeave={this.props.onNodeMouseLeave}
                            onNodeClick={this.props.onNodeClick}
                            selectedTerm={this.props.selectedTerm}
                            hoverTerm={this.props.hoverTerm}
                            key={field.field}
                        />
                    ) 
                : null }
            </div>
        );

    }
}


/**
 * Legend components to use alongside Charts. Best to include within a UIControlsWrapper, and place next to chart, utilizing the same data.
 * 
 * @class Legend
 * @type {Component}
 * @prop {Object[]} fields - List of objects containing at least 'field', in object dot notation. Ideally should also have 'name'.
 * @prop {boolean} includeFieldTitle - Whether to show field title at top of terms.
 * @prop {string} className - Optional className to add to Legend's outermost div container.
 * @prop {number} width - How wide should the legend container element (<div>) be.
 * @prop {string|Element|Component} title - Optional title to display at top of fields.
 */
export class Legend extends React.Component {

    static Term = Term
    static Field = Field

    static aggregegateBarPlotData(experiment_sets, fields){
        return barAggrFxn.genChartData(
            experiment_sets,
            fields,
            false
        );
    }

    static barPlotFieldDataToLegendFieldsData(field, sortBy = null){
        if (Array.isArray(field) && field.length > 0 && field[0] && typeof field[0] === 'object'){
            return field.map(function(f){ return Legend.barPlotFieldDataToLegendFieldsData(f, sortBy); });
        }
        if (!field) return null;
        var terms = _.pairs(field.terms).map(function(p){ // p[0] = term, p[1] = term counts
            return {
                'field' : field.field,
                'name' : Schemas.Term.toName(field.field, p[0]),
                'term' : p[0],
                'color' : vizUtil.colorForNode({
                    'term' : p[0],
                    'field' : field.field
                }, true, 'muted', null, true),
                'experiment_sets' : p[1].experiment_sets,
                'experiments' : p[1].experiments,
                'files' : p[1].files
            };
        });

        var adjustedField = _.extend({}, field, { 'terms' : terms });
        _.extend(adjustedField, { 'terms' : Legend.sortLegendFieldTermsByColorPalette(adjustedField) });

        if (sortBy){
            adjustedField.terms = _.sortBy(adjustedField.terms, sortBy);
        }

        return adjustedField;
    }

    static sortLegendFieldsTermsByColorPalette(fields, palette = 'muted'){
        return fields.map(function(f){
            return _.extend({}, f, { 'terms' : Legend.sortLegendFieldTermsByColorPalette(f, palette) });
        });
    }

    static sortLegendFieldTermsByColorPalette(field, palette = 'muted'){
        var orderedColorList = vizUtil.colorPalettes[palette];
        if (!orderedColorList) {
            console.error("No palette " + palette + ' found.');
            return field.terms;
        }
        if (field.terms && field.terms[0] && field.terms[0].color === null){
            console.warn("No colors assigned to legend terms, skipping sorting. BarPlot.UIControlsWrapper or w/e should catch lack of color and force update within 1s.");
            return field.terms;
        }
        
        return vizUtil.sortObjectsByColorPalette(field.terms, palette);

    }

    static totalTermsCount(fields){
        return _.reduce(fields, function(m,field){ return m + (field.terms || []).length; }, 0);
    }

    /**
     * @param {Object[]} fields - List of field objects, each containing at least a title, name, or field.
     * @param {{Object}} schemas - Schemas object passed down from app.state. 
     * @returns {Object[]} Modified field objects.
     */
    static parseFieldNames(fields, schemas){
        return fields.map(function(field){
            if (!field.title && !field.name) {
                return _.extend({} , field, {
                    'name' : Schemas.Field.toName(field.field, schemas || null)
                });
            }
            return field;
        });
    }

    static defaultProps = {
        'hasPopover' : false,
        'position' : 'absolute',
        'fields' : [],
        'id' : null,
        'className' : 'chart-color-legend',
        'width' : null,
        'height' : null,
        'expandable': false,
        'expandableAfter' : 5,
        'defaultExpanded' : false,
        'title' : null //<h4 className="text-500">Legend</h4>
    }

    render(){
        return <LegendExpandContainer {...this.props} />;
    }

}

class LegendExpandContainer extends React.Component {

    static defaultProps = {
        'expandableAfter' : 5,
        'expandable' : false,
        'defaultExpanded' : false,
        'hasPopover' : false
    }

    constructor(props){
        super(props);
        this.handleExpandToggle = _.throttle(this.handleExpandToggle.bind(this), 500);
        if (this.props.expandable){
            this.state = {
                'expanded' : props.defaultExpanded
            };
        }
    }

    handleExpandToggle(evt){
        this.setState({ 'expanded' : !this.state.expanded });
    }

    legendComponent(){
        var propsToPass = _.clone(this.props);
        propsToPass.onToggleExpand = this.handleExpandToggle;
        propsToPass.expanded = (this.state && this.state.expanded) || false;
        if (!this.props.hasPopover) return <LegendViewContainer {...propsToPass} />;
        return (
            <CursorViewBounds
                eventCategory="BarPlotLegend"
                actions={this.props.cursorDetailActions}
                highlightTerm
                width={this.props.width}
                clickCoordsFxn={(node, containerPosition, boundsHeight, isOnRightSide)=>{

                    var margin = 260;

                    return {
                        x : !isOnRightSide ? containerPosition.left - margin : containerPosition.left + 30,
                        y : containerPosition.top - 10 + (16 * (node.position || 0)),
                    };

                }}
            >
                <LegendViewContainer {...propsToPass} />
            </CursorViewBounds>
        );
    }

    render(){
        if (!this.props.expandable || !this.state){
            return this.legendComponent();
        } else {
            var className = "legend-expand-container";
            if (this.state.expanded) className += ' expanded';
            return (
                <div className={className}>
                    { this.legendComponent() }
                </div>
            );
        }
    }

}

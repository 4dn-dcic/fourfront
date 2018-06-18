'use strict';

import React from 'react';
import _ from 'underscore';
import PropTypes from 'prop-types';
import ReactTooltip from 'react-tooltip';


export class AuditTabView extends React.PureComponent {

    static getTabObject(context){
        var auditIconClass = AuditTabView.getItemIndicatorIcon(context);
        return {
            tab : (
                <span className={context.audit && _.keys(context.audit).length ? 'active' : null}>
                    <i className={"icon icon-fw icon-" + auditIconClass}/> Audits
                </span>
            ),
            key : "audits",
            disabled : !AuditTabView.doAnyAuditsExist(context),
            content : <AuditTabView audits={context.audit} />
        };
    }

    /**
     * @static
     * @public
     * @param {Object} context - Item object representation containing 'audit' property.
     * @returns {string} Classname suffix for FontAwesome icon to use as indicator icon.
     */
    static getItemIndicatorIcon = function(context){
        var auditIconClass = 'warning';
        if (context.audit && context.audit.ERROR && context.audit.ERROR.length){
            auditIconClass = 'exclamation-circle';
        } else if (context.audit && context.audit.WARNING && context.audit.WARNING.length){

        } else if (!AuditTabView.doAnyAuditsExist(context)){
            auditIconClass = 'check';
        }
        return auditIconClass;
    }

    /**
     * @static
     * @public
     * @param {Object} context - Item object representation containing 'audit' property.
     * @returns {boolean} True if any audits exist.
     */
    static doAnyAuditsExist = function(context){
        if (typeof context.audit === 'undefined') return false;
        if (_.keys(context.audit).length === 0 || _.reduce(context.audit, function(m,v){ return m + v.length; }, 0) === 0){
            return false;
        } else {
            return true;
        }
    }

    /**
     * Returns string broken into parts with a JSON segment in it.
     * 
     * @param {string} String with potential JSON string.
     * @returns {string[]} Array with either 1 part (no valid JSON found) or 3 parts (beforestring, JSONstring, afterstring).
     */
    static findJSONinString = function(str = "Some string { 'test' : 123 }"){
        //var r = str.search(/\{([^{}]|(?R))*\}/g);
        var i;
        var strLen = str.length;
        var firstBracketIndex = null;
        var lastBracketIndex = null;
        var openBrackets = 0;
        var closeBrackets = 0;
        for (i = 0; i < strLen; i++){
            if (str.charAt(i) === '{'){
                openBrackets++;
                if (firstBracketIndex === null) firstBracketIndex = i;
                continue;
            }
            if (firstBracketIndex !== null){
                if (str.charAt(i) === '}'){
                    closeBrackets++;
                    if (closeBrackets === openBrackets){
                        lastBracketIndex = i;
                        break;
                    }
                }
            }
        }
        var result;
        if (firstBracketIndex !== null && lastBracketIndex !== null){
            result = [
                str.slice(0, firstBracketIndex).trim(),
                str.slice(firstBracketIndex, lastBracketIndex + 1),
                str.slice(lastBracketIndex + 1, strLen).trim()
            ].map(function(r){
                if (r.length === 0) return null;
                return r;
            });
        } else {
            result = [
                str.trim()
            ];
        }
        return result;
    }

    static convertJSONToTable = function(jsonString){
        var jsonObj;
        if (typeof jsonString === 'string' && jsonString.charAt(0) === '{' && jsonString.charAt(jsonString.length - 1) === '}'){
            try {
                try {
                    jsonObj = JSON.parse(jsonString);
                } catch (e){
                    jsonString = jsonString.replace(/'/g, '"');
                    jsonObj = JSON.parse(jsonString);
                }
            } catch (e){
                return <code>{ jsonString }</code>;
            }
        } else if (typeof jsonString === 'object' && jsonString){
            jsonObj = jsonString;
        } else {
            console.error("Invalid JSON supplied. Returning original: " + jsonString);
            return <code>{ jsonString }</code>;
        }
        return (
            <ul>
            { _.pairs(jsonObj).map(function(r, i){
                return (
                    <li key={i}>
                        <span className="pull-right">({ r[1] })</span>
                        <code>{ r[0] }</code>
                    </li>
                );
            }) }
            </ul>
        );
    }

    static levelTitleMap = {
        'ERROR' : 'Error',
        'WARNING' : 'Warning',
        'INTERNAL_ACTION' : 'Internal Action'
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
    }

    componentDidMount(){
        ReactTooltip.rebuild();
    }

    render(){
        return (
            <div className="audits-view">
                <h3 className="tab-section-title">Audits</h3>
                <hr className="tab-section-title-horiz-divider mb-1"/>
                { _.sortBy(_.pairs(this.props.audits), function(auditLevelPair){
                    return -auditLevelPair[1][0].level;
                }).map((auditLevelPair, i) =>
                    <AuditLevelGrouping
                        key={auditLevelPair[0]}
                        level={auditLevelPair[0]}
                        audits={this.props.audits}
                        title={AuditTabView.levelTitleMap[auditLevelPair[0]]}
                        categoriesDefaultOpen={i === 0}
                    />
                )}
            </div>
        );
    }

}


class AuditLevelGrouping extends React.Component {

    static propTypes = {
        'level' : PropTypes.oneOf(['ERROR', 'WARNING', 'INTERNAL_ACTION']),
        'title' : PropTypes.string
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.iconClass = this.iconClass.bind(this);
    }

    iconClass(){
        if (this.props.level === 'WARNING') return 'warning';
        if (this.props.level === 'ERROR') return 'exclamation-circle';
        if (this.props.level === 'INTERNAL_ACTION') return 'tachometer';
        return 'warning';
    }

    render(){

        var level = this.props.level;
        var auditsForLevel = this.props.audits[level] || this.props.audits;

        if (!Array.isArray(auditsForLevel) || auditsForLevel.length === 0) return null;

        var groupedAudits = _.groupBy(auditsForLevel, 'category');

        return (
            <div className={"audits-view-" + level}>

                <div className="row">

                    <div className="col-sm-2 col-md-1">
                        <h3 className="text-left">
                            {/*<span className="text-400">{ audits[level].length }</span> */}<i
                                data-tip={auditsForLevel.length + ' ' + this.props.title + (auditsForLevel.length > 1 ? 's' : '')}
                                data-place="right"
                                className={"icon icon-fw icon-" + this.iconClass()}
                            />
                        </h3>
                        {/*<h3 className="text-300">{ this.props.title }{auditsForLevel.length > 1 ? 's' : ''}</h3>*/}
                    </div>

                    <div className="audits-container col-xs-12 col-sm-10 col-md-11">
                    { _.map(groupedAudits, (audits, groupIndex) =>
                        <AuditCategoryGrouping
                            level={level}
                            key={audits[0].category}
                            audits={audits}
                            defaultOpen={this.props.categoriesDefaultOpen}
                        />
                    )}
                    </div>
                    
                </div>
            </div>
        );
    }

}

class AuditCategoryGrouping extends React.Component {

    static propTypes = {
        level : PropTypes.oneOf(['ERROR', 'NOT_COMPLIANT', 'WARNING', 'INTERNAL_ACTION', 'INFO', 'DEBUG', 'NOT_SET']),
        audits : PropTypes.array
    }

    static defaultProps = {
        defaultOpen : true
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
        this.auditItemsList = this.auditItemsList.bind(this);
        this.state = {
            'open' : props.defaultOpen
        };
    }

    auditItemsList(){
        if (!this.state.open) return null;
        return this.props.audits.map((aud, i) =>
            <AuditItem 
                audit={aud}
                key={i}
                level={aud.level_name || this.props.level || "ERROR"}
                showCategory={false}
            />
        );
    }

    render(){
        var audits = this.props.audits;
        return (
            <div className="audit-grouping" key={audits[0].category}>
                <h4 className="text-400 audit-category">
                    <i className={"toggle-open icon icon-fw icon-" + (this.state.open ? 'minus' : 'plus')} onClick={()=>{ this.setState({ 'open' : !this.state.open }); }} />
                    <span className="text-500 inline-block text-right" style={{ minWidth : 20 }}>
                        { audits.length }
                    </span> { audits[0].category }
                </h4>
                { this.auditItemsList() }
            </div>
        );
    }

}


class AuditItem extends React.Component {

    static propTypes = {
        level : PropTypes.oneOf(['ERROR', 'NOT_COMPLIANT', 'WARNING', 'INTERNAL_ACTION', 'INFO', 'DEBUG', 'NOT_SET'])
    }

    constructor(props){
        super(props);
        this.render = this.render.bind(this);
    }

    render(){
        var audit = this.props.audit;
        var details = audit.detail.split('\n').filter(function(a){ return a !== '' && a; }); // Split newlines into sep. paragraphs.

        var categoryTitle;
        if (this.props.showCategory){
            categoryTitle = (
                <div className="col-xs-12 col-sm-12 audit-category">
                    <span>
                        <h4 className="text-500">{ audit.category }</h4>
                    </span>
                </div>
            );
        }

        return (
            <div className="row audit-item">
                { categoryTitle }
                <div className="col-xs-12 col-sm-12 audit-detail">
                    <ul>{
                        details.map(function(d,i){
                            var detailParts = AuditTabView.findJSONinString(d);
                            return (
                                <li key={i}>
                                    { detailParts[0] ? 
                                        <div>{ detailParts[0] }</div>
                                    : null }
                                    { detailParts[1] ? 
                                        <div>{ AuditTabView.convertJSONToTable(detailParts[1]) }</div>
                                    : null }
                                    { detailParts[2] ? 
                                        <div>{ detailParts[2] }</div>
                                    : null }
                                </li>
                            );
                        })
                    }</ul>
                </div>
            </div>
        );
    }

}

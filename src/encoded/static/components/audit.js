'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import { Panel } from 'react-bootstrap';

var editTargetMap = {
    'experiments': 'Experiment',
    'antibodies': 'Antibody',
    'antibody-characterizations': 'Antibody Characterization',
    'biosamples': 'Biosample',
    'documents': 'Document',
    'libraries': 'Library',
    'files': 'File',
    'labs': 'Lab',
    'platform': 'Platform',
    'targets': 'Target',
    'datasets': 'Dataset',
    'publications': 'Publication',
    'software': 'Software',
    'awards': 'Award',
    'replicates': 'Replicate'
};

/**
 * Bind these to "this"" from a constructor wherever want to use these.
 */
export const auditMixinFxn = {

    childContextTypes: {
        auditDetailOpen: PropTypes.bool, // Audit details open
        auditStateToggle: PropTypes.func // Function to set current audit detail type
    },

    initialState : {
        auditDetailOpen : false
    },

    onToggleAudit : function(e){
        e.preventDefault();
        this.setState({auditDetailOpen: !this.state.auditDetailOpen});
    }

};

class Header extends React.Component {
    render(){
        var children = this.props.children || <AuditIndicators context={this.props.context} />;
        if (children && children.type && children.type.displayName === 'AuditIndicators'){
            if (!children.type.prototype.isVisible.call(children)) {
                return null; // Invisible
            }
        }
        return (
            <header className="row">
                <div className="col-sm-12">
                    <div className="status-line">
                        { children }
                    </div>
                </div>
            </header>
        );
    }
}

export class AuditIndicators extends React.Component {

    static Header = Header

    static sortAuditLevels(audits){
        if (!audits) return null;
        return _(_.keys(audits)).sortBy(function(level) {
            return -audits[level][0].level;
        });
    }

    static contextTypes = {
        auditDetailOpen: PropTypes.bool,
        auditStateToggle: PropTypes.func,
        session: PropTypes.bool,
        hidePublicAudits: PropTypes.bool
    }

    isVisible(sortedAuditLevels = null){
        if (!this.props.audits) return false;
        if (!sortedAuditLevels) sortedAuditLevels = AuditIndicators.sortAuditLevels(this.props.audits);
        if (!sortedAuditLevels) return false;
        return (
            (!this.context.hidePublicAudits || this.context.session) &&
            this.props.audits &&
            _.keys(this.props.audits).length > 0 &&
            (this.context.session || !(sortedAuditLevels.length === 1 && sortedAuditLevels[0] === 'DCC_ACTION'))
        );
    }

    render() {
        var auditCounts = {};
        var audits = this.props.audits;
        var loggedIn = this.context.session;

        var sortedAuditLevels = AuditIndicators.sortAuditLevels(audits);
        if (!this.isVisible(sortedAuditLevels)) return null;


        var indicatorClass = "audit-indicators btn btn-default" + (this.context.auditDetailOpen ? ' active' : '') + (this.props.search ? ' audit-search' : '');

        return (
            <button className={indicatorClass} aria-label="Audit indicators" aria-expanded={this.context.auditDetailOpen} aria-controls={this.props.id} onClick={this.context.auditStateToggle}>
                {sortedAuditLevels.map(level => {
                    if (loggedIn || level !== 'DCC_ACTION') {
                        // Calculate the CSS class for the icon
                        var levelName = level.toLowerCase();
                        var btnClass = 'btn-audit btn-audit-' + levelName + ' audit-level-' + levelName;
                        var iconClass = 'icon audit-activeicon-' + levelName;
                        var groupedAudits = _(audits[level]).groupBy('category');

                        return (
                            <span className={btnClass} key={level}>
                                <i className={iconClass}><span className="sr-only">{'Audit'} {levelName}</span></i>
                                {Object.keys(groupedAudits).length}
                            </span>
                        );
                    }
                    return null;
                })}
            </button>
        );
    }
}


export class AuditDetail extends React.Component {

    static contextTypes = {
        auditDetailOpen: PropTypes.bool,
        session: PropTypes.bool
    }

    render() {
        var context = this.props.context;
        var auditLevels = context.audit;

        if (this.context.auditDetailOpen) {
            // Sort the audit levels by their level number, using the first element of each warning category
            var sortedAuditLevelNames = _(Object.keys(auditLevels)).sortBy(level => -auditLevels[level][0].level);
            var loggedIn = this.context.session;

            // First loop by audit level, then by audit group
            return (
                <Panel addClasses="audit-details" id={this.props.id.replace(/\W/g, '')} aria-hidden={!this.context.auditDetailOpen}>
                    {sortedAuditLevelNames.map(auditLevelName => {
                        if (loggedIn || auditLevelName !== 'DCC_ACTION') {
                            var audits = auditLevels[auditLevelName];
                            var level = auditLevelName.toLowerCase();
                            var iconClass = 'icon audit-icon-' + level;
                            var alertClass = 'audit-detail-' + level;
                            var levelClass = 'audit-level-' + level;

                            // Group audits within a level by their category ('name' corresponds to
                            // 'category' in a more machine-like form)
                            var groupedAudits = _(audits).groupBy('category');

                            return Object.keys(groupedAudits).map(groupName => <AuditGroup group={groupedAudits[groupName]} groupName={groupName} auditLevelName={auditLevelName} context={context} forcedEditLink={this.props.forcedEditLink} key={groupName} />);
                        }
                        return null;
                    })}
                </Panel>
            );
        }
        return null;
    }

}

export class AuditGroup extends React.Component {

    static propTypes = {
        group           : PropTypes.array.isRequired,   // Array of audits in one name/category
        groupName       : PropTypes.string.isRequired,  // Name of the group
        auditLevelName  : PropTypes.string.isRequired,  // Audit level
        context         : PropTypes.object.isRequired,  // Audit records
        session         : PropTypes.bool.isRequired
    }

    static contextTypes = {
        session: PropTypes.bool
    }

    constructor(props){
        super(props);
        this.onToggleDetail = this.onToggleDetail.bind(this);
        this.render = this.render.bind(this);
        this.state = { detailOpen : false };
    }

    onToggleDetail() {
        // Click on the detail disclosure triangle
        this.setState({detailOpen: !this.state.detailOpen});
    }

    render() {
        var {group, groupName, context} = this.props;
        var auditLevelName = this.props.auditLevelName.toLowerCase();
        var detailOpen = this.state.detailOpen;
        var alertClass = 'audit-detail-' + auditLevelName.toLowerCase();
        var alertItemClass = 'panel-collapse collapse audit-item-' + auditLevelName + (detailOpen ? ' in' : '');
        var iconClass = 'icon audit-icon-' + auditLevelName;
        var levelClass = 'audit-level-' + auditLevelName;
        var level = auditLevelName.toLowerCase();
        var categoryName = group[0].category.uppercaseFirstChar();
        var loggedIn = this.context.session;

        return (
            <div className={alertClass}>
                {loggedIn ?
                    <div className={'icon audit-detail-trigger-' + auditLevelName}>
                        <a href="#" className={'audit-detail-trigger-icon' + (detailOpen ? '' : ' collapsed')} data-trigger data-toggle="collapse" onClick={this.onToggleDetail}>
                            <span className="sr-only">More</span>
                        </a>
                    </div>
                : null}
                <div className="audit-detail-info">
                    <i className={iconClass}></i>
                    <span>
                        {loggedIn ?
                            <strong className={levelClass}>{auditLevelName.split('_').join(' ').toUpperCase()}&nbsp;&mdash;</strong>
                        :
                            <span>&nbsp;&nbsp;&nbsp;</span>
                        }
                    </span>
                    <strong>&nbsp;{categoryName}</strong>
                    {!loggedIn ?
                        <div className="btn-info-audit">
                            <a href={'/data-standards/#' + categoryName.toLowerCase().split(' ').join('_')} title={'View description of ' + categoryName + ' in a new tab'} target="_blank"><i className="icon icon-question-circle"></i></a>
                        </div>
                    : null}
                </div>
                {loggedIn ?
                    <div className="audit-details-section">
                        <div className="audit-details-decoration"></div>
                        {group.map((audit, i) =>
                            <div className={alertItemClass} key={i} role="alert">
                                <DetailEmbeddedLink detail={audit.detail} except={context['@id']} forcedEditLink={this.props.forcedEditLink} />
                            </div>
                        )}
                    </div>
                : null}
            </div>
        );
    }

}


// Display details with embedded links.
// props.detail: String possibly containing paths.
// props.except: Path of object being reported on.
// props.forcedEditLink: T if display path of reported object anyway.

class DetailEmbeddedLink extends React.Component {
    render() {
        var detail = this.props.detail;

        // Get an array of all paths in the detail string, if any.
        var matches = detail.match(/(\/.+?\/)(?=$|\s+)/g);
        if (matches) {
            // Build React object of text followed by path for all paths in detail string
            var lastStart = 0;
            var result = matches.map((match, i) => {
                var linkStart = detail.indexOf(match, lastStart);
                var preText = detail.slice(lastStart, linkStart);
                lastStart = linkStart + match.length;
                var linkText = detail.slice(linkStart, lastStart);
                if (match !== this.props.except || this.props.forcedEditLink) {
                    return <span key={i}>{preText}<a href={linkText}>{linkText}</a></span>;
                } else {
                    return <span key={i}>{preText}{linkText}</span>;
                }
            });

            // Pick up any trailing text after the last path, if any
            var postText = detail.slice(lastStart);

            // Render all text and paths, plus the trailing text
            return <span>{result}{postText}</span>;
        } else {
            // No links in the detail string; just display it with no links
            return <span>{detail}</span>;
        }
    }
}

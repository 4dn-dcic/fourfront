'use strict';

import React from 'react';
import memoize from 'memoize-one';
import ReactTooltip from 'react-tooltip';
import { IndividualBody, getIndividualDisplayTitle } from './IndividualBody';


export class PedigreeDetailPane extends React.PureComponent {

    componentDidUpdate(pastProps){
        const { currSelectedNodeId } = this.props;
        if (pastProps.currSelectedNodeId !== currSelectedNodeId) {
            ReactTooltip.rebuild();
        }
    }

    render(){
        const { unselectNode, memoized, objectGraph, currSelectedNodeId, className } = this.props;
        const selectedNode = currSelectedNodeId && memoized.findNodeWithId(objectGraph, currSelectedNodeId);

        if (!selectedNode){
            return null;
        } else if (currSelectedNodeId.slice(0,13) === 'relationship:'){
            return <RelationshipBody {...this.props} selectedNode={selectedNode} onClose={unselectNode} />;
        } else {
            return <IndividualBody {...this.props} selectedNode={selectedNode} onClose={unselectNode} />;
        }
    }
}



function PartnersLinks(props){
    const { partners, type = "div", onNodeClick, className = "partners-links", ...passProps } = props;
    const onLinkClick = (evt) => {
        evt.preventDefault();
        const targetNodeId = evt.target.getAttribute('data-for-id');
        if (!targetNodeId){
            console.warn("No target node id available");
            return false;
        }
        onNodeClick(targetNodeId);
    };
    const partnerLinks = partners.map((p) =>
        <span key={p.id} className="partner-link">
            <a href="#" data-for-id={p.id} onClick={onLinkClick}>
                { getIndividualDisplayTitle(p) }
            </a>
        </span>
    );
    return React.createElement(
        type,
        { 'data-partner-count' : partners.length, className, ...passProps },
        partnerLinks
    );
}


class RelationshipBody extends React.PureComponent {

    constructor(props){
        super(props);
        this.onNodeClick= this.onNodeClick.bind(this);
    }

    onNodeClick(evt){
        evt.preventDefault();
        const { onNodeClick } = this.props;
        const targetNodeId = evt.target.getAttribute('data-for-id');
        if (!targetNodeId){
            console.warn("No target node id available");
            return false;
        }
        onNodeClick(targetNodeId);
    }

    render(){
        const { selectedNode: relationship, onNodeClick } = this.props;
        const { id, partners, children } = relationship;
        return (
            <div className="detail-pane-inner">
                <div className="title-box">
                    <label>Relationship between</label>
                    <PartnersLinks {...{ partners, onNodeClick }} type="h3"/>
                </div>
                <div className="details">
                    <div className="detail-row" data-describing="children">
                        <label>Children</label>
                        { !children.length ? <div><em>None</em></div>
                            : <PartnersLinks onNodeClick={onNodeClick} partners={children}/>
                        }
                    </div>
                </div>
            </div>
        );
    }
}


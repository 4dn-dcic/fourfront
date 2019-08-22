import React from 'react';
import memoize from 'memoize-one';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { SlideInPane } from './../SlideInPane';



function getIndividualDisplayTitle(individual){
    const { display_title, name, id } = individual;
    return display_title || name || id;
}


export const DefaultDetailPaneComponent = React.memo(function DefaultDetailPaneComponent(props){
    const { unselectNode, memoized, objectGraph, currSelectedNodeId, overlaysContainer } = props;
    const selectedNode = currSelectedNodeId && memoized.findNodeWithId(objectGraph, currSelectedNodeId);

    let body;
    if (!currSelectedNodeId){
        body = null;
    } else if (currSelectedNodeId.slice(0,13) === 'relationship:'){
        body = <RelationshipBody {...props} selectedNode={selectedNode} onClose={unselectNode} />;
    } else {
        body = <IndividualBody {...props} selectedNode={selectedNode} onClose={unselectNode} />;
    }

    return (
        <SlideInPane overlaysContainer={overlaysContainer} in={!!(selectedNode)}
            onClose={unselectNode} className="pedigree-viz-detail-pane-container">
            { body }
        </SlideInPane>
    );
});

function IndividualBody(props){
    const { selectedNode: individual, onNodeClick, onClose } = props;
    const {
        id, name,
        _parentReferences : parents = [],
        _childReferences : children = []
    } = individual;
    const showTitle = getIndividualDisplayTitle(individual);
    return (
        <div className="detail-pane-inner">
            <div className="title-box row">
                <div className="col">
                    <label>Individual</label>
                    <h3>{ showTitle }</h3>
                </div>
                { onClose ?
                    <div className="col-auto">
                        <i className="icon icon-times fas clickable" onClick={onClose}/>
                    </div>
                    : null }
            </div>
            <div className="details">
                <div className="detail-row row" data-describing="parents">
                    <div className="col-12">
                        <label>Parents</label>
                        { !parents.length ? <div><em>None</em></div>
                            : <PartnersLinks onNodeClick={onNodeClick} partners={parents}/>
                        }
                    </div>
                </div>
                <div className="detail-row" data-describing="children">
                    <label>Children</label>
                    { !children.length ? <div><em>None</em></div>
                        : <PartnersLinks onNodeClick={onNodeClick} partners={children}/>
                    }
                </div>
            </div>
            Hello World
        </div>
    );
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


import React from 'react';
import memoize from 'memoize-one';
import { CSSTransition, TransitionGroup } from 'react-transition-group';



function getIndividualDisplayTitle(individual){
    const { display_title, name, id } = individual;
    return display_title || name || id;
}


export class DefaultDetailPaneComponent extends React.PureComponent {

    static getDerivedStateFromProps(props, state){
        if (props.currSelectedNodeId && props.currSelectedNodeId !== state.selectedNodeId){
            return { 'selectedNodeId' : props.currSelectedNodeId };
        }
        return null;
    }

    constructor(props){
        super(props);
        this.onExited = this.onExited.bind(this);
        this.state = {
            'transitioningOut' : false,
            'selectedNodeId' : props.currSelectedNodeId || null
        };
    }

    componentDidUpdate(pastProps){
        const { currSelectedNodeId } = this.props;
        if (!currSelectedNodeId && pastProps.currSelectedNodeId){
            // Transition out
            this.setState({ 'transitioningOut' : true });
        }
    }

    onExited(){
        this.setState({ 'transitioningOut' : false, 'selectedNodeId' : null });
    }

    render(){
        const { unselectNode, memoized, objectGraph } = this.props;
        const { transitioningOut, selectedNodeId } = this.state;
        if (!selectedNodeId && !transitioningOut){
            return null;
        }
        console.log('TTT', this.props, this.state);
        const selectedNode = selectedNodeId && memoized.findNodeWithId(objectGraph, selectedNodeId);
        let body;
        if (selectedNodeId.slice(0,13) === 'relationship:'){
            body = <RelationshipBody {...this.props} {...{ selectedNode }} />;
        } else {
            body = <IndividualBody {...this.props} {...{ selectedNode }} />;
        }
        return (
            <CSSTransition classNames="pedigree-detail-pane-transition" appear in={selectedNode && !transitioningOut}
                unmountOnExit timeout={{ enter: 10, exit: 400 }} onExited={this.onExited}>
                <div id="pedigree-detail-pane-container">
                    <div className="overlay-bg" onClick={unselectNode} />
                    <div className="detail-pane-outer">{ body }</div>
                </div>
            </CSSTransition>
        );
    }
}

function IndividualBody(props){
    const { selectedNode: individual, onNodeClick } = props;
    const {
        id, name,
        _parentReferences : parents = [],
        _childReferences : children = []
    } = individual;
    const showTitle = getIndividualDisplayTitle(individual);
    return (
        <div className="detail-pane-inner">
            <div className="title-box">
                <label>Individual</label>
                <h3>{ showTitle }</h3>
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


'use strict';

import React from 'react';
import _ from 'underscore';
import { console, ajax, DateUtility, object, Schemas } from './../../util';
import { store } from '../../../store';
import * as globals from './../../globals';
import { Collapse, Button } from 'react-bootstrap';
import { PartialList } from './../../item-pages/components';

/**
 * A single Announcement block/view.
 */
class Announcement extends React.Component {

    subtitleAuthor(author){
        if (!author) return null;
    }

    subtitle(){
        var content = this.props.content;
        var date = content.date_created;
        var author = content.submitted_by;
        var authorName = (author && author.display_title && <span className="text-500">{ author.display_title }</span>) || null;
        var unreleasedStatus = content.status && content.status !== 'released' ? <span className="text-500"> - { Schemas.Term.capitalizeSentence(content.status) }</span> : null;
        //var authorLink = authorName && object.itemUtil.atId(author);
        //if (authorLink) authorName = <a href={authorLink}>{ authorName }</a>;
        return (
            <div className="fourDN-section-info announcement-subtitle">
                { authorName ? <span>Posted by { authorName }</span>: null }
                { date ? <span>{!authorName ? ' Posted ' : ' '}on <DateUtility.LocalizedTime timestamp={date}/></span> : null }
                { unreleasedStatus }
            </div>
        );
    }

    render() {
        var title = this.props.content.title || "";
        var content = this.props.content.content || "";

        return (
            <div className="fourDN-section announcement">
                <div className="fourDN-section-title announcement-title">
                        <span dangerouslySetInnerHTML={{__html: title}}/>
                </div>
                { this.subtitle() }
                <div className="fourDN-content announcement-content">
                    <p dangerouslySetInnerHTML={{__html: content}}></p>
                </div>
            </div>
        );
    }

}

class AnnouncementsLoaded extends React.Component {

    static defaultProps = {
        'searchURL' : '/search/?type=StaticSection&section_type=Announcement&sort=-date_created'
    }

    constructor(props){
        super(props);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this);
        this.fetchAnnouncements = this.fetchAnnouncements.bind(this);
        this.handleAnnouncementsSearchResponse = this.handleAnnouncementsSearchResponse.bind(this);
        this.state = {
            'announcements' : null,
            'loading' : false,
            'mounted' : false,
            'loadedAll' : false // TODO when have more announcements in system : create 'see more' function at this level and pass it down to Announcements to load in more.
        };
    }

    componentDidMount(){
        if (!this.state.announcements) this.fetchAnnouncements();
        else this.setState({ 'mounted' : true });
    }

    componentWillReceiveProps(nextProps){
        if (nextProps.session !== this.props.session) this.fetchAnnouncements();
    }

    fetchAnnouncements(){
        this.setState({ 'loading' : true, 'mounted' : true }, ()=>{
            ajax.load(this.props.searchURL, this.handleAnnouncementsSearchResponse, 'GET', this.handleAnnouncementsSearchResponse);
        });
    }

    handleAnnouncementsSearchResponse(resp){
        var r_announcements = (resp && resp['@graph']) || null;
        if (Array.isArray(r_announcements) && r_announcements.length > 0){
            var loadedAll = typeof resp.total === 'number' && r_announcements.length === resp.total ? true : false;
            this.setState({ 'announcements' : r_announcements, 'loading' : false, 'loadedAll' : loadedAll, 'totalCount' : resp.total });
        } else {
            this.setState({ 'announcements' : null, 'loading' : false, 'loadedAll' : true });
        }
    }
    
    render (){
        if (Array.isArray(this.state.announcements)){
            return <Announcements {...this.props} loaded={false} announcements={this.state.announcements} total={this.state.totalCount} />;
        }
        if (this.state.loading || !this.state.mounted){
            return <h4 className="text-center mb-5" style={{ 'opacity' : 0.5 }}><i className="icon icon-spin icon-circle-o-notch"/></h4>;
        }
        return <Announcements loaded={false} announcements={[]} total={0} />;
    }
}

/**
 * Component which shows currents announcements.
 * Announcements are (temporarily) currently stored in src/encoded/static/data/announcements_data.js.
 * 
 * @prop {string} className - Outer <div> element's className
 * @prop {string} id - Outer <div> element's id attribute.
 */
export class Announcements extends React.Component {

    static defaultProps = {
        'announcements' : [],
        'loaded' : false,
        'initiallyVisible' : 3
    }

    constructor(props){
        super(props);
        this.toggleOpen = this.toggleOpen.bind(this);
        this.state = {
            'open' : false
        };
    }

    toggleOpen(){
        this.setState({ 'open' : !this.state.open });
    }

    render(){
        var { loaded, announcements, initiallyVisible, className, id, total } = this.props;
        if (loaded) return <AnnouncementsLoaded {...this.props} />;
        if (!total) total = announcements.length;

        var persistent, collapsible = null;

        function createAnnouncement(announce, idx){
            return <Announcement key={announce.title} index={idx} content={announce} icon={collapsible ? true : false} />;
        }

        if (announcements.length > initiallyVisible) {
            persistent = announcements.slice(0,initiallyVisible);
            collapsible = announcements.slice(initiallyVisible);
        } else {
            persistent = announcements;
        }

        if (!announcements || announcements.length === 0){
            return <div className={'text-center ' + (className || '')} id={id}><em>No announcements</em></div>;
        }

        var onSeeMoreButtonClick = this.props.onSeeMoreClick || this.toggleOpen;

        return (
            <div className={className} id={id}>{
                collapsible ? [
                    <PartialList key="list" open={this.state.open} collapsible={collapsible.map(createAnnouncement)} persistent={persistent.map(createAnnouncement)}/>,
                    <Button key="button" bsSize="sm" className="pull-right" onClick={onSeeMoreButtonClick} bsStyle="default">{ !this.state.open ? 'See ' + (total - persistent.length) + ' More' : 'Hide' }</Button>
                ] : persistent.map(createAnnouncement)
            }</div>
        );
    }
}

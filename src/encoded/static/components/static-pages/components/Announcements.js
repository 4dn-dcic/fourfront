'use strict';

import React from 'react';
import _ from 'underscore';
import { console, ajax, valueTransforms } from '@hms-dbmi-bgm/shared-portal-components/es/components/util';
import { LocalizedTime } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/LocalizedTime';
import { PartialList } from '@hms-dbmi-bgm/shared-portal-components/es/components/ui/PartialList';
import { BasicStaticSectionBody } from '@hms-dbmi-bgm/shared-portal-components/es/components/static-pages/BasicStaticSectionBody';
import { replaceString as placeholderReplacementFxn } from './../../static-pages/placeholders';

/**
 * A single Announcement block/view.
 * @todo refactor into functional components, if not getting rid of
 */

const Announcement = React.memo(function Announcement(props){
    const { section, windowWidth } = props;
    if (!section || !section.content) return null;
    const filetype = section.filetype || 'html';
    return (
        <div className="announcement">
            <div className="announcement-title">
                <span dangerouslySetInnerHTML={{ __html: section.title || '<em>Untitled</em>' }}/>
            </div>
            <AnnouncementSubTitle {...props}/>
            <div className="announcement-content">
                <BasicStaticSectionBody content={section.content} {...{ filetype, placeholderReplacementFxn, windowWidth }} />
            </div>
        </div>
    );
});

const AnnouncementSubTitle = React.memo(function AnnouncementSubTitle(props){
    const { section : { date_created : date = null, submitted_by : { display_title : authorDisplayTitle = null } = {}, status = null } } = props;
    const authorName = (authorDisplayTitle && <span className="text-500">{ authorDisplayTitle }</span>) || null;
    const unreleasedStatus = status && status !== 'released' ? (
        <span className="text-500"> - { valueTransforms.capitalizeSentence(status) }</span>
    ) : null;
    //var authorLink = authorName && object.itemUtil.atId(author);
    //if (authorLink) authorName = <a href={authorLink}>{ authorName }</a>;
    return (
        <div className="fourDN-section-info announcement-subtitle">
            { authorName ? <span>Posted by { authorName }</span>: null }
            { date ? <span>{!authorName ? ' Posted ' : ' '}on <LocalizedTime timestamp={date}/></span> : null }
            { unreleasedStatus }
        </div>
    );
});

class AnnouncementsLoaded extends React.PureComponent {

    static defaultProps = {
        'searchURL' : '/search/?type=StaticSection&section_type=Announcement&sort=-date_created'
    };

    constructor(props){
        super(props);
        this.fetchAnnouncements = this.fetchAnnouncements.bind(this);
        this.handleAnnouncementsSearchResponse = this.handleAnnouncementsSearchResponse.bind(this);
        this.state = {
            'announcements' : props.announcements || null,
            'loading' : false,
            'mounted' : false,
            'loadedAll' : false // TODO when have more announcements in system : create 'see more' function at this level and pass it down to Announcements to load in more.
        };
    }

    componentDidMount(){
        if (!this.state.announcements) this.fetchAnnouncements();
        else this.setState({ 'mounted' : true });
    }

    componentDidUpdate(pastProps){
        if (pastProps.session !== this.props.session) this.fetchAnnouncements();
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
        const { announcements, totalCount, mounted, loading } = this.state;
        if (Array.isArray(announcements)){
            return <Announcements {...this.props} loaded={false} announcements={announcements} total={totalCount} />;
        }
        if (loading || !mounted){
            return (
                <h4 className="text-center mb-5" style={{ 'opacity' : 0.5 }}>
                    <i className="icon icon-spin icon-circle-notch fas"/>
                </h4>
            );
        }
        return <Announcements loaded={false} announcements={[]} total={0} />;
    }
}

/**
 * Component which shows currents announcements.
 *
 * @prop {string} className - Outer <div> element's className
 * @prop {string} id - Outer <div> element's id attribute.
 */
export class Announcements extends React.PureComponent {

    static defaultProps = {
        'announcements' : [],
        'loaded' : false,
        'initiallyVisible' : 3
    };

    constructor(props){
        super(props);
        this.toggleOpen = this.toggleOpen.bind(this);
        this.state = {
            'open' : false
        };
    }

    toggleOpen(){
        this.setState(function({ open }){
            return { 'open' : !open };
        });
    }

    render(){
        const { loaded, announcements, initiallyVisible, className, id, total : propTotal, onSeeMoreClick, windowWidth } = this.props;
        const { open } = this.state;
        if (loaded) return <AnnouncementsLoaded {...this.props} />;

        let total = propTotal;

        const announcementsLength = (Array.isArray(announcements) && announcements.length) || 0;
        if (!total) total = announcementsLength;

        let persistent;
        let collapsible = null;

        function createAnnouncement(announce, idx) {
            return <Announcement key={announce.title} index={idx} section={announce} icon={collapsible ? true : false} windowWidth={windowWidth} />;
        }

        if (announcementsLength === 0){
            return <div className={'text-center ' + (className || '')} id={id}><em>No announcements</em></div>;
        }

        if (announcementsLength > initiallyVisible) {
            persistent = announcements.slice(0,initiallyVisible);
            collapsible = announcements.slice(initiallyVisible);
        } else {
            persistent = announcements;
        }

        const onSeeMoreButtonClick = onSeeMoreClick || this.toggleOpen;

        return (
            <div className={(className || '') + " clearfix"} id={id}>
                {
                    collapsible ? [
                        <PartialList key="list" open={open} collapsible={collapsible.map(createAnnouncement)} persistent={persistent.map(createAnnouncement)} windowWidth={windowWidth} />,
                        <button type="button" key="button" className="pull-right btn-sm btn-outline-dark" onClick={onSeeMoreButtonClick}>
                            {!open ? 'See ' + (total - persistent.length) + ' More' : 'Hide'}
                        </button>
                    ] : persistent.map(createAnnouncement)
                }
            </div>
        );
    }
}
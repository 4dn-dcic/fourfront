'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import _ from 'underscore';
import serialize from 'form-serialize';
import { Button, Modal, FormGroup, ControlLabel, FormControl, HelpBlock, InputGroup, Alert, Collapse } from 'react-bootstrap';
import { object, ajax } from './../util';
import { LinkToSelector } from './components/LinkToSelector';



export default class UserRegistrationForm extends React.PureComponent {

    static defaultProps = {
        'captchaSiteKey' : '6Lf6dZYUAAAAAEq46tu1mNp0BTCyl0-_wuJAu3nj',
        'endpoint' : "/create-unauthorized-user"
    };

    constructor(props){
        super(props);
        this.onRecaptchaLibLoaded   = this.onRecaptchaLibLoaded.bind(this);
        this.onReCaptchaResponse    = this.onReCaptchaResponse.bind(this);
        this.onReCaptchaError       = this.onReCaptchaError.bind(this);
        this.onReCaptchaExpiration  = this.onReCaptchaExpiration.bind(this);

        this.onFirstNameChange      = this.onFirstNameChange.bind(this);
        this.onLastNameChange       = this.onLastNameChange.bind(this);
        this.onContactEmailChange   = this.onContactEmailChange.bind(this);
        this.onSelectLab            = this.onSelectLab.bind(this);
        this.onClearLab             = this.onClearLab.bind(this);

        this.onFormSubmit           = this.onFormSubmit.bind(this);

        this.formRef = React.createRef();
        this.recaptchaContainerRef = React.createRef();

        this.state = {
            'captchaResponseToken' : null,
            'captchaErrorMsg'      : null,
            'registrationStatus'   : 'form',

            // These fields are required, so we store in state
            // to be able to do some as-you-type validation
            "value_for_first_name"          : null,
            "value_for_last_name"           : null,
            "value_for_contact_email"       : null,
            "value_for_pending_lab"         : null,
            "value_for_pending_lab_details" : null
        };
    }

    componentDidMount(){
        window.onRecaptchaLoaded = this.onRecaptchaLibLoaded;
        this.captchaJSTag = document.createElement('script');
        this.captchaJSTag.setAttribute('src', 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoaded&render=explicit');
        this.captchaJSTag.setAttribute('async', true);
        document.head.appendChild(this.captchaJSTag);
    }

    componentWillUnmount(){
        if (this.captchaJSTag){
            document.head.removeChild(this.captchaJSTag);
            delete this.captchaJSTag;
        }
    }

    onRecaptchaLibLoaded(){
        console.info('Loaded Google reCaptcha library..');
        grecaptcha.render(
            this.recaptchaContainerRef.current,
            {
                'sitekey'           : this.props.captchaSiteKey,
                'callback'          : this.onReCaptchaResponse,
                'error-callback'    : this.onReCaptchaExpiration,
                'expired-callback'  : this.onReCaptchaExpiration
            }
        );
    }

    /** We deliver token received here with POSTed form data for server-side validation. */
    onReCaptchaResponse(captchaResponseToken){
        this.setState({ captchaResponseToken, 'captchaErrorMsg' : null });
    }

    onReCaptchaError(){
        this.setState({
            'captchaResponseToken' : null,
            'captchaErrorMsg' : "Please retry - likely network error encountered."
        });
    }

    onReCaptchaExpiration(){
        this.setState({
            'captchaResponseToken' : null,
            'captchaErrorMsg' : "Please retry - reCaptcha validation expired."
        });
    }

    onFirstNameChange(e){ this.setState({ 'value_for_first_name' : e.target.value }); }

    onLastNameChange(e){ this.setState({ 'value_for_last_name' : e.target.value }); }

    onContactEmailChange(e){ this.setState({ 'value_for_contact_email' : e.target.value }); }

    onSelectLab(value_for_pending_lab, value_for_pending_lab_details){
        // TODO: If value_for_pending_lab exists but not value_for_pending_lab_details,
        // then do AJAX request to get details.
        // TODO: Error fallback (?)
        this.setState({ value_for_pending_lab, value_for_pending_lab_details });
    }

    onClearLab(e){
        e.preventDefault();
        this.setState({
            'value_for_pending_lab' : null,
            'value_for_pending_lab_details' : null
        });
    }

    onFormSubmit(evt){
        evt.preventDefault();
        evt.stopPropagation();
        var formElem = this.formRef.current;
        var formData = serialize(formElem, { 'hash' : true });
        console.log('DDD', formData);
        var combinedData = _.extend(formData, {
            'email'         : this.props.email, // We don't allow user(s) to edit/override their JWT.
            'pending_lab'   : this.state.value_for_pending_lab
            // These will be present in serialized formData:
            //'first_name'    : this.state.value_for_first_name,
            //'last_name'     : this.state.value_for_last_name
        });

        this.setState({'registrationStatus' : 'loading' }, ()=>{

            ajax.load(
                this.props.endpoint,
                (resp) => {
                    // TODO
                    this.setState({'registrationStatus' : 'success'});
                    this.props.onComplete(); // <- Do request to login, then hide/unmount this component.
                },
                'POST',
                (err) => {
                    // TODO
                    // If validation failure, set / show status message, return;
                    // Else If unknown failure:
                    this.setState({'registrationStatus' : 'network-failure'});
                },
                JSON.stringify(combinedData)
            );

        });

    }

    render(){
        var { email, onCancel } = this.props,
            { registrationStatus, value_for_first_name, value_for_last_name, value_for_contact_email,
                value_for_pending_lab_details, value_for_pending_lab } = this.state,
            captchaToken        = this.state.captchaResponseToken,
            captchaError        = this.state.captchaErrorMsg,
            emailValidationRegex= /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            contactEmail        = value_for_contact_email && value_for_contact_email.toLowerCase(),
            isContactEmailValid = !contactEmail || emailValidationRegex.test(contactEmail),
            maySubmit = (
                captchaToken && value_for_first_name && value_for_last_name
            ),
            errorIndicator = null,
            loadingIndicator = null;

        if (registrationStatus === 'network-failure'){
            // TODO: Hide form in this case?
            errorIndicator = (
                <Alert bsStyle="danger">
                    <span className="text-500">Failed to register new account. Please try again later.</span>
                </Alert>
            );
        } else if (registrationStatus === 'loading'){
            loadingIndicator = (
                <div style={{
                    'position' : 'absolute',
                    'display' : 'flex',
                    'alignItems' : 'center',
                    'fontSize' : '3em',
                    'color' : 'rgba(0,0,0,0.8)',
                    'backgroundColor' : 'rgba(255,255,255,0.85)',
                    'left' : 0, 'right' : 0, 'bottom' : 0, 'top' : 0
                }}>
                    <div className="text-center">
                        <i className="icon icon-spin icon-circle-o-notch"/>
                    </div>
                </div>
            );
        }

        return (
            <div className="user-registration-form-container" style={{ 'position' : 'relative' }}>

                { errorIndicator }

                <form method="POST" name="user-registration-form" ref={this.formRef} onSubmit={this.onFormSubmit}>

                    <FormGroup controlId="email-address" validationState={null}>
                        <ControlLabel>Primary E-Mail or Username</ControlLabel>
                        <h4 id="email-address" className="text-300 mt-0">
                            { object.itemUtil.User.gravatar(email, 36, {'style' : { 'borderRadius': '50%' }}, 'mm') }&nbsp;&nbsp;
                            { email }
                        </h4>
                    </FormGroup>

                    <div className="row">
                        <div className="col-sm-12 col-md-6">
                            <FormGroup controlId="firstName" validationState={value_for_first_name === '' ? 'error' : null}>
                                <ControlLabel>First Name <span className="text-danger">*</span></ControlLabel>
                                <FormControl name="first_name" type="text" onChange={this.onFirstNameChange}/>
                                <FormControl.Feedback />
                                { value_for_first_name === '' ? <HelpBlock>First name cannot be blank</HelpBlock> : null }
                            </FormGroup>
                        </div>
                        <div className="col-sm-12 col-md-6">
                            <FormGroup controlId="lastName" validationState={value_for_last_name === '' ? 'error' : null}>
                                <ControlLabel>Last Name <span className="text-danger">*</span></ControlLabel>
                                <FormControl name="last_name" type="text" onChange={this.onLastNameChange}/>
                                <FormControl.Feedback />
                                { value_for_last_name === '' ? <HelpBlock>Last name cannot be blank</HelpBlock> : null }
                            </FormGroup>
                        </div>
                    </div>

                    <hr className="mt-1 mb-15" />

                    <FormGroup controlId="pendingLab" validationState={null}>
                        <ControlLabel>Lab / Affiliation <span className="text-300">(Optional)</span></ControlLabel>
                        <div>
                            <LookupLabField onSelect={this.onSelectLab} currentLabDetails={value_for_pending_lab_details} onClear={this.onClearLab} />
                        </div>
                        <HelpBlock>Lab or Institute with which you are associated.</HelpBlock>
                    </FormGroup>


                    <Collapse in={!!(value_for_pending_lab)}>
                        <FormGroup controlId="jobTitle" validationState={null}>
                            <ControlLabel>
                                Job Title
                                { value_for_pending_lab_details && value_for_pending_lab_details.display_title &&
                                <span className="text-400"> at { value_for_pending_lab_details.display_title}</span> }
                                <span className="text-300"> (Optional)</span>
                            </ControlLabel>
                            <FormControl name="job_title" type="text"/>
                        </FormGroup>
                    </Collapse>

                    <FormGroup controlId="contactEmail" validationState={!isContactEmailValid ? 'error' : null}>
                        <ControlLabel>Preferred Contact Email <span className="text-300">(Optional)</span></ControlLabel>
                        <FormControl name="preferred_email" type="text" onChange={this.onContactEmailChange}/>
                        <HelpBlock>
                            { isContactEmailValid ? "Preferred contact email, if different from login/primary email." : "Please enter a valid e-mail address." }
                        </HelpBlock>
                    </FormGroup>

                    {/* <input type="hidden" name="g-recaptcha-response" value={captchaToken} /> */}

                    <div className="recaptcha-container">
                        <div className="g-recaptcha" ref={this.recaptchaContainerRef} />
                        { captchaError ? <HelpBlock>{ captchaError }</HelpBlock> : null }
                    </div>

                    <div className="clearfix">
                        <Button type="submit" disabled={!(maySubmit)} className="right text-300" bsSize="lg" bsStyle="primary">
                            Sign Up
                        </Button>
                    </div>
                </form>

                { loadingIndicator }

            </div>
        );
    }

}


class LookupLabField extends React.PureComponent {

    static propTypes = {
        'onSelect' : PropTypes.func.isRequired,
        'onClear' : PropTypes.func.isRequired,
        'loading' : PropTypes.bool.isRequired
    };

    constructor(props){
        super(props);
        this.receiveItem            = this.receiveItem.bind(this);
        this.setIsSelecting         = _.throttle(this.toggleIsSelecting.bind(this, true), 3000, { 'trailing' : false });
        this.unsetIsSelecting       = this.toggleIsSelecting.bind(this, false);
        this.toggleIsSelecting      = this.toggleIsSelecting.bind(this);
        this.state = {
            'isSelecting' : false
        };
    }

    toggleIsSelecting(isSelecting){
        this.setState(function(currState){
            if (typeof isSelecting !== 'boolean') isSelecting = !currState.isSelecting;
            if (isSelecting === currState.isSelecting) return null;
            return { isSelecting };
        });
    }

    receiveItem(selectionAtID, selectionItemContext) {

        // Is it blank? Do nothing.
        if (!selectionAtID) {
            return;
        }

        this.setState({ 'isSelecting' : false }, ()=>{
            // Invoke the object callback function, using the text input.
            this.props.onSelect(selectionAtID, selectionItemContext);
        });
    }

    render(){
        var { loading, currentLabDetails } = this.props,
            { isSelecting } = this.state,
            tooltip         = "Search for a Lab and add it to the display.",
            dropMessage     = "Drop a Lab here.",
            searchURL       = '/search/?currentAction=selection&type=Lab',
            currLabTitle    = (
                currentLabDetails && currentLabDetails['@id'] && currentLabDetails.display_title && (
                    <a href={object.itemUtil.atId(currentLabDetails)} target="_blank"
                        rel="noopener noreferrer" style={{ verticalAlign: "middle" }}>
                        { currentLabDetails.display_title }
                    </a>
                )
            ) || 'No Lab selected';

        return (
            <React.Fragment>

                <div className="row flexrow">
                
                </div>

                <InputGroup>
                    <InputGroup.Addon style={{ 'width' : 'auto' }}>{ currLabTitle }</InputGroup.Addon>
                    <InputGroup.Button>
                        <Button className={currentLabDetails ? "btn-default" : "btn-primary"} onClick={this.setIsSelecting} disabled={loading} data-tip={tooltip}>
                            Select
                        </Button>
                    </InputGroup.Button>
                    { currentLabDetails && currentLabDetails['@id'] ?
                        <InputGroup.Button>
                            <Button onClick={this.props.onClear}>
                                Clear
                            </Button>
                        </InputGroup.Button>
                    : null }
                </InputGroup>

                {/* <span className="text-500" style={{ verticalAlign: 'middle' }}>{ currLabTitle }</span> */}
                <LinkToSelector isSelecting={isSelecting} onSelect={this.receiveItem} onCloseChildWindow={this.unsetIsSelecting} dropMessage={dropMessage} searchURL={searchURL} />
            </React.Fragment>
        );
    }
}


export class UserRegistrationModal extends React.PureComponent {

    static defaultProps = {
        "title" : "Registration",
        "heading" : null,
        "email" : "person@email.com"
    };

    constructor(props){
        super(props);
        this.state = {
            'showForm' : false
        };
    }

    render(){
        var { title, heading, onCancel } = this.props;

        return (
            <Modal show bsSize="large" onHide={onCancel}>

                <Modal.Header closeButton>
                    <Modal.Title>{ title }</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    { heading }
                    <UserRegistrationForm {..._.pick(this.props, 'email', 'onCancel')} />
                </Modal.Body>
            </Modal>
        );
    }

}


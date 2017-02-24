'use strict';

var React = require('react');
var _ = require('underscore');
var { console, layout, isServerSide } = require('./util');
var vizUtil = require('./viz/utilities');

var FlexibleDescriptionBox = module.exports.FlexibleDescriptionBox = React.createClass({

    statics : {
        defaultDimensions : function(){
            return {
                paddingWidth : 0,
                paddingHeight : 0,
                buttonWidth : 30,
                initialHeight : 20
            };
        }
    },

    propTypes : {
        description : React.PropTypes.any.isRequired,
        dimensions : React.PropTypes.shape({
            paddingWidth : React.PropTypes.number,
            paddingHeight : React.PropTypes.number,
            buttonWidth : React.PropTypes.number,
            initialHeight : React.PropTypes.number
        }),
        fitTo : React.PropTypes.oneOf(['grid', 'parent', 'self']),
        includeButton : React.PropTypes.bool,   // If false, must use refs and call this.toggleDescriptionExpand manually
        className : React.PropTypes.string,
        textClassName : React.PropTypes.string,
        textElement : React.PropTypes.oneOf(['p', 'span', 'div', 'label']),
        textStyle : React.PropTypes.object
    },

    getDefaultProps : function(){
        return {
            dimensions : null,
            fitTo : 'self',
            includeButton : true,
            className : null,
            textClassName : 'text-normal',
            textElement : 'p',
            textStyle : null,
            debug : false
        };
    },

    getInitialState : function(){
        return {
            descriptionExpanded : false,
            descriptionWillFitOneLine : true,
            descriptionWhiteSpace : 'nowrap'
        }
    },

    descriptionHeight : null, // Use for animating height, if needed.
    
    dimensions : function(){
        if (this.props.dimensions) return _.extend(FlexibleDescriptionBox.defaultDimensions(), this.props.dimensions);
        else return FlexibleDescriptionBox.defaultDimensions();
    },
    
    checkWillDescriptionFitOneLineAndUpdateHeight : function(){

        if (isServerSide()) return true;
        var dims = this.dimensions();
        var containerWidth;

        if (this.props.fitTo === 'grid'){
            containerWidth = layout.gridContainerWidth();
        } else if (this.props.fitTo === 'parent'){
            containerWidth = this.refs.box.parentElement.offsetWidth;
        } else if (this.props.fitTo === 'self'){
            containerWidth = (this.refs.box && this.refs.box.offsetWidth) || 1000;
        }

        containerWidth -= dims.paddingWidth; // Account for inner padding & border.
        
        var tcw = layout.textContentWidth(
            this.props.description,
            this.props.textElement,
            this.props.textClassName,
            containerWidth - dims.buttonWidth, // Account for expand button.
            this.props.textStyle
        );

        if (!tcw) return true;

        this.descriptionHeight = tcw.containerHeight + dims.paddingHeight; // Account for padding, border.

        if (tcw.textWidth < containerWidth){ 
            return true;
        }
        return false;

    },
    

    componentDidMount : function(){
        if (this.props.debug) console.info("Mounted FlexibleDescriptionBox");
        if (!isServerSide()){

            // Create throttled version of toggleDescriptionExpand for button.
            this.throttledToggleDescriptionExpand = _.throttle(this.toggleDescriptionExpand, 350);

            // Hookup window resize event listener to checkWillDescriptionFitOneLineAndUpdateHeight
            this.debouncedLayoutResizeStateChange = _.debounce(() => {
                // Debounce to prevent from executing more than once every 300ms.
                var oldHeight = this.descriptionHeight;
                var willDescriptionFitAtNewWindowSize = this.checkWillDescriptionFitOneLineAndUpdateHeight();
                if (willDescriptionFitAtNewWindowSize != this.state.descriptionWillFitOneLine){
                    this.setState({
                        descriptionWillFitOneLine : willDescriptionFitAtNewWindowSize
                    });
                } else if (this.descriptionHeight != oldHeight) {
                    this.forceUpdate();
                }
            }, 300, false);

            window.addEventListener('resize', this.debouncedLayoutResizeStateChange);
            vizUtil.requestAnimationFrame(()=>{
                this.setState({
                    descriptionWillFitOneLine : this.checkWillDescriptionFitOneLineAndUpdateHeight()
                });
            });
        }
        
    },

    componentWillUnmount: function(){
        if (typeof window != 'undefined'){
            window.removeEventListener('resize', this.debouncedLayoutResizeStateChange);
            delete this.debouncedLayoutResizeStateChange;
            delete this.throttledToggleDescriptionExpand;
        }
    },

    toggleDescriptionExpand : function(){
        this.setState({
            descriptionWhiteSpace : 'normal',
  		    descriptionExpanded: !this.state.descriptionExpanded
        }, ()=>{
            if (!this.state.descriptionExpanded) {
                // Delay whiteSpace style since can't transition it w/ CSS3
                setTimeout(()=>{
                    this.setState({
                        descriptionWhiteSpace : 'nowrap'
                    })
                }, 350);
            }
        });
    },

    render : function(){
        if (this.props.debug) console.log('render FlexibleDescriptionBox');
        var expandButton;
        if (!this.state.descriptionWillFitOneLine){
            expandButton = (
                <button type="button" className="description-expand-button right" onClick={this.throttledToggleDescriptionExpand}>
                    <i className={"icon icon-" + (this.state.descriptionExpanded ? 'minus' : 'plus' )} />
                </button>
            );
        }
        return (
            <div
                ref={this.props.fitTo === 'grid' ? null : "box"}
                className={"flexible-description-box " + (this.props.className ? this.props.className : '')}
                style={{
                    height : this.state.descriptionExpanded ? this.descriptionHeight : this.dimensions().initialHeight + 'px',
                    whiteSpace : this.state.descriptionWhiteSpace
                }}
            >
                { expandButton }
                {
                    React.createElement(
                        this.props.textElement,
                        { 'className' : this.props.textClassName, 'style' : this.props.textStyle },
                        this.props.description
                    )
                }
            </div>
        );
    }

});
import React from 'react';
import ReactDOM from 'react-dom';
import { CSSTransition } from 'react-transition-group';



export class SlideInPane extends React.PureComponent {

    static getDerivedStateFromProps(props, state){
        if (props.in && props.in !== state.in){
            return { 'in' : props.in };
        }
        return null;
    }

    static defaultProps = {
        'fromSide' : 'right'
    };

    constructor(props){
        super(props);
        this.onExited = this.onExited.bind(this);
        this.state = {
            'transitioningOut' : false,
            'in' : props.in || false
        };
    }

    componentDidUpdate(pastProps){
        const { in: propIn } = this.props;
        if (!propIn && pastProps.in){
            // Transition out
            this.setState({ 'transitioningOut' : true });
        }
    }

    onExited(){
        this.setState({ 'transitioningOut' : false, 'in' : false });
    }

    render(){
        const { onClose, fromSide, overlaysContainer, children, ...passProps } = this.props;
        const { transitioningOut, in: stateIn } = this.state;
        if (!stateIn && !transitioningOut){
            return null;
        }

        return ReactDOM.createPortal(
            <CSSTransition classNames="slide-in-pane-transition" appear in={stateIn && !transitioningOut}
                unmountOnExit timeout={{ enter: 10, exit: 400 }} onExited={this.onExited}>
                <div id="slide-in-pane-container" {...passProps}>
                    <div className="overlay-bg" onClick={onClose} />
                    <div className={"slide-in-pane-outer from-side-" + fromSide}>{ children }</div>
                </div>
            </CSSTransition>,
            overlaysContainer,
            "slide-in-pane"
        );
    }
}

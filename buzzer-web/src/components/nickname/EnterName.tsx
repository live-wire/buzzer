import React from 'react';
import './EnterName.css';
import { Button, ButtonGroup } from '@chakra-ui/react'

interface IEnterNameState {
    value: string;
}

interface IEnterNameProps {
    visible: boolean;
    visEval: () => void;
}

class EnterName extends React.Component<IEnterNameProps, IEnterNameState> {
    constructor(props: any) {
        super(props);
        this.state = {
            value: '',
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
    uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    handleChange(event: any) {
        this.setState({ value: event.target.value });
    }
    handleSubmit(event: any) {
        if (this.state.value.length > 0) {
            localStorage.setItem("name", this.state.value);
            localStorage.setItem("uid", this.uuid());
            this.props.visEval();
        }
    }

    render() {
        if (this.props.visible == true) {
            return (
                <div className="topc">
                    <input className="inp" placeholder="Nickname" value={this.state.value} onChange={this.handleChange} />
                    <Button colorScheme='teal' size='lg' onClick={this.handleSubmit} >Continue</Button>
                </div>
            );
        } else {
            return (<div></div>);
        }
    }
}

export default EnterName;

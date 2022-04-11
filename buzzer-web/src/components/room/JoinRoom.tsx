import React from 'react';
import './JoinRoom.css';
import { Button, ButtonGroup } from '@chakra-ui/react'


interface IJoinRoomState {
    value: string;
}

interface IJoinRoomProps {
    join: (s: number) => void;
    create: (e: any) => void;
    visible: boolean;
    visEval: () => void;
}

class JoinRoom extends React.Component<IJoinRoomProps, IJoinRoomState> {
    constructor(props: any) {
        super(props);
        this.state = {
            value: '',
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleJoin = this.handleJoin.bind(this);
    }
    handleChange(event: any) {
        this.setState({ value: event.target.value });
    }
    handleJoin(event: any) {
        // value to number
        var y: number = +this.state.value;
        if (y > 0) {
            this.props.join(y);
        }
    }

    render() {
        if (this.props.visible == true) {
            return (
                <div className="topc">
                    <input className="inp" placeholder="Room Code" value={this.state.value} onChange={this.handleChange} />
                    <Button colorScheme='teal' size='lg' onClick={this.handleJoin}> Join Room </Button>
                    <p>OR</p>
                    <br />
                    <Button className="createRoom" colorScheme='pink' size='lg' onClick={this.props.create}> Create new Room </Button>
                </div>
            );
        } else {
            return (<div></div>);
        }
    }
}

export default JoinRoom;
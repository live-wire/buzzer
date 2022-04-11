import React from 'react';
import './Room.css';
import {
    List,
    ListItem,
    ListIcon,
    Text,
    Container,
    Button,
    Divider,
    OrderedList,
    Spinner,
    UnorderedList,
} from '@chakra-ui/react'
import { MdCheckCircle } from 'react-icons/md';
import { ImCross } from 'react-icons/im';
import { FaCrown } from 'react-icons/fa';

function Title(props: any) {
    return (
        <Text fontSize='5xl'>{props.value}</Text>
    );
}
interface IMembersProps {
    members: IMemberDetails[];
    host: string;
}

interface IMemberDetails {
    name: string;
    uid: string;
    connection: boolean;
    host: boolean;
}

function Members(props: IMembersProps) {
    return (
        <div>
            <Container className="members">
                <Text fontSize='lg' className="cntr">Host: {props.host}</Text>
                <List spacing={3}>
                    {props.members.map(function (item: IMemberDetails) {
                        return <ListItem>
                            <ListIcon as={item.connection == true ? MdCheckCircle : ImCross} color={item.connection == true ? 'green.500' : 'red.500'} />
                            {item.name}
                        </ListItem>
                    })
                    }
                </List>
            </Container>
        </div>
    );
}

interface IStatusProps {
    status: IStatusDetails[]
}

interface IStatusDetails {
    position: number;
    name: string;
    uid: string;
    value: string;
}

function Status(props: IStatusProps) {
    if (props.status.length > 0) {
        return (
            <Container className="members">
                <Text fontSize='lg' className="cntr">Results</Text>
                <OrderedList spacing={3}>{props.status.map(function (item: IStatusDetails) {
                    if (item.position == 1) {
                        return <ListItem> {item.name} {item.position} <ListIcon as={FaCrown} color='yellow.500' /></ListItem>
                    }
                    return <ListItem> {item.name} {item.position} </ListItem>
                })}</OrderedList>
            </Container>
        );
    }
    return <div></div>

}

interface IBuzzerProps {
    buzzer: () => void;
    ready: boolean;
}

function Buzzer(props: IBuzzerProps) {
    if (props.ready) {
        return (
            <div className='center'>
                <div onClick={props.buzzer} className="btn btn-buzz"></div>
                <br></br>
                <Text fontSize='medium'>GO!</Text>
            </div>
        );
    }
    return (
        <div className='center'>
            <div className="btn btn-buzz-disabled"></div>
            <br></br>
            <Spinner /> <Text fontSize='medium'>Hold up!</Text>
        </div>);
}

function GreenBuzzer(props: IBuzzerProps) {
    if (props.ready) {
        return (
            <div className='center'>
                <div onClick={props.buzzer} className="btn btn-buzz-green"></div>
            </div>
        );
    }
    return (
        <div className='center'>
        </div>);
}

interface IRoomState {

}

interface IRoomProps {
    title: string;
    leave: () => void;
    members: IMemberDetails[];
    status: IStatusDetails[];
    buzzer: () => void;
    visible: boolean;
    visEval: () => void;
    buzzerReady: boolean;
    ready: () => void;
    reset: () => void;
}

class Room extends React.Component<IRoomProps, IRoomState> {
    constructor(props: any) {
        super(props);
    }

    render() {
        if (this.props.visible == true) {
            var host = "";
            var hostuid = "";
            var buzzerReadyOverride = this.props.buzzerReady;
            for (var i = 0; i < this.props.members.length; i++) {
                if (this.props.members[i].host == true) {
                    host = this.props.members[i].name;
                    hostuid = this.props.members[i].uid;
                    break
                }
            }
            for (var i = 0; i < this.props.status.length; i++) {
                if (this.props.status[i].uid == localStorage.getItem("uid")) {
                    console.log("You've already buzzed");
                    buzzerReadyOverride = false;
                    break
                }
            }

            if (localStorage.getItem("uid") == hostuid) {

                if (this.props.buzzerReady == true) {
                    return (
                        <div>
                            <Title value={this.props.title} />
                            <Button colorScheme='red' size='lg' onClick={this.props.leave}>Leave Room</Button>
                            <Members members={this.props.members} host={host} />
                            <Divider className="divider" />
                            <Button className="btnroom" isLoading colorScheme='green' variant='solid' size='lg' loadingText='Round In Progress'> Click me </Button>
                            <Button className="btnroom" colorScheme='yellow' size='lg' onClick={this.props.reset}>Reset round</Button>
                            <Status status={this.props.status} />
                        </div>
                    );
                }
                return (
                    <div>
                        <Title value={this.props.title} />
                        <Button colorScheme='red' size='lg' onClick={this.props.leave}>Leave Room</Button>
                        <Members members={this.props.members} host={host} />
                        <Divider className="divider" />
                        <Button className="btnroom" colorScheme='green' size='lg' onClick={this.props.ready}> Start round </Button>
                        <Button className="btnroom" colorScheme='yellow' size='lg' onClick={this.props.reset}> Reset round </Button>
                        <Status status={this.props.status} />
                    </div>
                );
            }
            return (
                <div>
                    <Title value={this.props.title} />
                    <Button colorScheme='red' size='lg' onClick={this.props.leave}>Leave Room</Button>
                    <Members members={this.props.members} host={host} />
                    <Divider className="divider" />
                    <Buzzer buzzer={this.props.buzzer} ready={buzzerReadyOverride} />
                    <Status status={this.props.status} />
                </div>
            );
        } else {
            return (<div></div>);
        }
    }
}

export type {
    IMemberDetails,
    IStatusDetails
};

export default Room;
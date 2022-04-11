import React from 'react';
import logo from './logo.svg';
import './App.css';
import { throws } from 'assert';
import Room from './components/room/Room';
import JoinRoom from './components/room/JoinRoom';
import EnterName from './components/nickname/EnterName';
import { IMemberDetails, IStatusDetails } from './components/room/Room';

interface IAppState {
  nameVisible: boolean;
  roomVisible: boolean;
  joinRoomVisible: boolean;
  room: number;
  ws?: WebSocket;
  members: IMemberDetails[];
  status: IStatusDetails[];
  buzzerReady: boolean;
}

interface IAppProps {

}

class App extends React.Component<IAppProps, IAppState> {
  constructor(props: any) {
    super(props);
    this.state = {
      nameVisible: false,
      roomVisible: false,
      joinRoomVisible: false,
      room: 0,
      ws: undefined,
      members: [],
      buzzerReady: false,
      status: [],
    };
    this.join = this.join.bind(this);
    this.create = this.create.bind(this);
    this.leave = this.leave.bind(this);
    this.isNameVisible = this.isNameVisible.bind(this);
    this.isRoomVisible = this.isRoomVisible.bind(this);
    this.isJoinRoomVisible = this.isJoinRoomVisible.bind(this);
    this.visEval = this.visEval.bind(this);
    this.openSocketConnection = this.openSocketConnection.bind(this);
    this.buzzer = this.buzzer.bind(this);
    this.ready = this.ready.bind(this);
    this.reset = this.reset.bind(this);
  }

  ready() {
    if (this.state.ws != undefined) {
      this.state.ws.send("READY");
    }
  }

  reset() {
    if (this.state.ws != undefined) {
      this.state.ws.send("RESET");
    }
  }

  componentDidMount() {
    this.visEval();
  }

  visEval() {
    var room = localStorage.getItem("room")
    this.setState({
      nameVisible: this.isNameVisible(),
      roomVisible: this.isRoomVisible(),
      joinRoomVisible: this.isJoinRoomVisible(),
      room: +(room || 0),
      ws: (room != null && room != "") ? this.openSocketConnection() : undefined,

    })
  }

  buzzer() {
    if (this.state.ws != undefined) {
      this.state.ws.send("BUZZ");
    }
  }

  leave() {
    localStorage.removeItem("room");
    if (this.state.ws != undefined) {
      this.state.ws.close();
    }
    this.visEval();
  }

  join(code: number) {
    console.log("Joining room: " + code);
    console.log("join clicked");
    localStorage.setItem("room", code.toString());
    this.setState({ room: code });
    this.visEval()
  }

  create(event: any) {
    var t = this;
    fetch("/create", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      },
    }).then(function (response) {
      return response.json();
    }).then(function (data) {
      console.log(data);
      localStorage.setItem("room", data.code);
      t.setState({ room: data.code });
      t.visEval()
    });
  }

  isNameVisible(): boolean {
    var name = localStorage.getItem("name");
    var uid = localStorage.getItem("uid");
    if (uid == null || uid.length == 0 || name == null || name.length == 0) {
      return true;
    }
    return false;
  }

  isRoomVisible(): boolean {
    if (this.isNameVisible()) {
      return false;
    }
    var room = localStorage.getItem("room");
    if (room == null || room.length == 0) {
      return false;
    }
    return true;
  }

  isJoinRoomVisible(): boolean {
    if (this.isNameVisible()) {
      return false;
    }
    if (this.isRoomVisible()) {
      return false;
    }
    return true;
  }

  openSocketConnection() {
    if (this.state.ws != undefined) {
      return this.state.ws;
    }
    // + "/" + localStorage.getItem("room") + "?" + "name=" + localStorage.getItem("name") + "&uid=blah"
    var ws = new WebSocket("ws://" + window.location.host + "/join" + "?" + "name=" + localStorage.getItem("name") + "&uid=" + localStorage.getItem("uid") + "&room=" + localStorage.getItem("room"));
    var t = this;
    ws.onopen = function (evt) {
      console.log("WS open");
      t.setState({
        ws: ws
      })
    }
    ws.onclose = function (evt) {
      console.log("WS closed");
      t.leave();
    }
    ws.onmessage = function (evt) {
      console.log("WS message", evt);
      var data = JSON.parse(evt.data);
      if (data.type == "members") {
        t.setState({ members: data.members });
      } else if (data.type == "status") {
        var s = data.status ? data.status : [];
        t.setState({ status: s });
      } else if (data.type == "buzz") {
        t.setState({ buzzerReady: data.ready });
      }
    }
    ws.onerror = function (evt) {
      console.log("WS error", evt);
    }
    return ws
  }

  render() {
    return (
      <div className="App">
        <EnterName visible={this.state.nameVisible} visEval={this.visEval} />
        <JoinRoom visible={this.state.joinRoomVisible}
          visEval={this.visEval}
          join={this.join}
          create={this.create} />
        <Room visible={this.state.roomVisible}
          visEval={this.visEval}
          title={"Room: " + this.state.room}
          members={this.state.members}
          status={this.state.status}
          buzzer={this.buzzer}
          buzzerReady={this.state.buzzerReady}
          leave={this.leave}
          ready={this.ready}
          reset={this.reset} />
      </div>
    );
  }
}

export default App;

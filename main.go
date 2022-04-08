package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{} // use default options

var (
	portOutgoing = "localhost:8080"
)

type Rooms struct {
	L     sync.Mutex
	Rooms map[int]*Room
}

type Room struct {
	L       sync.Mutex
	Code    int
	Members map[string]*Member
	Game    *Game
	Host    *Member
}

type Game struct {
	L     sync.Mutex
	Buzz  map[string]time.Time
	Ready bool
}

type Member struct {
	Uid             string
	Name            string
	LastMessageRecv string
	Ws              *WebSocketConnection
}

type WebSocketConnection struct {
	Alive bool
	Conn  *websocket.Conn
}

func (x *Rooms) AddMemberWrapper(w http.ResponseWriter, r *http.Request) {
	if !checkAllRequiredVariables(w, r) {
		log.Println("Websocket join failed")
		return
	}
	room := r.URL.Query().Get("room")
	roomCode, _ := strconv.Atoi(room)
	uid := r.URL.Query().Get("uid")
	name := r.URL.Query().Get("name")

	if _, ok := x.Rooms[roomCode]; !ok {
		http.Error(w, "room not found", http.StatusBadRequest)
		return
	}

	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("error initializing ws:", err)
		return
	}
	ws := &WebSocketConnection{Alive: true, Conn: c}

	member := &Member{
		Uid:  uid,
		Name: name,
		Ws:   ws,
	}
	x.Rooms[roomCode].AddMember(member)
	x.Rooms[roomCode].BroadcastMembers()
	x.Rooms[roomCode].BroadcastStatus()
}

func checkAllRequiredVariables(w http.ResponseWriter, r *http.Request) bool {

	room := r.URL.Query().Get("room")
	_, err := strconv.Atoi(room)
	if room == "" || err != nil {
		http.Error(w, "invalid/missing room code", http.StatusBadRequest)
		return false
	}
	uid := r.URL.Query().Get("uid")
	if uid == "" {
		http.Error(w, "missing uid (in query params)", http.StatusBadRequest)
		return false
	}
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "missing name (in query params)", http.StatusBadRequest)
		return false
	}
	return true
}

func (x *Rooms) AddMember(member *Member) {
	x.L.Lock()
	defer x.L.Unlock()
	for _, room := range x.Rooms {
		room.AddMember(member)
	}
}

func (r *Room) GameReset() {
	r.L.Lock()
	defer r.L.Unlock()
	r.Game = &Game{
		Buzz:  make(map[string]time.Time),
		Ready: false,
	}
}

func (r *Room) Broadcast(message string) {
	for _, member := range r.Members {
		member.Ws.Write([]byte(message))
	}
}

func (r *Room) AddMember(member *Member) {
	r.L.Lock()
	defer r.L.Unlock()
	m, ok := r.Members[member.Uid]
	if ok {
		m.Ws.Close()
	}
	r.Members[member.Uid] = member
	if len(r.Members) == 1 {
		r.Host = member
	}
	go r.ReadLoop(member.Uid)
}

func generate6digitInt() int {
	return rand.Intn(999999)
}

func (x *Rooms) CreateRoom(w http.ResponseWriter, r *http.Request) {
	x.L.Lock()
	defer x.L.Unlock()

	roomCode := generate6digitInt()
	if _, ok := x.Rooms[roomCode]; ok {
		http.Error(w, "room already exists", http.StatusBadRequest)
		return
	}
	x.Rooms[roomCode] = &Room{
		Code:    roomCode,
		Members: make(map[string]*Member),
		Game: &Game{
			Buzz:  make(map[string]time.Time),
			Ready: false,
		},
	}
	log.Println("Room created:", roomCode)
	w.Write([]byte(fmt.Sprintf("{\"code\": %d}", roomCode)))
}

func (xr *Room) GetStatus() string {
	x := xr.Game
	x.L.Lock()
	defer x.L.Unlock()

	type kv struct {
		Position int       `json:"position"`
		Name     string    `json:"name"`
		Uid      string    `json:"uid"`
		Value    time.Time `json:"value"`
	}

	var ss []kv
	for k, v := range x.Buzz {
		ss = append(ss, kv{
			Position: 0,
			Uid:      k,
			Name:     xr.Members[k].Name,
			Value:    v,
		})
	}

	sort.Slice(ss, func(i, j int) bool {
		return ss[i].Value.Before(ss[j].Value)
	})

	ret := map[string]interface{}{
		"status": ss,
		"type":   "status",
	}
	b, e := json.Marshal(ret)
	if e != nil {
		log.Println("error marshalling json:", e)
		return ""
	}
	return string(b)
}

type MemberDetails struct {
	Uid        string `json:"uid"`
	Name       string `json:"name"`
	Connection bool   `json:"connection"`
	Host       bool   `json:"host"`
}

func (xr *Room) GetMembers() string {
	members := []MemberDetails{}

	for _, m := range xr.Members {
		members = append(members, MemberDetails{
			Name:       m.Name,
			Uid:        m.Uid,
			Connection: m.Ws.Alive,
			Host:       m.Uid == xr.Host.Uid,
		})
	}
	ret := map[string]interface{}{
		"members": members,
		"type":    "members",
	}
	b, e := json.Marshal(ret)
	if e != nil {
		log.Println("error marshalling members:", e)
		return ""
	}
	return string(b)
}
func (xr *Room) GetGameReady() string {
	ret := map[string]interface{}{
		"ready": xr.Game.Ready,
		"type":  "buzz",
	}
	b, e := json.Marshal(ret)
	if e != nil {
		log.Println("error marshalling game-ready:", e)
		return ""
	}
	return string(b)
}

func (x *Room) BroadcastGameReady() {
	x.L.Lock()
	defer x.L.Unlock()
	r := x.GetGameReady()
	if r != "" {
		x.Broadcast(r)
	}
}

func (x *Room) BroadcastStatus() {
	x.L.Lock()
	defer x.L.Unlock()
	r := x.GetStatus()
	if r != "" {
		x.Broadcast(r)
	}
}

func (x *Room) BroadcastMembers() {
	x.L.Lock()
	defer x.L.Unlock()
	m := x.GetMembers()
	if m != "" {
		x.Broadcast(m)
	}
}

func (x *Game) MessageRecv(message []byte, member *Member) {
	x.L.Lock()
	defer x.L.Unlock()
	if _, ok := x.Buzz[member.Uid]; !ok {
		x.Buzz[member.Uid] = time.Now()
	}
}

func (x *Game) SetReady() {
	x.L.Lock()
	defer x.L.Unlock()
	x.Ready = true
}

func (x *WebSocketConnection) Close() {
	x.Alive = false
	x.Conn.Close()
}

func (x *WebSocketConnection) Write(message []byte) error {
	return x.Conn.WriteMessage(websocket.TextMessage, message)
}

func (x *Room) ReadLoop(memberUid string) {
	for {
		_, message, err := x.Members[memberUid].Ws.Conn.ReadMessage()
		if err != nil {
			log.Println("error in readMessage:", err)
			x.Members[memberUid].Ws.Close()
			x.BroadcastMembers()
			break
		}
		msg := string(message)
		x.Members[memberUid].LastMessageRecv = msg
		if msg == "BUZZ" {
			x.Game.MessageRecv(message, x.Members[memberUid])
			x.BroadcastStatus()
		} else if msg == "READY" && x.Host.Uid == memberUid {
			x.Game.SetReady()
			x.BroadcastGameReady()
		} else if msg == "RESET" {
			x.GameReset()
			x.BroadcastGameReady()
			x.BroadcastStatus()
			x.BroadcastMembers()
		} else {
			log.Println("unknown message:", msg)
		}
		if !x.Members[memberUid].Ws.Alive {
			x.BroadcastMembers()
			break
		}
	}
}

func NewWebSocketConnection(w http.ResponseWriter, r *http.Request) (*WebSocketConnection, error) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("error initializing ws:", err)
		return nil, err
	}
	wsc := &WebSocketConnection{Alive: true, Conn: c}
	return wsc, nil
}

func main() {
	rand.Seed(time.Now().UnixNano())
	x := &Rooms{
		Rooms: make(map[int]*Room),
	}
	flag.Parse()
	log.SetFlags(0)
	r := mux.NewRouter()
	r.HandleFunc("/join", x.AddMemberWrapper)
	r.HandleFunc("/create", x.CreateRoom)
	r.HandleFunc("/healthcheck", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("OK")) })
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("./buzzer-web/build/")))
	log.Printf("Buzzer - HTTP up on %v \n", portOutgoing)
	log.Fatal(http.ListenAndServe(portOutgoing, r))
}

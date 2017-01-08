// script for ROOMHEAD, which is in charge of creating rooms
// and checking ready and start and end games.
// it is supposed to run all-the-time.
var appId = 'Ecy4bFJFxCowJKwqNtO1GLsv-gzGzoHsz';
var appKey = 'JwVKNn8ayp8kU5IwVKc7UjUb';

AV.initialize(appId, appKey);
var rooms = []; //在每个房间都存在着的成员
var players = [];

// 每个客户端自定义的 id
var clientId = 'ROOMHEAD';
// 一些特定的消息，用于标识开始、结束等控制事件。
var readyMsg = 'READYyYyY';
var startMsg = 'StaRtTtTt';
var endMsg = 'EndDdDDDd';

var realtime;
var client;
var messageIterator;

// 用来存储创建好的 roomObject
var room;
var autoquit = false;

// 监听是否服务器连接成功
var firstFlag = true;

// 用来标记历史消息获取状态
var logFlag = false;

// 拉取历史相关
// 最早一条消息的时间戳
var msgTime;

main();

function main(){
  showLog('正在连接服务器。。。');
  if (!firstFlag) {
    client.close();
  }
  
  //创建realtime
  realtime = new AV.Realtime({
    appId: appId,
    appKey: appKey,
    plugins: AV.TypedMessagesPlugin,
  });
  
  //创建客户端client
  realtime.createIMClient(clientId)
  .then(function(c){
    showLog('连接成功！');
    firstFlag = false;
    client = c;
    client.on('disconnect', function(){
      showLog('服务器正在重连，请耐心等待。。。');
    });
  })
  .then(function(){
    showLog('查找已有房间……');
    rooms = queryRooms(true);
  })
  .then(function(){
    ensureConstRooms(10);
    initPlayers();
  })
  .then(function(){
    client.on('membersjoined', function membersjoinedEventHandler(payload, conversation) {
      addPlayers(conversation, payload);
    });
    client.on('membersleft', function membersleftEventHandler(payload, conversation) {
      deletePlayers(conversation, payload);
    });
  })
  .catch(function(err){
    console.error(err);
  })
}

function ensureConstRooms(N){
  var nrooms = rooms.length;
  var i;
  if(nrooms>=N){
    showLog('Set '+(nrooms-N)+' rooms invisible!');
    for(i=N; i<nrooms; i++){
      rooms[i].set('attr', {vis:false});
    }
  }
  else {
    showLog('Add '+(N-nrooms)+' rooms!');
    for(i=nrooms; i<N; i++){
      rooms[i] = createOneRoom();
    }
  }
  for(i=0; i<N; i++){
    joinOneRoom(i);
    rooms[i].set('attr', {Num: i});
    rooms[i].set('attr', {vis:true});
    players[i] = new Array();
  }
}

function createOneRoom(){
  showLog('Create one room!');
  var curRoom;
  var currId;
  var roomName = 'RoomPlay';
  client.createConversation({
    name: roomName,
    members: [],
    attributes: {gameName:'LLK', maxPlayers: 6};
  })
  .then(function(conv){
    currId = conv.id;
    showLog('Created room: ', currId);
    return conv;
  })
  // .then(function(conv){
    // return conv.join();
  // }) // 在joinOneRoom中加入
  .then(function(conv){
    curRoom = conv;
    // ROOMHEAD 不关心过去的聊天记录
    // 不用messageIterator
    showLog('Joined room.');
    conv.on('message', function(message){
      if(!msgTime){
        msgTime = message.timestamp;
      }
      dealWithMessage(message, conv.get('attr').Num);
    });
  })
  .catch(function(err){
    console.error(err);
  });
  return curRoom;
}

function joinOneRoom(i){
  var rid = rooms[i].id;
  client.getConversation(rid)
  .then(function(conv){
    if(conv){
      return conv;
    }
    else {
      showLog('Room not exist!');
      return;
    }
  })
  .then(function(conv)){
    return conv.join();
  })
  .then(function(conv){
    showLog('Joined room '+i);
    rooms[i] = conv;
    conv.on('message', function(message){
      if(!msgTime){
        msgTime = message.timestamp;
      }
      dealWithMessage(message);
    });
  })
  .catch(function(err){
    console.error(err);
  });
}

function initPlayers(){
  showLog('init players!');
  var r;
  var i;
  for(r=0; r<rooms.length; r++){
    ms = rooms[r].members;
    for(i=0; i<ms.length; i++){
      if(ms[i]==clientId){
        continue;
      }
      else{
        members[idx].push({id: ms[i], isReady: false})
      }
    }
  }
}

function addPlayers(conv, pl){
  var idx = searchRoomsforRoom(conv);
  if(idx<0) {
    showLog('Room not found in _rooms_, please check!');
    return;
  }
  var newmembers = pl.members;
  var l = players[idx].length;
  for(var i=0; i<newmembers.length; i++){
    for(var j=0; j<l; j++){
      if(players[idx][j].id == newmembers[i]) break;
    }
    if(j==l){
      players[idx].push({id: newmembers[i], isReady: false});
    }
  }
}
function deletePlayers(conv, pl){
  var idx = searchRoomsforRoom(conv);
  if(idx<0) {
    showLog('Room not found in _rooms_, please check!');
    return;
  }
  var deletedmembers = pl.members;
  // var l = players[idx].length;
  var pls = players[idx];
  for(var i=0; i<deletedmembers.length; i++){
    for(var j=0; j<pls.length; j++){
      if(pls[j].id == deletedmembers[i]){
        pls.splice(j, 1);
        break;
      }
    }
  }
  players[idx] = pls;
}
function searchRoomsforRoom(conv){
  var cid = conv.id;
  for(var i=0; i<rooms.length; i++){
    if(rooms[i].id == cid){
      return i;
    }
  }
  return -1;
}

//目前只处理一种东西，就是readyMsg
function dealWithMessage(message, idx){
  var t = message.text;
  var f = message.from;
  var conv = rooms[idx];
  var fidx = -1;
  for(var i=0; i<players[idx].length; i++){
    if(players[idx][i].id == f){
      fidx = i;
    }
  }
  if(t == readyMsg){
    players[idx][fidx].isReady = true;
  }
}

function sendMsg(e, msg) {

  var val = inputSend.value;
  
  if(msg) val = msg;
  
  // 不让发送空字符
  if (!String(val).replace(/^\s+/, '').replace(/\s+$/, '')) {
    alert('请输入点文字！');
  }

  // 向这个房间发送消息，这段代码是兼容多终端格式的，包括 iOS、Android、Window Phone
  room.send(new AV.TextMessage(val)).then(function(message) {
    // 发送成功之后的回调
    inputSend.value = '';
    showLog('（' + formatTime(message.timestamp) + '）  自己： ', encodeHTML(message.text));
    printWall.scrollTop = printWall.scrollHeight;
  });
}


function queryRooms(){
  var query = client.getQuery();
  query.equalTo('name', 'RoomPlay').find()//limit(20).containsMembers([]).compact(false).find().
  .then(function(data){
    rooms = data;
    showRooms(rooms);
  })
  .then(function(){
    // if(!autojoin) return;
    if(!autoquit) return;
    var idx;
    for(var i=0; i<rooms.length; i++){
      console.log(rooms[i].members);
      if(rooms[i].members.indexOf(clientId)>=0){
        rooms[i].quit();
        idx = i+1;
        // break;
      }
    }
    autoquit = false;
  })
  .catch(console.error.bind(console));
}

//supporting functions
function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}

// 显示接收到的信息
function showMsg(message, isBefore) {
  var text = message.text;
  var from = message.from;
  if (message.from === clientId) {
    from = '自己';
  }
  if (message instanceof AV.TextMessage) {
    if (String(text).replace(/^\s+/, '').replace(/\s+$/, '')) {
      showLog('（' + formatTime(message.timestamp) + '）  ' + encodeHTML(from) + '： ', encodeHTML(message.text), isBefore);
    }
  } else if (message instanceof AV.FileMessage) {
    showLog('（' + formatTime(message.timestamp) + '）  ' + encodeHTML(from) + '： ', createLink(message.getFile().url()), isBefore);
  }
}

function showRooms(rooms){
  var lrooms = rooms.length;
  if(lrooms === 0)
  {
    showLog("没有可用的房间，请建立游戏房间！");
    return;
  }
  showLog("共有"+lrooms+"个房间: ");
  for(var i=0; i<lrooms; i++){
    showLog("Room "+(i+1));
    showLog("ID: "+ rooms[i].id);
    // showLog("Number of members: "+ rooms[i].members.length);
    showLog("members: " + rooms[i].members);
  }
}

// printwall
// 拉取历史
bindEvent(printWall, 'scroll', function(e) {
  if (printWall.scrollTop < 20) {
    getLog();
  }
});

// 获取消息历史
function getLog(callback) {
  var height = printWall.scrollHeight;
  if (logFlag || !messageIterator) {
    return;
  } else {
    // 标记正在拉取
    logFlag = true;
  }
  messageIterator.next().then(function(result) {
    var data = result.value;
    logFlag = false;
    // 存储下最早一条的消息时间戳
    var l = data.length;
    if (l) {
      msgTime = data[0].timestamp;
    }
    for (var i = l - 1; i >= 0; i--) {
      showMsg(data[i], true);
    }
    if (l) {
      printWall.scrollTop = printWall.scrollHeight - height;
    }
    if (callback) {
      callback();
    }
  }).catch(function(err) {
    console.error(err);
  });
}

// demo 中输出代码
function showLog(msg, data, isBefore) {
  if (data) {
    // console.log(msg, data);
    msg = msg + '<span class="strong">' + data + '</span>';
  }
  var p = document.createElement('p');
  p.innerHTML = msg;
  if (isBefore) {
    printWall.insertBefore(p, printWall.childNodes[0]);
  } else {
    printWall.appendChild(p);
  }
}

function encodeHTML(source) {
  return String(source)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\\/g,'&#92;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

function formatTime(time) {
  var date = new Date(time);
  var month = date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1;
  var currentDate = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
  var hh = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
  var mm = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
  var ss = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
  return date.getFullYear() + '-' + month + '-' + currentDate + ' ' + hh + ':' + mm + ':' + ss;
}

function createLink(url) {
  return '<a target="_blank" href="' + encodeHTML(url) + '">' + encodeHTML(url) + '</a>';
}

function bindEvent(dom, eventName, fun) {
  if (window.addEventListener) {
    dom.addEventListener(eventName, fun);
  } else {
    dom.attachEvent('on' + eventName, fun);
  }
}
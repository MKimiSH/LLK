// llk_test/roomhead.js: for ROOMHEAD
// script for ROOMHEAD, which is in charge of creating rooms
// and checking ready and start and end games.
// it is supposed to run all-the-time.
var appId = 'Ecy4bFJFxCowJKwqNtO1GLsv-gzGzoHsz';
var appKey = 'JwVKNn8ayp8kU5IwVKc7UjUb';
var bdst_easy = {H:5, W:8, imw:40, imh:40, osX:150, osY:10, nIm:10};
var bdst_med = {H:8, W:10, imw:40, imh:40, osX:10, osY:10, nIm:21};

AV.initialize(appId, appKey);
var rooms = []; //在每个房间都存在ROOMHEAD
var players = []; //每个房间中的玩家列表
// player.attr: id, isReady
// room.attr: 意义见logger.js
AV.Realtime.defineConversationProperty('vis');
AV.Realtime.defineConversationProperty('num');
AV.Realtime.defineConversationProperty('gameLevel');
AV.Realtime.defineConversationProperty('inGame');
AV.Realtime.defineConversationProperty('maxPlayers');
AV.Realtime.defineConversationProperty('gameName');

// 每个客户端自定义的 id
var clientId = 'ROOMHEAD';
// 一些特定的消息，用于标识开始、结束等控制事件。
var readyMsg = 'READYyYyY';
var startMsg = 'StaRtTtTt';
var endMsg = 'EndDdDDDd';
var finishedMsg = 'FinIshEdD';
var NROOMS = 10;

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

var printWall = document.getElementById('print-wall');
var openBtn = document.getElementById('open-btn');
var sendBtn = document.getElementById('send-btn');
var queryRoomBtn = $('#query-rooms')[0];
var clearPlayerBtn = $('#clear-players')[0];
var inputSend = document.getElementById('input-send');

bindEvent(openBtn, 'click', main);
bindEvent(queryRoomBtn, 'click', queryRooms);
bindEvent(clearPlayerBtn, 'click', clearPlayers);
bindEvent(sendBtn, 'click', sendMsgAll);

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
    // Deferred链式调用，保证先查询房间、再增删房间、再初始化玩家列表
    $.when(queryRooms())
    .then(function(){
      $.when(ensureConstRooms(NROOMS))
      .then(function(){
        initPlayers();
      });
    })
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

// 保证有N个房间可见
function ensureConstRooms(N){
  var nrooms = rooms.length;
  var dtd = $.Deferred();
  var i;
  if(nrooms>=N){
    showLog('Set '+(nrooms-N)+' rooms invisible!');
    for(i=N; i<nrooms; i++){
      rooms[i].vis = false;
    }
    var cnt=0;
    for(i=0; i<N; i++){
      $.when(joinOneRoom(i))
      .then(function(){
        cnt++;
        if(cnt==N){
          dtd.resolve(); // 需要每个房间都加入了，才能返回
        }
      })
    }
  }
  else {
    var cnt = 0;
    showLog('Add '+(N-nrooms)+' rooms!');
    for(i=nrooms; i<N; i++){
      //createOneRoom(i);
      $.when(createOneRoom(i))
      .then(function(){
        cnt++;
        if(cnt == N){
          dtd.resolve();
          showLog("dtd resoved");
        }
      })
    }
  }
  for(i=0; i<N; i++){
    players[i] = new Array();
  }
  return dtd.promise();
}

// 创建一个房间，用Deferred
function createOneRoom(idx){
  showLog('Create one room!');
  var curRoom;
  var currId;
  var roomName = 'RoomPlay';
  var dtdd = $.Deferred();
  var lvl = (idx<NROOMS/2 ? 1:2);
  client.createConversation({
    name: roomName,
    members: [],
    gameName: 'LLK',
    num: idx,
    vis: true,
    inGame: false,
    maxPlayers: 6,
    gameLevel: lvl
  })
  .then(function(conv){
    currId = conv.id;
    return conv;
  })
  .then(function(conv){
    return conv.join();
  }) // 在joinOneRoom中加入
  .then(function(conv){
    curRoom = conv;
    rooms[idx] = conv;
    // ROOMHEAD 不关心过去的聊天记录
    // 不用messageIterator
    showLog('Created room: ', currId);
    conv.on('message', function(message){
      if(!msgTime){
        msgTime = message.timestamp;
      }
      dealWithMessage(message, idx); 
    });
  })
  .then(function(){
    dtdd.resolve();
  })
  .catch(function(err){
    console.error(err);
  });
  // return curRoom;
  return dtdd.promise();
}

// 加入房间，同样是Deferred
function joinOneRoom(i){
  var rid = rooms[i].id;
  var dtd = $.Deferred();
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
  .then(function(conv){
    return conv.join();
  })
  .then(function(conv){
    showLog('Joined room '+i);
    rooms[i] = conv;
    conv.on('message', function(message){
      if(!msgTime){
        msgTime = message.timestamp;
      }
      dealWithMessage(message, i);
    });
  })
  .then(function(){
    dtd.resolve();
  })
  .catch(function(err){
    console.error(err);
  });
  return dtd.promise();
}

//初始化玩家列表
function initPlayers(){
  showLog('init players!');
  var r;
  var i;
  for(r=0; r<NROOMS; r++){
    ms = rooms[r].members;
    for(i=0; i<ms.length; i++){
      if(ms[i]==clientId){
        continue;
      }
      else{
        //玩家有两个属性
        players[r].push({id: ms[i], isReady: false}) 
      }
    }
  }
}

// 清空玩家列表并踢出所有用户
function clearPlayers(){
  if(!rooms) return;
  var tplayers = players;
  for(var i=0;i<NROOMS;i++){
    for(var j=0; j<tplayers[i].length; j++){
      rooms[i].remove(tplayers[i][j].id)
      .then(function(){
        // showLog('Removed player' + tplayers[i][j].id + 'from room ', i);
      });
    }
    players[i] = new Array();
  }
  for(var i=0; i<NROOMS; i++){
    
      rooms[i].inGame = false; //本来在游戏也不要游戏了
  }
  
}

// 响应玩家加入，更新玩家列表
function addPlayers(conv, pl){
  if(pl.members.length == 1 && pl.members[0]==clientId){
    return;
  }
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
      if(players[idx].length<rooms[idx].maxPlayers){
        players[idx].push({id: newmembers[i], isReady: false});
        showLog("Player "+newmembers[i]+" joined room "+idx);
      }
      else {
        rooms[idx].remove([newmembers[i]]);
        showLog("Player "+newmembers[i]+" kicked from room "+idx);
      }
    }
  }
}
// 响应玩家退出，更新玩家列表
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
        showLog("Player "+deletedmembers[i]+" left room "+idx);
        break;
      }
    }
  }
  players[idx] = pls;
}
function searchRoomsforRoom(conv){
  var cid = conv.id;
  for(var i=0; i<NROOMS; i++){
    if(rooms[i].id == cid){
      return i;
    }
  }
  return -1;
}

//处理特殊信息
function dealWithMessage(message, idx){
  
  var t = message.text;
  var f = message.from;
  showLog('deal with message '+t+' from '+f);
  var conv = rooms[idx];
  var fidx = -1;
  for(var i=0; i<players[idx].length; i++){
    if(players[idx][i].id == f){
      fidx = i;
    }
  }
  if(t == readyMsg){
    players[idx][fidx].isReady = true;
    sendMsg(rooms[idx], 'player '+players[idx][fidx].id+' is ready');
    checkAllReady(idx);
  }
  if(t == finishedMsg){
    endGameRoom(idx, fidx);
  }
}

// 如果大家都准备了就开始吧！
function checkAllReady(idx){
  var conv = rooms[idx];
  var pls = players[idx];
  if(pls.length < 2){
    showLog('too few players. room' + idx);
    return;
  }
  var isAllReady = true;
  for (var i=0; i<pls.length; i++){
    if(!pls[i].isReady){
      isAllReady = false;
      break;
    }
  }
  if(isAllReady){
    startGameRoom(idx);
  }
}
// 在一个房间里开始游戏，发送一些游戏参数给玩家。
function startGameRoom(idx){
  var val = startMsg;
  var lvl = rooms[idx].gameLevel;
  var bdst = lvl==1 ? bdst_easy:bdst_med;
  showLog(lvl+', '+bdst.nIm);
  var strBdst = JSON.stringify({type:"bdst", data:bdst});
  showLog(strBdst);
  rooms[idx].send(new AV.TextMessage(val)).then(function(message) {
    // 发送成功之后的回调
    showLog('（' + formatTime(message.timestamp) + '）  自己： ', encodeHTML(message.text));
    printWall.scrollTop = printWall.scrollHeight;
  })
  .then(function(){
    rooms[idx].send(new AV.TextMessage(strBdst)).then(function(message) {
      // 发送成功之后的回调
      showLog('bdst sent to room' + idx);
      printWall.scrollTop = printWall.scrollHeight;
    });
  });
  
  // rooms[idx].set('attr', {inGame: true});
  rooms[idx].inGame = true;
}
// 在一个房间里结束游戏，宣布胜者
function endGameRoom(idx, fidx){
  var val = endMsg;
  rooms[idx].send(new AV.TextMessage(val)).then(function(message) {
    // 发送成功之后的回调
    showLog('（' + formatTime(message.timestamp) + '）  自己： ', encodeHTML(message.text));
    printWall.scrollTop = printWall.scrollHeight;
  });
  sendMsg(rooms[idx], 'Winner is ' + players[idx][fidx].id);
  // rooms[idx].set('attr', {inGame: false});
  rooms[idx].inGame = false;
}

// 链式调用，查询已有房间
function queryRooms(){
  var query = client.getQuery();
  var dtd = $.Deferred();
  query.limit(100).equalTo('name', 'RoomPlay').find()//limit(20).containsMembers([]).compact(false).find().
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
  .then(function(){
    showLog('DTD resolved');
    dtd.resolve();
  })
  .catch(console.error.bind(console));
  return dtd.promise();
}

function sendMsg(conv, msg) {
  var val;
  if(msg) val = msg;
  
  // 不让发送空字符
  if (!String(val).replace(/^\s+/, '').replace(/\s+$/, '')) {
    alert('请输入点文字！');
  }

  conv.send(new AV.TextMessage(val)).then(function(message) {
    // 发送成功之后的回调
    showLog('（' + formatTime(message.timestamp) + '）  自己： ', encodeHTML(message.text));
    printWall.scrollTop = printWall.scrollHeight;
  });
}

// 广播
function sendMsgAll(e, msg){
  var val = inputSend.value;
  if(msg) val = msg;
  
  for(var i=0; i<NROOMS; i++){
    sendMsg(rooms[i], val);
  }
  
}

// *********************************************************
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

// printwall -----------------------------------------------
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
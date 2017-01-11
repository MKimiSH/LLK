// llk_test/logger.js: For player.html
// Author: MKimiSH

// appId 和 appKey 是 API给的
var appId = 'Ecy4bFJFxCowJKwqNtO1GLsv-gzGzoHsz';
var appKey = 'JwVKNn8ayp8kU5IwVKc7UjUb';

AV.initialize(appId, appKey);

var roomId = '586cf9f161ff4b006b2eff0a';
var rooms = [];

AV.Realtime.defineConversationProperty('vis'); //是否可见
AV.Realtime.defineConversationProperty('num'); //编号
AV.Realtime.defineConversationProperty('gameLevel'); //游戏难度
AV.Realtime.defineConversationProperty('inGame'); //是否在游戏
AV.Realtime.defineConversationProperty('maxPlayers'); //最大玩家数
AV.Realtime.defineConversationProperty('gameName'); //游戏名称

// 每个客户端自定义的 id
var clientId = 'testLLK';
// 一些特定的消息，用于标识开始、结束等控制事件。
var readyMsg = 'READYyYyY';
var startMsg = 'StaRtTtTt';
var endMsg = 'EndDdDDDd';
var finishedMsg = 'FinIshEdD';
var lostMsg = 'LoStTtTtT';

var realtime;
var client;
var messageIterator;

var selfReady; // Am I ready?
var opponent; // 对手信息
var oppReady; // 对手是否准备

// 用来存储创建好的 roomObject
var room;
var autoquit = true;

// 监听是否服务器连接成功
var firstFlag = true;

// 用来标记历史消息获取状态
var logFlag = false;

// 关联DOM
var openBtn = document.getElementById('open-btn');
var sendBtnAsFile = document.getElementById('send-btn-as-file');
var sendBtn = document.getElementById('send-btn');
var queryRoomBtn = $('#query-rooms')[0];
var createRoomBtn = $('#create-room')[0];
var joinRoomBtn = $('#join-room')[0];
var quitRoomBtn = $('#quit-room')[0];
var readyBtn = $('#ready-button')[0];
var inputName = document.getElementById('input-name');
var inputSend = document.getElementById('input-send');
var printWall = document.getElementById('print-wall');
var inputRoomId = $('#input-roomname')[0];

// 拉取历史相关
// 最早一条消息的时间戳
var msgTime;

// 绑定按钮点击事件处理
bindEvent(openBtn, 'click', main);
bindEvent(sendBtn, 'click', sendMsg);
bindEvent(sendBtnAsFile, 'click', sendMsgAsFile);
bindEvent(queryRoomBtn, 'click', queryRooms);
bindEvent(createRoomBtn, 'click', createJoinRoom);
bindEvent(joinRoomBtn, 'click', joinRoom);
bindEvent(readyBtn, 'click', sendReady);
bindEvent(quitRoomBtn, 'click', quitRoom);

// 绑定回车
bindEvent(document.body, 'keydown', function(e) {
  if (e.keyCode === 13) {
    if (firstFlag) {
      main();
    } else {
      sendMsg();
    }
  }
});

// 连接服务器并生成client
// 链式调用是Promise的用法，保证前一个函数返回之后才调用后一个
// then里的函数。
// then里匿名函数的参数是上一个函数的返回值
function main(){
  showLog('正在连接服务器。。。');
  var val = inputName.value;
  if (val) {
    clientId = val;
  }
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
  // 查找并列出已有房间
  .then(function(){
    showLog('查找已有房间……');
    queryRooms(true);
  })
  // 对玩家绑定事件，处理其他玩家进出的事件
  .then(function(){
    client.on('membersjoined', function membersjoinedEventHandler(payload, conversation) {
      showLog('玩家进入房间: ', payload.members);
      if(selfReady){
        sendReady(); //这样新来的玩家知道我已准备了
      }
    });
    client.on('membersleft', function membersleftEventHandler(payload, conversation) {
      showLog('玩家退出房间: ', payload.members);
    });
  })
  .catch(function(err){
    console.error(err);
  })
}

// e是event，msg是要发送的东西，invisible则不showLog()
function sendMsg(e, msg, invisible) {
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
    if(!invisible){
      showLog('（' + formatTime(message.timestamp) + '）  自己： ', encodeHTML(message.text));
    }
    printWall.scrollTop = printWall.scrollHeight;
  });

}

// 发送多媒体消息示例
function sendMsgAsFile() {

  var val = inputSend.value;

  // 不让发送空字符
  if (!String(val).replace(/^\s+/, '').replace(/\s+$/, '')) {
    alert('请输入点文字！');
  }
  new AV.File('message.txt', {
    base64: b64EncodeUnicode(val),
  }).save().then(function(file) {
    return room.send(new AV.FileMessage(file));
  }).then(function(message) {
    // 发送成功之后的回调
    inputSend.value = '';
    showLog('（' + formatTime(message.timestamp) + '）  自己： ', createLink(message.getFile().url()));
    printWall.scrollTop = printWall.scrollHeight;
  }).catch(console.warn);

}

// 创建房间并加入
function createJoinRoom(){
  quitRoom();
  showLog('正在创建房间……');
  var roomName = 'RoomPlay';
  client.createConversation({
    name: roomName,
    members:[]
    //members:[], attributes:{};
  })
  .then(function(conversation){
    roomId = conversation.id;
    showLog('创建新Room成功，id是：', roomId);
    return conversation;
  })
  .then(function(conversation){
    return conversation.join();
  })
  .then(function(conversation){
    room = conversation;
    // messageIterator是用来收消息的
    messageIterator = conversation.createMessagesIterator();
    getLog(function() {
      printWall.scrollTop = printWall.scrollHeight;
      showLog('已经加入房间！');
    })
    conversation.on('message', function(message) {
      if (!msgTime) {
        // 存储下最早的一个消息时间戳
        msgTime = message.timestamp;
      }
      checkMsg(message);
    });
  })
  .catch(function(err){
    console.error(err);
  })
}

// 加入第i个房间
function joinRoom(e, i){
  quitRoom();
  var rNum = inputRoomId.value;
  if(i) rNum = i;
  // showLog('准备加入房间ID：', rId);
  showLog('准备加入房间 ', rNum);
  var rId = rooms[rNum-1].id;
  client.getConversation(rId)
  .then(function(conversation){
    if(conversation){
      return conversation;
    }
    else{
      showLog('服务器没有这个room, 请创建');
      return ;
    }
  })
  .then(function(conversation){
    return conversation.join();
  })
  .then(function(conversation){
    room = conversation;
    messageIterator = conversation.createMessagesIterator();
    getLog(function(){
      printWall.scrollTop = printWall.scrollHeight;
      showLog('已经加入。');
    });
    conversation.on('message', function(message) {
      if (!msgTime) {
        // 存储下最早的一个消息时间戳
        msgTime = message.timestamp;
      }
      checkMsg(message);
    });
  })    
  .then(function(){
      showLog('Members are: '+room.members.slice(1)+'.');
  })
  .catch(function(err){
    console.error(err);
  })
}

// 发送准备信息
function sendReady(){
  var val = readyMsg;
  // 不让发送空字符
  if (!String(val).replace(/^\s+/, '').replace(/\s+$/, '')) {
    alert('请输入点文字！');
  }

  room.send(new AV.TextMessage(val)).then(function(message) {
    // 发送成功之后的回调
    inputSend.value = '';
    printWall.scrollTop = printWall.scrollHeight;
  })
  .then(function(){
    selfReady = true;
  });
}

// 查询已有房间
function queryRooms(){
  var query = client.getQuery();
  query.limit(50).equalTo('name', 'RoomPlay').find()//limit(20).containsMembers([]).compact(false).find().
  .then(function(data){
    rooms = data;
  })
  .then(function(){
    // 在第一次查询的时候，如果有上次加入的房间
    // 就退出，因为那不是这次会话要用的房间
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
  })
  .then(function(){
    // rooms可能乱序，所以给它一个顺序
    rooms = rooms.sort(function(a,b){
      if(a.gameLevel<b.gameLevel){
        return -1;
      }
      if(a.gameLevel>b.gameLevel){
        return 1;
      }
      return 0;
    });
  })
  .then(function(){
    showRooms(rooms, autoquit);
    autoquit = false;
  })
  .catch(console.error.bind(console));
}

// 在加入房间时退出房间
function quitRoom(){
  if(!room){
    showLog('并未加入房间，不能退出房间');
    return;
  }
  room.quit()
  .then(function(){
    showLog('成功退出房间');
  }).catch(console.error.bind(console));
  room = null;
}

// ***************************
//supporting functions
function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}

// 检查消息并处理特殊消息。
var recvBdst;
function checkMsg(m){
  var t = m.text;
  var f = m.from;
  var parset;
  try{
    parset = JSON.parse(t); // 接受ROOMHEAD发来的游戏属性
  }catch(e){}
  if(t == startMsg && f == 'ROOMHEAD'){
    startCountdown(3);
  }
  else if(t == endMsg && f=='ROOMHEAD'){
    endGame();
    recvBdst = null;
  }
  else if(f=='ROOMHEAD' && parset && parset.type && parset.type=='bdst'){
    recvBdst = parset.data;
  }
  else if(t==readyMsg){
    ;
  }
  else{
    if(f == 'ROOMHEAD'){
      m.from = "系统";
      showMsg(m);
    }
    else{
      showMsg(m);
    }
  }
}

// 倒计时并开始游戏
function startCountdown(sec){
  showLog("start Countdown!");
  showLog("secs remain: ", sec--);
  setTimeout(function(){
    if(sec>0){
      showLog("secs remain: ", sec--);
      setTimeout(arguments.callee, 1000);
    }
    else {
      showLog("Countdown over!!");
      // printWall.visibility = 'hidden';
      // printWall.style.visibility='hidden';
      runGame(recvBdst);
    }
  }, 1000);
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

function showMsgSys(message){
  var text = message.text;
  var from = message.from;
  from = '系统';
  showLog('（' + formatTime(message.timestamp) + '）  ' + encodeHTML(from) + '： ', encodeHTML(message.text), false, true);
}

function showRooms(rooms, hideMembers){
  var lrooms = rooms.length;
  if(lrooms === 0)
  {
    showLog("没有可用的房间，请建立游戏房间！");
    return;
  }
  showLog("共有"+lrooms+"个房间: ");
  for(var i=0; i<lrooms; i++){
    var gl = rooms[i].gameLevel == 1? 'EASY':'HARD';
    showLog("Room "+(i+1)+", level: "+gl);
    // showLog();
    // showLog("ID: "+ rooms[i].id);
    showLog("Number of players: "+ (rooms[i].members.length-1));
    if(!hideMembers){
      showLog("members: " + rooms[i].members.slice(1));
    }
  }
}

// ------------printwall----------------------
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
function showLog(msg, data, isBefore, isSys) {
  if (data) {
    // console.log(msg, data);
    if(isSys){
      msg = '<span class="strong">' + msg + data + '</span>';
    }
    else{
      msg = msg + '<span class="strong">' + data + '</span>';
    }
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

var appId = 'Ecy4bFJFxCowJKwqNtO1GLsv-gzGzoHsz';
var appKey = 'JwVKNn8ayp8kU5IwVKc7UjUb';

AV.initialize(appId, appKey);

// 请换成你自己的一个房间的 conversation id（这是服务器端生成的）
var roomId = '586cf9f161ff4b006b2eff0a';
var rooms = [];

// 每个客户端自定义的 id
var clientId = 'testLLK';

var realtime;
var client;
var messageIterator;
var selfReady; // Am I ready?

var opponent; // 对手信息
var oppReady; // 对手是否准备

// 用来存储创建好的 roomObject
var room;

// 监听是否服务器连接成功
var firstFlag = true;

// 用来标记历史消息获取状态
var logFlag = false;

var openBtn = document.getElementById('open-btn');
var sendBtnAsFile = document.getElementById('send-btn-as-file');
var sendBtn = document.getElementById('send-btn');
var queryRoomBtn = $('#query-rooms')[0];
var createRoomBtn = $('#create-room')[0];
var joinRoomBtn = $('#join-room')[0];
var readyBtn = $('#ready-button')[0];

var inputName = document.getElementById('input-name');
var inputSend = document.getElementById('input-send');
var printWall = document.getElementById('print-wall');
var inputRoomId = $('#input-roomname')[0];

// 拉取历史相关
// 最早一条消息的时间戳
var msgTime;

bindEvent(openBtn, 'click', main);
bindEvent(sendBtn, 'click', sendMsg);
bindEvent(sendBtnAsFile, 'click', sendMsgAsFile);
bindEvent(queryRoomBtn, 'click', queryRooms);
bindEvent(createRoomBtn, 'click', createJoinRoom);
bindEvent(joinRoomBtn, 'click', joinRoom);
bindEvent(readyBtn, 'click', sendReady);


bindEvent(document.body, 'keydown', function(e) {
  if (e.keyCode === 13) {
    if (firstFlag) {
      main();
    } else {
      sendMsg();
    }
  }
});

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
  .then(function(){
    showLog('查找已有房间……');
    queryRooms();
  })
  
}

function sendMsg() {

  var val = inputSend.value;

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

function createJoinRoom(){
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
      checkReady(message);
      showMsg(message);
    });
  })
  .catch(function(err){
    console.error(err);
  })
}

function joinRoom(){
  var rId = inputRoomId.value;
  showLog('准备加入房间ID：', rId);
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
      checkReady(message);
      showMsg(message);
    });
  })
  .catch(function(err){
    console.error(err);
  })
}

function sendReady(){
  var val = "ready";
  // 不让发送空字符
  if (!String(val).replace(/^\s+/, '').replace(/\s+$/, '')) {
    alert('请输入点文字！');
  }

  // 向这个房间发送消息，这段代码是兼容多终端格式的，包括 iOS、Android、Window Phone
  room.send(new AV.TextMessage(val)).then(function(message) {
    // 发送成功之后的回调
    checkReady(message);
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
  .catch(console.error.bind(console));
}


//supporting functions
function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode('0x' + p1);
    }));
}

function checkReady(m){
  var text = m.text;
  var from = m.from;
  if(text=='ready') {
    if(from !== clientId)
      oppReady = true;
    else
      selfReady = true;
  }
  if(selfReady===true && oppReady===true){
    startCountdown(3);
  }
}
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
      printWall.style.display = 'none';
      runGame();
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

function showRooms(rooms){
  var lrooms = rooms.length;
  if(lrooms === 0)
  {
    showLog("没有可用的房间，请建立游戏房间！");
    return;
  }
  showLog("共有"+lrooms+"个房间: ");
  for(var i=0; i<lrooms; i++){
    showLog("Room"+i);
    showLog("ID: "+ rooms[i].id);
    showLog("Number of members: "+ rooms[i].members.length);
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
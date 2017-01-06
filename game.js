// game on canvas

// JS for llk

var difficulty = 0; // 暂时只有0
var board = new Array();
var numImages = 3; // 1~numImages in board -> images
var bStatus = {H:2, W:5, imw:40, imh:40, osX:10, osY:10};
var numTilesLeft = 0; //必为偶数
var numTilesStart = 0;
var playerScore = 0;
var hintsLeft = 0;
var shuffleLeft = 0;
var EMPTY = 0;
var timeLeft = 120; //剩余秒数

var cTile = {i:0, j:0};
var isWin = false;
var startTime;

var boardCanvas = document.createElement("canvas");
boardCanvas.width = 500;
boardCanvas.height = 300;
boardCanvas.style.display = "none";
var boardContext = boardCanvas.getContext("2d");

var canvas = $("canvas")[0];
canvas.width = 800;
canvas.height = 500;
var context = canvas.getContext("2d");

// runGame();
var showImgBtn = $("#showimage-btn")[0];
showImgBtn.onclick = function(e){
  runGame();
}

canvas.onclick = function(e){
  var point = window2Canvas(e.clientX, e.clientY);
  if(pointInBoard(point)){
    updateBoard(point);
  }
}

function runGame(){
  // imgs = getImgs(imgs, imgids);
  isWin = false;
  startTime = new Date();
  canvas.style.display = "";
  buildBoard();
  displayBoard(context, board, 6, 10);
}
        
// 画图的函数
function displayBoard(cxt, board, H, W, clickedTile){
  cxt.clearRect(0,0,canvas.width, canvas.height);
  var imh = bStatus.imh;
  var imw = bStatus.imw;
  var offsetY = bStatus.osY;
  var offsetX = bStatus.osX;
  for(var i=1; i<=H; ++i){
    for(var j=1; j<=W; ++j){
      if(board[i][j]>0){
        cxt.drawImage(imgs[board[i][j]], offsetX+imw*(j-1), offsetY+imh*(i-1), imw, imh);
      }
    }
  }
  if(clickedTile){
    var dx = offsetX+imw*(clickedTile.j-1);
    var dy = offsetY+imh*(clickedTile.i-1);
    
    cxt.beginPath();
    cxt.rect(dx, dy, imw, imh);
    cxt.strokeStyle = "red";
    cxt.lineWidth = 5;
    cxt.stroke();
  }
}

// 这个应该有颜色值，提示、消去和选择不同
function highlightTile(){
  
}

function tilesDisappear(){
  
}

function connectTile(){
  
}

//控制函数
function updateBoard(point){
  var tileClicked = point2Tile(point.x, point.y);
  var i1 = cTile.i, j1 = cTile.j, i2 = tileClicked.i, j2 = tileClicked.j;
  //如果没点到东西就不变。
  if(board[i2][j2] === 0 || (i1===i2&&j1===j2)){
    return;
  }
  // 如果没有选中别的块
  if(cTile.i===0){
    displayBoard(context, board, bStatus.H, bStatus.W, tileClicked);
    cTile.i = tileClicked.i;
    cTile.j = tileClicked.j;
  }
  else {
    if(board[i1][j1]!==board[i2][j2])
    {
      displayBoard(context, board, bStatus.H, bStatus.W, tileClicked);
      cTile = tileClicked;
    }
    else{
      var isCon = checkConnect(i1, j1, i2, j2);
      if(isCon){
        board[i1][j1] = 0;
        board[i2][j2] = 0;
        cTile = {i:0, j:0};
        displayBoard(context, board, bStatus.H, bStatus.W);
        if(checkWin()){
          isWin = true;
          onWin();
        }
      }
      else{
        displayBoard(context, board, bStatus.H, bStatus.W, tileClicked);
        cTile = tileClicked;
      }
    }
  }
  // board[tileClicked.y][tileClicked.x] = 0;
}
function pointInBoard(point){
  var bdH = bStatus.H * bStatus.imh;
  var bdW = bStatus.W * bStatus.imw;
  var osx = bStatus.osX;
  var osy = bStatus.osY;
  return point.x<=bdW+osx && point.x>osx && point.y<=bdH+osy && point.y>osy;
}

function window2Canvas(x,y){
  var bbox = canvas.getBoundingClientRect();
  return {x: x-bbox.left, y: y-bbox.top};
}

function point2Tile(x, y){
  var imh = bStatus.imh;
  var imw = bStatus.imw;
  var offsetY = bStatus.osY;
  var offsetX = bStatus.osX;
  x -= offsetX;
  y -= offsetY;
  x /= imw;
  y /= imh;
  // return {x:parseInt(x)+1, y:parseInt(y)+1};
  return {i:parseInt(y)+1, j:parseInt(x)+1};
}

// 游戏函数
// build->display->choose (mouse)->checkConnect->tilesDisappear->displayBoard

/**
 * Fisher–Yates shuffle
 */
function shuffleArray(arr) {
    var input = arr;

    for (var i = input.length-1; i >=0; i--) {

        var randomIndex = Math.floor(Math.random()*(i+1));
        var itemAtIndex = input[randomIndex];

        input[randomIndex] = input[i];
        input[i] = itemAtIndex;
    }
    return input;
}

function shuffleBoard(){
  // var sbd = new Array(); //shuffledBoard;
  var tiles = new Array();
  var i,j;
  var tiles = new Array();
  var c=0;
  for(i=1; i<=bStatus.H; i++){
    for(j=1; j<=bStatus.W; j++){
      if(board[i][j]!==0)
        tiles[c++] = board[i][j];
    }
  }
  tiles = shuffleArray(tiles);
  c=0;
  for(i=1; i<=bStatus.H; i++){
    for(j=1; j<=bStatus.W; j++){
      if(board[i][j]!==0)
        board[i][j] = tiles[c++];
    }
  }
}
function randint(b, e){
  return Math.floor(Math.random()*(e-b+1))+b;
}
function buildBoard(){
  numTilesLeft = bStatus.H * bStatus.W;
  var tile4rand = numTilesLeft - 2*numImages; //每个图像至少两张
  var tiles = new Array();
  var c=0;
  for(c=0; c<tile4rand; c+=2){
    tiles[c] = randint(1, numImages);
    tiles[c+1] = tiles[c];
  }
  for(; c<numTilesLeft; c++){
    tiles[c] = (c-tile4rand)%numImages+1;
  }
  c=0;
  for(var i=1; i<=bStatus.H; i++){
    board[i] = new Array();
    for(var j=1; j<=bStatus.W; j++){
      board[i][j] = tiles[c++];
    }
  }
  board[0] = new Array();
  board[bStatus.H+1] = new Array();
  for(var i=0; i<=bStatus.H; i++){
    board[i][0] = 0;
    board[i][bStatus.W+1] = 0;
  }
  for(var j=0; j<=bStatus.W+1; j++){
    board[0][j] = 0;
    board[bStatus.H+1][j] = 0;
  }
  
  shuffleBoard();
}

function buildConnBoard(i,j){
  var concol = new Array();
  var conrow = new Array();
  for(var r = i+1; r<=bStatus.H+1; ++r){
    if(board[r][j]!==0) break;
    concol[r]=1;
  }
  for(var r = i-1; r>=0; --r){
    if(board[r][j]!==0) break;
    concol[r]=1;
  }
  for(var r = 0; r<=bStatus.H+1; ++r){
    if(concol[r]!==1) concol[r]=0;
  }
  for(var c = j+1; c<=bStatus.W+1; ++c){
    if(board[i][c]!==0) break;
    conrow[c]=1;
  }
  for(var c = j-1; c>=0; --c){
    if(board[i][c]!==0) break;
    conrow[c]=1;
  }
  for(var c = 0; c<=bStatus.W+1; ++c){
    if(conrow[c]!==1) conrow[c]=0;
  }
  return [concol, conrow];
}

//我觉得i1, j1, i2, j2 容易写错
function check1line(i,j , k,l){
  if(i == k){
    var b = j<l?j:l;
    var e = j<l?l:j;
    for(var t = b+1; t<e; ++t){
      if(board[i][t]!==0) return false;
    }
    return true;
  }
  else{ //j==l
    var b = i<k?i:k;
    var e = i<k?k:i;
    for(var t = b+1; t<e; ++t){
      if(board[t][j]!==0) return false;
    }
    return true;
  }
}
function check2line(i,j , k,l){
  var r1 = board[i][l]===0 && check1line(i,j,i,l) && check1line(k,l,i,l);
  var r2 = board[k][j]===0 && check1line(i,j,k,j) && check1line(k,l,k,j);
  return r1||r2;
}
// check3line = 构造两个cbd, 分别给出两个点能够一次连接到达的地方，然后对应查看有无1连接的存在
// 当然可以不用board，一维数组足矣。。
function check3line(i,j , k,l){
  var cbd1 = buildConnBoard(i,j); //connect board
  var cbd2 = buildConnBoard(k,l);
  console.log(cbd1);
  console.log(cbd2);
  var ccol1 = cbd1[0], crow1 = cbd1[1];
  var ccol2 = cbd2[0], crow2 = cbd2[1];
  for(var col=0; col<=bStatus.W+1; col++){
    if(crow1[col]==1 && crow2[col]==1) return true;
  }
  for(var row=0; row<=bStatus.H+1; row++){
    if(ccol1[row]==1 && ccol2[row]==1) return true;
  }
  return false;
}

// checkConnect = 看两个点是否能用3条或以内线段连接
function checkConnect(i1, j1, i2, j2){
  if(i1===i2 || j1===j2){
    if(check1line(i1, j1, i2, j2)){
      console.log("1");
      return true;
    }
  }
  if(check2line(i1, j1, i2, j2)){
    console.log("2");
    return true;
  }
  if(check3line(i1, j1, i2, j2)){
    console.log("3");
    return true;
  }
  return false;
}

// checkStuck = 遍历board，对每一组相同的image，checkConnect，找到就true。
// 这个找到的应当也可以作为返回值，以便作为hint
function checkStuck(){
  for(var i=1; i<=bStatus.H; i++){
    for(var j=1; j<=bStatus.W; j++){
      if(board[i][j] === EMPTY) continue;
      for(var k=1; k<=bStatus.H; k++){
        for(var l=1; l<=bStatus.W; l++){
          if(board[k][l] === EMPTY) continue;
          if(board[i][j] !== board[k][l]) continue;
          if(checkConnect(i,j,k,l)) return true;
        }
      }
    }
  }
  return false;
}

//赢了做什么
function onWin(){
  var millisecs = Date.now() - startTime;
  var secs = millisecs/1000;
  alert('finished in ' + secs + 'secs!');
  sendMsg('opp finished in ' + secs + 'secs!');
}

function checkWin(){
  for(var i=1; i<=bStatus.H; i++){
    for(var j=1; j<=bStatus.W; j++){
      if(board[i][j]!==EMPTY) return false;
    }
  }
  return true;
}


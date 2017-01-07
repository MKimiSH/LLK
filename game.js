// game on canvas

// JS for llk

var difficulty = 0; // 暂时只有0
var board = new Array();
var numImages = 6; // 1~numImages in board -> images
var bStatus = {H:4, W:4, imw:40, imh:40, osX:10, osY:10, nIm:2};
var numTilesLeft = 0; //必为偶数
var numTilesStart = 0;
var playerScore = 0;
var hintsLeft = 0;
var hintTiles;
var shuffleLeft = 0;
var EMPTY = 0;
var timeLeft = 130; //剩余秒数

var cTile = {i:0, j:0};
var isWin = false;
var startTime;
var inGame = false;

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
var hintBtn = $("#hint-btn");
var shuffleBtn = $("#shuffle-btn");

showImgBtn.onclick = function(e){
  runGame();
}

hintBtn.click(function(){
  while(1){
    var h = checkHint();
    if(h) break;
    shuffleBoard();
  }
  hintTiles = h;
  displayBoard(context, board, bStatus.H, bStatus.W);
});
shuffleBtn.click(function(){
  shuffleBoard();
  while(!checkHint()){
    shuffleBoard();
  }
  displayBoard(context, board, bStatus.H, bStatus.W);
});


canvas.onclick = function(e){
  var point = window2Canvas(e.clientX, e.clientY);
  if(pointInBoard(point)){
    updateBoard(point);
  }
}

function runGame(){
  // imgs = getImgs(imgs, imgids);
  isWin = false;
  inGame = true;
  startTime = new Date();
  canvas.style.display = "";
  printWall.style.display = 'none';
  hintBtn.css("display", "");
  shuffleBtn.css("display", "");
  buildBoard();
  startBleed(context);
  displayBoard(context, board, bStatus.H, bStatus.W);
}

function endGame(){
  canvas.style.display = "none";
  printWall.style.display = '';
  hintBtn.css("display", "none");
  shuffleBtn.css("display", "none");
  if(isWin){
    showLog("won last game!");
  }
  else showLog("lost last game!");
  board = new Array();
  cTile = {i:0, j:0};
  startTime = null;
  inGame = false;
  selfReady = false;
  oppReady = false;
}


// 画图的函数们
function displayBoard(cxt, board, H, W, clickedTile){
  var imh = bStatus.imh;
  var imw = bStatus.imw;
  var offsetY = bStatus.osY;
  var offsetX = bStatus.osX;
  cxt.clearRect(0,0, offsetX+imw*(W+2), offsetY+imh*(H+2));
  for(var i=1; i<=H; ++i){
    for(var j=1; j<=W; ++j){
      if(board[i][j]>0){
        cxt.drawImage(imgs[board[i][j]], offsetX+imw*(j), offsetY+imh*(i), imw, imh);
      }
    }
  }
  var tw = imw*W*0.3, th = 18;
  var tosy = offsetY + imh*(H+2.5) + th;
  var tosx = offsetX + imw + imw*W-tw;
  cxt.clearRect(tosx, tosy-th-2, tw*1.5, th+5);
  cxt.font = "14px SimSun";
  cxt.fillText("剩余块数：" + numTilesLeft, tosx, tosy);
  
  if(clickedTile){
    var dx = offsetX+imw*(clickedTile.j);
    var dy = offsetY+imh*(clickedTile.i);
    
    cxt.beginPath();
    cxt.rect(dx, dy, imw, imh);
    cxt.strokeStyle = "red";
    cxt.lineWidth = 3;
    cxt.stroke();
  }
  if(hintTiles){
    for(var idx=0; idx<2; ++idx){
      var i = hintTiles[idx].i, j = hintTiles[idx].j;
      var dx = offsetX+imw*(j);
      var dy = offsetY+imh*(i);
      
      cxt.beginPath();
      cxt.rect(dx, dy, imw, imh);
      cxt.strokeStyle = "yellow";
      cxt.lineWidth = 2;
      cxt.stroke();
    }
    hintTiles = null;
  }
}


function tilesDisappear(){
  
}

function startBleed(cxt){
  var imh = bStatus.imh;
  var imw = bStatus.imw;
  var offsetY = bStatus.osY;
  var offsetX = bStatus.osX;
  var H = bStatus.H;
  var W = bStatus.W;
  
  var rw = imw*W*0.6, rh = 18;
  var rosy = offsetY + imh*(H+2.5);
  var rosx = offsetX + imw;
  
  var pctLeft = 100;
  var pctStep = 0.5/timeLeft*100;
  setTimeout(function(){
    cxt.clearRect(rosx-3, rosy-3, rw+6, rh+6);
    cxt.beginPath();
    pctLeft -= pctStep;
    cxt.rect(rosx, rosy, rw*pctLeft/100, rh);
    cxt.fillStyle = "red";
    cxt.fill();
    
    cxt.beginPath();
    cxt.rect(rosx, rosy, rw, rh);
    cxt.strokeStyle = "#000";
    cxt.strokeWidth = 2;
    cxt.stroke();
    if(!inGame) return;
    if(pctLeft <= 0 && inGame){
      onLose();
    }
    else {
      setTimeout(arguments.callee, 500);
    }
  }, 500);
}

function connectTile(ctx, tile1, tile2){
  var imh = bStatus.imh;
  var imw = bStatus.imw;
  var offsetY = bStatus.osY;
  var offsetX = bStatus.osX;
  var i1 = tile1.i, j1 = tile1.j, i2 = tile2.i, j2 = tile2.j;
  var pts = getConnPoints(i1, j1, i2, j2);
  for(var i=0; i<pts.length; i++){
    pts[i] = board2Canvas(pts[i]);
  }
  
  ctx.beginPath();
  for(var i=0; i<pts.length; i++){
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.strokeStyle = "#069";
  ctx.strokeWidth = 2;
  ctx.stroke();
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
        numTilesLeft -= 2;
        connectTile(context, tileClicked, cTile);
        cTile = {i:0, j:0};
        setTimeout(function(){
          displayBoard(context, board, bStatus.H, bStatus.W);
          if(checkWin()){
            isWin = true;
            onWin();
          }
        }, 100);
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
  var osx = bStatus.osX + bStatus.imw;
  var osy = bStatus.osY + bStatus.imh;
  return point.x<=bdW+osx && point.x>osx && point.y<=bdH+osy && point.y>osy;
}

function window2Canvas(x,y){
  var bbox = canvas.getBoundingClientRect();
  return {x: x-bbox.left, y: y-bbox.top};
}

function board2Canvas(tile){
  var imh = bStatus.imh;
  var imw = bStatus.imw;
  var offsetY = bStatus.osY;
  var offsetX = bStatus.osX;
  return {x: offsetX + tile.j*imw + imw/2, y: offsetY + tile.i*imh + imh/2};
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
  // console.log([parseInt(y), parseInt(x)]);
  // return {x:parseInt(x)+1, y:parseInt(y)+1};
  return {i:parseInt(y), j:parseInt(x)};
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
  if(r1) return {i:i, j:l};
  if(r2) return {i:k, j:j};
  return false;
}
// check3line = 构造两个cbd, 分别给出两个点能够一次连接到达的地方，然后对应查看有无1连接的存在
// 当然可以不用board，一维数组足矣。。
function check3line(i,j , k,l){
  var cbd1 = buildConnBoard(i,j); //connect board
  var cbd2 = buildConnBoard(k,l);
  var ccol1 = cbd1[0], crow1 = cbd1[1];
  var ccol2 = cbd2[0], crow2 = cbd2[1];
  for(var col=0; col<=bStatus.W+1; col++){
    if(crow1[col]==1 && crow2[col]==1 && check1line(i, col, k, col)) 
      return [{i:i, j:col}, {i:k, j:col}];
  }
  for(var row=0; row<=bStatus.H+1; row++){
    if(ccol1[row]==1 && ccol2[row]==1 && check1line(row, j, row, l)) 
      return [{i:row, j:j}, {i:row, j:l}];;
  }
  return false;
}

// checkConnect = 看两个点是否能用3条或以内线段连接
function checkConnect(i1, j1, i2, j2){
  if(i1===i2 || j1===j2){
    if(check1line(i1, j1, i2, j2)){
      return true;
    }
  }
  if(check2line(i1, j1, i2, j2)){
    return true;
  }
  if(check3line(i1, j1, i2, j2)){
    return true;
  }
  return false;
}

//Already known that they are connected, return turn points for drawing
function getConnPoints(i1, j1, i2, j2){
  var ret = new Array();
  ret[0] = {i:i1, j:j1};
  if(i1===i2 || j1===j2){
    var pt1 = check1line(i1, j1, i2, j2);
    if(pt1){
      // console.log("1");
      ret[1] = {i:i2, j:j2};
      return ret;
    }
  }
  var pt2 = check2line(i1, j1, i2, j2);
  if(pt2){
    // console.log("2");
    ret[1] = pt2;
    ret[2] = {i:i2, j:j2};
    return ret;
  }
  var pt3 = check3line(i1, j1, i2, j2);
  if(pt3){
    ret[1] = pt3[0];
    ret[2] = pt3[1];
    ret[3] = {i:i2, j:j2};
    // console.log("3");
    return ret;
  }
}

// checkStuck = 遍历board，对每一组相同的image，checkConnect，找到就true。
// 这个找到的应当也可以作为返回值，以便作为hint
function checkHint(){
  for(var i=1; i<=bStatus.H; i++){
    for(var j=1; j<=bStatus.W; j++){
      if(board[i][j] === EMPTY) continue;
      for(var k=1; k<=bStatus.H; k++){
        for(var l=1; l<=bStatus.W; l++){
          if(board[k][l] === EMPTY) continue;
          if((i==k&&j==l) || board[i][j] !== board[k][l]) continue;
          if(checkConnect(i,j,k,l)) {
            // console.log([i,j,k,l]);
            return [{i:i, j:j}, {i:k, j:l}];
          }
        }
      }
    }
  }
  // console.log('nothing found');
  return false;
}

//赢了做什么
function onWin(){
  var millisecs = Date.now() - startTime;
  var secs = millisecs/1000;
  alert('finished in ' + secs + 'secs!');
  if(room){
    sendMsg(null, 'OPP: finished in ' + secs + 'secs!');
  }
  endGame();
}

function checkWin(){
  for(var i=1; i<=bStatus.H; i++){
    for(var j=1; j<=bStatus.W; j++){
      if(board[i][j]!==EMPTY) return false;
    }
  }
  return true;
}

//时间到了，输了！
function onLose(){
  alert('Game over!');
  endGame();
}

var imgnames = ["",
        "cb1.png", 
        "ecl1.png",
        "keras.jpg",
        "maple.png",
        "mathematica.jpg",
        "matlab.jpeg",
        "pc.png",
        "tf.png",
        "theano.jpeg",
        "torch.png",
        "vs1.png",
        "vs2.png",
        "frog1.png",
        "frog2.png",
        "ha1.png",
        "ha2.png",
        "ha3.png",
        "ha4.png",
        "ha5.png",
        "ha6.png",
        "ha7.png",
        "ha8.png",
        "yzhang.png"]; //13 images
var imgids = ["",
        "cb1", 
        "ecl1",
        "keras",
        "maple",
        "mathematica",
        "matlab",
        "pc",
        "tf",
        "theano",
        "torch",
        "vs1",
        "vs2",
        "frog1",
        "frog2",
        "ha1",
        "ha2",
        "ha3",
        "ha4",
        "ha5",
        "ha6",
        "ha7",
        "ha8",
        "yzhang"]; //13 images
        
var parent = document.getElementById("images-parent");
var imgs = new Array();
function addImagetoParent(path, imgid, par, idx){
  // var newimg = document.createElement("img");
  var newimg = new Image();
  newimg.setAttribute("id", imgid);
  // newimg.style.visibility="hidden";
  newimg.style.display="none";
  newimg.src = path;
  // par.appendChild(newimg);
  newimg.onload = function(){
    imgs[idx] = newimg;
  }
}

for(var i=1; i<imgnames.length; i++){
  var path = "./images/"+imgnames[i];
  addImagetoParent(path, imgids[i], parent, i);
}



const tf = require('@tensorflow/tfjs-node')

const mobilenet = require('@tensorflow-models/mobilenet');
//const jpeg = require('jpeg-js');
//const toUint8Array = require('base64-to-uint8array')

const {Image, createCanvas, createImageData} = require('canvas');

module.exports = {

async imgPrediction(b64img){
  
  var canvas = createCanvas(256,144);
  var context = canvas.getContext('2d');
  var image = new Image;
  image.onload = function() {
    context.drawImage(image, 0, 0);
  }
  image.src = "data:image/png;base64,"+ b64img;
  mobilenet.load().then(model => {
    model.classify(canvas).then(predictions => {
      console.log('Predictions: ');
      console.log(predictions);
    });
  });

},

}
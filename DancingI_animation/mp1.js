/**
 * @file MP1: Dancing I Logo and original animation
 * @author Joseph Lee <tlee95@illinois.edu>  
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The WebGL buffer holding the triangle */
var vertexPositionBuffer;

/** @global The WebGL buffer holding the vertex colors */
var vertexColorBuffer;

/** @global The WorldView matrix */
var wvMatrix = glMatrix.mat4.create();

/** @global The Modelview matrix */
var mvMatrix = glMatrix.mat4.create();

/** @global The Projection matrix */
var pMatrix = glMatrix.mat4.create();

/** @global The angle of rotation around the x axis */
var defAngle = 0;

/** @global "Scale By" or another measure of time for each frame*/
var scby = 0;

/** @global Which one to animate where true is dancing I logo */
var dancing = true;

/** @global Count the frames we render....*/
var frameNumber =0;
    
//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.wvMatrixUniform, false, wvMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}


/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
  shaderProgram.wvMatrixUniform = gl.getUniformLocation(shaderProgram, "uWVMatrix");
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
}

/**
 * Populate vertex buffer with data for I logo
 */
function loadVertices() {
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  var triangleVertices = [
         0.5,  0.4,  0.0,
         0.5,  0.8,  0.0,
        -0.5,  0.8,  0.0,
        -0.5,  0.4,  0.0,
        -0.5,  0.8,  0.0,
         0.5,  0.4,  0.0,
      
         0.5, -0.4,  0.0,
         0.5, -0.8,  0.0,
        -0.5, -0.8,  0.0,
        -0.5, -0.4,  0.0,
        -0.5, -0.8,  0.0,
         0.5, -0.4,  0.0,
      
        0.25, -0.4,  0.0,     
        0.25,  0.4,  0.0,
       -0.25, -0.4,  0.0,
       -0.25, -0.4,  0.0,
        0.25,  0.4,  0.0,
       -0.25,  0.4,  0.0,

      // Blue Border
         0.55,  0.35,  0.0,
         0.55,  0.85,  0.0,
        -0.55,  0.85,  0.0,
        -0.55,  0.35,  0.0,
        -0.55,  0.85,  0.0,
         0.55,  0.35,  0.0,
      
         0.55, -0.35,  0.0,
         0.55, -0.85,  0.0,
        -0.55, -0.85,  0.0,
        -0.55, -0.35,  0.0,
        -0.55, -0.85,  0.0,
         0.55, -0.35,  0.0,
      
        0.30, -0.45,  0.0,     
        0.30,  0.45,  0.0,
       -0.30, -0.45,  0.0,
       -0.30, -0.45,  0.0,
        0.30,  0.45,  0.0,
       -0.30,  0.45,  0.0      
  ];
    
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = 36;
}

/**
 * Populate color buffer with data for I Logo
 */
function loadColors() {
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    
  // Set the heart of the circle to be black    
  var colors = [];
  var blue = [
    19.0/255.0, 41.0/255.0, 74.0/255.0, 1.0
  ];   
  var orange = [
    234.0/255.0, 76.0/255.0, 39.0/255.0, 1.0
  ];

/** First half of vertices make up the smaller orange I,
    Second half make upt the larger Blue I to make the border
*/
  for (i=0;i<=vertexPositionBuffer.numberOfItems;i++){
      if (i < vertexPositionBuffer.numberOfItems/2) {
          colors.push(...orange);
      } else {
          colors.push(...blue);
      }
  }
    
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4; 
}

/** Populate color buffer with data for original animation
 */
function loadMyVerts() {
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  var triangleVertices = [
         1.0,  0.7,  0.0,
         1.0,  1.0,  0.0,
        -1.0,  1.0,  0.0,
      
         1.0,  0.7,  0.0,
         0.7, -1.0,  0.0,
         1.0, -1.0,  0.0,
      
         0.7, -1.0,  0.0,
        -1.0, -0.7,  0.0,
        -1.0, -1.0,  0.0,
      
        -1.0, -0.7,  0.0,
        -0.7,0.955,  0.0,
        -1.0,  1.0,  0.0,
      
        -0.7,0.955,  0.0,
       0.955, 0.45,  0.0,
         1.0,  0.7,  0.0,
      
       0.955, 0.45,  0.0,
        0.45,-0.96,  0.0,
         0.7, -1.0,  0.0,

        0.45,-0.955,  0.0,
       -0.955,-0.45,  0.0,
        -1.0, -0.7,  0.0,

       -0.955,-0.45,  0.0,
       -0.45, 0.88,  0.0,
        -0.7, 0.955,  0.0,
      
       -0.45, 0.88,  0.0,      
        0.885, 0.25,  0.0,
        0.955, 0.45,  0.0,

        0.885, 0.25,  0.0,
        0.25,-0.885,  0.0,
         0.45,-0.96,  0.0,
      
        0.25,-0.885,  0.0,
        -0.878,-0.25,  0.0,
       -0.955,-0.45,  0.0,
      
       -0.878,-0.25,  0.0,
        -0.22, 0.77,  0.0,
       -0.45, 0.88,  0.0,
      
        -0.22, 0.77,  0.0,
        0.78, 0.06, 0.0,
        0.885, 0.25,  0.0,
      
         0.78, 0.06, 0.0,
         0.08, -0.79,  0.0,
         0.25,-0.885,  0.0,

         0.08, -0.79,  0.0,
        -0.77,-0.08,  0.0,
        -0.878,-0.25,  0.0,
      
        -0.77,-0.08,  0.0,
        -0.06, 0.655,  0.0,
        -0.22, 0.77,  0.0,
    
        -0.06, 0.655, 0.0,
         0.65, -0.1, 0.0,
         0.78, 0.06, 0.0,
      
         0.65, -0.1, 0.0,
         -0.09,-0.65, 0.0,
         0.08, -0.79, 0.0,

         -0.09,-0.65, 0.0,
         -0.62, 0.07, 0.0,
        -0.77,-0.08, 0.0,

         -0.62, 0.07, 0.0,
         0.06, 0.53, 0.0,
        -0.06, 0.655,  0.0,
      
         0.06, 0.53, 0.0,
         0.5, -0.21,  0.0,
         0.65, -0.1, 0.0,
      
          0.5, -0.21,  0.0,
         -0.21, -0.48, 0.0,
         -0.09,-0.65, 0.0,
      
         -0.21, -0.48, 0.0,
         -0.45, 0.18, 0.0,
         -0.62, 0.07, 0.0,

         -0.45, 0.18, 0.0,
          0.155, 0.37, 0.0,
          0.06, 0.53, 0.0,
      
          0.155, 0.37, 0.0,
          0.32, -0.28, 0.0,
          0.5, -0.21,  0.0,
      
          0.32, -0.28, 0.0,
          -0.28, -0.3,  0.0,
         -0.21, -0.48, 0.0,

          -0.28, -0.3,  0.0,
         -0.28,  0.23, 0.0,
         -0.45, 0.18, 0.0,

         -0.28,  0.23, 0.0,
          0.2, 0.19, 0.0,
          0.155, 0.37, 0.0,
      
          0.2, 0.19, 0.0,
          0.155, -0.288, 0.0,
          0.32, -0.28, 0.0,
      
          0.155, -0.288, 0.0,
          -0.28, -0.16, 0.0,
          -0.28, -0.3,  0.0,
      
          -0.28, -0.16, 0.0,
          -0.14,  0.22,  0.0,
          -0.28,  0.23, 0.0,
      
          -0.14,  0.22,  0.0,
           0.19,  0.05, 0.0,
           0.2, 0.19, 0.0,
      
           0.19,  0.05, 0.0,
           0.03, -0.28, 0.0,
          0.155, -0.288, 0.0

  ];
    
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = 99;    
}


/** Populate color buffer with colors for original animation
 */
function loadMyColors() {
  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    
   
  var colors = [];
  
  var a=1.0;
  var r;
  var b;
  var g;
  // RGB Components change with timestamps indicated by scby
  var halfV= vertexPositionBuffer.numberOfItems/Math.cos(scby);
  for (i=0;i<=vertexPositionBuffer.numberOfItems;i++){
      r=Math.sin(Math.abs((i-halfV)/halfV)*3);
      b=Math.sin(Math.abs((i-halfV)/halfV)*30);
      g=Math.cos(Math.abs((i-halfV)/halfV)*30);
      colors.push(r);
      colors.push(g);
      colors.push(b);
      colors.push(a);
  }
    
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4;
}


/** Modify and repopulate buffers with offset to x for dancing effect
*/
function dance()
{   
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  var triangleVertices = [
         0.5 + Math.sin(defAngle)/30,  0.4,  0.0,
         0.5 + Math.cos(defAngle)/30,  0.8,  0.0,
        -0.5 + Math.cos(defAngle)/30,  0.8,  0.0,
        -0.5 + Math.sin(defAngle)/30,  0.4,  0.0,
        -0.5 + Math.cos(defAngle)/30,  0.8,  0.0,
         0.5 + Math.sin(defAngle)/30,  0.4,  0.0,
      
         0.5 + Math.cos(defAngle)/30, -0.4,  0.0,
         0.5 + Math.sin(defAngle)/30, -0.8,  0.0,
        -0.5 + Math.sin(defAngle)/30, -0.8,  0.0,
        -0.5 + Math.cos(defAngle)/30, -0.4,  0.0,
        -0.5 + Math.sin(defAngle)/30, -0.8,  0.0,
         0.5 + Math.cos(defAngle)/30, -0.4,  0.0,
      
        0.25 + Math.cos(defAngle)/30, -0.4,  0.0,     
        0.25 + Math.sin(defAngle)/30,  0.4,  0.0,
       -0.25 + Math.cos(defAngle)/30, -0.4,  0.0,
       -0.25 + Math.cos(defAngle)/30, -0.4,  0.0,
        0.25 + Math.sin(defAngle)/30,  0.4,  0.0,
       -0.25 + Math.sin(defAngle)/30,  0.4,  0.0,

      // Blue Border
         0.55 + Math.sin(defAngle)/30,  0.35,  0.0,
         0.55 + Math.cos(defAngle)/30,  0.85,  0.0,
        -0.55 + Math.cos(defAngle)/30,  0.85,  0.0,
        -0.55 + Math.sin(defAngle)/30,  0.35,  0.0,
        -0.55 + Math.cos(defAngle)/30,  0.85,  0.0,
         0.55 + Math.sin(defAngle)/30,  0.35,  0.0,
      
         0.55 + Math.cos(defAngle)/30, -0.35,  0.0,
         0.55 + Math.sin(defAngle)/30, -0.85,  0.0,
        -0.55 + Math.sin(defAngle)/30, -0.85,  0.0,
        -0.55 + Math.cos(defAngle)/30, -0.35,  0.0,
        -0.55 + Math.sin(defAngle)/30, -0.85,  0.0,
         0.55 + Math.cos(defAngle)/30, -0.35,  0.0,
      
        0.30 + Math.cos(defAngle)/30, -0.45,  0.0,     
        0.30 + Math.sin(defAngle)/30,  0.45,  0.0,
       -0.30 + Math.cos(defAngle)/30, -0.45,  0.0,
       -0.30 + Math.cos(defAngle)/30, -0.45,  0.0,
        0.30 + Math.sin(defAngle)/30,  0.45,  0.0,
       -0.30 + Math.sin(defAngle)/30,  0.45,  0.0      
  ];
    
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.DYNAMIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = 36;
}

/**
 * Populate buffers with data
 */
function setupBuffers() {
  //Generate the vertex positions    
  loadVertices();

  //Generate the vertex colors
  loadColors();
}

/** Populate buffers with data for second animation
*/
function setupBuffers2() {
    loadMyVerts();
    
    loadMyColors();
}

/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
  

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 
                         vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 
                            vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
}

/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
var identityMatrix = new Float32Array(16);
glMatrix.mat4.identity(identityMatrix);
function animate() {
    if (dancing) {
        glMatrix.mat4.translate(wvMatrix,identityMatrix,[Math.cos(scby)/3*2,Math.sin(scby)/2,0])
        glMatrix.mat4.scale(wvMatrix, wvMatrix,[Math.sin(scby)/2,Math.sin(scby)/2,1])
        glMatrix.mat4.rotate(wvMatrix, wvMatrix, defAngle/50, [0,0,-1]);
        dance();
    } else if (!dancing) {
        glMatrix.mat4.identity(wvMatrix);
        loadMyColors();
    }

}

/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders(); 
  setupBuffers();
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.enable(gl.DEPTH_TEST);
  glMatrix.mat4.identity(wvMatrix);
  glMatrix.mat4.identity(mvMatrix);
  glMatrix.mat4.identity(pMatrix); 
  tick();
}

/**
 * Tick called for every animation frame.
 */
function tick() {
    console.log("Frame ",frameNumber);
    frameNumber=frameNumber+1;
      var type = document.getElementsByName("type");
    //changes for radio button
    if (type[0].checked) {
      if (!dancing) {
          dancing = true;
          setupBuffers();
      }
    } else if (type[1].checked) {
      if (dancing) {
          dancing = false;
          setupBuffers2();
      }
    }
    defAngle = performance.now()/ 1000 * 2* Math.PI;
    scby = performance.now()/ 1000;
    animate();
    setMatrixUniforms();
    draw();
    requestAnimationFrame(tick);
}


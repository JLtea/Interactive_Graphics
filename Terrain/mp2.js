
/**
 * @file A simple WebGL example drawing central Illinois style terrain
 * @author Eric Shaffer <shaffer1@illinois.edu>  
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global The angle of rotation around the y axis */
var viewRot = 10;

/** @global A glmatrix vector to use for transformations */
var transformVec = vec3.create();    

// Initialize the vector....
vec3.set(transformVec,0.0,0.0,-2.0);

/** @global An object holding the geometry for a 3D terrain */
var myTerrain;


// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0,0.0,0.0);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0,1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0,0.0,0.0);

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [0,3,3];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0,0,0];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [1,1,1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular =[0,0,0];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [1.0,1.0,1.0];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [205.0/255.0,163.0/255.0,63.0/255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [0.0,0.0,0.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 23;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0,0.0,0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0,1.0,1.0];


// Rotation
/** @global Roll angle */
var rollAngle = 0.0;
/** @global Pitch angle */
var pitchAngle = 0.0;
/** @global Speed to move at */
var speed = 0.001;
var upRotationQuat = quat.create();
var direction = quat.create();
var rotateRoll = quat.create();
var rotatePitch = quat.create();
var upRotated = vec3.create();
var conjugate = quat.create();
var viewDirRot = vec3.fromValues(0.0,0.0,-1.0);


//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
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

//----------------------------------------------------------------------------------
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

//----------------------------------------------------------------------------------
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

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess"); 
  shaderProgram.uniformMaxZLoc = gl.getUniformLocation(shaderProgram, "maxZ");
  shaderProgram.uniformMinZLoc = gl.getUniformLocation(shaderProgram, "minZ");
  shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");  
  shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
  shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");
  shaderProgram.uniformFogLoc = gl.getUniformLocation(shaderProgram, "fogEnabled");
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha,a,d,s,fog) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform1f(shaderProgram.uniformMinZLoc, myTerrain.minZ);
  gl.uniform1f(shaderProgram.uniformMaxZLoc, myTerrain.maxZ);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
  gl.uniform1f(shaderProgram.uniformFogLoc, fog);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupBuffers() {
    myTerrain = new Terrain(64,-0.5,0.5,-0.5,0.5);
    myTerrain.loadBuffers();
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
    moveForward();
    roll();
    upRotated = vec3.fromValues(upRotationQuat[0], upRotationQuat[1], upRotationQuat[2]);

    pitch();
    upRotated = vec3.fromValues(upRotationQuat[0], upRotationQuat[1], upRotationQuat[2]);
    viewDirRot = vec3.fromValues(direction[0], direction[1], direction[2]);
    
    var transformVec = vec3.create();
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), 
                     gl.viewportWidth / gl.viewportHeight,
                     0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDirRot);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,upRotated);    
 
    //Draw Terrain
    mvPushMatrix();
    vec3.set(transformVec,0.0,-0.25,-2.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateY(mvMatrix, mvMatrix, degToRad(viewRot));
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));
    setMatrixUniforms();
    setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular);
    
    if (document.getElementById("fog").checked) {
      setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular, true); 
      myTerrain.drawTriangles();
    } else {
      setMaterialUniforms(shininess,kAmbient,kTerrainDiffuse,kSpecular, false); 
      myTerrain.drawTriangles();
    }
    mvPopMatrix();

  
}

//----------------------------------------------------------------------------------
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
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  tick();
}

//----------------------------------------------------------------------------------
/**
 * Animate function
 */
function animate() {
    // left
    if (currentlyPressedKeys[37]) {
        rollAngle -= 0.001;
    }
    // up
    if (currentlyPressedKeys[38]) {
        pitchAngle += 0.001;
    }
    // right
    if (currentlyPressedKeys[39]) {
        rollAngle += 0.001;
    }
    // down
    if (currentlyPressedKeys[40]) {
        pitchAngle -= 0.001;
    }
    // =
    if (currentlyPressedKeys[187]) {
        speed += 0.0001;
    }
    // -
    if (currentlyPressedKeys[189]) {
        speed -= 0.0001;
    }
}


//----------------------------------------------------------------------------------
/**
 * Keeping drawing frames....
 */
function tick() {
    requestAnimFrame(tick);
    animate();
    draw();
}

//----------------------------------------------------------------------------------
/**
 * Code to handle user interaction
 */

var currentlyPressedKeys = {};

function handleKeyDown(event) {
    if (event.key == "ArrowDown" | event.key == "ArrowUp" |
        event.key == "ArrowRight"  | event.key == "ArrowLeft" |
        event.key == "Equal"  | event.key == "Minus") {
        event.preventDefault();
    }
    currentlyPressedKeys[event.keyCode] = true;
}

function handleKeyUp(event) {
    if (event.key == "ArrowDown" | event.key == "ArrowUp" |
        event.key == "ArrowRight"  | event.key == "ArrowLeft" |
        event.key == "Equal"  | event.key == "Minus") {
        event.preventDefault();
    }
    currentlyPressedKeys[event.keyCode] = false;
}

/**
 * Moves plane forward in view direction with speedFactor
 */
function moveForward() {
    eyePt[0] += viewDirRot[0] * speed;
    eyePt[1] += viewDirRot[1] * speed;
    eyePt[2] += viewDirRot[2] * speed;
}

/**
 * Rotate x axis
 */
function pitch() {
    // "y-axis" to rotate around
    var orthog = vec3.cross(vec3.create(), viewDir, upRotated);
    rotatePitch[0] = orthog[0] * Math.sin(pitchAngle / 2);
    rotatePitch[1] = orthog[1] * Math.sin(pitchAngle / 2);
    rotatePitch[2] = orthog[2] * Math.sin(pitchAngle / 2);
    rotatePitch[3] = Math.cos(pitchAngle / 2);

    var upQuat = quat.fromValues(upRotated[0], upRotated[1], upRotated[2], 0);
    var viewQuat = quat.fromValues(viewDir[0], viewDir[1], viewDir[2], 0);
    newUpQuat = quat.multiply(upRotationQuat, rotatePitch, upQuat);
    conjugate = quat.conjugate(conjugate, rotatePitch);

    //qpq^-1
    direction = quat.multiply(direction, rotatePitch, viewQuat);
    direction = quat.multiply(direction, direction, conjugate);
    upRotationQuat = quat.multiply(upRotationQuat, newUpQuat, conjugate);
}

/**
 * Rotate z axis
 */
function roll() {
    rotateRoll[0] = viewDir[0] * Math.sin(rollAngle / 2);
    rotateRoll[1] = viewDir[1] * Math.sin(rollAngle / 2);
    rotateRoll[2] = viewDir[2] * Math.sin(rollAngle / 2);
    rotateRoll[3] = Math.cos(rollAngle / 2);

    var upQuat = quat.fromValues(up[0], up[1], up[2], 0);
    conjugate = quat.conjugate(conjugate, rotateRoll);
    
    // qpq^-1
    upRotationQuat = quat.multiply(upRotationQuat, rotateRoll, upQuat);
    upRotationQuat = quat.multiply(upRotationQuat, upRotationQuat, conjugate);
}


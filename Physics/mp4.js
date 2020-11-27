/**
 * @file A simple particle system using WebGL
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

 /** @global The View matrix */
 var vMatrix = mat4.create();

 /** @global The Projection matrix */
 var pMatrix = mat4.create();

 /** @global The Normal matrix */
 var nMatrix = mat3.create();

 /** @global The matrix stack for hierarchical modeling */
 var mvMatrixStack = [];

 // View parameters
 /** @global Location of the camera in world coordinates */
 var eyePt = vec3.fromValues(0.0,0.0,3.0);
 /** @global Direction of the view in world coordinates */
 var viewDir = vec3.fromValues(0.0,0.0,-1.0);
 /** @global Up vector for view matrix creation, in world coordinates */
 var up = vec3.fromValues(0.0,1.0,0.0);
 /** @global Location of a point along viewDir in world coordinates */
 var viewPt = vec3.fromValues(0.0,0.0,0.0);

 //Light parameters
 /** @global Light position in VIEW coordinates */
 var lightPosition = [1,1,1];
 /** @global Ambient light color/intensity for Phong reflection */
 var lAmbient = [0.3,0.3,0.3];
 /** @global Diffuse light color/intensity for Phong reflection */
 var lDiffuse = [1,1,1];
 /** @global Specular light color/intensity for Phong reflection */
 var lSpecular =[0.5,0.5,0.5];

 //Material parameters
 /** @global Ambient material color/intensity for Phong reflection */
 var kAmbient = [1.0,1.0,1.0];
 /** @global Diffuse material color/intensity for Phong reflection */
 var kDiffuse = [205.0/255.0,163.0/255.0,63.0/255.0];
 /** @global Specular material color/intensity for Phong reflection */
 var kSpecular = [0.5,0.5,0.5];
 /** @global Shininess exponent for Phong reflection */
 var shininess = 4;
 /** @global Edge color fpr wireframeish rendering */
 var kEdgeBlack = [0.0,0.0,0.0];
 /** @global Edge color for wireframe rendering */
 var kEdgeWhite = [1.0,1.0,1.0];

 var spheres = [];
 var drag = 0.15;
 var gravity = [0, -9.8, 0];

 var sphereVertexPositionBuffer;
 var sphereVertexNormalBuffer;


 var lastFrame = -1;

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
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

//----------------------------------------------------------------------------------
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
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
    var names = ["webgl", "experimental-webgl"];
    var context = null;
    for (var i = 0; i < names.length; i++) {
        try {
            context = canvas.getContext(names[i]);
        }
        catch(e) {}

        if (context) {
            break;
        }
    }
    if (context) {
        context.viewportWidth = canvas.width;
        context.viewportHeight = canvas.height;
    }
    else {
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
    }
    else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    }
    else {
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
* Sends material information to the shader
* @param {Float32} alpha shininess coefficient
* @param {Float32Array} a Ambient material color
* @param {Float32Array} d Diffuse material color
* @param {Float32Array} s Specular material color
*/
function setMaterialUniforms(alpha,a,d,s) {
    gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
    gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
    gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
    gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}

//----------------------------------------------------------------------------------
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
    shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKAmbient");
    shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKDiffuse");
    shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uKSpecular");
}

//----------------------------------------------------------------------------------
/**
* Startup function
*/
function startup() {
    canvas = document.getElementById("myGLCanvas");
    gl = createGLContext(canvas);

    setupShaders();
    setupSphereBuffers();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    addSpheres();
    tick();
}

//----------------------------------------------------------------------------------
/**
 * Add n = 5 spheres
 */
function addSpheres() {
    for (var n = 0; n < 5; n++) {
        var sphere = new Particle();
        spheres.push(sphere);
    }
}
/**
 * Removes n = 5 spheres
 */
function removeSpheres() {
    for (var n = 0; n < 5; n++) {
        spheres.shift();
    }
}

//----------------------------------------------------------------------------------
/**
 * Populates buffers with data for spheres
 */
function setupSphereBuffers() {
    var sphereData=[];
    var sphereNormals=[];
    var numT = sphereFromSubdivision(6, sphereData, sphereNormals);
    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereData), gl.STATIC_DRAW);
    sphereVertexPositionBuffer.itemSize = 3;
    sphereVertexPositionBuffer.numItems = numT * 3;

    // Specify normals to be able to do lighting calculations
    sphereVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals),
                  gl.STATIC_DRAW);
    sphereVertexNormalBuffer.itemSize = 3;
    sphereVertexNormalBuffer.numItems = numT * 3;

}

//----------------------------------------------------------------------------------
/**
 * Draws a sphere from buffer
 */
function drawSphere() {
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           sphereVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);
 gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);
}

//----------------------------------------------------------------------------------
/**
 * Draws particles in spheres array
 */
function drawParticles() {
    for (var i = 0; i < spheres.length; i++) {
        var sphere = spheres[i];
        mvPushMatrix();

        mat4.translate(mvMatrix, mvMatrix, sphere.position);
        mat4.scale(mvMatrix, mvMatrix, [sphere.radius, sphere.radius, sphere.radius]);

        setMatrixUniforms();
        setMaterialUniforms(shininess, sphere.color, sphere.color, kSpecular);
        drawSphere();

        mvPopMatrix();
    }
}

//----------------------------------------------------------------------------------
/**
* draw frame
*/
function tick() {
    requestAnimFrame(tick);
    animate();
    draw();
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mat4.perspective(pMatrix,degToRad(60),
                     gl.viewportWidth / gl.viewportHeight,
                     0.1, 500.0);
    vec3.add(viewPt, eyePt, viewDir);
    mat4.lookAt(mvMatrix, eyePt, viewPt, up);

    setLightUniforms(lightPosition, lAmbient, lDiffuse, lSpecular);

    drawParticles();
}

/**
* Update transformations
*/
function animate() {
    var now = new Date().getTime();

    if (lastFrame == -1) {
        lastFrame = now;
    }

    var delta_t = (now - lastFrame) / 1000.0;
    lastFrame = now;

    for (var i = 0; i < spheres.length; i++) {
        var particle = spheres[i];

        // physics stuff
        particle.update_velocity(delta_t);
        particle.update_position(delta_t);
        particle.resolve_collision(delta_t);
    }
}

// User Interface
var keysDown = [];

function handleKeyDown(event) {
    keysDown[event.key] = true;

    if (keysDown["="]) {
        addSpheres();
    }
    if (keysDown["-"]) {
        removeSpheres();
    }

}
function handleKeyUp(event) {
    keysDown[event.key] = false;
}
function reset() {
    spheres = [];
}
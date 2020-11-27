/**
 * @fileoverview Terrain - A simple 3D terrain using WebGL
 * @author Joseph Lee
 */

/** Class implementing 3D terrain. */
class Terrain{
/**
 * Initialize members of a Terrain object
 * @param {number} div Number of triangles along x axis and y axis
 * @param {number} minX Minimum X coordinate value
 * @param {number} maxX Maximum X coordinate value
 * @param {number} minY Minimum Y coordinate value
 * @param {number} maxY Maximum Y coordinate value
 */
    constructor(div,minX,maxX,minY,maxY) {
        this.div = div;
        
        this.minX = minX;
        this.minY = minY;
        this.minZ = 0;
        
        this.maxX = maxX;
        this.maxY = maxY;
        this.maxZ = 0;

        // Allocate vertex array
        this.vBuffer = [];
        // Allocate triangle array
        this.fBuffer = [];
        // Allocate normal array
        this.nBuffer = [];
        // Allocate array for edges so we can draw wireframe
        this.eBuffer = [];
        console.log("Terrain: Allocated buffers");

        this.generateTriangles();
        console.log("Terrain: Generated triangles");

        this.generateLines();
        console.log("Terrain: Generated lines");

        var delta = (this.maxX - this.minY) / 150;
        this.randomHeights(100, delta);
        console.log("Terrain: Set Heights");
        
        this.generateNormals();
        console.log("Terrain: Generated Normals");
        
        this.normalizeNormals();
        console.log("Terrain: Normalized Normals");        
        
        // Get extension for 4 byte integer indices for drwElements
        var ext = gl.getExtension('OES_element_index_uint');
        if (ext == null){
            alert("OES_element_index_uint is unsupported by your browser and terrain generation cannot proceed.");
        }
    }

    /**
    * Set the x,y,z coords of a vertex at location(i,j)
    * @param {Object} v an an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    setVertex(v,i,j) {
        var vid = 3 * (i * (this.div + 1) + j);
        this.vBuffer[vid + 0] = v[0];
        this.vBuffer[vid + 1] = v[1];
        this.vBuffer[vid + 2] = v[2];

        if (v[2] < this.minZ) {
            this.minZ = v[2];
        }

        if (v[2] > this.maxZ) {
            this.maxZ = v[2];
        }
    }

    /**
    * Return the x,y,z coordinates of a vertex at location (i,j)
    * @param {Object} v an array of length 3 holding x,y,z coordinates
    * @param {number} i the ith row of vertices
    * @param {number} j the jth column of vertices
    */
    getVertex(v,i,j) {
        var vid = 3 * (i * (this.div + 1) + j);
        v[0] = this.vBuffer[vid];
        v[1] = this.vBuffer[vid + 1];
        v[2] = this.vBuffer[vid + 2];
    }

    /**
    * Send the buffer objects to WebGL for rendering
    */
    loadBuffers() {
        // Specify the vertex coordinates
        this.VertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vBuffer), gl.STATIC_DRAW);
        this.VertexPositionBuffer.itemSize = 3;
        this.VertexPositionBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexPositionBuffer.numItems, " vertices");

        // Specify normals to be able to do lighting calculations
        this.VertexNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.nBuffer),
                  gl.STATIC_DRAW);
        this.VertexNormalBuffer.itemSize = 3;
        this.VertexNormalBuffer.numItems = this.numVertices;
        console.log("Loaded ", this.VertexNormalBuffer.numItems, " normals");

        // Specify faces of the terrain
        this.IndexTriBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.fBuffer),
                  gl.STATIC_DRAW);
        this.IndexTriBuffer.itemSize = 1;
        this.IndexTriBuffer.numItems = this.fBuffer.length;
        console.log("Loaded ", this.IndexTriBuffer.numItems, " triangles");

        //Setup Edges
        this.IndexEdgeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this.eBuffer),
                  gl.STATIC_DRAW);
        this.IndexEdgeBuffer.itemSize = 1;
        this.IndexEdgeBuffer.numItems = this.eBuffer.length;
        console.log("triangulatedPlane: loadBuffers");
    }

    /**
    * Render the triangles
    */
    drawTriangles() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

        //Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexTriBuffer);
        gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT,0);
    }

    /**
    * Render the triangle edges wireframe style
    */
    drawEdges() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, this.VertexPositionBuffer.itemSize,
                         gl.FLOAT, false, 0, 0);

        // Bind normal buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexNormalBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute,
                           this.VertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);

        //Draw
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.IndexEdgeBuffer);
        gl.drawElements(gl.LINES, this.IndexEdgeBuffer.numItems, gl.UNSIGNED_INT,0);
    }

    /**
     * Fill the vertex and buffer arrays
     */
    generateTriangles() {
        var deltaX = (this.maxX - this.minX) / this.div;
        var deltaY = (this.maxY - this.minY) / this.div;

        for (var i = 0; i <= this.div; i++) {
            for (var j = 0; j <= this.div; j++) {
                this.vBuffer.push(this.minX + deltaX * j);
                this.vBuffer.push(this.minY + deltaY * i);
                this.vBuffer.push(0);

                this.nBuffer.push(0);
                this.nBuffer.push(0);
                this.nBuffer.push(1);
            }
        }

        for (var i = 0; i < this.div; i++) {
            for (var j = 0; j < this.div; j++) {
                var vid = i * (this.div + 1) + j;
                this.fBuffer.push(vid);
                this.fBuffer.push(vid + 1);
                this.fBuffer.push(vid + this.div + 1);

                this.fBuffer.push(vid + 1);
                this.fBuffer.push(vid + 1 + this.div + 1);
                this.fBuffer.push(vid + this.div + 1);
            }
        }

        this.numVertices = this.vBuffer.length/3;
        this.numFaces = this.fBuffer.length/3;
    }

    /**
     * Print vertices and triangles to console for debugging
     */
    printBuffers() {
        for (var i = 0; i < this.numVertices; i++) {
               console.log("v ", this.vBuffer[i*3], " ",
                                 this.vBuffer[i*3 + 1], " ",
                                 this.vBuffer[i*3 + 2], " ");
        }

        for(var i = 0; i < this.numFaces; i++) {
               console.log("f ", this.fBuffer[i*3], " ",
                                 this.fBuffer[i*3 + 1], " ",
                                 this.fBuffer[i*3 + 2], " ");
        }
    }

    /**
     * Generates line values from faces in faceArray
     * to enable wireframe rendering
     */
    generateLines() {
        var numTris=this.fBuffer.length/3;
        for(var f=0;f<numTris;f++)
        {
            var fid=f*3;
            this.eBuffer.push(this.fBuffer[fid]);
            this.eBuffer.push(this.fBuffer[fid+1]);

            this.eBuffer.push(this.fBuffer[fid+1]);
            this.eBuffer.push(this.fBuffer[fid+2]);

            this.eBuffer.push(this.fBuffer[fid+2]);
            this.eBuffer.push(this.fBuffer[fid]);
        }
    }

    /**
     * Generates line values from faces in faceArray
     * to enable wireframe rendering
     */
    generateNormals() {
        var numTris = this.fBuffer.length / 3;
        for (var f = 0; f < numTris; f++) {
            var fid = f * 3;
            var p1 = this.fBuffer[fid];
            var p2 = this.fBuffer[fid + 1];
            var p3 = this.fBuffer[fid + 2];

            var v1 = vec3.create();
            var v2 = vec3.create();
            var v3 = vec3.create();

            this.getVertexAtIndex(v1, p1);
            this.getVertexAtIndex(v2, p2);
            this.getVertexAtIndex(v3, p3);

            // compute normal for T using N = (v2 - v1) X (v3 - v1)
            vec3.subtract(v2, v2, v1);
            vec3.subtract(v3, v3, v1);

            var normal = vec3.create();
            vec3.cross(normal, v2, v3);
            vec3.normalize(normal, normal);

            this.addNormalAtIndex(normal, p1);
            this.addNormalAtIndex(normal, p2);
            this.addNormalAtIndex(normal, p3);
        }
    }

    /**
    * Return the x,y,z coordinates of a vertex at index i
    * @param {Vec3} v a vec3 of length 3 holding x,y,z coordinates
    * @param {number} i the triangle number
    */
    getVertexAtIndex(v, i) {
        var index = 3 * i;
        vec3.set(v, this.vBuffer[index], this.vBuffer[index + 1], this.vBuffer[index + 2]);
    }

    /**
    * Set the x,y,z coordinates of a vertex at index i
    * @param {Vec3} v a vec3 of length 3 holding x,y,z coordinates
    * @param {number} i the triangle number
    */
    addNormalAtIndex(v, i) {
        var index = 3 * i;
        this.nBuffer[index] += v[0];
        this.nBuffer[index + 1] += v[1];
        this.nBuffer[index + 2] += v[2];
    }

    /**
    * Normalize all vectors in nBuffer
    */
    normalizeNormals() {
        var numTris = this.nBuffer.length / 3;
        for (var f = 0; f < numTris; f++) {
            var fid = f * 3;
            var p1 = this.nBuffer[fid];
            var p2 = this.nBuffer[fid + 1];
            var p3 = this.nBuffer[fid + 2];

            var v = vec3.create();
            vec3.set(v, p1, p2, p3);
            vec3.normalize(v, v);
            this.nBuffer[fid] = v[0];
            this.nBuffer[fid + 1] = v[1];
            this.nBuffer[fid + 2] = v[2];
        }
    }

    /**
     * Randomly set Z coordinates for vertices
     * Increase heights on one side and decrease on the other.
     * @param {number} N number of times
     * @param {number} h the height to increase or decrease on vertices
     */
     randomHeights(N, h) {
         for (var i = 0; i < N; i++) {
             var randX = Math.floor(Math.random() * this.div);
             var randY = Math.floor(Math.random() * this.div);
             var theta = 2.0 * Math.PI * Math.random();
             var randH = (Math.random() * h) + (h / 2);
             var randNorm = [];
             
             randNorm[0] = Math.cos(theta);
             randNorm[1] = Math.sin(theta);

             for (var x = 0; x <= this.div; x++) {
                 for (var y = 0; y <= this.div; y++) {
                     var subtractVector = []
                     subtractVector[0] = x - randX;
                     subtractVector[1] = y - randY;
                     var dotProduct = (subtractVector[0] * randNorm[0]) + (subtractVector[1] * randNorm[1]);
                     var point = []
                     this.getVertex(point, x, y);
                     if (dotProduct > 0) {
                         point[2] += randH;
                     } else {
                         point[2] -= randH;
                     }
                     this.setVertex(point, x, y);
                 }
             }
         }
     }
}

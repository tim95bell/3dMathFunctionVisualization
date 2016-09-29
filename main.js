"use strict";

var canvas;
var gl;

var LEFT = -1;
var RIGHT = 1;
var BOTTOM = -1;
var TOP = 1;

var near = -1;
var far = 2;

var fovy = 27.0;
var aspectRatio;

var worldview, projection, modelview;
var mvLoc, projLoc, colorLoc, drawingMeshLoc;

var theta = 1;
var phi = 1;

var dTheta = 0;
var dPhi = 0;

var mouseControls = false;

// var eye = vec3(0.0, -75.0, 2.0);
// var eye = vec3(0.0, -1.0, 3.0);//0.3);
// var eye = vec3(0.0, -1.0, 1.0);
var eye = vec3(0.0, -2.0, 0.0);


// var at = vec3(0.0, 0.0, 2.0);
var at = vec3(0.0, 0.0, 0.0);
// var at = vec3(0.0, 0.0, 1.0);

var up = vec3(0.0, 0.0, 1.0);
// var up = vec3(0.0, 1.0, 0.0);

// mesh is from -1 to +1
var vertices = [];
var density = 30; // must be even
var stripSize = (density+1)*2;
// var numStrips = density/2;
var numStrips = density;
for(var y = 0; y < density; y += 1){
  // var strip = [];
  var yTopPoint = y/(density/2) - 1;
  var yBottomPoint = (y+1)/(density/2) - 1;
  for(var x = 0; x < density+1; ++x){
    var xPoint = x/(density/2) - 1;
    // strip.push( vec2(xPoint, yTopPoint) );
    // strip.push( vec2(xPoint, yBottomPoint) );
    // mesh.push(strip);
    vertices.push( vec3(xPoint, yTopPoint, 0) );
    vertices.push( vec3(xPoint, yBottomPoint, 0) );
  }
}

// axis
var axisIndex = vertices.length;
vertices.push( vec3(-2,0,0) );
vertices.push( vec3(2,0,0) );
vertices.push( vec3(0,-2,0) );
vertices.push( vec3(0,2,0) );
vertices.push( vec3(0,0,-2) );
vertices.push( vec3(0,0,2) );


window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    aspectRatio = canvas.width/canvas.height;

    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);

    //
    //  Load shaders and initialize attribute buffers
    //
    // var axisProgram = initShaders( gl, "axis-vertex-shader", "axis-fragment-shader" );
    // gl.useProgram( axisProgram );

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    // gl.bufferData( gl.ARRAY_BUFFER, sizeof['vec2'] * density*density, gl.STATIC_DRAW);

    // gl.bufferData( gl.ARRAY_BUFFER, sizeof['vec2'] * mesh.length, gl.STATIC_DRAW);
    // gl.bufferSubData( gl.ARRAY_BUFFER, sizeof['vec2'] * mesh.length, flatten(mesh) );

    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );

    // for(var i = 0; i < mesh.length; ++i)
    //   gl.bufferSubData( gl.ARRAY_BUFFER, i*density*2, flatten(mesh[i]) );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    mvLoc = gl.getUniformLocation( program, "modelView" );
    projLoc = gl.getUniformLocation( program, "projection" );
    colorLoc = gl.getUniformLocation( program, "color" );
    drawingMeshLoc = gl.getUniformLocation( program, "drawingMesh");


    var projection = ortho(LEFT, RIGHT, BOTTOM, TOP, near, far);
    gl.uniformMatrix4fv(projLoc, false, flatten(projection));


    // modelview = mat4();
    // modelview[0][0] = 0.5;
    // modelview[1][1] = 0.5;
    // modelview[2][2] = 0.5;
    // gl.uniformMatrix4fv(mvLoc,false, flatten(modelview) );

    window.onkeydown = function(event) {
      if(mouseControls)
        return;

  		var key = String.fromCharCode(event.keyCode);
  		switch( key ) {
  		  case 'A':
          theta += 0.05;
  		    break;
  		  case 'D':
          theta -= 0.05;
  		    break;
        case 'W':
          phi += 0.05;
          break;
        case 'S':
          phi -= 0.05;
          break;
  		}
      calcRotation();
      render();
  	};

    document.onmousemove = function(e){
      if(!mouseControls)
        return;

      var x = e.movementX;
      var y = e.movementY;

      dTheta += x/1000;
      dPhi +=   y/1000;
    };

    document.onkeyup = function(event){
  		var key = String.fromCharCode(event.keyCode);
  		switch( event.keyCode ) {
        // esc
        case 27:
          mouseControls = false;
          document.getElementById("mouseControlsDiv").style.display = "";
          dTheta = dPhi = 0;
          break;
      }
    };

    canvas.requestPointerLock = canvas.requestPointerLock ||
                            canvas.mozRequestPointerLock;

    document.onclick = function(event){
      if(event.clientX > 0 && event.clientX < canvas.width && event.clientY > 0 && event.clientY < canvas.height){
        canvas.requestPointerLock();
        mouseControls = true;
        document.getElementById("mouseControlsDiv").style.display = "none";
        render();
      }
    };

    theta = 4.808172249621658;
    phi = 4.868412615451514;
    gl.lineWidth(4);
    calcRotation();
    render();
}

function calcRotation(){
  var fowardV = subtract(at, eye);
  var fowardDirectionV = normalize(fowardV);
  var rightDirectionV = cross(fowardV, up);

  var newAtFromEye = vec3(
    Math.sin(phi)*Math.cos(theta),
    Math.sin(phi)*Math.sin(theta),
    Math.cos(phi)
  );
  eye = add(newAtFromEye, at);
  var cameraAdd;
  if(phi > Math.PI*2)
  phi -= Math.PI*2;
  else if(phi < 0)
  phi += Math.PI*2;
  if(phi < Math.PI)
  cameraAdd = radians(90);
  else
  cameraAdd = -radians(90);

  // up = vec3(
  //   Math.sin(phi)*Math.cos(theta),
  //   Math.sin(phi)*Math.sin(theta),
  //   Math.cos(phi) + cameraAdd//radians(90)
  // )
  var camPhi = phi+Math.PI/4;
  up = vec3(
    Math.sin(camPhi)*Math.cos(theta),
    Math.sin(camPhi)*Math.sin(theta),
    Math.cos(camPhi)// + cameraAdd//radians(90)
  )

}

function constrain(lower, upper, val){
  if(val < lower)
    return lower;
  else if(val > upper)
    return upper;
  else
    return val;
}

function update(){
  if(dTheta == 0 && dPhi == 0)
    return;

  var maxSpeed = Math.PI/10;
  theta += dTheta;
  phi += dPhi;
  // dTheta -= 0.1;
  dTheta *= 0.95;
  dTheta = constrain(-maxSpeed, maxSpeed, dTheta);
  // dPhi -= 0.1;
  dPhi *= 0.95;
  dPhi = constrain(-maxSpeed, maxSpeed, dPhi);
  calcRotation();
}


function render() {
  gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if(mouseControls)
    update();

  worldview = lookAt(eye, at, up);

  var modelTransform = scalem(0.4, 0.4, 0.4);
  worldview = mult(worldview, modelTransform);
  gl.uniformMatrix4fv(mvLoc, false, flatten(worldview));

  // draw mesh
  // triangles
  gl.uniform1i(drawingMeshLoc, 1);
  gl.lineWidth(1);
  gl.uniform4fv(colorLoc, flatten(vec4(0.8, 0.8, 0.8, 1.0)));
  for(var i = 0; i < numStrips; ++i){
    gl.drawArrays(gl.TRIANGLE_STRIP, i*stripSize, stripSize);
  }
  // lines
  gl.uniform4fv(colorLoc, flatten(vec4(1.0, 0.2, 0.3, 1.0)));
  for(var i = 0; i < numStrips; ++i){
    gl.drawArrays(gl.LINE_STRIP, i*stripSize, stripSize);
  }

  // draw axis
  gl.uniform1i(drawingMeshLoc, 0);
  gl.lineWidth(4);
  //x
  gl.uniform4fv(colorLoc, flatten(vec4(1, 0, 0, 1.0)));
  gl.drawArrays(gl.LINES, axisIndex, 2);
  //y
  gl.uniform4fv(colorLoc, flatten(vec4(0, 1, 0, 1.0)));
  gl.drawArrays(gl.LINES, axisIndex+2, 2);
  //z
  gl.uniform4fv(colorLoc, flatten(vec4(0, 0, 1, 1.0)));
  gl.drawArrays(gl.LINES, axisIndex+4, 2);

  if(mouseControls)
    requestAnimFrame(render);
}

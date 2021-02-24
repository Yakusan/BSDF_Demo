
// =====================================================
var gl;

// =====================================================

var cameraPos = [0., 0., 1.];
var viewMatrix = mat4.create();

// distCENTER = Z translation
var distCENTER = 0.0;

var rotMatrix = mat4.create();

var pMatrix = mat4.create();
var inv_pViewMatrix = mat4.create();

var envMapON = 0;

var uLightsON    = [0, 1, 0, 0, 0, 0];
var uColorLights = [1., 1., 1.];
var uPosLights   = [ 0., 0.,  0.,
				     0., 100.,  0.,
                     0., 0.,  100.,
                     0., 0., -100.,
                    -100., 0.,  0.,
                     100., 0.,  0.  ];

var uKd = [0.008, 0.4, 0.8];
var uF0 = [0.04, 0.04, 0.04];
var uNo = 1.5;
var uRoughness = 1.0;

var uToneMappingCheck = 0;
var uGammaCheck       = 0;

var displayPlan = 1;

// =====================================================

var modelName = 'bunny';
var modelTrans = [0.0, -0.25, 0.0];
var modelRot = [0.0, 0.0, 0.0];
var modelScale = 0.5;

var renderFuncName = 'lambert';

var OBJ1 = null;
var PLANE = null;
var SKYBOX = null;


// =====================================================
// OBJET 3D, lecture fichier obj
// =====================================================

class objmesh {

	// --------------------------------------------
	constructor(objFname, shaderName, transVal, eulerAngles, scaleVal) {
		this.objName = 'assets/models/' + objFname;

		this.shaderPath = 'assets/shaders/';
		this.shaderName = shaderName;

		this.modelMatrix = mat4.create();
		mat4.identity(this.modelMatrix);

		let transMatrixModel = mat4.create();
		let rotMatrixModel = mat4.create();
		let scaleMatrixModel = mat4.create();

		mat4.identity(transMatrixModel);
		mat4.translate(transMatrixModel, transVal);

		// Common rotation order : Y parent of X parent of Z
		mat4.identity(rotMatrixModel);
		mat4.rotateY(rotMatrixModel, eulerAngles[1]);
		mat4.rotateX(rotMatrixModel, eulerAngles[0]);
		mat4.rotateZ(rotMatrixModel, eulerAngles[2]);

		mat4.identity(scaleMatrixModel);
		mat4.scale(scaleMatrixModel, [scaleVal, scaleVal, scaleVal]);

		// M = T * R * S
		mat4.multiply(transMatrixModel, rotMatrixModel, this.modelMatrix);
		mat4.multiply(this.modelMatrix, scaleMatrixModel);

		this.loaded = -1;
		this.shader = null;
		this.mesh = null;

		loadObjFile(this);
		loadShaders(this);
	}

	// --------------------------------------------
	setShadersParams() {
		gl.useProgram(this.shader);

		this.shader.vAttrib = gl.getAttribLocation(this.shader, "aVertexPosition");
		gl.enableVertexAttribArray(this.shader.vAttrib);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.vertexBuffer);
		gl.vertexAttribPointer(this.shader.vAttrib, this.mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

		this.shader.nAttrib = gl.getAttribLocation(this.shader, "aVertexNormal");
		gl.enableVertexAttribArray(this.shader.nAttrib);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.mesh.normalBuffer);
		gl.vertexAttribPointer(this.shader.nAttrib, this.mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

		this.shader.modelMatrixUniform = gl.getUniformLocation(this.shader, "uModelMatrix"); 
		this.shader.viewMatrixUniform = gl.getUniformLocation(this.shader, "uViewMatrix");
		this.shader.pMatrixUniform = gl.getUniformLocation(this.shader, "uPMatrix");
		
		this.shader.uLightsON = gl.getUniformLocation(this.shader, "uLightsON");
		this.shader.uColorLights = gl.getUniformLocation(this.shader, "uColorLights");
		this.shader.uPosLights = gl.getUniformLocation(this.shader, "uPosLights");

		if(this.shadername !== 'cook_torrance_metal')
			this.shader.uKd = gl.getUniformLocation(this.shader, "uKd");
		
		if(this.shadername !== 'lambert')
		{
			this.shader.uF0 = gl.getUniformLocation(this.shader, "uF0");
			this.shader.uRoughness = gl.getUniformLocation(this.shader, "uRoughness");
		}

		if(this.shadername !== 'cook_torrance')
			this.shader.uNo = gl.getUniformLocation(this.shader, "uNo");

		this.shader.uToneMappingCheck = gl.getUniformLocation(this.shader, "uToneMappingCheck");
		this.shader.uGammaCheck = gl.getUniformLocation(this.shader, "uGammaCheck");

		this.shader.uEnvMapONUniform = gl.getUniformLocation(this.shader, "uEnvMapON");
		this.shader.uSkyboxSamplerUniform = gl.getUniformLocation(this.shader, "uSkybox");
	}

	// --------------------------------------------
	setMatrixUniforms() {
		gl.uniformMatrix4fv(this.shader.modelMatrixUniform, false, this.modelMatrix);
		gl.uniformMatrix4fv(this.shader.viewMatrixUniform, false, viewMatrix);
		gl.uniformMatrix4fv(this.shader.pMatrixUniform, false, pMatrix);

		gl.uniform1iv(this.shader.uLightsON, uLightsON);
		gl.uniform3fv(this.shader.uColorLights, uColorLights);
		gl.uniform3fv(this.shader.uPosLights, uPosLights);

		if(this.shadername !== 'cook_torrance_metal')
			gl.uniform3fv(this.shader.uKd, uKd);
		
		if(this.shadername !== 'lambert')
		{
			gl.uniform3fv(this.shader.uF0, uF0);
			gl.uniform1f(this.shader.uRoughness, uRoughness);
		}

		if(this.shadername !== 'cook_torrance')
			gl.uniform1f(this.shader.uNo, uNo);

		gl.uniform1i(this.shader.uToneMappingCheck, uToneMappingCheck);
		gl.uniform1i(this.shader.uGammaCheck, uGammaCheck);


		gl.uniform1i(this.shader.uEnvMapONUniform, envMapON);
		gl.uniform1i(this.shader.uSkyboxSamplerUniform, 0);
	}

	// --------------------------------------------
	draw() {
		if (this.shader && this.loaded == 4 && this.mesh != null) {
			this.setShadersParams();
			this.setMatrixUniforms();

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.mesh.indexBuffer);
			gl.drawElements(gl.TRIANGLES, this.mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		}
	}

}



// =====================================================
// PLAN 3D, Support géométrique
// =====================================================

class plane {

	// --------------------------------------------
	constructor() {
		this.shaderPath = 'assets/shaders/';
		this.shaderName = 'plane';

		this.loaded = -1;
		this.shader = null;
		this.initAll();
	}

	// --------------------------------------------
	initAll() {
		var size = 1.0;
		var vertices = [
			-size, 0.0, -size,
			-size, 0.0,  size,
			 size, 0.0,  size,

			 size, 0.0,  size,
			 size, 0.0, -size,
			-size, 0.0, -size,
		];

		var texcoords = [
			0.0, 1.0,
			0.0, 0.0,
			1.0, 0.0,

			1.0, 0.0,
			1.0, 1.0,
			0.0, 1.0
		];

		this.vBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		this.vBuffer.itemSize = 3;
		this.vBuffer.numItems = 6;

		this.tBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
		this.tBuffer.itemSize = 2;
		this.tBuffer.numItems = 6;

		loadShaders(this);
	}


	// --------------------------------------------
	setShadersParams() {
		gl.useProgram(this.shader);

		this.shader.vAttrib = gl.getAttribLocation(this.shader, "aVertexPosition");
		gl.enableVertexAttribArray(this.shader.vAttrib);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
		gl.vertexAttribPointer(this.shader.vAttrib, this.vBuffer.itemSize, gl.FLOAT, false, 0, 0);

		this.shader.tAttrib = gl.getAttribLocation(this.shader, "aTexCoords");
		gl.enableVertexAttribArray(this.shader.tAttrib);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
		gl.vertexAttribPointer(this.shader.tAttrib, this.tBuffer.itemSize, gl.FLOAT, false, 0, 0);

		this.shader.viewMatrixUniform = gl.getUniformLocation(this.shader, "uViewMatrix");
		this.shader.pMatrixUniform = gl.getUniformLocation(this.shader, "uPMatrix");
	}


	// --------------------------------------------
	setMatrixUniforms() {
		gl.uniformMatrix4fv(this.shader.viewMatrixUniform, false, viewMatrix);		
		gl.uniformMatrix4fv(this.shader.pMatrixUniform, false, pMatrix);
	}

	// --------------------------------------------
	draw() {
		if (this.shader && this.loaded == 4) {
			this.setShadersParams();
			this.setMatrixUniforms(this);

			gl.drawArrays(gl.TRIANGLES, 0, this.vBuffer.numItems);
			gl.drawArrays(gl.LINE_LOOP, 0, this.vBuffer.numItems);
		}
	}

}


// =====================================================
// Skybox & map d'environnement, Reflexion du metal en environnement statique
// =====================================================

class skybox {

	// --------------------------------------------
	constructor(envName, width, height) {
		this.envPath = 'assets/environment_map/';
		this.envName = envName;

		this.shaderPath = 'assets/shaders/';
		this.shaderName = 'skybox';

		this.width = width;
		this.height = height;

		this.loaded = -1;
		this.shader = null;
		this.initAll();
	}

	// --------------------------------------------
	initAll() {
		this.skyboxVertices = new Float32Array(
		[
			// positions
			// Front
			-1.0,  1.0, -1.0,
			-1.0, -1.0, -1.0,
			 1.0, -1.0, -1.0,
			 1.0, -1.0, -1.0,
			 1.0,  1.0, -1.0,
			-1.0,  1.0, -1.0,

			// Left
			-1.0, -1.0,  1.0,
			-1.0, -1.0, -1.0,
			-1.0,  1.0, -1.0,
			-1.0,  1.0, -1.0,
			-1.0,  1.0,  1.0,
			-1.0, -1.0,  1.0,

			// Right
			 1.0, -1.0, -1.0,
			 1.0, -1.0,  1.0,
			 1.0,  1.0,  1.0,
			 1.0,  1.0,  1.0,
			 1.0,  1.0, -1.0,
			 1.0, -1.0, -1.0,

			 // Back
			-1.0, -1.0,  1.0,
			-1.0,  1.0,  1.0,
			 1.0,  1.0,  1.0,
			 1.0,  1.0,  1.0,
			 1.0, -1.0,  1.0,
			-1.0, -1.0,  1.0,

			// Top
			-1.0,  1.0, -1.0,
			 1.0,  1.0, -1.0,
			 1.0,  1.0,  1.0,
			 1.0,  1.0,  1.0,
			-1.0,  1.0,  1.0,
			-1.0,  1.0, -1.0,

			// Down
			-1.0, -1.0, -1.0,
			-1.0, -1.0,  1.0,
			 1.0, -1.0, -1.0,
			 1.0, -1.0, -1.0,
			-1.0, -1.0,  1.0,
			 1.0, -1.0,  1.0
		] );

		this.faceInfos = [
		  {
		    target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
		    src: this.envPath + this.envName + '/right.jpg',
		  },
		  {
		    target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
		    src: this.envPath + this.envName + '/left.jpg',
		  },
		  {
		    target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
		    src: this.envPath + this.envName + '/top.jpg',
		  },
		  {
		    target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
		    src: this.envPath + this.envName + '/bottom.jpg',
		  },
		  {
		    target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
		    src: this.envPath + this.envName + '/back.jpg',
		  },
		  {
		    target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
		    src: this.envPath + this.envName + '/front.jpg',
		  }
		];

		// Create a buffer for positions
		this.cubemapBuffer = gl.createBuffer();
		// Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
		gl.bindBuffer(gl.ARRAY_BUFFER, this.cubemapBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.skyboxVertices, gl.STATIC_DRAW);
		this.cubemapBuffer.itemSize = 3;
		this.cubemapBuffer.numItems = 36;

		// Create a texture.
		this.tbuffer = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.tbuffer);

		this.loadImages(this.tbuffer, this.width, this.height);

		loadShaders(this);
	}


	// --------------------------------------------
	setShadersParams() {
		// Specific for render the skybox
		gl.depthFunc(gl.LEQUAL);

		gl.useProgram(this.shader);

		this.shader.tcAttrib = gl.getAttribLocation(this.shader, "aTexCoords");
		gl.enableVertexAttribArray(this.shader.tcAttrib);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.cubemapBuffer);
		gl.vertexAttribPointer(this.shader.tcAttrib, this.cubemapBuffer.itemSize, gl.FLOAT, false, 0, 0);

		this.shader.inv_pViewMatrixUniform = gl.getUniformLocation(this.shader, "u_invPViewMatrix");		
		this.shader.uSkyboxSamplerUniform = gl.getUniformLocation(this.shader, "uSkybox");
	}


	// --------------------------------------------
	setMatrixUniforms() {
		mat4.identity(inv_pViewMatrix);

		// We place the view at the center of the scene according to the skybox
		viewMatrix[12] = 0.0;
		viewMatrix[13] = 0.0;
		viewMatrix[14] = 0.0;

		mat4.multiply(pMatrix, viewMatrix, inv_pViewMatrix);
		mat4.inverse(inv_pViewMatrix);

		gl.uniformMatrix4fv(this.shader.inv_pViewMatrixUniform, false, inv_pViewMatrix);
	    gl.uniform1i(this.shader.uSkyboxSamplerUniform, 0);
	}

	loadImages(tbuffer, width, height) {

		function isPowerOf2(value) {
	  		return (value & (value - 1)) == 0;
		}

		this.faceInfos.forEach((faceInfo) => {
			const {target, src} = faceInfo;

			// Upload the canvas to the cubemap face.
			const level = 0;
			const internalFormat = gl.RGBA;
			const format = gl.RGBA;
			const type = gl.UNSIGNED_BYTE;
			//const border = 0;
			//const pixel = new Uint8Array ([0, 0, 255, 255]);

			// Used only for testing
			//gl.texImage2D(target, level, internalFormat, width, height, border, format, type, pixel);

			// Allocation d'un espace VRAM pour les textures.
			gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

			// Asynchronously load an image
			const image = new Image();
			image.src = src;
			image.addEventListener('load', function() {

				
				gl.bindTexture(gl.TEXTURE_CUBE_MAP, tbuffer);
				gl.texImage2D(target, level, internalFormat, format, type, image);

				// WebGL1 a des spécifications différentes pour les images puissances de 2
				// par rapport aux images non puissances de 2 ; aussi vérifier si l'image est une
				// puissance de 2 sur chacune de ses dimensions.
				if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
					// Oui, c'est une puissance de 2. Générer les mips.
					gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
					gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
				}

				else {
					gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				}
			});
		});
	}

	// --------------------------------------------
	draw() {
		if (this.shader && this.loaded == 4) {
			this.setShadersParams();
			this.setMatrixUniforms(this);

			gl.drawArrays(gl.TRIANGLES, 0, this.cubemapBuffer.numItems);

			gl.depthFunc(gl.LESS);
		}
	}

}

// =====================================================
// FONCTIONS GENERALES, INITIALISATIONS
// =====================================================



// =====================================================
function initGL(canvas) {
	try {
		gl = canvas.getContext("webgl");
		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;
		gl.viewport(0, 0, canvas.width, canvas.height);

		gl.clearColor(0.7, 0.7, 0.7, 1.0);
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		gl.frontFace(gl.CCW);
		gl.depthFunc(gl.LESS);

	} catch (e) { }
	if (!gl) {
		console.log("Could not initialise WebGL");
	}
}


// =====================================================
function loadObjFile(OBJ3D) {
	var xhttp = new XMLHttpRequest();

	xhttp.onreadystatechange = function () {
		if (xhttp.readyState == 4 && xhttp.status == 200) {
			var tmpMesh = new OBJ.Mesh(xhttp.responseText);
			OBJ.initMeshBuffers(gl, tmpMesh);
			OBJ3D.mesh = tmpMesh;
		}
	}

	xhttp.open("GET", OBJ3D.objName, true);
	xhttp.send();
}



// =====================================================
function loadShaders(Obj3D) {
	loadShaderText(Obj3D, '.vs');
	loadShaderText(Obj3D, '.fs');
}

// =====================================================
function loadShaderText(Obj3D, ext) {   // lecture asynchrone...
	var xhttp = new XMLHttpRequest();

	xhttp.onreadystatechange = function () {
		if (xhttp.readyState == 4 && xhttp.status == 200) {
			if (ext == '.vs') { Obj3D.vsTxt = xhttp.responseText; Obj3D.loaded++; }
			if (ext == '.fs') { Obj3D.fsTxt = xhttp.responseText; Obj3D.loaded++; }
			if (Obj3D.loaded == 2) {
				Obj3D.loaded++;
				compileShaders(Obj3D);
				Obj3D.loaded++;
			}
		}
	}

	Obj3D.loaded = 0;
	xhttp.open("GET", Obj3D.shaderPath + Obj3D.shaderName + ext, true);
	xhttp.send();
}

// =====================================================
function compileShaders(Obj3D) {
	Obj3D.vshader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(Obj3D.vshader, Obj3D.vsTxt);
	gl.compileShader(Obj3D.vshader);
	if (!gl.getShaderParameter(Obj3D.vshader, gl.COMPILE_STATUS)) {
		console.log("Vertex Shader FAILED... " + Obj3D.shaderPath + Obj3D.shaderName + ".vs");
		console.log(gl.getShaderInfoLog(Obj3D.vshader));
	}

	Obj3D.fshader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(Obj3D.fshader, Obj3D.fsTxt);
	gl.compileShader(Obj3D.fshader);
	if (!gl.getShaderParameter(Obj3D.fshader, gl.COMPILE_STATUS)) {
		console.log("Fragment Shader FAILED... " + Obj3D.shaderPath + Obj3D.shaderName + ".fs");
		console.log(gl.getShaderInfoLog(Obj3D.fshader));
	}

	Obj3D.shader = gl.createProgram();
	gl.attachShader(Obj3D.shader, Obj3D.vshader);
	gl.attachShader(Obj3D.shader, Obj3D.fshader);
	gl.linkProgram(Obj3D.shader);
	if (!gl.getProgramParameter(Obj3D.shader, gl.LINK_STATUS)) {
		console.log("Could not initialise shaders");
		console.log(gl.getShaderInfoLog(Obj3D.shader));
	}
}

function updateViewMatrix()
{
	cameraPos = [0., 0., 1.];
	mat4.identity(viewMatrix);

	cameraPos[2] += distCENTER;

	if(cameraPos[2] < 0.)
	{
		distCENTER = -1.0;
		cameraPos[2] = 0.0;
	}

	// On clamp les rotations sur l'axe X pour une valeur +/- inférieur a PI/2
	mat4.identity(rotMatrix);
	if(Math.abs(rotX) >= (Math.PI / 2.))
		rotX = (rotX < 0.) ? -1.5706 : 1.5706;

	mat4.rotateY(rotMatrix, -rotY);
	mat4.rotateX(rotMatrix, -rotX);

	mat4.multiplyVec3(rotMatrix, cameraPos);

	mat4.lookAt(cameraPos, [0, 0, 0], [0, 1, 0], viewMatrix);

	uPosLights[0] = cameraPos[0];
	uPosLights[1] = cameraPos[1];
	uPosLights[2] = cameraPos[2];
}

// Point d'entree de WebGL
// =====================================================
function webGLStart() {

	var canvas = document.getElementById("WebGL-app");

	canvas.onmousedown = handleMouseDown;
	document.onmouseup = handleMouseUp;
	document.onmousemove = handleMouseMove;
	canvas.onwheel = handleMouseWheel;

	initGL(canvas);

	mat4.perspective(90, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
	updateViewMatrix();

	PLANE = new plane();
	OBJ1 = new objmesh(modelName + '.obj', renderFuncName, modelTrans, modelRot, modelScale);

	// Equivalent de la boucle principale en C/C++
	tick();
}

// =====================================================
function drawScene() {

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	updateViewMatrix();

	if(displayPlan == 1)
		PLANE.draw();
	
	OBJ1.draw();

	if(envMapON == 1)
		SKYBOX.draw();
}


// SECTION DEDIEE A L'INTERFACE UTILISATEUR
// =====================================================

const srcLightChangedBoxValue = function(i, isChecked) {
	uLightsON[i] = isChecked ? 1 : 0;
}

$(document).ready(function() {

	const planCheck = $('#planCheck');
	const toneMappingCheck = $('#toneMappingCheck');
	const gammaCheck = $('#gammaCheck');
	
	const envMapCheck = $('#envMapCheck');
	const lightObsCheck = $('#lightObsCheck');
	const lightUpCheck = $('#lightUpCheck');
	const lightFrontCheck = $('#lightFrontCheck');
	const lightBackCheck = $('#lightBackCheck')
	const lightLeftCheck = $('#lightLeftCheck')
	const lightRightCheck = $('#lightRightCheck');


	function envMapToggled() {
		if(envMapCheck.is(":checked"))
		{
			$.ajax({
		       url : 'assets/ui/ui_environnement_map_selector.html',
		       type : 'GET',
		       dataType : 'html',
		       success : function(code_html, statut) {
					$('#map-selection').append(code_html);

					SKYBOX = new skybox('basilica', 2048, 2048);
					envMapON = 1;

					$('#select-map').on('change', function() {
						let match = /([a-z]+), (\d{1,5}), (\d{1,5})/.exec($(this).val());
					    if (match !== null) {
					    	SKYBOX = new skybox(match[1], parseInt(match[2]), parseInt(match[3]));
					    	envMapON = 1;
						}

						else
						{
							SKYBOX = null;
							envMapON = 0;
							envMapCheck.prop("checked", false);
							$('#map-selection').empty();
						}
					});
				}
			})
		}

		else
		{
			$('#map-selection').empty();

			SKYBOX = null;
			envMapON = 0;
		}
	}

	// Choix du modele a charger
	// -------------------------------------------------------------------------------------------

	modelName = 'bunny';
	modelTrans = [0.0, -0.25, 0.0];
	modelRot = [0.0, 0.0, 0.0];
	modelScale = 0.5;
	$('#select-model').val('bunny, (0.0, -0.25, 0.0), (0.0, 0.0, 0.0), 0.5');
	$('#select-model').on('change', function() {
		let match = /([a-zA-Z_]+), \(([-]?\d+.\d+, [-]?\d+.\d+, [-]?\d+.\d+)\), \(([-]?\d+.\d+, [-]?\d+.\d+, [-]?\d+.\d+)\), (\d+.\d+)/.exec($(this).val());
		if (match !== null) {
			modelName = match[1];

			let subMatch = /([-]?\d+.\d+), ([-]?\d+.\d+), ([-]?\d+.\d+)/.exec(match[2]);

			modelTrans[0] = parseFloat(subMatch[1]);
			modelTrans[1] = parseFloat(subMatch[2]);
			modelTrans[2] = parseFloat(subMatch[3]);

			subMatch = /([-]?\d+.\d+), ([-]?\d+.\d+), ([-]?\d+.\d+)/.exec(match[3]);

			modelRot[0] = parseFloat(subMatch[1]);
			modelRot[1] = parseFloat(subMatch[2]);
			modelRot[2] = parseFloat(subMatch[3]);

			modelScale = parseFloat(match[4]);

			OBJ1 = new objmesh(modelName + '.obj', renderFuncName, modelTrans, modelRot, modelScale);
		}

		else
		{
			modelName = 'bunny';
			modelTrans = [0.0, -0.25, 0.0];
			modelRot = [0.0, 0.0, 0.0];
			modelScale = 0.5;

			$(this).val('bunny, (0.0, -0.25, 0.0), (0.0, 0.0, 0.0), 0.5');

			OBJ1 = new objmesh(modelName + '.obj', renderFuncName, modelTrans, modelRot, modelScale);
		}
	});

	// Selection de la fonction de rendu
	// -------------------------------------------------------------------------------------------

	$('#select-render').val('lambert');
	$('#select-render').on('change', function() {
		renderFuncName = this.value;
		OBJ1 = new objmesh(modelName + '.obj', renderFuncName, modelTrans, modelRot, modelScale);

		$.ajax({
	       url : `assets/ui/ui_${renderFuncName}_config.html`,
	       type : 'GET',
	       dataType : 'html',
	       success : function(code_html, statut) {
				$('#render-config').empty();
				$('#render-config').append(code_html);


				if('lambert' === renderFuncName) {
					uKd = [0.008, 0.4, 0.8];

					const colorpicker = $('#colorpicker');
					colorpicker.unbind();
					colorpicker.colorpicker({format: "rgb", color: "#0266CC", useAlpha: false});
					colorpicker.on('colorpickerChange', function(event) {
						let match = /rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/.exec(event.color.toString());
		            	if (match !== null) {
		            		uKd = [match[1] / 255., match[2] / 255., match[3] / 255.];
		            	}
					});

					lightObsCheck.prop("checked", false);
					lightUpCheck.prop("checked", true);
					lightFrontCheck.prop("checked", false);
					lightBackCheck.prop("checked", false);
					lightLeftCheck.prop("checked", false);
					lightRightCheck.prop("checked", false);

					uLightsON = [0, 1, 0, 0, 0, 0];
				}

				if('cook_torrance' === renderFuncName) {
					uKd = [0.44, 0.04, 0.04];

					const colorpicker = $('#colorpicker');
					colorpicker.unbind();
					colorpicker.colorpicker({format: "rgb", color: "#FF0000", useAlpha: false});
					colorpicker.on('colorpickerChange', function(event) {
						let match = /rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/.exec(event.color.toString());
		            	if (match !== null) {
		            		uKd = [match[1] / 255., match[2] / 255., match[3] / 255.];
		            	}
					});
				}

				if('lambert' !== renderFuncName) {

					if('cook_torrance' === renderFuncName)
					{
						uF0 = [0.04, 0.04, 0.04]; // F0 plastique
						uNo = 1.5;

					  	lightObsCheck.prop("checked", false);
						lightUpCheck.prop("checked", true);
						lightFrontCheck.prop("checked", true);
						lightBackCheck.prop("checked", true);
						lightLeftCheck.prop("checked", true);
						lightRightCheck.prop("checked", true);

						uLightsON = [0, 1, 1, 1, 1, 1];

						$('#select-material').on('change', function(event) {
							let match = /F0\((\d+.\d+), (\d+.\d+), (\d+.\d+)\), (\d+.\d+)/.exec($(this).find(':selected').val());
			            	if (match !== null) {
								uF0 = [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
								uNo = parseFloat(match[4]);
			            	}
						});
					}

					else
					{
					  	lightObsCheck.prop("checked", false);
						lightUpCheck.prop("checked", false);
						lightFrontCheck.prop("checked", false);
						lightBackCheck.prop("checked", false);
						lightLeftCheck.prop("checked", false);
						lightRightCheck.prop("checked", false);

						uLightsON = [0, 0, 0, 0, 0, 0];

						if(envMapON == 0)
						{
							SKYBOX = new skybox('basilica', 2048, 2048);

							envMapON = 1;
							envMapCheck.prop("checked", true);

							envMapToggled();
						}

						uF0 = [1.0, 0.782, 0.344]; // F0 de l'or

						$('#select-material').on('change', function(event) {
							let match = /F0\((\d+.\d+), (\d+.\d+), (\d+.\d+)\)/.exec($(this).find(':selected').val());
			            	if (match !== null)
								uF0 = [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
						});
					}

					uRoughness = 0.5;

				  	const $roughnessSpan = $('#roughness-span');
				  	$roughnessSpan.html(uRoughness.toPrecision(2));
				  	$('#roughness-range').on('input change', function(event) {
				  		const value = $(this).val();
						$roughnessSpan.html(parseFloat(value).toPrecision(2));
				    	uRoughness = value;
				  	});
			  	}
			}
		});
	});

	$('#colorpicker').colorpicker({format: "rgb", color: "#0266CC", useAlpha: false});
	$('#colorpicker').on('colorpickerChange', function(event) {
		let match = /rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/.exec(event.color.toString());
    	if (match !== null) {
			uKd = [match[1] / 255., match[2] / 255., match[3] / 255.];
    	}
	});


	// Afficher le plan
	// -------------------------------------------------------------------------------------------

	displayPlan = 1
	planCheck.prop("checked", true);

	planCheck.change(function() { displayPlan = $(this).is(":checked") ? 1 : 0; });


	// Activer Tone mapping et/ou correction gamma
	// -------------------------------------------------------------------------------------------

	uToneMappingCheck = 0;
	uGammaCheck       = 0;

	toneMappingCheck.prop("checked", false);
	gammaCheck.prop("checked", false);

	toneMappingCheck.change(function() { uToneMappingCheck = $(this).is(":checked") ? 1 : 0; });
	gammaCheck.change(function() { uGammaCheck = $(this).is(":checked") ? 1 : 0; });


	// Afficher la carte d'environnement
	// -------------------------------------------------------------------------------------------

	envMapON = 0;
	envMapCheck.prop("checked", false);

	envMapCheck.change(function() { envMapToggled(); });

	// Allumer une ou plusieurs sources de lumière de position fixe
	// -------------------------------------------------------------------------------------------

	uLightsON = [0, 1, 0, 0, 0, 0];

	lightObsCheck.prop("checked", false);
	lightUpCheck.prop("checked", true);
	lightFrontCheck.prop("checked", false);
	lightBackCheck.prop("checked", false);
	lightLeftCheck.prop("checked", false);
	lightRightCheck.prop("checked", false);

	lightObsCheck.change(function() { srcLightChangedBoxValue(0, $(this).is(":checked")); });
	lightUpCheck.change(function() { srcLightChangedBoxValue(1, $(this).is(":checked")); });
	lightFrontCheck.change(function() { srcLightChangedBoxValue(2, $(this).is(":checked")); });
	lightBackCheck.change(function() { srcLightChangedBoxValue(3, $(this).is(":checked")); });
	lightLeftCheck.change(function() { srcLightChangedBoxValue(4, $(this).is(":checked")); });
	lightRightCheck.change(function() { srcLightChangedBoxValue(5, $(this).is(":checked")); });

	// Couleur des lumieres
	// -------------------------------------------------------------------------------------------

	const colorpicker_lights = $('#colorpicker-lights');
	colorpicker_lights.colorpicker({format: "rgb", color: "#FFFFFF", useAlpha: false});

	colorpicker_lights.on('colorpickerChange', function(event) {
		let match = /rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/.exec(event.color.toString());
    	if (match !== null) {
    		uColorLights = [match[1] / 255., match[2] / 255., match[3] / 255.];
    	}
	});
})
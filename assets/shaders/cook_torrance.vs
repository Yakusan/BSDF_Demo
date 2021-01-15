attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;

// ============================

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uPMatrix;

// ============================

varying vec4 pos3D;
varying vec3 N;

// ============================

void main(void)
{
	pos3D = uModelMatrix * vec4(aVertexPosition, 1.0);
	N = aVertexNormal;
	gl_Position = uPMatrix * uViewMatrix * pos3D;
}

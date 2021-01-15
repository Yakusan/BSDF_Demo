attribute vec3 aVertexPosition;
attribute vec2 aTexCoords;

uniform mat4 uViewMatrix;
uniform mat4 uPMatrix;

varying vec2 texCoords;

void main(void) {
	texCoords = aTexCoords;
	gl_Position = uPMatrix * uViewMatrix * vec4(aVertexPosition, 1.0);
}

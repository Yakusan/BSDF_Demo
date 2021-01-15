precision mediump float;

uniform mat4 u_invPViewMatrix;
uniform samplerCube u_skybox;

varying vec4 texCoords;

void main()
{
	vec4 t = u_invPViewMatrix * texCoords;
	gl_FragColor = textureCube(u_skybox, normalize(t.xyz / t.w));
}
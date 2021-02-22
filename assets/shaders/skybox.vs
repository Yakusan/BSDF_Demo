attribute vec3 aTexCoords;

varying vec4 texCoords;
varying mat4 invPMVMatrix;

void main()
{
  texCoords = vec4(aTexCoords, 1.0);
  gl_Position = vec4(aTexCoords.xy, 1.0, 1.0);
}
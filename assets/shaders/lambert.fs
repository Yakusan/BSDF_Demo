precision mediump float;
precision highp int;


// ==================== UNIFORM ====================

uniform int  uLightsON[6];  // Lumiere
uniform vec3 uPosLights[6]; // Position des lumières
uniform vec3 uColorLights;  // Puissance de la lumiere (sa couleur)

uniform vec3 uKd;           // Couleur de l'objet

uniform int uToneMappingCheck;
uniform int uGammaCheck;


// ==================== VARYING ====================*/
varying vec4 pos3D; // Vertices du modèle
varying vec3 N;     // Normal a la surface du modele


// ================= CONSTANTE =====================*/
const float M_PI = 3.14159265359;


// ============== FONCTION DE RENDU ==================*/
vec3 Lambert(vec3 Wi)
{
	vec3 Li = uColorLights;

    // Coefficent de diffusion pour le modele de Lambert
    vec3 Fr = uKd;

	return Li * Fr * max(dot(N, Wi), 0.0);
}

void main(void)
{
	vec3 Lo = vec3(0.0, 0.0, 0.0);

	for(int i = 0 ; i < 6 ; ++i)
	{
		if(uLightsON[i] == 1)
			Lo += Lambert(normalize(uPosLights[i] - vec3(pos3D)));
	}

    if(uToneMappingCheck == 1)
        Lo = Lo / (Lo + vec3(1.0, 1.0, 1.0));
    
    if(uGammaCheck == 1)
    {
        for(int i = 0 ; i < 3 ; ++i)
        {
            if(Lo[i] <= 0.0031308)
                Lo[i] = 12.92 * Lo[i];

            else
                Lo[i] = pow(1.055 * Lo[i], 1.0 / 2.4) - 0.055;
        }
    }

    gl_FragColor = vec4(Lo, 1.0);
}
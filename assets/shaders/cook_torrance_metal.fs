precision mediump float;
precision highp int;

// TODO Moyenner les cartes d'environnements
// cf : https://learnopengl.com/PBR/IBL/Diffuse-irradiance

// =================== UNIFORM =======================
uniform int  uLightsON[6];  // Tableau de booleen des lumiere active
uniform vec3 uPosLights[6]; // Position des lumières
uniform vec3 uColorLights;  // Couleur des lumieres

uniform vec3  uF0;        // Valeur de F0° lineaire du modele pour la diffusion et la refraciton [0., 1.]
uniform float uRoughness; // Rugosite du modele

uniform int uToneMappingCheck;
uniform int uGammaCheck;

uniform int uEnvMapON;
uniform samplerCube u_skybox;

// =================== VARYING =======================
varying vec4 pos3D;        // Vertice du modele 3D
varying vec3 N;            // Normal du modele 3D (vecteur unitaire)

// ==================== CONSTANTE ====================
const float M_PI = 3.14159265359;


// ================== FONCTIONS ======================
vec3 Fresnel_Schlick_approximation(vec3 Wi, vec3 m)
{   
    // vec3 F90° = vec3(1.0, 1.0, 1.0)
    return uF0 + (vec3(1.0, 1.0, 1.0) - uF0) * pow(1.0 - max(dot(m, Wi), 0.0), 5.0);
}

float Beckmann_Distribution(vec3 m)
{
    float roughness2    = uRoughness * uRoughness;
    float cos_theta_m   = dot(N, m);
    float cos2_theta_m  = cos_theta_m * cos_theta_m;
    float tan2_m_inv_r2 = (cos2_theta_m - 1.0) / (roughness2 * cos2_theta_m);

    return (clamp(cos_theta_m, 0.00, 1.00) * exp(tan2_m_inv_r2)) / (M_PI * roughness2 * (cos2_theta_m * cos2_theta_m));
}


float Cook_Torrance_Geometry(vec3 Wi, vec3 Wo, vec3 m)
{
    float ndm = max(dot(N, m), 0.0);

    float gnmi = (2.0 * ndm * max(dot(N, Wi), 0.0)) / max(dot(m, Wi), 0.0);
    float gnmo = (2.0 * ndm * max(dot(N, Wo), 0.0)) / max(dot(m, Wo), 0.0);

    return min(1., min(gnmi, gnmo));
}

// ============== FONCTION DE RENDU ==================

// Wi = Direction de la lumière incidente (vecteur unitaire)
// Li = Puissance de la lumiere incidente (La couleur d'une lumiere ponctuelle ou la carte d'irradiance)
vec3 Cook_Torrance_Metal(vec3 Wi, vec3 Li)
{
    vec3  Wo  = normalize(uPosLights[0] - vec3(pos3D)); // Direction de l'oeil de l'observateur (vecteur unitaire)
    vec3  m   = normalize(Wi + Wo);                     // normale des microsurfaces
    float idn = dot(N, Wi);                             // cosinus de l'angle (N, Wi)

    // Calcul du speculaire de Cook-Torrance
    vec3 Fs = (Fresnel_Schlick_approximation(Wi, m) *
               Beckmann_Distribution(m) *
               Cook_Torrance_Geometry(Wi, Wo, m)) / (4.0 * abs(idn) * abs(dot(N, Wo)));


    // Fr = Fonction de rendu: Pas de diffusion pour le metal, seulement la Speculaire de Cook-Torrance
    vec3 Fr = Fs;

    // Equation de rendu Lo = Li * Fr physiquement realiste par la conservation de l'energie avec Fr * cos(angle (N, Wi))
    return Li * M_PI * Fr * max(idn, 0.0);
}

void main(void)
{
    vec3 Lo = vec3(0.0, 0.0, 0.0);

    if(uEnvMapON == 1)
    {
        vec3 Wo = normalize(vec3(pos3D) - uPosLights[0]);
        vec3 R = normalize(reflect(Wo, N));
        vec3 irradianceMap = textureCube(u_skybox, R).rgb;

        Lo = mix(irradianceMap, Cook_Torrance_Metal(R, irradianceMap), uRoughness);
    }

    for(int i = 0 ; i < 6 ; ++i)
    {
        // Equation de rendu Lo = Li * Fr physiquement realiste par la conservation de l'energie avec Fr * cos(angle (N, Wi))
        if(uLightsON[i] == 1)
            Lo += Cook_Torrance_Metal(normalize(uPosLights[i] - vec3(pos3D)), uColorLights);
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
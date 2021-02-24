precision mediump float;
precision highp int;

// ============== UNIFORM ==================
uniform int  uLightsON[6];  // Tableau de booleen des lumiere active
uniform vec3 uPosLights[6]; // Position des lumières
uniform vec3 uColorLights;  // Couleur des lumieres

uniform vec3  uKd;        // Couleur du modele
uniform vec3  uF0;        // Valeur de F0° lineaire du modele pour la diffusion et la refraciton [0., 1.]
uniform float uNo;
uniform float uRoughness; // Rugosite du modele

uniform int uEnvMapON;
uniform samplerCube u_skybox;

uniform int uToneMappingCheck;
uniform int uGammaCheck;

// ============== VARYING ==================
varying vec4 pos3D;        // Vertice du modele 3D
varying vec3 N;            // Normal du modele 3D (vecteur unitaire)

/*
**********************************************************************************************************************
*                                                                                                                    *
* Note: le coefficient de reflexion uF0 est le coefficient de reflection d'un rayon incident parallèle à la normale, *
*       c'est a dire lorsque l'angle theta est égale a 0 et où lorsque la reflection est minimale.                   *
*       Ce coefficient peut varier en fonction du materiau non metallique que l'on souhaite rendre.                  *
*       En supposant que nos lumieres incidentes soient non polarisé, j'ai choisi des coefficient                    *
*       précalculé disponible sur le site ci-dessous.                                                                *
*                                                                                                                    *
*       cf : https://refractiveindex.info/                                                                           *
*                                                                                                                    *
*       Exemple de données fournissant le coefficient de reflexion F0 du plastique Poly(methyl methacrylate)         *
*       (Voir section encadré "Reflection calculator")                                                               *
*       https://refractiveindex.info/?shelf=3d&book=plastics&page=pmma                                               *
**********************************************************************************************************************
*/

// ================== CONSTANTE ======================
const float M_PI = 3.14159265359;


// ================== FONCTIONS ======================
vec3 Fresnel_Schlick_approximation(float m_idm)
{   
    // vec3 F90° = vec3(1.0)
    return uF0 + (vec3(1.0) - uF0) * pow(1.0 - m_idm, 5.0);
}

float Beckmann_Distribution(float cos_theta_m)
{
    float roughness2    = uRoughness * uRoughness;
    float cos2_theta_m  = cos_theta_m * cos_theta_m;
    float tan2_m_inv_r2 = (cos2_theta_m - 1.0) / (roughness2 * cos2_theta_m);

    return (step(0.0009765625, cos_theta_m) * exp(tan2_m_inv_r2)) / (M_PI * roughness2 * (cos2_theta_m * cos2_theta_m));
}


float Cook_Torrance_Geometry(float idn, float odn, float m_idm, float ndm)
{
    float m_ndm = max(ndm, 0.0);

    float gnmi = (2.0 * m_ndm * max(idn, 0.0)) / m_idm;
    float gnmo = (2.0 * m_ndm * max(odn, 0.0)) / m_idm;

    return min(1., min(gnmi, gnmo));
}

// ============== FONCTION DE RENDU ==================

// Wi =  Direction de la lumière incidente (vecteur unitaire)
vec3 Cook_Torrance(vec3 Wi)
{    
    vec3  Wo     = normalize(uPosLights[0] - vec3(pos3D)); // Direction de l'oeil de l'observateur (vecteur unitaire)
    vec3  ms     = normalize(Wi + Wo);                     // normale speculaire des microsurfaces
    float m_idms = max(dot(ms, Wi), 0.0);
    float idn    = dot(N, Wi); // cosinus de l'angle (N, Wi)
    float odn    = dot(N, Wo); // cosinus de l'angle (N, Wo)

    vec3 Fd = vec3(0.0);

    // Calcul du speculaire de Cook-Torrance
    vec3 F_ms = Fresnel_Schlick_approximation(m_idms);
    if(uEnvMapON == 0)
    {
        // Calcul de la diffusion sur les microsurfaces opaque avec un modele lambertien
        Fd = (vec3(1.0) - F_ms) * uKd / M_PI;  
    }


    float ndms  = dot(N, ms);  // cosinus de l'angle (N, m)
    vec3 Fs = (F_ms *
              Beckmann_Distribution(ndms) *
              Cook_Torrance_Geometry(idn, odn, m_idms, ndms)) / (4.0 * abs(idn) * abs(odn));

    
    return Fd + Fs;
}

// Calcul de la transparence sur les microsurfaces avec le modele defini dans le papier
// "Microfacet Models for Refraction through Rough Surfaces" [Wal07]
vec3 Walter(vec3 Wo)
{
    vec3  Wi   = normalize(uPosLights[0] - vec3(pos3D)); // Direction de l'oeil de l'observateur (vecteur unitaire)
    vec3  mt   = normalize(-Wi - uNo * Wo);
    float idn  = dot(N, Wi);
    float odn  = dot(N, Wo);
    float ndmt = dot(mt, N);
    float idmt = dot(mt, Wi);
    float odmt = dot(mt, Wo);
    float iodmt2 = (idmt + uNo * odmt) * (idmt + uNo * odmt);
    float no2  = uNo * uNo;

    return (abs(idmt) * abs(odmt) / abs(idn) * abs(odn)) *
           (no2 * (vec3(1.0) - Fresnel_Schlick_approximation(max(idmt, 0.0))) *
           Beckmann_Distribution(ndmt) *
           Cook_Torrance_Geometry(idn, odn, max(idmt, 0.0), ndmt) / iodmt2);
}

vec3 Fr(vec3 Li, vec3 Fr, float idn)
{
    return Li * M_PI * Fr * max(idn, 0.0);
}

void main(void)
{
    vec3 Lo = vec3(0.0);

    if(uEnvMapON == 1)
    {
        vec3 Wo            = normalize(vec3(pos3D) - uPosLights[0]);
        vec3 R             = normalize(refract(Wo, N, 1. / uNo));
        vec3 irradianceMap = textureCube(u_skybox, R,  4.0 * uRoughness).rgb;

        Lo = irradianceMap * uKd;

        // TODO resultat actuel temporaire
        // Fr = Fonction de rendu: Speculaire de Cook-Torrance + Transparence de Walter
        //Lo = Fr(irradianceMap, Cook_Torrance(R) + Walter(R), dot(N, R));

        for(int i = 0 ; i < 6 ; ++i)
        {
            // Equation de rendu Lo = Li * Fr physiquement realiste par la conservation de l'energie avec Fr * cos(angle (N, Wi))
            // Speculaire de Cook-Torrance + Transparence de Walter
            if(uLightsON[i] == 1)
            {
                vec3 Wi = normalize(uPosLights[i] - vec3(pos3D));
                Lo += Fr(uColorLights, Cook_Torrance(Wi) /*+ Walter(Wi)*/, dot(N, Wi));
            }
        }
    }

    else
    {
        for(int i = 0 ; i < 6 ; ++i)
        {
            // Equation de rendu Lo = Li * Fr physiquement realiste par la conservation de l'energie avec Fr * cos(angle (N, Wi))
            // Diffusion lambertien + Speculaire de Cook-Torrance
            if(uLightsON[i] == 1)
            {
                vec3 Wi = normalize(uPosLights[i] - vec3(pos3D));
                Lo += Fr(uColorLights, Cook_Torrance(Wi), dot(N, Wi));
            }
        }
    }

    if(uToneMappingCheck == 1)
        Lo = Lo / (Lo + vec3(1.0));
    
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
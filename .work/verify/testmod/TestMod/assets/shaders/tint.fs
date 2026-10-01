#if defined(VERTEX) || __VERSION__ > 100 || defined(GL_FRAGMENT_PRECISION_HIGH)
	#define MY_HIGHP_OR_MEDIUMP highp
#else
	#define MY_HIGHP_OR_MEDIUMP mediump
#endif
extern MY_HIGHP_OR_MEDIUMP vec2 tint;
extern MY_HIGHP_OR_MEDIUMP number time;
extern MY_HIGHP_OR_MEDIUMP vec4 texture_details;
extern MY_HIGHP_OR_MEDIUMP vec2 image_details;
vec4 effect( vec4 colour, Image texture, vec2 texture_coords, vec2 screen_coords )
{
    vec4 tex = Texel(texture, texture_coords);
    vec2 uv = (((texture_coords)*(image_details)) - texture_details.xy*texture_details.ba)/texture_details.ba;
    if (uv.x > 0.98 || uv.x < 0.02 || uv.y > 0.98 || uv.y < 0.02) { return tex; }
    float w = 0.5 + 0.5*sin(time*2.0 + tint.g*3.0 + uv.y*6.28);
    tex.rgb = mix(tex.rgb, vec3(1.0, 0.2, 0.8), 0.55*w*tex.a);
    return tex;
}